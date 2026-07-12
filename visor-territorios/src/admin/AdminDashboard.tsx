import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { contactos } from '../data/contactos';
import { poblaciones } from '../data/poblaciones';
import { limpiarTexto } from '../services/territoriosService';
import { useModal } from '../hooks/useModal';

interface FirestoreTerritorio {
  id: string;
  numero: number;
  poblacion: string;
  nombre?: string;
  nombreLimpio?: string;
  whatsapp?: string;
  entrega?: string;
  devolucion?: string;
  tieneAviso?: boolean;
  aviso?: string;
  creado?: Timestamp | Date;
}

export const AdminDashboard: React.FC = () => {
  const { showConfirm, showAlert } = useModal();

  // Estados principales
  const [selectedPoblacion, setSelectedPoblacion] = useState<string>(() => {
    return localStorage.getItem('poblacionRegistro') || '';
  });
  const [territorios, setTerritorios] = useState<FirestoreTerritorio[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Estado para el formulario de nuevo territorio
  const [showForm, setShowForm] = useState<boolean>(false);
  const [nuevoNumero, setNuevoNumero] = useState<string>('');
  const [nuevaPoblacion, setNuevaPoblacion] = useState<string>('');
  const [nuevoAsignado, setNuevoAsignado] = useState<string>('');
  const [nuevaFechaAsignacion, setNuevaFechaAsignacion] = useState<string>('');
  const [nuevaFechaDevolucion, setNuevaFechaDevolucion] = useState<string>('');
  const [tieneAviso, setTieneAviso] = useState<boolean>(false);
  const [avisoDetalle, setAvisoDetalle] = useState<string>('');
  const [guardandoNuevo, setGuardandoNuevo] = useState<boolean>(false);

  // Estado para el feedback visual de guardado en filas
  const [guardadoStatus, setGuardadoStatus] = useState<Record<string, Record<string, 'success' | 'error' | null>>>({});

  // Cerrar menús de acciones si se hace clic fuera
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Cargar territorios cuando cambia la población seleccionada
  useEffect(() => {
    localStorage.setItem('poblacionRegistro', selectedPoblacion);
    if (!selectedPoblacion) {
      setTerritorios([]);
      return;
    }

    const cargarTerritorios = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, 'Territorios'),
          where('poblacion', '==', selectedPoblacion)
        );
        const snap = await getDocs(q);
        const lista: FirestoreTerritorio[] = [];
        snap.forEach(docSnap => {
          lista.push({ id: docSnap.id, ...docSnap.data() } as FirestoreTerritorio);
        });

        // Ordenar por número
        lista.sort((a, b) => {
          const na = typeof a.numero === 'number' ? a.numero : parseInt(a.numero as unknown as string, 10);
          const nb = typeof b.numero === 'number' ? b.numero : parseInt(b.numero as unknown as string, 10);
          if (isNaN(na) && isNaN(nb)) return 0;
          if (isNaN(na)) return 1;
          if (isNaN(nb)) return -1;
          return na - nb;
        });

        setTerritorios(lista);
      } catch (err) {
        console.error('Error cargando territorios:', err);
        showAlert('No se pudieron cargar los territorios.', 'Error');
      } finally {
        setLoading(false);
      }
    };

    cargarTerritorios();
  }, [selectedPoblacion]);

  // Pre-rellenar población en el formulario cuando se abre y hay filtro activo
  useEffect(() => {
    if (showForm && selectedPoblacion && !nuevaPoblacion) {
      setNuevaPoblacion(selectedPoblacion);
    }
  }, [showForm, selectedPoblacion]);

  // Filtrado en tiempo real por búsqueda
  const territoriosFiltrados = useMemo(() => {
    const queryNormalized = searchQuery.toLowerCase().trim();
    if (!queryNormalized) return territorios;

    return territorios.filter(t => {
      const numeroMatch = String(t.numero).toLowerCase().includes(queryNormalized);
      const nombreMatch = t.nombre ? t.nombre.toLowerCase().includes(queryNormalized) : false;
      return numeroMatch || nombreMatch;
    });
  }, [territorios, searchQuery]);

  // Función para guardar feedback visual
  const triggerFeedback = (id: string, campo: string, status: 'success' | 'error') => {
    setGuardadoStatus(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [campo]: status
      }
    }));
    setTimeout(() => {
      setGuardadoStatus(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          [campo]: null
        }
      }));
    }, 800);
  };

  // Guardado automático genérico al salir de un input (blur)
  const handleInputBlur = async (id: string, campo: keyof FirestoreTerritorio, valorOriginal: any, nuevoValorStr: string) => {
    const valorLimpio = nuevoValorStr.trim();
    
    // Si no cambió, no hacemos nada
    if (String(valorOriginal || '') === valorLimpio) return;

    let valorFinal: any = valorLimpio;

    if (campo === 'numero') {
      const numInt = parseInt(valorLimpio, 10);
      if (isNaN(numInt)) {
        showAlert('El número de territorio debe ser un número válido.', 'Aviso');
        // Revertir valor
        setTerritorios(prev => prev.map(t => t.id === id ? { ...t, numero: valorOriginal } : t));
        return;
      }
      valorFinal = numInt;
    }

    try {
      await updateDoc(doc(db, 'Territorios', id), { [campo]: valorFinal });
      setTerritorios(prev => prev.map(t => t.id === id ? { ...t, [campo]: valorFinal } : t));
      triggerFeedback(id, campo as string, 'success');
    } catch (err) {
      console.error(`Error guardando ${campo}:`, err);
      triggerFeedback(id, campo as string, 'error');
    }
  };

  // Asignación automática de contactos en tiempo real (onChange del input Nombre)
  const handleNombreChange = async (id: string, nuevoNombre: string) => {
    // Actualizar localmente el input inmediatamente para que sea fluido
    setTerritorios(prev => prev.map(t => t.id === id ? { ...t, nombre: nuevoNombre } : t));

    const contactoMatch = contactos.find(
      c => c.nombre.toLowerCase() === nuevoNombre.toLowerCase().trim()
    );

    if (contactoMatch) {
      const hoy = new Date().toISOString().split('T')[0];
      const actualizacion = {
        nombre: contactoMatch.nombre,
        nombreLimpio: limpiarTexto(contactoMatch.nombre),
        whatsapp: contactoMatch.whatsapp || '',
        entrega: hoy
      };

      try {
        await updateDoc(doc(db, 'Territorios', id), actualizacion);
        setTerritorios(prev => prev.map(t => t.id === id ? { ...t, ...actualizacion } : t));
        triggerFeedback(id, 'nombre', 'success');
        triggerFeedback(id, 'whatsapp', 'success');
        triggerFeedback(id, 'entrega', 'success');
      } catch (err) {
        console.error('Error al autocompletar contacto:', err);
        triggerFeedback(id, 'nombre', 'error');
      }
    }
  };

  // Auto-rellenar fecha de devolución al hacer doble clic
  const handleFechaDevolucionDblClick = async (id: string, fechaActual: string | undefined) => {
    if (!fechaActual) {
      const hoy = new Date().toISOString().split('T')[0];
      try {
        await updateDoc(doc(db, 'Territorios', id), { devolucion: hoy });
        setTerritorios(prev => prev.map(t => t.id === id ? { ...t, devolucion: hoy } : t));
        triggerFeedback(id, 'devolucion', 'success');
      } catch (err) {
        console.error('Error guardando fecha de devolución:', err);
        triggerFeedback(id, 'devolucion', 'error');
      }
    }
  };

  // Acción: WhatsApp share
  const handleSendWhatsApp = (t: FirestoreTerritorio) => {
    if (!t.whatsapp || !t.nombre) return;
    const nombreParam = limpiarTexto(t.nombre);
    const mensaje = `Hola ${t.nombre}, ahora puedes instalar la aplicación "Visor" para ver los territorios que tienes asignados, entra en este enlace:\n\n${window.location.origin}/?cliente=${nombreParam}`;
    const telefono = `34${t.whatsapp.replace(/\D/g, '')}`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  // Acción: Marcar territorio terminado
  const handleTerminarTerritorio = async (id: string) => {
    const hoy = new Date().toISOString().split('T')[0];
    try {
      await updateDoc(doc(db, 'Territorios', id), { devolucion: hoy });
      setTerritorios(prev => prev.map(t => t.id === id ? { ...t, devolucion: hoy } : t));
      triggerFeedback(id, 'devolucion', 'success');
    } catch (err) {
      console.error('Error terminando territorio:', err);
      showAlert('No se pudo marcar como terminado.', 'Error');
    }
  };

  // Acción: Borrar datos de la fila
  const handleBorrarDatosFila = async (id: string) => {
    const confirmacion = await showConfirm(
      '¿Seguro que quieres borrar los datos de asignación de este territorio? Se vaciarán el nombre, whatsapp y fechas.',
      'Borrar Datos'
    );
    if (!confirmacion) return;

    const actualizacion = {
      nombre: '',
      nombreLimpio: '',
      whatsapp: '',
      entrega: '',
      devolucion: ''
    };

    try {
      await updateDoc(doc(db, 'Territorios', id), actualizacion);
      setTerritorios(prev => prev.map(t => t.id === id ? { ...t, ...actualizacion } : t));
      triggerFeedback(id, 'nombre', 'success');
      triggerFeedback(id, 'whatsapp', 'success');
      triggerFeedback(id, 'entrega', 'success');
      triggerFeedback(id, 'devolucion', 'success');
    } catch (err) {
      console.error('Error al borrar datos de fila:', err);
      showAlert('No se pudieron borrar los datos.', 'Error');
    }
  };

  // Acción: Ver territorio en visor
  const handleVerTerritorio = (t: FirestoreTerritorio) => {
    const numero = t.numero || '';
    if (!numero) return;
    const url = t.nombre
      ? `${window.location.origin}/?cliente=${limpiarTexto(t.nombre)}&territorio=${numero}`
      : `${window.location.origin}/?territorio=${numero}`;
    window.open(url, '_blank');
  };

  // Acción: Eliminar fila definitivamente
  const handleEliminarFila = async (id: string, numero: number) => {
    const confirmacion = await showConfirm(
      `⚠️ ¿Eliminar el territorio ${numero} DEFINITIVAMENTE de la base de datos? Esta acción no se puede deshacer.`,
      'Eliminar Territorio'
    );
    if (!confirmacion) return;

    try {
      await deleteDoc(doc(db, 'Territorios', id));
      setTerritorios(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error('Error al eliminar territorio:', err);
      showAlert('No se pudo eliminar el territorio.', 'Error');
    }
  };

  // Enviar el formulario de Nuevo Territorio
  const handleCrearNuevoTerritorio = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nuevoNumero.trim() || !nuevaPoblacion) {
      showAlert('El número y la población son campos obligatorios.', 'Aviso');
      return;
    }

    const numero = parseInt(nuevoNumero, 10);
    if (isNaN(numero)) {
      showAlert('El número de territorio debe ser un número entero válido.', 'Aviso');
      return;
    }

    setGuardandoNuevo(true);

    const contactoMatch = contactos.find(
      c => c.nombre.toLowerCase() === nuevoAsignado.toLowerCase().trim()
    );
    const whatsapp = contactoMatch ? (contactoMatch.whatsapp || '') : '';

    const nuevoDoc = {
      numero,
      poblacion: nuevaPoblacion,
      nombre: nuevoAsignado.trim(),
      nombreLimpio: nuevoAsignado.trim() ? limpiarTexto(nuevoAsignado) : '',
      whatsapp,
      entrega: nuevaFechaAsignacion,
      devolucion: nuevaFechaDevolucion,
      tieneAviso,
      aviso: tieneAviso ? avisoDetalle.trim() : '',
      creado: new Date()
    };

    try {
      const docRef = await addDoc(collection(db, 'Territorios'), nuevoDoc);
      
      // Limpiar formulario
      setNuevoNumero('');
      setNuevoAsignado('');
      setNuevaFechaAsignacion('');
      setNuevaFechaDevolucion('');
      setTieneAviso(false);
      setAvisoDetalle('');
      setShowForm(false);

      // Si el territorio es de la población seleccionada, lo agregamos localmente
      if (nuevaPoblacion === selectedPoblacion) {
        const itemAgregado: FirestoreTerritorio = { id: docRef.id, ...nuevoDoc };
        setTerritorios(prev => {
          const nuevaLista = [...prev, itemAgregado];
          return nuevaLista.sort((a, b) => {
            const na = typeof a.numero === 'number' ? a.numero : parseInt(a.numero as unknown as string, 10);
            const nb = typeof b.numero === 'number' ? b.numero : parseInt(b.numero as unknown as string, 10);
            return na - nb;
          });
        });
      } else {
        // Cambiar población seleccionada a la del nuevo
        setSelectedPoblacion(nuevaPoblacion);
      }
    } catch (err) {
      console.error('Error al guardar nuevo territorio:', err);
      showAlert('No se pudo guardar el territorio.', 'Error');
    } finally {
      setGuardandoNuevo(false);
    }
  };

  // Lógica de cálculo de colores de fila (tr-rojo, tr-verde)
  const getFilaClass = (t: FirestoreTerritorio) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const hoyMenosTresMeses = new Date(hoy);
    hoyMenosTresMeses.setMonth(hoyMenosTresMeses.getMonth() - 3);

    const fechaEntrega = t.entrega ? new Date(t.entrega) : null;
    const fechaDevolucion = t.devolucion ? new Date(t.devolucion) : null;

    // 🔴 MÁS DE TRES MESES QUE NO SE TRABAJA (Devuelto hace más de 3 meses)
    if (fechaDevolucion && fechaDevolucion < hoyMenosTresMeses) {
      return 'tr-rojo';
    }

    // 🟢 MÁS DE TRES MESES SIN DEVOLUCIÓN (En curso hace más de 3 meses)
    if (fechaEntrega && !t.devolucion) {
      const entregaMasTresMeses = new Date(fechaEntrega);
      entregaMasTresMeses.setMonth(entregaMasTresMeses.getMonth() + 3);
      if (entregaMasTresMeses < hoy) {
        return 'tr-verde';
      }
    }

    return '';
  };

  // Lógica de fecha reciente (hoy - 10 días)
  const isFechaAlerta = (fechaStr: string | undefined) => {
    if (!fechaStr) return false;
    const fecha = new Date(fechaStr);
    fecha.setHours(0, 0, 0, 0);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const hoyMenos10Dias = new Date(hoy);
    hoyMenos10Dias.setDate(hoyMenos10Dias.getDate() - 10);

    return fecha > hoyMenos10Dias;
  };

  return (
    <div className="container">
      <header>
        <div>
          <h1>Administración de Territorios</h1>
        </div>
        <div>
          <a href="/" className="btn btn-secondary">
            <span>👁️</span> Ir al Visor
          </a>
        </div>
      </header>

      <section className={`grid ${showForm ? 'con-formulario' : ''}`}>
        
        {/* Formulario de creación/edición */}
        {showForm && (
          <div className="card" id="form-container">
            <h2 style={{ marginBottom: '20px' }}>Nuevo Territorio</h2>
            <form onSubmit={handleCrearNuevoTerritorio}>
              
              <div className="form-group">
                <label htmlFor="numero">Número de Territorio</label>
                <input 
                  type="text" 
                  id="numero" 
                  required 
                  placeholder="Ej. 25, 30"
                  value={nuevoNumero}
                  onChange={e => setNuevoNumero(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="poblacion">Población / Zona</label>
                <select 
                  id="poblacion" 
                  required
                  value={nuevaPoblacion}
                  onChange={e => setNuevaPoblacion(e.target.value)}
                >
                  <option value="">-- Selecciona población --</option>
                  {poblaciones.map(p => (
                    <option key={p.poblacion} value={p.poblacion}>
                      {p.poblacion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="publicador">Asignado a</label>
                <input 
                  type="text" 
                  id="publicador" 
                  list="listaNombresDashboard" 
                  placeholder="Nombre del publicador..."
                  value={nuevoAsignado}
                  onChange={e => setNuevoAsignado(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fechaAsignacion">Fecha de Asignación</label>
                <input 
                  type="date" 
                  id="fechaAsignacion"
                  value={nuevaFechaAsignacion}
                  onChange={e => setNuevaFechaAsignacion(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fechaDevolucion">Fecha de Devolución</label>
                <input 
                  type="date" 
                  id="fechaDevolucion"
                  value={nuevaFechaDevolucion}
                  onChange={e => setNuevaFechaDevolucion(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '20px' }}>
                <input 
                  type="checkbox" 
                  id="tieneAviso" 
                  style={{ width: 'auto', margin: 0 }}
                  checked={tieneAviso}
                  onChange={e => setTieneAviso(e.target.checked)}
                />
                <label htmlFor="tieneAviso" style={{ margin: 0, cursor: 'pointer' }}>⚠️ Tiene aviso importante</label>
              </div>

              {tieneAviso && (
                <div className="form-group" style={{ marginTop: '15px' }}>
                  <label htmlFor="aviso">Detalle del aviso</label>
                  <textarea 
                    id="aviso" 
                    rows={3} 
                    placeholder="Escribe el aviso aquí (perro suelto, timbre roto...)"
                    value={avisoDetalle}
                    onChange={e => setAvisoDetalle(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '25px' }}>
                <button type="submit" className="btn" disabled={guardandoNuevo}>
                  {guardandoNuevo ? 'Guardando...' : '💾 Guardar'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowForm(false)}
                  disabled={guardandoNuevo}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Listado y Tabla */}
        <div className="card">
          <div className="search-container">
            <input 
              type="text" 
              placeholder="Buscar por número o publicador..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select 
              value={selectedPoblacion}
              onChange={e => setSelectedPoblacion(e.target.value)}
            >
              <option value="">-- Selecciona población --</option>
              {poblaciones.map(p => (
                <option key={p.poblacion} value={p.poblacion}>
                  {p.poblacion}
                </option>
              ))}
            </select>
            <button 
              type="button" 
              className="btn" 
              onClick={() => setShowForm(prev => !prev)}
            >
              <span>➕</span> Nuevo Territorio
            </button>
          </div>

          <div className="table-responsive">
            {loading ? (
              <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
                Cargando datos del servidor...
              </div>
            ) : !selectedPoblacion ? (
              <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
                Selecciona una población arriba para comenzar la gestión.
              </div>
            ) : territoriosFiltrados.length === 0 ? (
              <div style={{ padding: '40px', textAlignment: 'center', color: 'var(--text-secondary)' }}>
                No se encontraron territorios cargados para esta sección.
              </div>
            ) : (
              <table id="tablaTerritorios">
                <thead>
                  <tr>
                    <th>Nº</th>
                    <th>Asignado a</th>
                    <th>WhatsApp</th>
                    <th>Entregado</th>
                    <th>Devuelto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {territoriosFiltrados.map((t) => {
                    const rowFeedback = guardadoStatus[t.id] || {};
                    return (
                      <tr key={t.id} className={getFilaClass(t)}>
                        <td>
                          <input 
                            type="text" 
                            defaultValue={t.numero}
                            className={
                              rowFeedback.numero === 'success' ? 'guardado' :
                              rowFeedback.numero === 'error' ? 'error-field' : ''
                            }
                            onBlur={e => handleInputBlur(t.id, 'numero', t.numero, e.target.value)}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={t.nombre || ''}
                            list="listaNombresDashboard"
                            autoComplete="off"
                            className={
                              rowFeedback.nombre === 'success' ? 'guardado' :
                              rowFeedback.nombre === 'error' ? 'error-field' : ''
                            }
                            onChange={e => handleNombreChange(t.id, e.target.value)}
                          />
                        </td>
                        <td>
                          <input 
                            type="text" 
                            value={t.whatsapp || ''} 
                            readOnly 
                            placeholder="Sin teléfono"
                            className={
                              rowFeedback.whatsapp === 'success' ? 'guardado' : ''
                            }
                          />
                        </td>
                        <td>
                          <input 
                            type={t.entrega ? 'date' : 'text'} 
                            placeholder="En curso..."
                            value={t.entrega || ''}
                            className={
                              `${isFechaAlerta(t.entrega) ? 'fecha-alerta' : ''} ` +
                              `${rowFeedback.entrega === 'success' ? 'guardado' : ''}`
                            }
                            onChange={e => {
                              setTerritorios(prev => prev.map(item => item.id === t.id ? { ...item, entrega: e.target.value } : item));
                            }}
                            onBlur={e => handleInputBlur(t.id, 'entrega', t.entrega, e.target.value)}
                          />
                        </td>
                        <td>
                          <input 
                            type={t.devolucion ? 'date' : 'text'} 
                            placeholder="Pendiente..."
                            value={t.devolucion || ''}
                            className={
                              `${isFechaAlerta(t.devolucion) ? 'fecha-alerta' : ''} ` +
                              `${rowFeedback.devolucion === 'success' ? 'guardado' : ''}`
                            }
                            onDoubleClick={() => handleFechaDevolucionDblClick(t.id, t.devolucion)}
                            onChange={e => {
                              setTerritorios(prev => prev.map(item => item.id === t.id ? { ...item, devolucion: e.target.value } : item));
                            }}
                            onBlur={e => handleInputBlur(t.id, 'devolucion', t.devolucion, e.target.value)}
                          />
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn-acciones" 
                            title="Opciones"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(prev => prev === t.id ? null : t.id);
                            }}
                          >
                            📤
                          </button>
                          
                          {activeMenuId === t.id && (
                            <div className="menu-acciones" onClick={e => e.stopPropagation()}>
                              {t.whatsapp && t.nombre && (
                                <button 
                                  type="button" 
                                  className="btn-whatsapp"
                                  onClick={() => {
                                    handleSendWhatsApp(t);
                                    setActiveMenuId(null);
                                  }}
                                >
                                  💬 WhatsApp
                                </button>
                              )}
                              <button 
                                type="button" 
                                className="btn-terminar-territorio"
                                onClick={() => {
                                  handleTerminarTerritorio(t.id);
                                  setActiveMenuId(null);
                                }}
                              >
                                ✅ Terminar
                              </button>
                              <button 
                                type="button" 
                                className="btn-borrar-datos"
                                onClick={() => {
                                  handleBorrarDatosFila(t.id);
                                  setActiveMenuId(null);
                                }}
                              >
                                🧹 Borrar datos
                              </button>
                              <button 
                                type="button" 
                                onClick={() => {
                                  handleVerTerritorio(t);
                                  setActiveMenuId(null);
                                }}
                              >
                                🔍 Ver visor
                              </button>
                              <button 
                                type="button" 
                                className="btn-eliminar-fila"
                                onClick={() => {
                                  handleEliminarFila(t.id, t.numero);
                                  setActiveMenuId(null);
                                }}
                              >
                                🗑️ Eliminar
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </section>

      {/* Datalist de contactos ordenado para el autocompletado en los inputs de Asignado A */}
      <datalist id="listaNombresDashboard">
        {contactos
          .filter(c => c.nombre && c.nombre.trim())
          .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }))
          .map(c => (
            <option key={c.nombre} value={c.nombre} />
          ))
        }
      </datalist>
    </div>
  );
};

export default AdminDashboard;
