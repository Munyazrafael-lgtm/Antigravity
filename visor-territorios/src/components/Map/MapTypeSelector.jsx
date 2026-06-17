import React from 'react';

export const MapTypeSelector = ({ onSelect, onCancel }) => {
  return (
    <div className="notes-modal-container glass-card" style={{ maxWidth: '350px', padding: '2rem' }} onClick={e => e.stopPropagation()}>
      <div className="notes-modal-header" style={{ marginBottom: '1.5rem', justifyContent: 'center', display: 'flex' }}>
        <h2 className="editor-title">¿Qué modo quieres editar?</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', rowGap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'row', columnGap: '1rem' }}>
          <button
            className="action-button-square active reveal-button"
            style={{ padding: '1.25rem', fontSize: '1.1rem', flex: 1 }}
            onClick={() => onSelect('m')}
          >
            🗺️ Callejero
          </button>
          <button
            className="action-button-square active reveal-button"
            style={{ padding: '1.25rem', fontSize: '1.1rem', flex: 1 }}
            onClick={() => onSelect('s')}
          >
            🛰️ Satélite
          </button>
        </div>
        <button
          className="action-button-square"
          style={{ padding: '1.25rem', fontSize: '1.1rem', marginTop: '0.5rem', background: 'var(--bg-secondary)', border: '2px dashed var(--accent-blue)', color: 'var(--accent-blue)' }}
          onClick={() => onSelect('gallery')}
        >
          📁 Mis Mapas Guardados
        </button>
        <button
          className="action-button-square"
          style={{ marginTop: '0.5rem', opacity: 0.7 }}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default MapTypeSelector;
