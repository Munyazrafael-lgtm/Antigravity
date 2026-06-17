import { useRef, useState, useEffect, useMemo, useCallback, type ReactElement } from 'react';
import { guardarMapaOffline } from '../../services/db';
import type { MapaOffline } from '../../types';
import { useModal } from '../../hooks/useModal';
import useCanvasHistory from '../../hooks/useCanvasHistory';
import useCanvasDrawing from '../../hooks/useCanvasDrawing';
import EditorToolbar from './EditorToolbar';

type LoadingState = 'loading' | 'ready' | 'error';

interface EditorCanvasProps {
  mapaBase: MapaOffline;
  onClose: (success: boolean) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ mapaBase, onClose }): ReactElement => {
  const { showAlert, showConfirm } = useModal();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const [lazoColor, setLazoColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(true);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [eraserPattern, setEraserPattern] = useState<CanvasPattern | null>(null);

  // Refs para mantener las imágenes cargadas y evitar recargas en efectos secundarios
  const loadedImgActualRef = useRef<HTMLImageElement | null>(null);
  const loadedImgOriRef = useRef<HTMLImageElement | null>(null);

  // Historial de cambios
  const history = useCanvasHistory(canvasRef);

  // Eventos de dibujo
  const { startDrawing, draw, stopDrawing } = useCanvasDrawing(
    canvasRef,
    isPanning,
    loadingState === 'ready',
    history.saveToHistory
  );

  // Determinar la imagen original y la actual (Memorizados para evitar reinicios innecesarios)
  const srcOriginal = useMemo(() => mapaBase.mapaOriginal || mapaBase.imageDataUrl, [mapaBase]);
  const srcActual = useMemo(() => mapaBase.imageDataUrl, [mapaBase]);

  // Cargador de imágenes robusto con promesas y TIMEOUT
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      if (!src) {
        return reject(new Error("La ruta de la imagen está vacía o es indefinida."));
      }

      const img = new Image();
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Tiempo de espera agotado cargando: ${src.substring(0, 40)}...`));
      }, 15000); // 15s por si la conexión es lenta

      // Configurar CORS para evitar "tainted canvas" solo si es un recurso de origen cruzado
      const isCrossOrigin = (url: string): boolean => {
        if (!url || url.startsWith('data:') || url.startsWith('blob:')) return false;
        try {
          const target = new URL(url, window.location.href);
          return target.origin !== window.location.origin;
        } catch {
          return false;
        }
      };

      if (isCrossOrigin(src)) {
        img.crossOrigin = "Anonymous";
      }

      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        console.error("Error detallado de carga:", e);
        reject(new Error(`Fallo al cargar imagen (${src.substring(0, 40)}...)`));
      };
      img.src = src;
    });
  };

  // 1. Efecto de carga e inicialización de dimensiones
  useEffect(() => {
    let active = true;

    const initEditor = async (): Promise<void> => {
      setLoadingState('loading');
      try {
        let imgOri: HTMLImageElement, imgActual: HTMLImageElement;

        // Optimización: Si son la misma imagen, cargar solo una vez
        if (srcOriginal === srcActual) {
          imgActual = await loadImage(srcActual);
          imgOri = imgActual;
        } else {
          [imgOri, imgActual] = await Promise.all([
            loadImage(srcOriginal),
            loadImage(srcActual)
          ]);
        }

        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Guardar en refs para uso posterior en otros efectos
        loadedImgActualRef.current = imgActual;
        loadedImgOriRef.current = imgOri;
        originalImageRef.current = imgOri;

        // Configurar dimensiones (Esto limpia el canvas)
        canvas.width = imgActual.width;
        canvas.height = imgActual.height;

        setLoadingState('ready');
      } catch (err) {
        console.error("Editor Error:", err);
        if (active) {
          setLoadingState('error');
        }
      }
    };

    initEditor();
    return () => {
      active = false;
    };
  }, [srcActual, srcOriginal]);

  // 2. Efecto dedicado al DIBUJO INICIAL (con retraso de estabilidad)
  useEffect(() => {
    if (loadingState !== 'ready') return;
    let active = true;

    const drawInitialImage = async (): Promise<void> => {
      // Pequeña pausa para asegurar que el DOM se ha pintado
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      if (!active) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const img = loadedImgActualRef.current;
      const imgOri = loadedImgOriRef.current;

      if (!img || !imgOri) {
        console.warn("Imágenes no encontradas en el ref, reintentando carga suave...");
        return;
      }

      ctx.drawImage(img, 0, 0);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      // Crear el patrón de borrado
      const pattern = ctx.createPattern(imgOri, 'no-repeat');
      setEraserPattern(pattern);

      // Guardar estado inicial en el historial
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      history.resetHistory(imgData);
    };

    drawInitialImage();
    return () => {
      active = false;
    };
  }, [loadingState, srcActual, srcOriginal]);

  // Sincronizar estilo de dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loadingState !== 'ready') return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    ctx.globalCompositeOperation = "source-over";

    if (isEraser && eraserPattern) {
      ctx.strokeStyle = eraserPattern;
      ctx.lineWidth = lineWidth * 5;
    } else {
      ctx.strokeStyle = lazoColor;
      ctx.lineWidth = lineWidth;
    }
  }, [lazoColor, lineWidth, isEraser, loadingState, eraserPattern]);

  // Forzar repaint y auto-scroll al centro cuando cambia el zoom
  useEffect(() => {
    const workspace = containerRef.current;
    if (!workspace) return;

    // Forzar repaint completo para eliminar artefactos del zoom anterior
    const wrapper = workspace.querySelector('#canvas-layers-wrapper') as HTMLElement;
    if (wrapper) {
      wrapper.style.display = 'none';
      void workspace.offsetHeight; // Forzar reflow síncrono
      wrapper.style.display = '';
    }

    // Auto-scroll al centro cuando hay zoom
    if (zoom > 1) {
      requestAnimationFrame(() => {
        const scrollLeft = (workspace.scrollWidth - workspace.clientWidth) / 2;
        const scrollTop = (workspace.scrollHeight - workspace.clientHeight) / 2;
        workspace.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'smooth' });
      });
    }
  }, [zoom]);

  const handleSaveAndExit = useCallback(async (e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation();
    setIsSaving(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    const mapaActualizado: MapaOffline = {
      ...mapaBase,
      imageDataUrl: dataUrl,
      fecha: Date.now()
    };

    const success = await guardarMapaOffline(mapaActualizado);
    setIsSaving(false);

    if (success) {
      onClose(true);
    } else {
      await showAlert("Error al intentar guardar automáticamente.", "Error");
    }
  }, [mapaBase, onClose, showAlert]);

  const clearCanvas = useCallback(async (e?: React.MouseEvent): Promise<void> => {
    if (e) e.stopPropagation();
    const confirmed = await showConfirm("¿Deseas resetear todos los cambios actuales?", "Resetear");
    if (!confirmed) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (originalImageRef.current) {
      ctx.drawImage(originalImageRef.current, 0, 0);
    }
    history.saveToHistory();
  }, [showConfirm, history]);

  return (
    <div className="editor-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="editor-workspace" ref={containerRef}>
        {loadingState === 'loading' && (
          <div className="map-loading editor-loading-mask">
            <div className="spinner"></div>
            <p className="editor-loading-text">Cargando mapa en el editor...</p>
          </div>
        )}

        {loadingState === 'error' && (
          <div className="map-loading editor-loading-mask error-state">
            <span className="editor-loading-error-icon">❌</span>
            <p className="editor-loading-text">Error al cargar el mapa.</p>
            <button onClick={() => onClose(false)} className="action-button-square">Volver</button>
          </div>
        )}

        <div
          id="canvas-layers-wrapper"
          className={`drawing-container ${isPanning ? 'panning-mode' : ''}`}
          style={{
            width: `${zoom * 100}%`,
            touchAction: isPanning ? 'auto' : 'none'
          }}
        >
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              touchAction: isPanning ? 'auto' : 'none'
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
        </div>
      </div>

      <EditorToolbar
        isPanning={isPanning}
        isEraser={isEraser}
        lazoColor={lazoColor}
        lineWidth={lineWidth}
        zoom={zoom}
        isSaving={isSaving}
        isReady={loadingState === 'ready'}
        history={history}
        setIsPanning={setIsPanning}
        setIsEraser={setIsEraser}
        setLazoColor={setLazoColor}
        setLineWidth={setLineWidth}
        setZoom={setZoom}
        onSaveAndExit={handleSaveAndExit}
        onClearCanvas={clearCanvas}
      />
    </div>
  );
};

export default EditorCanvas;
