import { useRef, useState, useCallback, useEffect } from 'react';

const MAX_HISTORY = 5;

interface HistoryState {
  undo: string[];
  redo: string[];
}

export interface CanvasHistoryActions {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  saveToHistory: () => void;
  resetHistory: (initialState: string) => void;
}

/**
 * Hook para gestionar el historial de undo/redo del canvas.
 * Almacena snapshots comprimidos como Data URLs y expone acciones para navegar el historial.
 * También registra atajos de teclado globales (Ctrl+Z / Ctrl+Y).
 */
export default function useCanvasHistory(canvasRef: React.RefObject<HTMLCanvasElement | null>): CanvasHistoryActions {
  const historyRef = useRef<HistoryState>({ undo: [], redo: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveToHistory = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Guardamos como JPEG comprimido para ahorrar memoria (reducido de 16MB a ~300KB por snapshot)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    historyRef.current.undo.push(dataUrl);
    if (historyRef.current.undo.length > MAX_HISTORY) {
      historyRef.current.undo.shift();
    }
    historyRef.current.redo = [];

    setCanUndo(true);
    setCanRedo(false);
  }, [canvasRef]);

  const handleUndo = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.undo.length <= 1) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const currentState = historyRef.current.undo.pop()!;
    historyRef.current.redo.push(currentState);
    if (historyRef.current.redo.length > MAX_HISTORY) {
      historyRef.current.redo.shift();
    }

    const prevState = historyRef.current.undo[historyRef.current.undo.length - 1];
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = prevState;

    setCanUndo(historyRef.current.undo.length > 1);
    setCanRedo(true);
  }, [canvasRef]);

  const handleRedo = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.redo.length === 0) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    
    const nextState = historyRef.current.redo.pop()!;
    historyRef.current.undo.push(nextState);
    if (historyRef.current.undo.length > MAX_HISTORY) {
      historyRef.current.undo.shift();
    }

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = nextState;

    setCanUndo(true);
    setCanRedo(historyRef.current.redo.length > 0);
  }, [canvasRef]);

  const resetHistory = useCallback((initialState: string): void => {
    historyRef.current.undo = [initialState];
    historyRef.current.redo = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Atajos de teclado globales
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUndo, handleRedo]);

  return { canUndo, canRedo, handleUndo, handleRedo, saveToHistory, resetHistory };
}
