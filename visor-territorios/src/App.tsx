import './App.css';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import TerritoryList from './components/Map/TerritoryList';
import { TerritoryMap } from './components/Map/TerritoryMap';
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import type { MapaOffline } from './types';
import useAppState from './hooks/useAppState';

// Carga perezosa (lazy load) para dividir el bundle principal
const EditorCanvas = lazy(() => import('./components/Map/EditorCanvas').then(m => ({ default: m.EditorCanvas })));
const MapTypeSelector = lazy(() => import('./components/Map/MapTypeSelector').then(m => ({ default: m.MapTypeSelector })));
const SavedMapsGallery = lazy(() => import('./components/Map/SavedMapsGallery').then(m => ({ default: m.SavedMapsGallery })));
const TerritoryNotes = lazy(() => import('./components/Map/TerritoryNotes').then(m => ({ default: m.TerritoryNotes })));

function App() {
  const {
    userName,
    territoryNumber,
    geojsonData,
    showMap,
    setShowMap,
    showEditor,
    setShowEditor,
    showMapTypeSelector,
    setShowMapTypeSelector,
    showGallery,
    setShowGallery,
    showNotes,
    setShowNotes,
    setMapInstance,
    editingTerritory,
    setEditingTerritory,
    editingNotesTerritory,
    userLocation,
    notesVersion,
    triggerNotesRefresh,
    handleNameSubmit,
    handleTerritorySelect,
    handleLocateUser,
    handleEditMap,
    handleEditNotes,
    handleMapTypeSelect,
  } = useAppState();

  // Refs para limpiar listeners del SW al desmontar
  const swIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const swVisibilityHandlerRef = useRef<(() => void) | null>(null);

  // Register Service Worker (autoUpdate: se activa solo sin esperar confirmación)
  useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: v' + (import.meta.env.VITE_APP_VERSION || '?'));
      if (swVisibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', swVisibilityHandlerRef.current);
      }
      if (swIntervalRef.current) {
        clearInterval(swIntervalRef.current);
      }
      const handler = (): void => {
        if (document.visibilityState === 'visible') r?.update();
      };
      document.addEventListener('visibilitychange', handler);
      swVisibilityHandlerRef.current = handler;
      swIntervalRef.current = setInterval(() => r?.update(), 3 * 60 * 1000);
    },
    onRegisterError(e) {
      console.error('SW registration error', e);
    },
  });

  // Cleanup de los listeners del SW al desmontar el componente
  useEffect(() => {
    return () => {
      if (swVisibilityHandlerRef.current) {
        document.removeEventListener('visibilitychange', swVisibilityHandlerRef.current);
      }
      if (swIntervalRef.current) {
        clearInterval(swIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`app-container ${showMap ? 'show-mobile-map' : ''}`}>
      <div className="sidebar">
        {userName ? (
          <TerritoryList
            clientName={userName}
            selectedId={territoryNumber}
            onSelect={handleTerritorySelect}
            onShowMap={() => setShowMap(true)}
            onEditMap={handleEditMap}
            onEditNotes={handleEditNotes}
            onLocateUser={handleLocateUser}
            notesVersion={notesVersion}
          />
        ) : (
          <WelcomeScreen onNameSubmit={handleNameSubmit} />
        )}
      </div>
      <div className="map-container">
        {userName && showMap ? (
          <>
            <button className="back-mobile-btn" onClick={() => setShowMap(false)}>
              <span>⬅️</span> Volver a la lista
            </button>
            <TerritoryMap territoryNumber={territoryNumber!} onMapLoad={setMapInstance} userLocation={userLocation} geojsonData={geojsonData} />
          </>
        ) : null}
      </div>
      <Suspense fallback={<div className="map-loading">Cargando módulo...</div>}>
        {showEditor && <EditorCanvas mapaBase={editingTerritory as MapaOffline} onClose={() => setShowEditor(false)} />}
        {showNotes && editingNotesTerritory && (
          <TerritoryNotes
            territoryId={editingNotesTerritory.id || String(editingNotesTerritory.numero)}
            territoryNumber={editingNotesTerritory.numero}
            onClose={(saved) => {
              setShowNotes(false);
              if (saved === true) triggerNotesRefresh();
            }}
          />
        )}
        {showMapTypeSelector && (
          <div className="modal-overlay-backdrop" onClick={() => setShowMapTypeSelector(false)}>
            <div onClick={e => e.stopPropagation()}>
              <MapTypeSelector onSelect={handleMapTypeSelect} onCancel={() => setShowMapTypeSelector(false)} />
            </div>
          </div>
        )}
        {showGallery && (
          <div className="modal-overlay-backdrop" onClick={() => setShowGallery(false)}>
            <SavedMapsGallery 
              onClose={() => setShowGallery(false)}
              onSelectMap={(mapa: MapaOffline) => {
                setEditingTerritory(mapa);
                setShowGallery(false);
                setShowEditor(true);
              }} 
            />
          </div>
        )}
      </Suspense>
    </div>
  );
}

export default App;
