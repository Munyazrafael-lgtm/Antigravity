import { useEffect, useState, type MouseEvent } from 'react';
import { obtenerMapasOffline, eliminarMapaOffline } from '../../services/db';
import type { MapaOffline } from '../../types';
import { useModal } from '../../hooks/useModal';

interface SavedMapsGalleryProps {
  onSelectMap: (mapa: MapaOffline) => void;
  onClose: () => void;
}

export const SavedMapsGallery: React.FC<SavedMapsGalleryProps> = ({ onSelectMap, onClose }) => {
  const [mapas, setMapas] = useState<MapaOffline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMapas();
  }, []);

  const cargarMapas = async (): Promise<void> => {
    setLoading(true);
    const mapasGuardados = await obtenerMapasOffline();
    
    // Eliminar duplicados (obtenerMapasOffline ya los devuelve ordenados por fecha desc)
    const uniqueMaps: MapaOffline[] = [];
    const seen = new Set<string>();
    
    for (const mapa of mapasGuardados) {
      const key = `${mapa.numero}_${mapa.tipo || 'unknown'}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMaps.push(mapa);
      }
    }
    
    setMapas(uniqueMaps);
    setLoading(false);
  };

  const { showConfirm } = useModal();

  const handleEliminar = async (e: MouseEvent, id: string): Promise<void> => {
    e.stopPropagation();
    const confirmed = await showConfirm('¿Seguro que quieres eliminar este mapa guardado?', 'Eliminar Mapa');
    if (confirmed) {
      await eliminarMapaOffline(id);
      cargarMapas();
    }
  };

  return (
    <div className="notes-modal-container glass-card gallery-modal" onClick={(e: MouseEvent) => e.stopPropagation()}>
      <div className="notes-modal-header gallery-modal-header">
        <h2 className="editor-title">Mis Mapas Guardados</h2>
        <button className="action-button-square gallery-modal-close-btn" onClick={onClose}>Cerrar</button>
      </div>

      <div className="gallery-content-scroll scrollbar-custom">
        {loading ? (
          <div className="gallery-empty-state">Cargando mapas...</div>
        ) : mapas.length === 0 ? (
          <div className="gallery-empty-state">No hay mapas guardados aún.</div>
        ) : (
          <div className="gallery-grid">
            {mapas.map((mapa) => (
              <div key={mapa.id} className="territory-list-item gallery-item-card" onClick={() => onSelectMap(mapa)}>
                <div className="gallery-thumbnail-wrapper">
                  {mapa.imageDataUrl ? (
                    <img src={mapa.imageDataUrl} alt={`Mapa ${mapa.numero}`} className="gallery-thumbnail-img" />
                  ) : (
                    <div className="gallery-thumbnail-fallback">Sin imagen</div>
                  )}
                </div>
                <div className="gallery-item-footer">
                  <span className="gallery-item-title">Territorio {mapa.numero}</span>
                  <button className="action-button-square gallery-item-delete-btn" onClick={(e: MouseEvent<HTMLButtonElement>) => handleEliminar(e, mapa.id)} title="Eliminar mapa">🗑️</button>
                </div>
                <span className="gallery-item-date">
                  {new Date(mapa.fecha).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedMapsGallery;
