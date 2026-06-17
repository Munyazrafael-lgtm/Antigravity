import React, { useEffect, useState } from 'react';
import { obtenerMapasOffline, eliminarMapaOffline } from '../../services/db';

export const SavedMapsGallery = ({ onSelectMap, onClose }) => {
  const [mapas, setMapas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarMapas();
  }, []);

  const cargarMapas = async () => {
    setLoading(true);
    const mapasGuardados = await obtenerMapasOffline();
    
    // Eliminar duplicados (obtenerMapasOffline ya los devuelve ordenados por fecha desc)
    const uniqueMaps = [];
    const seen = new Set();
    
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

  const handleEliminar = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que quieres eliminar este mapa guardado?')) {
      await eliminarMapaOffline(id);
      cargarMapas();
    }
  };

  return (
    <div className="notes-modal-container glass-card" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '1.5rem' }} onClick={e => e.stopPropagation()}>
      <div className="notes-modal-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="editor-title">Mis Mapas Guardados</h2>
        <button className="action-button-square" onClick={onClose} style={{ padding: '0.5rem 1rem' }}>Cerrar</button>
      </div>

      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }} className="scrollbar-custom">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Cargando mapas...</div>
        ) : mapas.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No hay mapas guardados aún.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {mapas.map((mapa) => (
              <div key={mapa.id} className="territory-list-item" style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', gap: '0.5rem', cursor: 'pointer' }} onClick={() => onSelectMap(mapa)}>
                <div style={{ width: '100%', height: '120px', borderRadius: '8px', overflow: 'hidden', background: 'var(--bg-primary)' }}>
                  {mapa.imageDataUrl ? (
                    <img src={mapa.imageDataUrl} alt={`Mapa ${mapa.numero}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>Sin imagen</div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Territorio {mapa.numero}</span>
                  <button className="action-button-square" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#fee2e2', color: '#ef4444', border: 'none' }} onClick={(e) => handleEliminar(e, mapa.id)} title="Eliminar mapa">🗑️</button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
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
