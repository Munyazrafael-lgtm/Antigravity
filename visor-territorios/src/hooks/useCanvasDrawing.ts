import { useState, useCallback, useRef, type RefObject } from 'react';

interface DrawingHandlers {
  startDrawing: (e: React.MouseEvent | React.TouchEvent) => void;
  draw: (e: React.MouseEvent | React.TouchEvent) => void;
  stopDrawing: () => void;
}

/**
 * Hook para gestionar eventos de dibujo sobre un canvas (mouse + touch).
 * Convierte coordenadas de pantalla a coordenadas del canvas teniendo en cuenta
 * el escalado CSS (zoom) y devuelve handlers listos para asignar a eventos JSX.
 */
export default function useCanvasDrawing(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  isPanning: boolean,
  isReady: boolean,
  onStrokeEnd: () => void
): DrawingHandlers {
  const [isDrawing, setIsDrawing] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);

  const getCoordinates = useCallback((e: React.MouseEvent | React.TouchEvent, rect: DOMRect): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX: number, clientY: number;
    if ('touches' in e && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      const me = e as React.MouseEvent;
      clientX = me.clientX;
      clientY = me.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, [canvasRef]);

  const startDrawing = useCallback((e: React.MouseEvent | React.TouchEvent): void => {
    if (isPanning || !isReady) return;
    if ('touches' in e && e.touches && e.touches.length > 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    rectRef.current = rect;

    e.preventDefault();
    const { x, y } = getCoordinates(e, rect);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  }, [canvasRef, isPanning, isReady, getCoordinates]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent): void => {
    if (!isDrawing || isPanning || !rectRef.current) return;
    if ('touches' in e && e.touches && e.touches.length > 1) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e, rectRef.current);
    const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
  }, [canvasRef, isDrawing, isPanning, getCoordinates]);

  const stopDrawing = useCallback((): void => {
    if (isDrawing) {
      const ctx = canvasRef.current?.getContext('2d', { willReadFrequently: true });
      if (ctx) ctx.closePath();
      setIsDrawing(false);
      rectRef.current = null;
      onStrokeEnd();
    }
  }, [canvasRef, isDrawing, onStrokeEnd]);

  return { startDrawing, draw, stopDrawing };
}
