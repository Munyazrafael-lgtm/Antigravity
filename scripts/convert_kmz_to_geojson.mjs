import AdmZip from 'adm-zip';
import { kml } from '@tmcw/togeojson';
import { DOMParser } from 'xmldom';
import fs from 'fs';
import path from 'path';

const KML_DIR = '../servidor/public/kml';
const GEOJSON_DIR = '../servidor/public/geojson';

if (!fs.existsSync(GEOJSON_DIR)) {
    fs.mkdirSync(GEOJSON_DIR, { recursive: true });
}

const files = fs.readdirSync(KML_DIR).filter(f => f.endsWith('.kmz'));

console.log(`Encontrados ${files.length} archivos KMZ. Iniciando conversión...`);

files.forEach(file => {
    try {
        const zip = new AdmZip(path.join(KML_DIR, file));
        const zipEntries = zip.getEntries();
        
        // El KML principal suele llamarse doc.kml en los KMZ
        const kmlEntry = zipEntries.find(e => e.entryName.endsWith('.kml'));
        
        if (!kmlEntry) {
            console.warn(`No se encontró archivo KML dentro de ${file}`);
            return;
        }

        const kmlContent = zip.readAsText(kmlEntry);
        const dom = new DOMParser().parseFromString(kmlContent, 'text/xml');
        const converted = kml(dom);
        
        const outputName = file.replace('.kmz', '.json');
        const outputPath = path.join(GEOJSON_DIR, outputName);
        fs.writeFileSync(outputPath, JSON.stringify(converted, null, 2));
        console.log(`✅ Convertido: ${file} -> ${outputName}`);

        // También actualizar la carpeta pwa/geojson si existe (para que los cambios sean inmediatos)
        const PWA_GEOJSON_DIR = '../servidor/public/pwa/geojson';
        if (fs.existsSync(PWA_GEOJSON_DIR)) {
            fs.writeFileSync(path.join(PWA_GEOJSON_DIR, outputName), JSON.stringify(converted, null, 2));
            console.log(`   └─ También actualizado en PWA`);
        }
    } catch (err) {
        console.error(`❌ Error en ${file}:`, err.message);
    }
});

console.log('--- Conversión finalizada ---');
