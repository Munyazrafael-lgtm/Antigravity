import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, writeBatch } from 'firebase/firestore';
import { z } from 'zod';

import type { Territorio, TerritoriosCliente, NotasTerritorio } from '../types';

// ─── ESQUEMAS DE VALIDACIÓN ZOD ───

export const TerritorioSchema = z.object({
    id: z.string(),
    numero: z.union([z.number(), z.string().transform(v => parseInt(v, 10) || 0)]).catch(0),
    poblacion: z.string().catch('Sin población'),
    nombre: z.string().catch(''),
    nombreLimpio: z.string().catch(''),
    entrega: z.string().catch(''),
    tieneNota: z.boolean().catch(false),
    tieneAviso: z.boolean().catch(false),
    devolucion: z.string().optional()
});

export const NotasTerritorioSchema = z.object({
    nota: z.string().catch(''),
    aviso: z.string().catch(''),
    ultimaActualizacion: z.number().optional()
});

// ───────────────────────────────────

/** Normaliza el texto: quita acentos, convierte a minúsculas y cambia espacios por guiones */
export function limpiarTexto(texto: string | null | undefined): string {
    if (!texto) return "";
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")           
        .replace(/[^a-z0-9-]/g, "");    
}

/** 
 * Obtiene un territorio específico por su número
 */
export async function fetchTerritorioPorNumero(numero: string | number): Promise<Territorio | null> {
    if (!numero) return null;

    const q = query(
        collection(db, "Territorios"),
        where("numero", "==", Number(numero))
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const t = d.data();
    
    const rawData = { id: d.id, ...t };
    const parsed = TerritorioSchema.safeParse(rawData);

    if (!parsed.success) {
        console.warn("Validación fallida en fetchTerritorioPorNumero. Detalle:", parsed.error);
        return null;
    }

    return parsed.data;
}

/** 
 * Obtiene todos los territorios activos
 */
export async function fetchTerritoriosPorCliente(clienteInput: string): Promise<TerritoriosCliente> {
    const nombreLimpio = limpiarTexto(clienteInput);
    if (!nombreLimpio) return { territorios: [], nombreReal: "" };

    // Intentamos consulta indexada directa (Altamente eficiente: solo lee los registros de este usuario)
    const q = query(
        collection(db, "Territorios"),
        where("devolucion", "==", ""),
        where("nombreLimpio", "==", nombreLimpio)
    );

    let snap = await getDocs(q);

    // Si la consulta directa no devuelve nada, podría ser porque la base de datos no está migrada.
    // Usamos el fallback de autocuración para migrar los documentos sobre la marcha.
    if (snap.empty) {
        const fallbackQ = query(
            collection(db, "Territorios"),
            where("devolucion", "==", "")
        );
        const fallbackSnap = await getDocs(fallbackQ);
        const batch = writeBatch(db);
        let hasPendingMigration = false;
        const territoriosMigrados: Territorio[] = [];
        let nombreRealMigrado = "";

        fallbackSnap.forEach(d => {
            const t = d.data();
            const rawData = { id: d.id, ...t };
            const parsed = TerritorioSchema.safeParse(rawData);

            if (parsed.success) {
                const val = parsed.data;
                if (val.nombre && limpiarTexto(val.nombre) === nombreLimpio) {
                    nombreRealMigrado = val.nombre;
                    territoriosMigrados.push(val);

                    // Escribimos el campo nombreLimpio para que futuras lecturas usen el query optimizado
                    const docRef = doc(db, "Territorios", d.id);
                    batch.update(docRef, { nombreLimpio });
                    hasPendingMigration = true;
                }
            }
        });

        if (hasPendingMigration) {
            await batch.commit().catch(err => console.error("Error al ejecutar auto-migración de nombreLimpio:", err));
        }

        if (territoriosMigrados.length > 0) {
            territoriosMigrados.sort((a, b) => a.numero - b.numero);
            return { territorios: territoriosMigrados, nombreReal: nombreRealMigrado };
        }

        return { territorios: [], nombreReal: "" };
    }

    const territorios: Territorio[] = [];
    let nombreReal = "";

    snap.forEach(d => {
        const t = d.data();
        const rawData = { id: d.id, ...t };
        const parsed = TerritorioSchema.safeParse(rawData);

        if (parsed.success) {
            const val = parsed.data;
            if (val.numero && val.nombre) {
                nombreReal = val.nombre;
                territorios.push(val);
            }
        } else {
            console.warn(`Territorio inválido ignorado (ID: ${d.id}). Detalle:`, parsed.error);
        }
    });

    territorios.sort((a, b) => a.numero - b.numero);
    return { territorios, nombreReal };
}

/** 
 * Marca un territorio como terminado poniéndole la fecha de hoy
 */
export async function marcarTerritorioDevuelto(docId: string, fecha: string | null = null): Promise<void> {
    const valorFecha = fecha || new Date().toISOString().split("T")[0];
    await updateDoc(doc(db, "Territorios", docId), {
        devolucion: valorFecha
    });
}

/**
 * Obtiene la nota y el aviso de la subcolección del territorio
 */
export async function obtenerNotas(territorioId: string): Promise<NotasTerritorio> {
    const docRef = doc(db, "Territorios", territorioId, "Notas", "actual");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        const data = snap.data();
        const parsed = NotasTerritorioSchema.safeParse(data);
        if (parsed.success) {
            return parsed.data;
        }
        console.warn(`Notas inválidas para territorio ${territorioId}. Detalle:`, parsed.error);
    }
    return { nota: "", aviso: "" };
}

/**
 * Guarda o actualiza la nota y el aviso en la subcolección y actualiza los indicadores en el Doc principal
 */
export async function guardarNotas(territorioId: string, { nota, aviso }: { nota: string; aviso: string }): Promise<void> {
    const batch = writeBatch(db);

    // 1. Guardar nota y aviso en la subcolección
    const notasRef = doc(db, "Territorios", territorioId, "Notas", "actual");
    batch.set(notasRef, {
        nota: nota || "",
        aviso: aviso || "",
        ultimaActualizacion: Date.now()
    });

    // 2. Actualizar los indicadores en el documento principal para la lista
    const mainDocRef = doc(db, "Territorios", territorioId);
    batch.update(mainDocRef, {
        tieneNota: !!(nota && nota.trim()),
        tieneAviso: !!(aviso && aviso.trim())
    });

    // Escritura atómica: ambas operaciones se aplican o fallan juntas
    await batch.commit();
}
