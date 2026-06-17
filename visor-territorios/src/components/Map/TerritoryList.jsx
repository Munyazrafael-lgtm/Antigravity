import { useEffect, useState } from 'react';
/* styles import removed - not used */
import { fetchTerritoriosPorCliente } from '../../services/territoriosService';

export const TerritoryList = ({ clientName, selectedId, onSelect, onShowMap, onEditMap, onEditNotes }) => {
/* mostrarMapa function removed - not used */
  const [territories, setTerritories] = useState([]);

  // Load territories when client name changes
  useEffect(() => {
    if (!clientName) {
      setTerritories([]);
      return;
    }
    const load = async () => {
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

  // Handler for edit button click (receives territory object)
  const handleEditClick = (territorio) => {
    if (!territorio) {
      alert('Seleccione un territorio primero');
      return;
    }
    onEditMap && onEditMap(territorio);
  };

  return (
    <div className="sidebar glass-card ">
      <h1 className="hero-title-small">Territorios de:</h1>
      <div className="control-group">
        <div className="assigned-user-display" style={{ padding: "0 0.75rem 1rem", background: "var(--bg-secondary)", color: "var(--text-primary)", fontWeight: 600, textAlign: "center", fontSize: "1.05rem", wordBreak: "break-word", display: "flex", justifyContent: "center", alignItems: "center", rowGap: "0.5rem", columnGap: "0.5rem" }}>
          <span>{clientName ? `${clientName} (${territories.length})` : 'Rafael Muñoz (2)'}</span>
        </div>
      </div>
      <div className="control-group fade-in">
        <div className="territory-list scrollbar-custom">
          {territories.map((t) => (
            <div key={t.id || t.numero} className={`territory-list-item ${selectedId == t.numero ? 'active' : ''}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} onClick={() => onSelect(t.numero)}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span className="territory-number">{t.numero}</span>
                <span className="territory-population">{t.poblacion}</span>
              </div>
              {selectedId == t.numero && (
                <button 
                  title="Editar Mapa" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditClick(t);
                  }}
                  style={{ 
                    background: "rgba(255, 255, 255, 0.9)", 
                    border: "none", 
                    borderRadius: "8px", 
                    width: "36px", 
                    height: "36px", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    cursor: "pointer",
                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                    fontSize: "1.1rem"
                  }}
                >
                  ✏️
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="fade-in" style={{ display: "flex", rowGap: "0.5rem", columnGap: "0.5rem", marginTop: "1rem" }}>
        <button className="action-button-square view-map-mobile-btn" title="Ver Mapa" style={{ flex: "1" }} onClick={() => onShowMap && onShowMap()}>
          <span>🔍</span> Ver Mapa
        </button>
      </div>
      <div className="actions-grid fade-in" style={{ marginTop: "auto" }}>
        <button className="action-button-square" title="Mi Ubicación"><span>📍</span> Ubicación</button>
        <button className="action-button-square" title="Ruta" onClick={() => {
          const selectedTerritory = territories.find(t => t.numero == selectedId);
          if (selectedTerritory && selectedTerritory.poblacion) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(selectedTerritory.poblacion)}`, '_blank');
          }
        }}><span>🚗</span> Ruta</button>
        <button className="action-button-square" title="Editar notas del territorio" onClick={() => {
          const selectedTerritory = territories.find(t => t.numero == selectedId);
          onEditNotes && onEditNotes(selectedTerritory);
        }}><span>✏️</span> Notas</button>
        <button className="action-button-square" title="Recargar la aplicación"><span>🔄</span> Recargar</button>
        <button className="action-button-square finish-button" title="Marcar como terminado"><span>✅</span> Territorio Terminado</button>
        <div className="version-indicator" style={{ textAlign: "center", fontSize: "0.7rem", opacity: 0.5, marginTop: "1rem", color: "var(--text-secondary)" }}>Versión 1.2.3</div>
      </div>
    </div>
  );
};

export default TerritoryList;
