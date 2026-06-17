/**
 * Define los modelos de datos tipados del proyecto para
 * mejorar la seguridad en compilación y evitar castings con 'any' o 'unknown'.
 */

/** Datos de un territorio almacenado en Firestore */
export interface Territorio {
  id: string;
  numero: number;
  poblacion: string;
  nombre?: string;
  nombreLimpio?: string;
  entrega: string;
  tieneNota: boolean;
  tieneAviso: boolean;
  devolucion?: string;
}

/** Resultado de buscar territorios de un cliente */
export interface TerritoriosCliente {
  territorios: Territorio[];
  nombreReal: string;
}

/** Datos de notas de un territorio */
export interface NotasTerritorio {
  nota: string;
  aviso: string;
  ultimaActualizacion?: number;
}

/** Datos de un mapa guardado offline en IndexedDB */
export interface MapaOffline {
  id: string; // Formato: `${numero}_${tipo}`
  numero: string;
  tipo: 'm' | 's'; // callejero o satélite
  fecha: number;
  imageDataUrl: string; // Imagen con los trazos editados (Base64)
  mapaOriginal: string;  // Imagen limpia base original de la que se partió
}
