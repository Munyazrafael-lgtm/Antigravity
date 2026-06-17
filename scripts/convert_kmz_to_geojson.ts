// convert_kmz_to_geojson.ts
// Conversión de archivos KMZ a GeoJSON usando TypeScript.
// Mantiene la misma lógica que el script original pero con tipos básicos.

import AdmZip from 'adm-zip';
import { kml } from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';
import fs from 'fs';
import path from 'path';

// Rutas absolutas basadas en la ubicación del archivo compilado
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const KML_DIR: string = path.join(PROJECT_ROOT, 'visor-territorios', 'kml');
const GEOJSON_DIR: string = path.join(PROJECT_ROOT, 'visor-territorios', 'public', 'geojson');

const DIST_DIR: string = path.join(PROJECT_ROOT, 'servidor', 'dist');
const DIST_GEOJSON_DIR: string = path.join(DIST_DIR, 'geojson');
const missing: string[] = [];


// Aseguramos que los directorios de salida existan
if (!fs.existsSync(GEOJSON_DIR)) {
  fs.mkdirSync(GEOJSON_DIR, { recursive: true });
}

if (fs.existsSync(DIST_DIR) && !fs.existsSync(DIST_GEOJSON_DIR)) {
  fs.mkdirSync(DIST_GEOJSON_DIR, { recursive: true });
}

// Lista de archivos *.kmz en la carpeta de origen
const files: string[] = fs
  .readdirSync(KML_DIR)
  .filter((f: string) => f.endsWith('.kmz'));

console.log(`Encontrados ${files.length} archivos KMZ. Iniciando conversión...`);

files.forEach((file: string) => {
  try {
    const zip: AdmZip = new AdmZip(path.join(KML_DIR, file));
    const zipEntries = zip.getEntries();

    // El KML principal suele llamarse doc.kml en los KMZ
    const kmlEntry = zipEntries.find((e) => e.entryName.toLowerCase().endsWith('.kml'));

    if (!kmlEntry) {
      console.warn(`No se encontró archivo KML dentro de ${file}`);
      return;
    }

    const kmlContent: string = zip.readAsText(kmlEntry);
    const dom = new DOMParser().parseFromString(kmlContent, 'text/xml');
    const converted = kml(dom);

    const outputName: string = file.replace('.kmz', '.json');
    const outputPath: string = path.join(GEOJSON_DIR, outputName);
    fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
    console.log(`✅ Convertido: ${file} -> ${outputName}`);

    // Copiar al directorio de despliegue si existe
    if (fs.existsSync(DIST_GEOJSON_DIR)) {
      const distOutputPath: string = path.join(DIST_GEOJSON_DIR, outputName);
      fs.writeFileSync(distOutputPath, JSON.stringify(converted, null, 2));
    }
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const message = (err as any).message ?? err;
    console.error(`❌ Error en ${file}:`, message);
    missing.push(file);
  }
});

// Report any files that were not converted
if (missing.length) {
  console.warn(`⚠️ ${missing.length} archivo(s) no se convirtieron:`);
  missing.forEach((f) => console.warn(`  - ${f}`));
}

console.log('--- Conversión finalizada ---');
