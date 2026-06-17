import { useRef, useState, useEffect, useMemo } from 'react';
import { guardarMapaOffline } from '../../services/db';

export const EditorCanvas = ({ mapaBase, onClose }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const originalImageRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lazoColor, setLazoColor] = useState('#ff0000');
  const [lineWidth, setLineWidth] = useState(3);
  const [isEraser, setIsEraser] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(true);
  const [loadingState, setLoadingState] = useState('loading'); // 'loading', 'ready', 'error'
  const [eraserPattern, setEraserPattern] = useState(null);
  
  // Refs para mantener las imágenes cargadas y evitar recargas en efectos secundarios
  const loadedImgActualRef = useRef(null);
  const loadedImgOriRef = useRef(null);

  // Historial de cambios para Undo / Redo
  const historyRef = useRef({ undo: [], redo: [] });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Determinar la imagen original y la actual (Memorizados para evitar reinicios innecesarios)
  const srcOriginal = useMemo(() => mapaBase.mapaOriginal || mapaBase.imageDataUrl, [mapaBase]);
  const srcActual = useMemo(() => mapaBase.imageDataUrl, [mapaBase]);

  // Cargador de imágenes robusto con promesas y TIMEOUT
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      if (!src) {
        return reject(new Error("La ruta de la imagen está vacía o es indefinida."));
      }

      const img = new Image();
      const timeout = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        reject(new Error(`Tiempo de espera agotado cargando: ${src.substring(0, 40)}...`));
      }, 15000); // Aumentado a 15s por si la conexión es lenta

      // Configurar CORS para evitar "tainted canvas" si no es una data URL
      if (!src.startsWith('data:')) {
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
    
    const initEditor = async () => {
      setLoadingState('loading');
      try {
        let imgOri, imgActual;
        
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
            // No alertamos aquí para evitar bucles de UI, ya mostramos el estado de error en el render
        }
      }
    };

    initEditor();
    return () => { active = false; };
  }, [srcActual, srcOriginal]);

  // 2. Efecto dedicado al DIBUJO INICIAL (con retraso de estabilidad)
  useEffect(() => {
    if (loadingState !== 'ready') return;
    let active = true;

    const drawInitialImage = async () => {
        // Pequeña pausa para asegurar que el DOM se ha pintado
        await new Promise(resolve => setTimeout(resolve, 50));
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        // USAR LAS IMÁGENES YA CARGADAS EN EL REF en lugar de recargar con loadImage
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
        historyRef.current.undo = [imgData];
        historyRef.current.redo = [];
        setCanUndo(false);
        setCanRedo(false);
    };

    drawInitialImage();
    return () => { active = false; };
  }, [loadingState, srcActual, srcOriginal]);

  // Sincronizar estilo de dibujo
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loadingState !== 'ready') return;
    const ctx = canvas.getContext('2d');
    
    ctx.globalCompositeOperation = "source-over";

    if (isEraser && eraserPattern) {
      ctx.strokeStyle = eraserPattern;
      ctx.lineWidth = lineWidth * 5; 
    } else {
      ctx.strokeStyle = lazoColor;
      ctx.lineWidth = lineWidth;
    }
  }, [lazoColor, lineWidth, isEraser, loadingState, eraserPattern]);

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (isPanning || loadingState !== 'ready') return;
    if (e.touches && e.touches.length > 1) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const updateZoom = (newZoom, e) => {
    if (e) e.stopPropagation();
    setZoom(newZoom);
  };

  const draw = (e) => {
    if (!isDrawing || isPanning) return;
    if (e.touches && e.touches.length > 1) return;

    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    historyRef.current.undo.push(imgData);
    historyRef.current.redo = [];
    
    setCanUndo(true);
    setCanRedo(false);
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.undo.length <= 1) return;
    
    const ctx = canvas.getContext('2d');
    const currentState = historyRef.current.undo.pop();
    historyRef.current.redo.push(currentState);
    
    const prevState = historyRef.current.undo[historyRef.current.undo.length - 1];
    ctx.putImageData(prevState, 0, 0);
    
    setCanUndo(historyRef.current.undo.length > 1);
    setCanRedo(true);
  };

  const handleRedo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.redo.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const nextState = historyRef.current.redo.pop();
    historyRef.current.undo.push(nextState);
    
    ctx.putImageData(nextState, 0, 0);
    
    setCanUndo(true);
    setCanRedo(historyRef.current.redo.length > 0);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
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
  }, []);

  const stopDrawing = () => {
    if (isDrawing) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.closePath();
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const handleSaveAndExit = async (e) => {
    if (e) e.stopPropagation();
    setIsSaving(true);
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL('image/png');
    
    const mapaActualizado = {
      ...mapaBase,
      imageDataUrl: dataUrl,
      fecha: Date.now()
    };
    
    const success = await guardarMapaOffline(mapaActualizado);
    setIsSaving(false);
    
    if (success) {
      onClose(true); // El true indicaba éxito de guardado, pero ahora necesitamos saber si quiere ir a galería
    } else {
      alert("Error al intentar guardar automáticamente.");
      // Incluso si falla el guardado, permitimos salir o avisamos al usuario?
      // El usuario pidió que guarde y salga. Si falla, avisamos.
    }
  };

  const clearCanvas = (e) => {
    if (e) e.stopPropagation();
    if(!window.confirm("¿Deseas resetear todos los cambios actuales?")) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (originalImageRef.current) {
        ctx.drawImage(originalImageRef.current, 0, 0);
    }
    saveToHistory();
  };

  return (
    <div className="editor-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="editor-workspace" ref={containerRef}>
        {loadingState === 'loading' && (
            <div className="map-loading" style={{ position: 'absolute', zIndex: 10, background: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                <div className="spinner"></div>
                <p style={{ color: 'white' }}>Cargando mapa en el editor...</p>
            </div>
        )}

        {loadingState === 'error' && (
            <div className="map-loading" style={{ position: 'absolute', zIndex: 10, background: 'rgba(0,0,0,0.8)', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                <span style={{ fontSize: '3rem' }}>❌</span>
                <p style={{ color: 'white' }}>Error al cargar el mapa.</p>
                <button onClick={() => onClose(false)} className="action-button-square">Volver</button>
            </div>
        )}

        <div 
          id="canvas-layers-wrapper"
          className={`drawing-container ${isPanning ? 'panning-mode' : ''}`}
          style={{ 
            width: `${zoom * 100}%`,
            position: 'relative',
            display: 'inline-block',
            margin: '0 auto',
            transition: 'width 0.2s ease-out'
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

      <div className="editor-toolbar glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="tool-group" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="color-picker-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="action-button-square finish-button" 
              onClick={handleSaveAndExit}
              disabled={isSaving || loadingState !== 'ready'}
              style={{ height: '48px', padding: '0 1rem', minWidth: '80px', fontSize: '1rem' }}
            >
              {isSaving ? "⏳" : "SALIR"}
            </button>
          </div>
        </div>

        <div className="tool-group" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="color-picker-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className={`action-button-square ${isPanning ? 'active' : ''}`} 
              onClick={(e) => { e.stopPropagation(); setIsPanning(true); }}
              title="Mover Mapa"
              disabled={loadingState !== 'ready'}
              style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }}
            >
              ✋
            </button>
            <button 
              className={`action-button-square ${!isPanning ? 'active' : ''}`} 
              onClick={(e) => { e.stopPropagation(); setIsPanning(false); }}
              title="Dibujar"
              disabled={loadingState !== 'ready'}
              style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }}
            >
              ✏️
            </button>
          </div>
        </div>

        <div className="tool-group" style={{ display: 'flex', alignItems: 'center' }}>
          <div className="color-picker-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
            <button 
              className="action-button-square" 
              onClick={(e) => { e.stopPropagation(); handleUndo(); }}
              disabled={!canUndo || loadingState !== 'ready'}
              title="Deshacer (Ctrl+Z)"
              style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }}
            >
              ↩️
            </button>
            <button 
              className="action-button-square" 
              onClick={(e) => { e.stopPropagation(); handleRedo(); }}
              disabled={!canRedo || loadingState !== 'ready'}
              title="Rehacer (Ctrl+Y)"
              style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }}
            >
              ↪️
            </button>
          </div>
        </div>

        {!isPanning ? (
          <>
            <div className="tool-group fade-in" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="color-picker-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className={`action-button-square ${!isEraser && lazoColor === '#ff0000' ? 'active' : ''}`} 
                  style={{ width: '48px', height: '48px', padding: 0 }}
                  onClick={(e) => { e.stopPropagation(); setIsEraser(false); setLazoColor('#ff0000');}}
                  title="Color Rojo"
                >
                  <span style={{ display: 'block', width: '24px', height: '24px', borderRadius: '50%', background: '#ff0000', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
                </button>
                <button 
                  className={`action-button-square ${!isEraser && lazoColor === '#3b82f6' ? 'active' : ''}`} 
                  style={{ width: '48px', height: '48px', padding: 0 }}
                  onClick={(e) => { e.stopPropagation(); setIsEraser(false); setLazoColor('#3b82f6');}}
                  title="Color Azul"
                >
                  <span style={{ display: 'block', width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
                </button>
                <button 
                  className={`action-button-square ${isEraser ? 'active' : ''}`} 
                  style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }}
                  onClick={(e) => { e.stopPropagation(); setIsEraser(true); }}
                  title="Goma de Borrar"
                >
                  🧹
                </button>
                <button 
                  className="action-button-square" 
                  style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem', color: '#ef4444' }} 
                  onClick={clearCanvas} 
                  title="Resetear Todo"
                >
                  🗑️
                </button>
              </div>
            </div>

            <div className="tool-group fade-in" title="Grosor del Pincel" style={{ display: 'flex', alignItems: 'center' }}>
              <div className="color-picker-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className={`action-button-square ${lineWidth === 3 ? 'active' : ''}`}
                  style={{ width: '48px', height: '48px', padding: 0 }}
                  onClick={(e) => { e.stopPropagation(); setLineWidth(3); }}
                  title="Pincel Fino (3px)"
                >
                  <span style={{ display: 'block', width: '4px', height: '4px', borderRadius: '50%', background: lineWidth === 3 ? 'white' : 'var(--text-primary)' }}></span>
                </button>
                <button
                  className={`action-button-square ${lineWidth === 8 ? 'active' : ''}`}
                  style={{ width: '48px', height: '48px', padding: 0 }}
                  onClick={(e) => { e.stopPropagation(); setLineWidth(8); }}
                  title="Pincel Medio (8px)"
                >
                  <span style={{ display: 'block', width: '8px', height: '8px', borderRadius: '50%', background: lineWidth === 8 ? 'white' : 'var(--text-primary)' }}></span>
                </button>
                <button
                  className={`action-button-square ${lineWidth === 15 ? 'active' : ''}`}
                  style={{ width: '48px', height: '48px', padding: 0 }}
                  onClick={(e) => { e.stopPropagation(); setLineWidth(15); }}
                  title="Pincel Grueso (15px)"
                >
                  <span style={{ display: 'block', width: '15px', height: '15px', borderRadius: '50%', background: lineWidth === 15 ? 'white' : 'var(--text-primary)' }}></span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="tool-group fade-in" style={{ display: 'flex', alignItems: 'center' }}>
            <div className="color-picker-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
                <button className="action-button-square" onClick={(e) => updateZoom(Math.max(1, zoom - 0.5), e)} style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }} disabled={loadingState !== 'ready'}>-</button>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zoom</span>
                <button className="action-button-square" onClick={(e) => updateZoom(Math.min(10, zoom + 0.5), e)} style={{ width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' }} disabled={loadingState !== 'ready'}>+</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
