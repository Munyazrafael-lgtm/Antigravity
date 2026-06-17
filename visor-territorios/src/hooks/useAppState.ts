import { useState } from 'react';
import type { Territorio } from '../types';
import type { MapMode } from '../components/Map/MapTypeSelector';
import useUIVisibility from './useUIVisibility';
import useUserSession from './useUserSession';
import useUserLocation from './useUserLocation';
import useEditingState from './useEditingState';

/**
 * Hook orquestador principal que compone hooks de dominio específicos:
 * - useUIVisibility (modales y vistas)
 * - useUserSession (usuario y territorio seleccionado)
 * - useUserLocation (geolocalización)
 * - useEditingState (estado de edición y galería)
 */
export default function useAppState() {
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Determinar si hay datos guardados (solo se evalúa una vez al montar)
  const [initialHasSession] = useState(() =>
    !!localStorage.getItem('userName') || !!localStorage.getItem('territoryNumber')
  );

  const [notesVersion, setNotesVersion] = useState(0);

  // Componer hooks específicos
  const ui = useUIVisibility(initialHasSession);
  const session = useUserSession(() => {
    ui.setShowMap(true);
  });
  const location = useUserLocation();
  const editing = useEditingState();

  const handleNameSubmit = (name: string): void => {
    session.handleNameSubmit(name);
  };

  const handleTerritorySelect = (id: string): void => {
    session.handleTerritorySelect(id);
  };

  const handleLocateUser = (): void => {
    location.handleLocateUser(mapInstance, () => {
      ui.setShowMap(true);
    });
  };

  const handleEditMap = (territory: Territorio): void => {
    editing.handleEditMap(territory, () => {
      ui.setShowMapTypeSelector(true);
    });
  };

  const handleEditNotes = (territory: Territorio | undefined): void => {
    editing.handleEditNotes(territory, () => {
      ui.setShowNotes(true);
    });
  };

  const handleMapTypeSelect = async (type: MapMode): Promise<void> => {
    await editing.handleMapTypeSelect(
      type,
      () => {
        ui.setShowMapTypeSelector(false);
        ui.setShowGallery(true);
      },
      () => {
        ui.setShowMapTypeSelector(false);
        ui.setShowEditor(true);
      }
    );
  };

  return {
    // Sesión
    userName: session.userName,
    territoryNumber: session.territoryNumber,
    geojsonData: session.geojsonData,

    // Visibilidad UI
    showMap: ui.showMap,
    setShowMap: ui.setShowMap,
    showEditor: ui.showEditor,
    setShowEditor: ui.setShowEditor,
    showMapTypeSelector: ui.showMapTypeSelector,
    setShowMapTypeSelector: ui.setShowMapTypeSelector,
    showGallery: ui.showGallery,
    setShowGallery: ui.setShowGallery,
    showNotes: ui.showNotes,
    setShowNotes: ui.setShowNotes,

    // Instancia mapa
    mapInstance,
    setMapInstance,

    // Edición
    editingTerritory: editing.editingTerritory,
    setEditingTerritory: editing.setEditingTerritory,
    editingNotesTerritory: editing.editingNotesTerritory,
    userLocation: location.userLocation,

    // Notes reactivity
    notesVersion,
    triggerNotesRefresh: () => setNotesVersion(v => v + 1),

    // Handlers
    handleNameSubmit,
    handleTerritorySelect,
    handleLocateUser,
    handleEditMap,
    handleEditNotes,
    handleMapTypeSelect,
  };
}
