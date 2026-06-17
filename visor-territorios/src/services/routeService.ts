import { getCentroidFromGeoJSON } from '../utils/geojson';
import type { FeatureCollection } from 'geojson';

/**
 * Abre Google Maps con una ruta al centroide del GeoJSON de un territorio.
 * Abre la pestaña de forma síncrona para evitar el bloqueo de popups del navegador,
 * y redirige una vez calculado el destino.
 *
 * @param numero      Número del territorio
 * @param poblacion   Nombre de la población (fallback si el GeoJSON falla)
 * @param onError     Callback para errores que necesitan ser mostrados al usuario
 */
export async function abrirRutaAlTerritorio(
  numero: string,
  poblacion: string | undefined,
  onError: (message: string) => void,
  cachedGeoJson?: FeatureCollection
): Promise<void> {
  // Abrimos la pestaña inmediatamente de forma síncrona para evitar el bloqueo de ventanas emergentes
  const newTab = window.open('', '_blank');
  if (newTab) {
    newTab.document.write(
      '<p style="font-family: sans-serif; text-align: center; margin-top: 20%; color: #666; font-size: 1.2rem;">Cargando ruta en Google Maps...</p>'
    );
  }

  try {
    let data: FeatureCollection;
    if (cachedGeoJson) {
      data = cachedGeoJson;
    } else {
      const geojsonUrl = `${import.meta.env.BASE_URL}geojson/${numero}.json`;
      const response = await fetch(geojsonUrl);
      if (!response.ok) {
        throw new Error(`No se pudo cargar el archivo GeoJSON para el territorio ${numero}`);
      }
      data = await response.json();
    }
    const centroid = getCentroidFromGeoJSON(data);
    if (centroid) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${centroid.lat},${centroid.lng}`;
      if (newTab) {
        newTab.location.href = mapsUrl;
      } else {
        window.open(mapsUrl, '_blank');
      }
    } else {
      throw new Error('No se encontraron coordenadas válidas en el GeoJSON');
    }
  } catch (err) {
    console.error('Error calculando ruta desde GeoJSON:', err);
    // Fallback a la población si existe
    if (poblacion) {
      const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(poblacion)}`;
      if (newTab) {
        newTab.location.href = fallbackUrl;
      } else {
        window.open(fallbackUrl, '_blank');
      }
    } else {
      if (newTab) newTab.close();
      onError('No se pudo determinar la ubicación del territorio.');
    }
  }
}
