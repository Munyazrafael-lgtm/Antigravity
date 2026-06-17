import { useState } from 'react';

export interface UIVisibilityState {
  showMap: boolean;
  setShowMap: (show: boolean) => void;
  showEditor: boolean;
  setShowEditor: (show: boolean) => void;
  showMapTypeSelector: boolean;
  setShowMapTypeSelector: (show: boolean) => void;
  showGallery: boolean;
  setShowGallery: (show: boolean) => void;
  showNotes: boolean;
  setShowNotes: (show: boolean) => void;
}

/**
 * Hook para gestionar la visibilidad de los distintos modales y vistas.
 */
export default function useUIVisibility(initialShowMap: boolean): UIVisibilityState {
  const [showMap, setShowMap] = useState(initialShowMap);
  const [showEditor, setShowEditor] = useState(false);
  const [showMapTypeSelector, setShowMapTypeSelector] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  return {
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
  };
}
