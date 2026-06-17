import { useEffect, useState } from "react";

/**
 * Hook para gestionar los mapas offline.
 * Carga los archivos GeoJSON desde la carpeta pública y los almacena en estado.
 */
export default function useOfflineMaps() {
  const [geojsonData, setGeojsonData] = useState({});

  // Carga todos los archivos .json del directorio public/geojson
  useEffect(() => {
    const loadGeojson = async () => {
      try {
        // Lista de archivos conocidos (puedes ampliarla según sea necesario)
        const files = [
          "0.json","1.json","2.json","3.json","4.json","5.json","6.json","7.json","8.json","9.json",
          "10.json","11.json","12.json","13.json","14.json","15.json","101.json","102.json","103.json",
          "104.json","105.json","106.json","107.json","108.json","109.json","110.json","111.json",
          "112.json","113.json","114.json","115.json","116.json","117.json","118.json","119.json",
          "120.json","121.json","122.json","123.json","131.json","132.json","133.json","201.json",
          "202.json","203.json","204.json","205.json","206.json","207.json","208.json","209.json",
          "210.json","211.json","212.json","213.json","214.json","215.json","301.json","302.json",
          "303.json","304.json","305.json","306.json","307.json","308.json","309.json","310.json",
          "311.json","312.json","313.json","314.json","321.json","322.json","323.json","324.json",
          "326.json","401.json","402.json","403.json","404.json","405.json","406.json","407.json",
          "408.json","409.json","410.json","411.json","412.json","413.json","414.json","421.json",
          "422.json","423.json","424.json","425.json","431.json","451.json","452.json"
        ];

        const data = {};
        await Promise.all(
          files.map(async (file) => {
            const response = await fetch(`/geojson/${file}`);
            if (response.ok) {
              const json = await response.json();
              data[file.replace(".json", "")] = json;
            }
          })
        );
        setGeojsonData(data);
      } catch (e) {
        console.error("Error cargando mapas offline:", e);
      }
    };

    loadGeojson();
  }, []);

  return { geojsonData };
}