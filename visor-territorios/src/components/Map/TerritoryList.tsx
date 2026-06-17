import { useEffect, useState, type MouseEvent } from 'react';
import { fetchTerritoriosPorCliente } from '../../services/territoriosService';
import type { Territorio } from '../../types';
import { useModal } from '../../hooks/useModal';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import ActionsBar from './ActionsBar';

interface TerritoryListProps {
  clientName: string;
  selectedId: string | null;
  onSelect: (numero: string) => void;
  onShowMap?: () => void;
  onEditMap?: (territory: Territorio) => void;
  onEditNotes?: (territory: Territorio | undefined) => void;
  onLocateUser?: () => void;
  notesVersion?: number;
}

const TerritoryList: React.FC<TerritoryListProps> = ({ clientName, selectedId, onSelect, onShowMap, onEditMap, onEditNotes, onLocateUser, notesVersion }) => {
  const [territories, setTerritories] = useState<Territorio[]>([]);

  // Load territories when client name changes
  useEffect(() => {
    if (!clientName) {
      setTerritories([]);
      return;
    }
    const load = async (): Promise<void> => {
      try {
        const { territorios } = await fetchTerritoriosPorCliente(clientName);
        setTerritories(territorios);
      } catch (err) {
        console.error('Error cargando territorios:', err);
        setTerritories([]);
      }
    };
    load();
  }, [clientName]);

  const { showAlert } = useModal();

  // Handler for edit button click (receives territory object)
  const handleEditClick = (territorio: Territorio): void => {
    if (!territorio) {
      showAlert('Seleccione un territorio primero', 'Aviso');
      return;
    }
    onEditMap && onEditMap(territorio);
  };

  const isOnline = useOnlineStatus();

  return (
    <>
      <div className="territory-header">
        <h1 className="hero-title-small margin-0">Territorios:</h1>
        <div className={`connectivity-badge ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Conexión activa' : 'Trabajando sin conexión'}>
          <span className="status-dot"></span>
          <span>{isOnline ? 'En línea' : 'Sin red'}</span>
        </div>
      </div>
      <div className="control-group">
        <div className="assigned-user-display">
          <span>{`${clientName} (${territories.length})`}</span>
        </div>
      </div>
      <div className="control-group fade-in">
        <div className="territory-list scrollbar-custom">
          {territories.map((t) => (
            <div key={t.id || t.numero} className={`territory-list-item territory-list-item-wrapper ${selectedId === String(t.numero) ? 'active' : ''}`} onClick={() => onSelect(String(t.numero))}>
              <div className="territory-item-info">
                <span className="territory-number">{t.numero}</span>
                <span className="territory-population">{t.poblacion}</span>
              </div>
              {selectedId === String(t.numero) && (
                <>
                  <button 
                    title="Editar Mapa" 
                    className="territory-item-action-btn"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      handleEditClick(t);
                    }}
                  >
                    ✏️
                  </button>
                  <button 
                    title="Ver Mapa"
                    className="territory-item-action-btn"
                    onClick={(e: MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onShowMap && onShowMap();
                    }}
                  >
                    <span>🔍</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
      <ActionsBar
        territories={territories}
        selectedId={selectedId}
        setTerritories={setTerritories}
        onLocateUser={onLocateUser}
        onEditNotes={onEditNotes}
        notesVersion={notesVersion}
      />
    </>
  );
};

export default TerritoryList;
