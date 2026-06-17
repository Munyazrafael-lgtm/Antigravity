import './App.css';
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import TerritoryList from './components/Map/TerritoryList';
import { TerritoryMap } from './components/Map/TerritoryMap';
import { EditorCanvas } from "./components/Map/EditorCanvas";
import WelcomeScreen from './components/WelcomeScreen/WelcomeScreen';
import MapTypeSelector from './components/Map/MapTypeSelector';
import SavedMapsGallery from './components/Map/SavedMapsGallery';
import { TerritoryNotes } from './components/Map/TerritoryNotes';

function App() {
  // Register Service Worker
  useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered');
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') r?.update();
      });
    },
    onRegisterError(e) {
      console.error('SW registration error', e);
    },
  });

  // Cargar nombre de usuario guardado en localStorage (si existe)
  const storedName = typeof window !== 'undefined' ? localStorage.getItem('userName') : null;
  const [userName, setUserName] = useState(storedName);

  // Cargar número de territorio guardado en localStorage (si existe)
  const storedTerritory = typeof window !== 'undefined' ? localStorage.getItem('territoryNumber') : null;
  const [territoryNumber, setTerritoryNumber] = useState(storedTerritory);

  // Cuando el nombre de usuario está disponible, cargar territorio por defecto
  // Si el usuario ya tiene nombre pero no hay territorio guardado, usar el predeterminado y guardarlo
  useEffect(() => {
    if (!territoryNumber) {
      setTerritoryNumber('1');
      localStorage.setItem('territoryNumber', '1');
    }
  }, []); // solo se ejecuta una vez al montar
  const handleNameSubmit = (name) => {
    console.log('Nombre ingresado:', name);
    // Guardar nombre en localStorage para futuras visitas
    localStorage.setItem('userName', name);
    setUserName(name);
    // Guardar territorio por defecto y persistirlo
    setTerritoryNumber('1');
    localStorage.setItem('territoryNumber', '1');
  };

  const handleTerritorySelect = (id) => {
    setTerritoryNumber(id);
    // Guardar el territorio seleccionado para próximas visitas
    localStorage.setItem('territoryNumber', id);
    setShowListMobile(false);
  };

  const [showListMobile, setShowListMobile] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showMapTypeSelector, setShowMapTypeSelector] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [selectedMapType, setSelectedMapType] = useState(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [editingTerritory, setEditingTerritory] = useState(null);
  const [editingNotesTerritory, setEditingNotesTerritory] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    let isMounted = true;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        if (isMounted) {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const handleEditMap = (territory) => {
    setEditingTerritory(territory);
    setShowMapTypeSelector(true);
  };

  const handleEditNotes = (territory) => {
    if (!territory) return;
    setEditingNotesTerritory(territory);
    setShowNotes(true);
  };

  const handleMapTypeSelect = async (type) => {
    if (type === 'gallery') {
      setShowMapTypeSelector(false);
      setShowGallery(true);
      return;
    }
    
    // Buscar si ya existe un mapa guardado para este territorio y tipo
    const { obtenerMapasOffline } = await import('./services/db');
    const mapasGuardados = await obtenerMapasOffline();
    const mapId = `${editingTerritory.numero}_${type}`;
    // Buscamos por id exacto o por si venía de un guardado antiguo
    const savedMap = mapasGuardados.find(m => m.id === mapId || (m.numero === editingTerritory.numero && m.tipo === type));

    if (savedMap) {
      setSelectedMapType(type);
      setEditingTerritory(savedMap);
      setShowMapTypeSelector(false);
      setShowEditor(true);
      return;
    }

    // type: 's' (satélite) or 'm' (map)
    const imgUrl = `${import.meta.env.BASE_URL}mapas/${editingTerritory?.numero ?? ''}${type}.jpg`;
    const mapaBase = { 
      ...editingTerritory, 
      id: mapId,
      tipo: type,
      imageDataUrl: imgUrl,
      mapaOriginal: imgUrl 
    };
    setSelectedMapType(type);
    setEditingTerritory(mapaBase);
    setShowMapTypeSelector(false);
    setShowEditor(true);
  };
  return (
    <div className="app-container">
      <div className="sidebar">
        {userName ? (
          <TerritoryList
            clientName={userName}
            selectedId={territoryNumber}
            onSelect={handleTerritorySelect}
            showOnMobile={showListMobile}
            onShowMap={() => setShowMap(true)}
            onEditMap={handleEditMap}
            onEditNotes={handleEditNotes}
          />
        ) : (
          <WelcomeScreen onNameSubmit={handleNameSubmit} />
        )}
      </div>
      <div className="map-container">
        {userName && showMap ? <TerritoryMap territoryNumber={territoryNumber} onMapLoad={setMapInstance} userLocation={userLocation} /> : null}
      </div>
      {showEditor && <EditorCanvas mapaBase={editingTerritory} onClose={() => setShowEditor(false)} />}
      {showNotes && editingNotesTerritory && (
        <TerritoryNotes
          territoryId={editingNotesTerritory.id || editingNotesTerritory.numero}
          territoryNumber={editingNotesTerritory.numero}
          onClose={() => setShowNotes(false)}
        />
      )}
      {showMapTypeSelector && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowMapTypeSelector(false)}>
          <div onClick={e => e.stopPropagation()}>
            <MapTypeSelector onSelect={handleMapTypeSelect} onCancel={() => setShowMapTypeSelector(false)} />
          </div>
        </div>
      )}
      {showGallery && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowGallery(false)}>
          <SavedMapsGallery 
            onClose={() => setShowGallery(false)}
            onSelectMap={(mapa) => {
              setEditingTerritory(mapa);
              setShowGallery(false);
              setShowEditor(true);
            }} 
          />
        </div>
      )}
    </div>
  );
}

export default App;