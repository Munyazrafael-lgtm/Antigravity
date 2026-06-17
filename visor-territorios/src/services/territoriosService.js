import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';

/** Normaliza el texto: quita acentos, convierte a minúsculas y cambia espacios por guiones */
export function limpiarTexto(texto) {
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
export async function fetchTerritorioPorNumero(numero) {
    if (!numero) return null;

    const q = query(
        collection(db, "Territorios"),
        where("numero", "==", numero.toString())
    );

    const snap = await getDocs(q);
    if (snap.empty) return null;

    const d = snap.docs[0];
    const t = d.data();
    
    return {
        id: d.id,
        numero: t.numero,
        poblacion: t.poblacion || "Sin población",
        nombre: t.nombre || "",
        entrega: t.entrega || "",
        tieneNota: t.tieneNota || false,
        tieneAviso: t.tieneAviso || false
    };
}

/** 
 * Obtiene todos los territorios activos
 */
export async function fetchTerritoriosPorCliente(clienteInput) {
    const nombreLimpio = limpiarTexto(clienteInput);
    if (!nombreLimpio) return { territorios: [], nombreReal: "" };

    const q = query(
        collection(db, "Territorios"),
        where("devolucion", "==", "")
    );

    const snap = await getDocs(q);
    const territorios = [];
    let nombreReal = "";

    snap.forEach(d => {
        const t = d.data();
        if (t.numero && t.nombre) {
            if (limpiarTexto(t.nombre) === nombreLimpio) {
                nombreReal = t.nombre;
                territorios.push({
                    numero: t.numero,
                    poblacion: t.poblacion,
                    entrega: t.entrega || "",
                    id: d.id,
                    tieneNota: t.tieneNota || false,
                    tieneAviso: t.tieneAviso || false
                });
            }
        }
    });

    territorios.sort((a, b) => Number(a.numero) - Number(b.numero));
    return { territorios, nombreReal };
}

/** 
 * Marca un territorio como terminado poniéndole la fecha de hoy
 */
export async function marcarTerritorioDevuelto(docId, fecha = null) {
    const valorFecha = fecha || new Date().toISOString().split("T")[0];
    await updateDoc(doc(db, "Territorios", docId), {
        devolucion: valorFecha
    });
}

/**
 * Obtiene la nota y el aviso de la subcolección del territorio
 */
export async function obtenerNotas(territorioId) {
    const docRef = doc(db, "Territorios", territorioId, "Notas", "actual");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
        return snap.data();
    }
    return { nota: "", aviso: "" };
}

/**
 * Guarda o actualiza la nota y el aviso en la subcolección y actualiza los indicadores en el Doc principal
 */
export async function guardarNotas(territorioId, { nota, aviso }) {
    const docRef = doc(db, "Territorios", territorioId, "Notas", "actual");
    await setDoc(docRef, {
        nota: nota || "",
        aviso: aviso || "",
        ultimaActualizacion: Date.now()
    });

    // Actualizar también los indicadores en el documento principal para la lista
    const mainDocRef = doc(db, "Territorios", territorioId);
    await updateDoc(mainDocRef, {
        tieneNota: !!(nota && nota.trim()),
        tieneAviso: !!(aviso && aviso.trim())
    });
}
