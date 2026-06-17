import { useState, useEffect, useMemo, type MouseEvent } from 'react';
import type { Territorio } from '../../types';
import { marcarTerritorioDevuelto } from '../../services/territoriosService';
import { abrirRutaAlTerritorio } from '../../services/routeService';
import { eliminarMapasDeTerritorio } from '../../services/db';
import { useModal } from '../../hooks/useModal';

interface ActionsBarProps {
  territories: Territorio[];
  selectedId: string | null;
  setTerritories: React.Dispatch<React.SetStateAction<Territorio[]>>;
  onLocateUser?: () => void;
  onEditNotes?: (territory: Territorio | undefined) => void;
  notesVersion?: number;
}

const ActionsBar: React.FC<ActionsBarProps> = ({ territories, selectedId, setTerritories, onLocateUser, onEditNotes, notesVersion }) => {
  const { showAlert, showConfirm } = useModal();

  const selectedTerritory = useMemo(
    () => territories.find(t => String(t.numero) === selectedId),
    [territories, selectedId]
  );

  const handleOpenRoute = async (): Promise<void> => {
    if (!selectedTerritory) {
      showAlert('Seleccione un territorio primero', 'Aviso');
      return;
    }
    await abrirRutaAlTerritorio(
      String(selectedTerritory.numero),
      selectedTerritory.poblacion,
      (msg) => showAlert(msg, 'Error')
    );
  };

  const handleFinish = async (e: MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.stopPropagation();
    if (!selectedTerritory) return;
    const confirmed = await showConfirm(
      `¿Seguro que quieres marcar el territorio ${selectedTerritory.numero} como terminado?`,
      'Confirmar devolución'
    );
    if (!confirmed) return;
    const today = new Date().toISOString().split('T')[0];
    try {
      await marcarTerritorioDevuelto(selectedTerritory.id || String(selectedTerritory.numero), today);
      await eliminarMapasDeTerritorio(selectedTerritory.numero);
      setTerritories(prev => prev.filter(t => t.numero !== selectedTerritory.numero));
    } catch (err) {
      console.error('Error marcando territorio', err);
    }
  };

  // Determinar el estado de notas para el botón
  const tieneAviso = selectedTerritory?.tieneAviso;
  const [tieneNotaLocal, setTieneNotaLocal] = useState(false);

  useEffect(() => {
    if (selectedTerritory) {
      setTieneNotaLocal(!!localStorage.getItem(`nota_personal_${selectedTerritory.id}`));
    } else {
      setTieneNotaLocal(false);
    }
  }, [selectedTerritory, notesVersion]);

  const renderNotesLabel = () => {
    if (tieneAviso) {
      return (
        <>
          <span className="warning-icon">⚠️</span>{' '}
          <span className="status-tag-aviso">¡Atención!</span>
        </>
      );
    }
    if (tieneNotaLocal) {
      return (
        <>
          <span>📝</span>{' '}
          <span className="status-tag-nota">Notas</span>
        </>
      );
    }
    return (
      <>
        <span>✏️</span>{' '}
        <span>Notas</span>
      </>
    );
  };

  return (
    <div className="actions-grid actions-grid-container fade-in">
      <button className="action-button-square" title="Mi Ubicación" onClick={() => onLocateUser && onLocateUser()}>
        <span>📍</span> Ubicación
      </button>
      <button className="action-button-square" title="Ruta" onClick={handleOpenRoute}>
        <span>🚗</span> Ruta
      </button>
      <button
        className="action-button-square"
        title="Editar notas del territorio"
        onClick={() => onEditNotes && onEditNotes(selectedTerritory)}
      >
        {renderNotesLabel()}
      </button>
      <button className="action-button-square" title="Recargar la aplicación" onClick={() => window.location.reload()}>
        <span>🔄</span> Recargar
      </button>
      <button className="action-button-square finish-button" title="Marcar como terminado" onClick={handleFinish}>
        <span>✅</span> Territorio Terminado
      </button>
      <div className="version-indicator">Versión {import.meta.env.VITE_APP_VERSION}</div>
    </div>
  );
};

export default ActionsBar;
