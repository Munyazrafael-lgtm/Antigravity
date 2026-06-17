import React, { useState, useEffect } from 'react';
import type { CanvasHistoryActions } from '../../hooks/useCanvasHistory';

// Estilo reutilizable para botones de la toolbar de tamaño uniforme
const toolBtnStyle: React.CSSProperties = { width: '48px', height: '48px', padding: 0, fontSize: '1.2rem' };
const colorDotStyle = (color: string): React.CSSProperties => ({
  display: 'block', width: '24px', height: '24px', borderRadius: '50%',
  background: color, border: '2px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
});
const brushDotStyle = (size: number, isActive: boolean): React.CSSProperties => ({
  display: 'block', width: `${size}px`, height: `${size}px`, borderRadius: '50%',
  background: isActive ? 'white' : 'var(--text-primary)'
});

interface EditorToolbarProps {
  // Estado
  isPanning: boolean;
  isEraser: boolean;
  lazoColor: string;
  lineWidth: number;
  zoom: number;
  isSaving: boolean;
  isReady: boolean;
  history: CanvasHistoryActions;
  // Acciones
  setIsPanning: (v: boolean) => void;
  setIsEraser: (v: boolean) => void;
  setLazoColor: (v: string) => void;
  setLineWidth: (v: number) => void;
  setZoom: React.Dispatch<React.SetStateAction<number>>;
  onSaveAndExit: (e?: React.MouseEvent) => void;
  onClearCanvas: (e?: React.MouseEvent) => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  isPanning, isEraser, lazoColor, lineWidth, zoom, isSaving, isReady,
  history, setIsPanning, setIsEraser, setLazoColor, setLineWidth, setZoom,
  onSaveAndExit, onClearCanvas
}) => {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const disabled = !isReady;



  const [showBrushOptions, setShowBrushOptions] = useState(false);
  const [showColorOptions, setShowColorOptions] = useState(false);
  const [showZoomOptions, setShowZoomOptions] = useState(false);

  useEffect(() => {
    if (!showBrushOptions && !showColorOptions && !showZoomOptions) return;
    const handleDocumentClick = () => {
      setShowBrushOptions(false);
      setShowColorOptions(false);
      setShowZoomOptions(false);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [showBrushOptions, showColorOptions, showZoomOptions]);

  return (
    <div className="editor-toolbar glass-card" onClick={stop}>
      {/* Guardar y Salir */}
      <div className="tool-group">
        <div className="color-picker-group">
          <button
            className="action-button-square"
            onClick={onSaveAndExit}
            disabled={isSaving || disabled}
            style={{ ...toolBtnStyle, backgroundColor: '#ffffff' }}
            title="Guardar y Salir"
          >
            {isSaving ? "⏳" : "❌"}
          </button>
        </div>
      </div>

      {/* Modo Pan / Dibujo */}
      <div className="tool-group">
        <div className="color-picker-group">
          {!isPanning ? (
            <button
              className="action-button-square"
              onClick={(e) => { stop(e); setIsPanning(true); }}
              title="Mover Mapa" disabled={disabled} style={{ ...toolBtnStyle, backgroundColor: '#ffffff' }}
            >✋</button>
          ) : (
            <button
              className="action-button-square"
              onClick={(e) => { stop(e); setIsPanning(false); }}
              title="Dibujar" disabled={disabled} style={toolBtnStyle}
            >✏️</button>
          )}
        </div>
      </div>

      {/* Undo / Redo */}
      <div className="tool-group">
        <div className="color-picker-group">
          <button
            className="action-button-square"
            onClick={(e) => { stop(e); history.handleUndo(); }}
            disabled={!history.canUndo || disabled}
            title="Deshacer (Ctrl+Z)" style={toolBtnStyle}
          >↩️</button>
          <button
            className="action-button-square"
            onClick={(e) => { stop(e); history.handleRedo(); }}
            disabled={!history.canRedo || disabled}
            title="Rehacer (Ctrl+Y)" style={toolBtnStyle}
          >↪️</button>
        </div>
      </div>

      {/* Papelera / Resetear todo solo en modo Mover Mapa (isPanning) */}
      {isPanning && (
        <div className="tool-group fade-in">
          <button
            className="action-button-square"
            onClick={onClearCanvas}
            disabled={disabled}
            style={{ ...toolBtnStyle, color: '#ef4444' }}
            title="Resetear Todo"
          >🗑️</button>
        </div>
      )}

      {/* Controles de zoom siempre visibles */}
      <div className="tool-group">
        <div className="color-picker-group">
          {showZoomOptions ? (
            ([1, 2, 3] as const).map(z => (
              <button
                key={z}
                className={`action-button-square ${zoom === z ? 'active' : ''}`}
                style={toolBtnStyle}
                onClick={(e) => {
                  stop(e);
                  setZoom(z);
                  setShowZoomOptions(false);
                }}
                title={`Zoom ${z}x`}
              >
                {z}x
              </button>
            ))
          ) : (
            <button
              className="action-button-square active"
              style={toolBtnStyle}
              onClick={(e) => {
                stop(e);
                setShowZoomOptions(true);
              }}
              title="Cambiar Zoom"
              disabled={disabled}
            >
              🔍{zoom}x
            </button>
          )}
        </div>
      </div>

      {/* Herramientas de dibujo (Colores y grosor) al final */}
      {!isPanning && (
        <>
          {/* Colores y borrador */}
          <div className="tool-group fade-in">
            <div className="color-picker-group">
              {showColorOptions ? (
                <>
                  <button
                    className={`action-button-square ${!isEraser && lazoColor === '#ff0000' ? 'active' : ''}`}
                    style={{ ...toolBtnStyle }}
                    onClick={(e) => { stop(e); setIsEraser(false); setLazoColor('#ff0000'); setShowColorOptions(false); }}
                    title="Color Rojo"
                  ><span style={colorDotStyle('#ff0000')}></span></button>
                  <button
                    className={`action-button-square ${!isEraser && lazoColor === '#3b82f6' ? 'active' : ''}`}
                    style={{ ...toolBtnStyle }}
                    onClick={(e) => { stop(e); setIsEraser(false); setLazoColor('#3b82f6'); setShowColorOptions(false); }}
                    title="Color Azul"
                  ><span style={colorDotStyle('#3b82f6')}></span></button>
                  <button
                    className={`action-button-square ${isEraser ? 'active' : ''}`}
                    style={toolBtnStyle}
                    onClick={(e) => { stop(e); setIsEraser(true); setShowColorOptions(false); }}
                    title="Goma de Borrar"
                  >🧹</button>
                </>
              ) : (
                isEraser ? (
                  <button
                    className="action-button-square active"
                    style={toolBtnStyle}
                    onClick={(e) => { stop(e); setShowColorOptions(true); }}
                    title="Goma de Borrar"
                  >🧹</button>
                ) : (
                  <button
                    className="action-button-square active"
                    style={toolBtnStyle}
                    onClick={(e) => { stop(e); setShowColorOptions(true); }}
                    title={`Color ${lazoColor === '#ff0000' ? 'Rojo' : 'Azul'}`}
                  ><span style={colorDotStyle(lazoColor)}></span></button>
                )
              )}
            </div>
          </div>

          {/* Grosor del pincel */}
          <div className="tool-group fade-in" title="Grosor del Pincel">
            <div className="color-picker-group">
              {showBrushOptions ? (
                [3, 8, 15].map(size => (
                  <button
                    key={size}
                    className={`action-button-square ${lineWidth === size ? 'active' : ''}`}
                    style={{ ...toolBtnStyle }}
                    onClick={(e) => {
                      stop(e);
                      setLineWidth(size);
                      setShowBrushOptions(false);
                    }}
                    title={`Pincel ${size === 3 ? 'Fino' : size === 8 ? 'Medio' : 'Grueso'} (${size}px)`}
                  >
                    <span style={brushDotStyle(size === 3 ? 4 : size, lineWidth === size)}></span>
                  </button>
                ))
              ) : (
                <button
                  className="action-button-square active"
                  style={{ ...toolBtnStyle }}
                  onClick={(e) => {
                    stop(e);
                    setShowBrushOptions(true);
                  }}
                  title="Cambiar grosor de pincel"
                >
                  <span style={brushDotStyle(lineWidth === 3 ? 4 : lineWidth, true)}></span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default React.memo(EditorToolbar);
