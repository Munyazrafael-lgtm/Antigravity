import { useRef, useState, useCallback, useEffect } from 'react';

const MAX_HISTORY = 5;

interface HistoryState {
  undo: ImageData[];
  redo: ImageData[];
}

export interface CanvasHistoryActions {
  canUndo: boolean;
  canRedo: boolean;
  handleUndo: () => void;
  handleRedo: () => void;
  saveToHistory: () => void;
  resetHistory: (initialState: ImageData) => void;
}

/**
 * Hook para gestionar el historial de undo/redo del canvas.
 * Almacena snapshots de ImageData y expone acciones para navegar el historial.
 * También registra atajos de teclado globales (Ctrl+Z / Ctrl+Y).
 */
export default function useCanvasHistory(canvasRef: React.RefObject<HTMLCanvasElement | null>): CanvasHistoryActions {
  const historyRef = useRef<HistoryState>({ undo: [], redo: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveToHistory = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    historyRef.current.undo.push(imgData);
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
    ctx.putImageData(prevState, 0, 0);

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

    ctx.putImageData(nextState, 0, 0);

    setCanUndo(true);
    setCanRedo(historyRef.current.redo.length > 0);
  }, [canvasRef]);

  const resetHistory = useCallback((initialState: ImageData): void => {
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
