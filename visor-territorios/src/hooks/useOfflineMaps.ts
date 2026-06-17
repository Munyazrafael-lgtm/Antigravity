import { useEffect, useState, useRef } from "react";
import type { FeatureCollection } from "geojson";

/** Mapa de ID de territorio → su GeoJSON */
export type GeojsonDataMap = Record<string, FeatureCollection>;

/**
 * Hook para gestionar los mapas offline.
 * Carga el archivo GeoJSON del territorio solicitado bajo demanda y lo cachea
 * en memoria para acceso instantáneo en futuras selecciones.
 *
 * Antes se cargaban ~85 archivos en paralelo al montar la app, saturando la red
 * y retrasando el renderizado inicial. Ahora solo se carga el territorio activo.
 */
export default function useOfflineMaps(territoryNumber: string | null): { geojsonData: GeojsonDataMap } {
  const [geojsonData, setGeojsonData] = useState<GeojsonDataMap>({});
  const cacheRef = useRef<GeojsonDataMap>({});

  useEffect(() => {
    if (!territoryNumber) return;

    // Si ya está cacheado, añadirlo al estado si aún no está
    if (cacheRef.current[territoryNumber]) {
      setGeojsonData(prev => {
        if (prev[territoryNumber]) return prev;
        return { ...prev, [territoryNumber]: cacheRef.current[territoryNumber] };
      });
      return;
    }

    let active = true;

    const loadGeojson = async (): Promise<void> => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}geojson/${territoryNumber}.json`);
        if (response.ok && active) {
          const json = (await response.json()) as FeatureCollection;
          cacheRef.current[territoryNumber] = json;
          setGeojsonData(prev => ({ ...prev, [territoryNumber]: json }));
        }
      } catch (e) {
        console.error(`Error cargando GeoJSON del territorio ${territoryNumber}:`, e);
      }
    };

    loadGeojson();
    return () => { active = false; };
  }, [territoryNumber]);

  return { geojsonData };
}
