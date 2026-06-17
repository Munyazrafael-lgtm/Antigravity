import type { FeatureCollection, Geometry, Position } from 'geojson';

/** Resultado de cálculo de centroide */
export interface Centroid {
  lat: number;
  lng: number;
}

/**
 * Extrae un centro/centroide representativo de datos GeoJSON.
 * Calcula la media aritmética de todas las coordenadas encontradas
 * en cualquier tipo de geometría (Point, LineString, Polygon, Multi*).
 */
export const getCentroidFromGeoJSON = (geojson: FeatureCollection | Record<string, unknown>): Centroid | null => {
  const lats: number[] = [];
  const lngs: number[] = [];

  const processGeometry = (geometry: Geometry | null | undefined): void => {
    if (!geometry) return;
    const { type, coordinates } = geometry as Geometry & { coordinates: unknown };
    if (type === 'Point') {
      const coords = coordinates as Position;
      if (Array.isArray(coords) && coords.length >= 2) {
        lngs.push(coords[0]);
        lats.push(coords[1]);
      }
    } else if (type === 'LineString' || type === 'MultiPoint') {
      const coords = coordinates as Position[];
      if (Array.isArray(coords)) {
        coords.forEach(coord => {
          if (Array.isArray(coord) && coord.length >= 2) {
            lngs.push(coord[0]);
            lats.push(coord[1]);
          }
        });
      }
    } else if (type === 'Polygon' || type === 'MultiLineString') {
      const coords = coordinates as Position[][];
      if (Array.isArray(coords)) {
        coords.forEach(ring => {
          if (Array.isArray(ring)) {
            ring.forEach(coord => {
              if (Array.isArray(coord) && coord.length >= 2) {
                lngs.push(coord[0]);
                lats.push(coord[1]);
              }
            });
          }
        });
      }
    } else if (type === 'MultiPolygon') {
      const coords = coordinates as Position[][][];
      if (Array.isArray(coords)) {
        coords.forEach(poly => {
          if (Array.isArray(poly)) {
            poly.forEach(ring => {
              if (Array.isArray(ring)) {
                ring.forEach(coord => {
                  if (Array.isArray(coord) && coord.length >= 2) {
                    lngs.push(coord[0]);
                    lats.push(coord[1]);
                  }
                });
              }
            });
          }
        });
      }
    }
  };

  const gj = geojson as Record<string, unknown>;
  if (gj && gj.type === 'FeatureCollection') {
    const features = gj.features as Array<{ geometry: Geometry }>;
    if (Array.isArray(features)) {
      features.forEach(feature => {
        if (feature) processGeometry(feature.geometry);
      });
    }
  } else if (gj && gj.type === 'Feature') {
    processGeometry((gj as { geometry: Geometry }).geometry);
  } else if (gj) {
    processGeometry(gj as unknown as Geometry);
  }

  if (lats.length === 0 || lngs.length === 0) return null;

  const avgLat = lats.reduce((sum, val) => sum + val, 0) / lats.length;
  const avgLng = lngs.reduce((sum, val) => sum + val, 0) / lngs.length;

  return { lat: avgLat, lng: avgLng };
};
