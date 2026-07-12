import type { MapaOffline } from "../types";

const DB_NAME = "MapasOfflineDB";
const DB_VERSION = 2;
const STORE_NAME = "mapas";

/**
 * Singleton de conexión a IndexedDB.
 * Reutiliza una única instancia durante toda la vida de la app,
 * evitando abrir (y no cerrar) una conexión nueva en cada operación.
 * Si la conexión se cierra inesperadamente, se reconecta automáticamente.
 */
let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  // Si ya tenemos una conexión activa, reutilizarla
  if (dbInstance) return Promise.resolve(dbInstance);
  // Si ya hay una conexión en progreso, esperar a que se resuelva
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      } else {
        store = (e.currentTarget as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
      }

      if (!store.indexNames.contains("numero")) {
        store.createIndex("numero", "numero", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;

      // Si el navegador cierra la conexión (ej. versionchange), limpiar la referencia
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };

      resolve(dbInstance);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
};

export const guardarMapaOffline = async (territorioData: MapaOffline): Promise<boolean> => {
  try {
    // Si se guarda o actualiza el mapa, lo eliminamos de la lista de borrados para que pueda volver a sincronizarse si es necesario
    const deletedMaps: string[] = JSON.parse(localStorage.getItem('deletedOfflineMaps') || '[]');
    const updatedDeleted = deletedMaps.filter(id => id !== territorioData.id);
    localStorage.setItem('deletedOfflineMaps', JSON.stringify(updatedDeleted));

    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.put(territorioData);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("IndexedDB Save Error:", error);
    return false;
  }
};

export const obtenerMapasOffline = async (): Promise<MapaOffline[]> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Ordenamos los mapas por fecha de guardado (los más nuevos primero)
        const mapas: MapaOffline[] = request.result || [];
        mapas.sort((a, b) => b.fecha - a.fecha);
        resolve(mapas);
      };
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("IndexedDB Fetch Error:", error);
    return [];
  }
};

export const eliminarMapaOffline = async (id: string): Promise<boolean> => {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("IndexedDB Delete Error:", error);
    return false;
  }
};

export const eliminarMapasDeTerritorio = async (numero: string | number): Promise<boolean> => {
  try {
    const db = await getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const index = store.index("numero");

      const numStr = numero.toString();
      const numVal = Number(numero);

      // Buscamos y borramos usando cursores bajo la misma transacción
      const reqStr = index.openCursor(numStr);
      reqStr.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      const reqNum = index.openCursor(numVal);
      reqNum.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error("IndexedDB Delete Territory Maps Error:", error);
    return false;
  }
};
