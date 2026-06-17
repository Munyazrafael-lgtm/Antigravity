import { useState, useEffect } from 'react';
import { obtenerNotas, guardarNotas } from '../../services/territoriosService';

export const TerritoryNotes = ({ territoryId, territoryNumber, onClose }) => {
  const [data, setData] = useState({ nota: '', aviso: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const notas = await obtenerNotas(territoryId);
      setData(notas);
      setLoading(false);
    };
    fetchData();
  }, [territoryId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await guardarNotas(territoryId, data);
      setIsEditing(false);
    } catch {
      alert("Error al guardar las notas.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="notes-modal-overlay">
        <div className="notes-modal-container glass-card">
          <div className="map-loading">Cargando datos...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-modal-overlay fade-in" onClick={() => !isEditing && onClose()}>
      <div className="notes-modal-container glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="notes-modal-header">
          <h2 className="editor-title">Editar: T-{territoryNumber}</h2>
          <button className="close-preview-btn" onClick={onClose}>❌</button>
        </div>

        <div className="notes-modal-content">
          <div className="note-field-group">
            <label className="control-label">⚠️ Aviso Importante</label>
            {isEditing ? (
              <textarea
                className="premium-input note-textarea aviso-style"
                value={data.aviso}
                onChange={(e) => setData({ ...data, aviso: e.target.value })}
                placeholder="Escribe aquí avisos (ej: Perro peligroso, no tocar timbre...)"
              />
            ) : (
              <div className={`note-display-box aviso-box ${!data.aviso ? 'empty' : ''}`}>
                {data.aviso || "Sin avisos registrados."}
              </div>
            )}
          </div>

          <div className="note-field-group">
            <label className="control-label">📝 Notas Generales</label>
            {isEditing ? (
              <textarea
                className="premium-input note-textarea"
                value={data.nota}
                onChange={(e) => setData({ ...data, nota: e.target.value })}
                placeholder="Escribe notas sobre el territorio..."
                rows={6}
              />
            ) : (
              <div className={`note-display-box ${!data.nota ? 'empty' : ''}`}>
                {data.nota || "Sin notas registradas."}
              </div>
            )}
          </div>
        </div>

        <div className="notes-modal-actions" style={{ flexDirection: 'row', rowGap: '0.5rem', columnGap: '0.5rem' }}>
          {isEditing ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button 
                className="action-button-square" 
                onClick={() => setIsEditing(false)} 
                disabled={saving}
              >
                Cancelar
              </button>
              <button 
                className="action-button-square finish-button" 
                onClick={handleSave} 
                disabled={saving}
                style={{ flex: 2 }}
              >
                {saving ? "Guardando..." : "💾 Guardar Cambios"}
              </button>
            </div>
          ) : (
            <>
              <button 
                className="action-button-square active reveal-button" 
                onClick={() => setIsEditing(true)} 
                style={{ flex: "1 1 0%" }}
                title="Editar nota"
              >
                ✏️ Editar Nota
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
