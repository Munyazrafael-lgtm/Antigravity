import { useState, useEffect } from 'react';
import { obtenerNotas, guardarNotas } from '../../services/territoriosService';
import { useModal } from '../../hooks/useModal';

interface TerritoryNotesProps {
  territoryId: string;
  territoryNumber: string | number;
  onClose: (saved?: boolean) => void;
}

interface NotesData {
  nota: string;
  aviso: string;
}

export const TerritoryNotes: React.FC<TerritoryNotesProps> = ({ territoryId, territoryNumber, onClose }) => {
  const [data, setData] = useState<NotesData>({ nota: '', aviso: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      setLoading(true);
      const notas = await obtenerNotas(territoryId);
      const notaLocal = localStorage.getItem(`nota_personal_${territoryId}`) || '';
      setData({
        aviso: notas.aviso || '',
        nota: notaLocal
      });
      setLoading(false);
    };
    fetchData();
  }, [territoryId]);

  const { showAlert } = useModal();

  const handleSave = async (): Promise<void> => {
    setSaving(true);
    try {
      // Guardar el aviso en Firestore y limpiar/eliminar la nota global compartida
      await guardarNotas(territoryId, { ...data, nota: '' });
      // Guardar la nota personal únicamente de forma local en el dispositivo
      localStorage.setItem(`nota_personal_${territoryId}`, data.nota);
      onClose(true); 
    } catch {
      await showAlert("Error al guardar las notas.", "Error");
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
    <div className="notes-modal-overlay fade-in">
      <div className="notes-modal-container glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="notes-modal-header">
          <h2 className="editor-title">Editar: T-{territoryNumber}</h2>
        </div>

        <div className="notes-modal-content">
          <div className="note-field-group">
            <label className="control-label">⚠️ Aviso Importante</label>
            <textarea
              className="premium-input note-textarea aviso-style"
              value={data.aviso}
              onChange={(e) => setData({ ...data, aviso: e.target.value })}
              placeholder="Escribe aquí avisos (ej: Perro peligroso, no tocar timbre...)"
            />
          </div>

          <div className="note-field-group">
            <label className="control-label">📝 Notas personales</label>
            <textarea
              className="premium-input note-textarea"
              value={data.nota}
              onChange={(e) => setData({ ...data, nota: e.target.value })}
              placeholder="Escribe aquí tus notas personales (solo se guardan en este dispositivo)..."
              rows={6}
            />
          </div>
        </div>

        <div className="fade-in notes-action-container" onClick={(e) => e.stopPropagation()}>
          <button className="action-button-square" onClick={() => onClose(false)} disabled={saving}>Cancelar</button>
          <button className="action-button-square finish-button notes-save-btn" onClick={handleSave} disabled={saving}>{saving ? "Guardando..." : "💾 Guardar Cambios"}</button>
        </div>

      </div>

    </div>


  );
};

export default TerritoryNotes;
