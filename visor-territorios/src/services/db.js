const DB_NAME = "MapasOfflineDB";
const DB_VERSION = 2;
const STORE_NAME = "mapas";

export const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      let store;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
      } else {
        store = e.currentTarget.transaction.objectStore(STORE_NAME);
      }
      
      if (!store.indexNames.contains("numero")) {
        store.createIndex("numero", "numero", { unique: false });
      }
    };
    
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

export const guardarMapaOffline = async (territorioData) => {
  try {
    // Si se guarda o actualiza el mapa, lo eliminamos de la lista de borrados para que pueda volver a sincronizarse si es necesario
    const deletedMaps = JSON.parse(localStorage.getItem('deletedOfflineMaps') || '[]');
    const updatedDeleted = deletedMaps.filter(id => id !== territorioData.id);
    localStorage.setItem('deletedOfflineMaps', JSON.stringify(updatedDeleted));

    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(territorioData);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error("IndexedDB Save Error:", error);
    return false;
  }
};

export const obtenerMapasOffline = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = () => {
        // Ordenamos los mapas por fecha de guardado (los más nuevos primero)
        const mapas = request.result || [];
        mapas.sort((a, b) => b.fecha - a.fecha);
        resolve(mapas);
      };
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error("IndexedDB Fetch Error:", error);
    return [];
  }
};

export const eliminarMapaOffline = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (error) {
    console.error("IndexedDB Delete Error:", error);
    return false;
  }
};

export const eliminarMapasDeTerritorio = async (numero) => {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const index = store.index("numero");
    
    // Buscamos tanto por String como por Number para evitar fallos de tipo en IndexedDB
    const keysSet = new Set();
    const stringKeyReq = index.getAllKeys(numero.toString());
    const numberKeyReq = index.getAllKeys(Number(numero));

    await Promise.all([
      new Promise(resolve => { stringKeyReq.onsuccess = () => { (stringKeyReq.result || []).forEach(k => keysSet.add(k)); resolve(); }; }),
      new Promise(resolve => { numberKeyReq.onsuccess = () => { (numberKeyReq.result || []).forEach(k => keysSet.add(k)); resolve(); }; })
    ]);

    const keys = Array.from(keysSet);
    if (keys.length === 0) return true;

    await Promise.all(keys.map(key => new Promise((resolve, reject) => {
      const delReq = store.delete(key);
      delReq.onsuccess = () => resolve();
      delReq.onerror = (e) => reject(e.target.error);
    })));
    
    return true;
  } catch (error) {
    console.error("IndexedDB Delete Territory Maps Error:", error);
    return false;
  }
};
