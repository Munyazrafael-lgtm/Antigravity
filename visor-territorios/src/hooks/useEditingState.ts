import { useState } from 'react';
import type { Territorio, MapaOffline } from '../types';
import type { MapMode } from '../components/Map/MapTypeSelector';
import { obtenerMapasOffline } from '../services/db';

export interface EditingState {
  editingTerritory: Territorio | MapaOffline | null;
  setEditingTerritory: (t: Territorio | MapaOffline | null) => void;
  editingNotesTerritory: Territorio | null;
  setEditingNotesTerritory: (t: Territorio | null) => void;
  handleEditMap: (territory: Territorio, onStartEditing: () => void) => void;
  handleEditNotes: (territory: Territorio | undefined, onStartNotes: () => void) => void;
  handleMapTypeSelect: (
    type: MapMode,
    onShowGallery: () => void,
    onShowEditor: () => void
  ) => Promise<void>;
}

/**
 * Hook para gestionar los territorios/mapas que están en edición o anotación.
 */
export default function useEditingState(): EditingState {
  const [editingTerritory, setEditingTerritory] = useState<Territorio | MapaOffline | null>(null);
  const [editingNotesTerritory, setEditingNotesTerritory] = useState<Territorio | null>(null);

  const handleEditMap = (territory: Territorio, onStartEditing: () => void): void => {
    setEditingTerritory(territory);
    onStartEditing();
  };

  const handleEditNotes = (territory: Territorio | undefined, onStartNotes: () => void): void => {
    if (!territory) return;
    setEditingNotesTerritory(territory);
    onStartNotes();
  };

  const handleMapTypeSelect = async (
    type: MapMode,
    onShowGallery: () => void,
    onShowEditor: () => void
  ): Promise<void> => {
    if (type === 'gallery') {
      onShowGallery();
      return;
    }

    const mapasGuardados = await obtenerMapasOffline();
    const mapId = `${editingTerritory?.numero}_${type}`;
    const savedMap = mapasGuardados.find(
      m => m.id === mapId || (m.numero === String(editingTerritory?.numero ?? '') && m.tipo === type)
    );

    if (savedMap) {
      setEditingTerritory(savedMap);
      onShowEditor();
      return;
    }

    const imgUrl = `${import.meta.env.BASE_URL}mapas/${editingTerritory?.numero ?? ''}${type}.jpg`;
    const mapaBase: MapaOffline = {
      id: mapId,
      numero: String(editingTerritory?.numero ?? ''),
      tipo: type as 'm' | 's',
      fecha: Date.now(),
      imageDataUrl: imgUrl,
      mapaOriginal: imgUrl,
    };
    setEditingTerritory(mapaBase);
    onShowEditor();
  };

  return {
    editingTerritory,
    setEditingTerritory,
    editingNotesTerritory,
    setEditingNotesTerritory,
    handleEditMap,
    handleEditNotes,
    handleMapTypeSelect,
  };
}
