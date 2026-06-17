// =================================================
// APLICACIÓN DE GESTIÓN DE TERRITORIOS
// =================================================

// ─────────────────────────────────────────────────
// 1. IMPORTS
// ─────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ─────────────────────────────────────────────────
// 2. CONFIGURACIÓN FIREBASE
// ─────────────────────────────────────────────────
// La configuración se inyecta desde dt.html para no hardcodear credenciales aquí.
const firebaseConfig = window.__FIREBASE_CONFIG__;
if (!firebaseConfig) {
  throw new Error("Firebase config no encontrada. Asegúrate de definir window.__FIREBASE_CONFIG__ antes de cargar este script.");
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

console.log("🔥 Firebase inicializado correctamente");

// ─────────────────────────────────────────────────
// 3. VARIABLES GLOBALES / DATOS ESTÁTICOS
// ─────────────────────────────────────────────────
// Se asume que estas variables están definidas en otro archivo o script
// const contactos   = [ ... ];   // Array de objetos { nombre, whatsapp, ... }
// const poblaciones = [ ... ];   // Array de objetos { poblacion: string }

// ─────────────────────────────────────────────────
// 4. REFERENCIAS AL DOM (una sola vez)
// ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const $$ = selector => document.querySelector(selector);

const elementos = {
  // Filtros y selects
  filtroPoblacion: $("filtroPoblacion"),

  // Tabla y botones
  tablaBody: $$("#tablaTerritorios tbody"),
  btnNuevoTerritorio: $("btnNuevoTerritorio"),
};

// ─────────────────────────────────────────────────
// 5. FUNCIONES AUXILIARES
// ─────────────────────────────────────────────────

/** Normaliza texto: quita acentos, convierte a minúsculas y cambia espacios por guiones */
function limpiarTexto(texto) {
  if (!texto) return "";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quita acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")           // Espacios por guiones
    .replace(/[^a-z0-9-]/g, "");    // Quita caracteres especiales
}

/** Crea o actualiza el datalist con nombres de contactos ordenados */
function crearDatalistContactos() {
  let datalist = $("listaNombres");

  if (!datalist) {
    datalist = document.createElement("datalist");
    datalist.id = "listaNombres";
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = "";

  window.contactos
    .filter(c => c?.nombre?.trim())
    .map(c => ({ ...c, nombre: c.nombre.trim() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" }))
    .forEach(c => {
      const option = document.createElement("option");
      option.value = c.nombre;
      datalist.appendChild(option);
    });
}

/** Rellena un <select> con las poblaciones disponibles */
function rellenarSelectPoblaciones(select) {
  if (!select || !Array.isArray(window.poblaciones)) return;

  select.innerHTML = `<option value="">-- Selecciona población --</option>`;

  window.poblaciones
    .map(p => p.poblacion)
    .sort((a, b) => a.localeCompare(b, "es"))
    .forEach(poblacion => {
      const option = document.createElement("option");
      option.value = poblacion;
      option.textContent = poblacion;
      select.appendChild(option);
    });
}

/** Restaura la población guardada en Registro */
function restaurarPoblacionRegistro() {
  const poblacionGuardada = localStorage.getItem("poblacionRegistro");

  if (poblacionGuardada) {
    elementos.filtroPoblacion.value = poblacionGuardada;
  }
}



/** Aplica color a la fila según fechas de entrega y devolución */
function aplicarColorTr(tr) {
  const inputEntrega = tr.querySelector('[data-field="entrega"]');
  const inputDevolucion = tr.querySelector('[data-field="devolucion"]');

  // Limpiar colores previos
  tr.classList.remove("tr-rojo", "tr-verde");

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const hoyMenosTresMeses = new Date(hoy);
  hoyMenosTresMeses.setMonth(hoyMenosTresMeses.getMonth() - 3);

  const entregaValor = inputEntrega?.value || "";
  const devolucionValor = inputDevolucion?.value || "";

  const fechaEntrega = entregaValor ? new Date(entregaValor) : null;
  const fechaDevolucion = devolucionValor ? new Date(devolucionValor) : null;

  // 🔴 MAS DE TRES MESES QUE NO SE TRABAJA
  if (
    fechaDevolucion &&
    fechaDevolucion < hoyMenosTresMeses
  ) {
    tr.classList.add("tr-rojo");
    return; // prioridad absoluta
  }

  // 🟢 MAS DE TRES MESES SIN DEVOLUCIÓN
  if (
    fechaEntrega &&
    !devolucionValor
  ) {
    const entregaMasTresMeses = new Date(fechaEntrega);
    entregaMasTresMeses.setMonth(entregaMasTresMeses.getMonth() + 3);

    if (entregaMasTresMeses < hoy) {
      tr.classList.add("tr-verde");
    }
  }
}

/** Resalta entrega/devolución si la fecha es superior a hoy - 10 días */
function aplicarColorFechaInput(input) {
  if (!input || !input.value) {
    input?.classList.remove("fecha-alerta");
    return;
  }

  const fechaCampo = new Date(input.value);
  fechaCampo.setHours(0, 0, 0, 0);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const hoyMenos10Dias = new Date(hoy);
  hoyMenos10Dias.setDate(hoyMenos10Dias.getDate() - 10);

  if (fechaCampo > hoyMenos10Dias) {
    input.classList.add("fecha-alerta");
  } else {
    input.classList.remove("fecha-alerta");
  }
}

// ─────────────────────────────────────────────────
// 6. TABLA DE TERRITORIOS
// ─────────────────────────────────────────────────

// Carga y renderiza la tabla de territorios según la población seleccionada 
async function cargarTablaTerritorios() {
  elementos.tablaBody.innerHTML = "";

  const poblacion = elementos.filtroPoblacion.value;

  if (!poblacion) return;

  const q = query(
    collection(db, "Territorios"),
    where("poblacion", "==", poblacion)
  );

  const snap = await getDocs(q);
  const territorios = [];

  snap.forEach(docSnap => {
    territorios.push({ id: docSnap.id, ...docSnap.data() });
  });

  // Ordenar por número (numérico cuando sea posible)
  territorios.sort((a, b) => {
    const na = parseInt(a.numero, 10);
    const nb = parseInt(b.numero, 10);
    if (isNaN(na) && isNaN(nb)) return 0;
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  });

  territorios.forEach((data, index) => {
    crearFilaEditable(data.id, data, index);
  });
}

// Crea una fila editable en la tabla 
function crearFilaEditable(id, data, index) {
  const tr = document.createElement("tr");

  tr.innerHTML = `
    <td><input type="text" value="${data.numero || ""}" data-field="numero"></td>
    <td><input type="text" value="${data.nombre || ""}" data-field="nombre"   list="listaNombres" autocomplete="on"></td>
    <td><input type="text" value="${data.whatsapp || ""}" data-field="whatsapp" readonly></td>
    <td><input type="${data.entrega ? 'date' : 'text'}" class="fecha-control" value="${data.entrega || ""}" data-field="entrega" placeholder="En curso..."></td>
    <td><input type="${data.devolucion ? 'date' : 'text'}" class="fecha-control" value="${data.devolucion || ""}" data-field="devolucion" placeholder="Pendiente..."></td>
    <td>
      <div class="block">
        <button type="button" class="btn-acciones" title="Opciones">📤</button>
      </div>
      <div class="menu-acciones oculto">
        <button type="button" class="btn-whatsapp" title="Enviar por WhatsApp">WhatsApp</button>
        <button type="button" class="btn-terminar-territorio" style="color: var(--accent-green) !important; font-weight: 600;">Territorio terminado</button>
        <button type="button" class="btn-borrar-datos">Borrar datos</button>
        <button type="button" class="btn-ver-territorio">Ver territorio</button>
        <button type="button" class="btn-eliminar-fila">Eliminar territorio</button>
      </div>
    </td>
  `;

  // Referencias locales a elementos de esta fila
  const btnAcciones = tr.querySelector(".btn-acciones");
  const menuAcciones = tr.querySelector(".menu-acciones");
  const btnBorrarDatos = tr.querySelector(".btn-borrar-datos");
  const btnTerminarTerritorio = tr.querySelector(".btn-terminar-territorio");
  const btnVerTerritorio = tr.querySelector(".btn-ver-territorio");
  const btnEliminar = tr.querySelector(".btn-eliminar-fila");
  const inputNombre = tr.querySelector('[data-field="nombre"]');
  const inputWhatsapp = tr.querySelector('[data-field="whatsapp"]');
  const btnWhatsapp = tr.querySelector(".btn-whatsapp");
  const inputNumero = tr.querySelector('[data-field="numero"]');
  const inputEntrega = tr.querySelector('[data-field="entrega"]');
  const inputDevolucion = tr.querySelector('[data-field="devolucion"]');

  // ── Cambio de fechas → recolorear fila ─────────────
  [inputEntrega, inputDevolucion].forEach(input => {
    if (!input) return;

    input.addEventListener("focus", () => {
      input.type = "date";
    });

    input.addEventListener("blur", () => {
      if (!input.value) {
        input.type = "text";
      }
    });

    input.addEventListener("change", () => {
      aplicarColorFechaInput(input);
      aplicarColorTr(tr);
    });
  });

  // ── Auto-rellenar fecha de devolución al hacer doble clic si está vacío ─────
  inputDevolucion.addEventListener("dblclick", () => {
    if (!inputDevolucion.value) {
      const hoy = new Date().toISOString().split("T")[0];
      inputDevolucion.type = "date";
      inputDevolucion.value = hoy;
      aplicarColorFechaInput(inputDevolucion);
      aplicarColorTr(tr);
      
      // Forzar el guardado automático (trigger blur)
      inputDevolucion.dispatchEvent(new Event("blur"));
    }
  });

  // ── Menú de acciones ───────────────────────────────
  btnAcciones.addEventListener("click", e => {
    e.stopPropagation();
    menuAcciones.classList.toggle("oculto");
  });

  document.addEventListener("click", () => {
    menuAcciones.classList.add("oculto");
  });

  // ── Borrar datos de la fila ─────────────────────────
  btnBorrarDatos.addEventListener("click", async () => {
    const campos = ["nombre", "whatsapp", "entrega", "devolucion"];
    campos.forEach(field => {
      const input = tr.querySelector(`[data-field="${field}"]`);
      if (input) {
        input.value = "";
        // Restablecer el tipo a 'text' para mostrar placeholders y quitar alertas
        if (field === "entrega" || field === "devolucion") {
          input.type = "text";
          input.classList.remove("fecha-alerta");
        }
      }
    });

    // Limpiar los colores de fondo de la fila (tr-rojo, tr-verde)
    aplicarColorTr(tr);

    try {
      await updateDoc(doc(db, "Territorios", id), {
        nombre: "",
        nombreLimpio: "",
        whatsapp: "",
        entrega: "",
        devolucion: ""
      });
    } catch (err) {
      console.error("Error al borrar datos:", err);
      alert("No se pudieron borrar los datos");
    }

    menuAcciones.classList.add("oculto");
  });

  // ── Marcar territorio como terminado ──────────────────
  btnTerminarTerritorio?.addEventListener("click", () => {
    const hoy = new Date().toISOString().split("T")[0];
    inputDevolucion.type = "date";
    inputDevolucion.value = hoy;
    aplicarColorFechaInput(inputDevolucion);
    aplicarColorTr(tr);

    // Forzar el guardado automático disparando el evento de desenfoque (blur)
    inputDevolucion.dispatchEvent(new Event("blur"));

    menuAcciones.classList.add("oculto");
  });

  // ── Abrir visor para este territorio ──────────────────
  btnVerTerritorio?.addEventListener("click", () => {
    const numero = inputNumero?.value || "";
    if (!numero) {
      alert("Introduce un número de territorio primero");
      return;
    }
    const nombre = inputNombre?.value || "";
    const url = nombre
      ? `${window.location.origin}/?cliente=${limpiarTexto(nombre)}&territorio=${numero}`
      : `${window.location.origin}/?territorio=${numero}`;
    window.open(url, "_blank");
    menuAcciones.classList.add("oculto");
  });

  // ── Eliminar territorio definitivamente ─────────────
  btnEliminar.addEventListener("click", async () => {
    if (!confirm("⚠️ ¿Eliminar este territorio DEFINITIVAMENTE?")) return;

    try {
      await deleteDoc(doc(db, "Territorios", id));
      tr.remove();
    } catch (err) {
      console.error("Error al eliminar territorio:", err);
      alert("No se pudo eliminar el territorio");
    }
  });

  // ── Enviar acceso a la aplicación por WhatsApp ────────────────
  btnWhatsapp?.addEventListener("click", async () => {
    if (!inputWhatsapp.value) return;

    const nombreCliente = inputNombre?.value || "";
    const nombreParam = limpiarTexto(nombreCliente);

    // Mensaje invitando a usar e instalar la app
    const mensaje = `Hola ${nombreCliente}, ahora puedes instalar la aplicación "Visor" para ver los territorios que tienes asignados, entra en este enlace:\n\n${window.location.origin}/?cliente=${nombreParam}`;

    const telefono = `34${inputWhatsapp.value.replace(/\D/g, "")}`;
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  });

  // ── Asignación Automática de Contacto y Fecha ───────
  inputNombre?.addEventListener("input", async () => {
    const contacto = window.contactos.find(
      c => c.nombre?.toLowerCase() === inputNombre.value.toLowerCase()
    );

    if (!contacto) return;

    inputWhatsapp.value = contacto.whatsapp || "";

    const inputEntrega = tr.querySelector('[data-field="entrega"]');
    const hoy = new Date().toISOString().split("T")[0];

    // Automáticamente marcamos la fecha de entrega al asignar un contacto
    if (inputEntrega) {
      inputEntrega.value = hoy;
      aplicarColorFechaInput(inputEntrega);
      aplicarColorTr(tr);
    }

    try {
      await updateDoc(doc(db, "Territorios", id), {
        nombre: contacto.nombre,
        nombreLimpio: limpiarTexto(contacto.nombre),
        whatsapp: contacto.whatsapp,
        entrega: hoy
      });

      inputNombre.classList.add("guardado");
      inputWhatsapp.classList.add("guardado");
      if (inputEntrega) inputEntrega.classList.add("guardado");

      setTimeout(() => {
        inputNombre.classList.remove("guardado");
        inputWhatsapp.classList.remove("guardado");
        if (inputEntrega) inputEntrega.classList.remove("guardado");
      }, 800);
    } catch (error) {
      console.error("Error al guardar contacto y fecha:", error);
      inputNombre.classList.add("error");
      inputWhatsapp.classList.add("error");
      if (inputEntrega) inputEntrega.classList.add("error");
    }
  });

  // ── Guardado automático al salir del campo ──────────
  tr.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener("blur", async () => {
      const campo = input.dataset.field;
      if (campo === "nombre") return; // El nombre se guarda desde el evento input

      let valor = input.value?.trim() || "";
      let valorAActualizar = valor;

      if (campo === "numero") {
        const numInt = parseInt(valor, 10);
        if (isNaN(numInt)) {
          alert("El número de territorio debe ser un número válido");
          input.value = data.numero || "";
          return;
        }
        valorAActualizar = numInt;
      }

      try {
        await updateDoc(doc(db, "Territorios", id), { [campo]: valorAActualizar });
        if (campo === "numero") {
          data.numero = valorAActualizar;
        }
        input.classList.add("guardado");
        setTimeout(() => input.classList.remove("guardado"), 800);
        aplicarColorTr(tr);
      } catch (error) {
        console.error(`Error guardando ${campo}:`, error);
        input.classList.add("error");
      }
    });
  });


  aplicarColorFechaInput(inputEntrega);
  aplicarColorFechaInput(inputDevolucion);
  aplicarColorTr(tr);

  elementos.tablaBody.appendChild(tr);
}

// ─────────────────────────────────────────────────
// 8. EVENT LISTENERS PRINCIPALES
// ─────────────────────────────────────────────────

elementos.filtroPoblacion.addEventListener("change", () => {
  const poblacion = elementos.filtroPoblacion.value;

  // ✅ GUARDAR POBLACIÓN SELECCIONADA
  localStorage.setItem("poblacionRegistro", poblacion);

  cargarTablaTerritorios().catch(err =>
    console.error("Error cargando tabla:", err)
  );
});

elementos.btnNuevoTerritorio.addEventListener("click", () => {
  const formContainer = $("form-container");
  const mainGrid = $("main-grid");
  if (formContainer && mainGrid) {
    formContainer.classList.remove("oculto");
    mainGrid.classList.add("con-formulario");
  }

  // Pre-rellenar la población actual si está seleccionada en el filtro
  const selectPoblacionForm = $("poblacion");
  if (selectPoblacionForm && elementos.filtroPoblacion.value) {
    selectPoblacionForm.value = elementos.filtroPoblacion.value;
  }

  const inputNumero = $("numero");
  if (inputNumero) {
    inputNumero.focus();
  }
});

// Búsqueda en tiempo real
const buscarInput = $("buscarInput");
if (buscarInput) {
  buscarInput.addEventListener("input", () => {
    const qText = buscarInput.value.toLowerCase().trim();
    const filas = elementos.tablaBody.querySelectorAll("tr");
    filas.forEach(fila => {
      const inputNum = fila.querySelector('[data-field="numero"]');
      const inputNom = fila.querySelector('[data-field="nombre"]');
      const numVal = inputNum ? inputNum.value.toLowerCase() : "";
      const nomVal = inputNom ? inputNom.value.toLowerCase() : "";
      
      if (numVal.includes(qText) || nomVal.includes(qText)) {
        fila.style.display = "";
      } else {
        fila.style.display = "none";
      }
    });
  });
}

// Toggler para el grupo de aviso
const tieneAvisoCheckbox = $("tieneAviso");
const avisoGroup = $("avisoGroup");
if (tieneAvisoCheckbox && avisoGroup) {
  tieneAvisoCheckbox.addEventListener("change", () => {
    avisoGroup.style.display = tieneAvisoCheckbox.checked ? "block" : "none";
  });
}

// Envío del formulario de Nuevo Territorio
const formNuevo = $("territorioForm");
if (formNuevo) {
  formNuevo.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const numeroStr = $("numero").value.trim();
    const poblacion = $("poblacion").value;
    const nombre = $("publicador").value.trim();
    const entrega = $("fechaAsignacion").value;
    const devolucion = $("fechaDevolucion").value;
    const tieneAviso = $("tieneAviso").checked;
    const aviso = $("aviso").value.trim();

    if (!numeroStr || !poblacion) {
      alert("Número y población son obligatorios");
      return;
    }

    const numero = parseInt(numeroStr, 10);
    if (isNaN(numero)) {
      alert("El número de territorio debe ser un número válido");
      return;
    }

    const contacto = window.contactos.find(
      c => c.nombre?.toLowerCase() === nombre.toLowerCase()
    );
    const whatsapp = contacto ? (contacto.whatsapp || "") : "";

    try {
      await addDoc(collection(db, "Territorios"), {
        numero,
        poblacion,
        nombre,
        nombreLimpio: limpiarTexto(nombre),
        whatsapp,
        entrega,
        devolucion,
        tieneAviso,
        aviso,
        creado: new Date()
      });

      formNuevo.reset();
      if (avisoGroup) avisoGroup.style.display = "none";
      
      // Ocultar el formulario
      const formContainer = $("form-container");
      const mainGrid = $("main-grid");
      if (formContainer && mainGrid) {
        formContainer.classList.add("oculto");
        mainGrid.classList.remove("con-formulario");
      }
      
      // Si el territorio creado es de la población seleccionada, recargar
      if (elementos.filtroPoblacion.value === poblacion) {
        await cargarTablaTerritorios();
      } else {
        // Cambiar filtro para mostrar la población del nuevo territorio
        elementos.filtroPoblacion.value = poblacion;
        localStorage.setItem("poblacionRegistro", poblacion);
        await cargarTablaTerritorios();
      }
    } catch (err) {
      console.error("Error guardando territorio desde formulario:", err);
      alert("No se pudo guardar el territorio");
    }
  });
}

// Botón de Cancelar en el formulario
const btnCancelarForm = $("btnCancelar");
if (btnCancelarForm && formNuevo) {
  btnCancelarForm.addEventListener("click", () => {
    formNuevo.reset();
    if (avisoGroup) avisoGroup.style.display = "none";
    
    const formContainer = $("form-container");
    const mainGrid = $("main-grid");
    if (formContainer && mainGrid) {
      formContainer.classList.add("oculto");
      mainGrid.classList.remove("con-formulario");
    }
  });
}

// ─────────────────────────────────────────────────
// 9. INICIALIZACIÓN
// ─────────────────────────────────────────────────
async function inicializar() {
  try {
    crearDatalistContactos();
    rellenarSelectPoblaciones(elementos.filtroPoblacion);
    
    const selectPoblacionForm = $("poblacion");
    if (selectPoblacionForm) {
      rellenarSelectPoblaciones(selectPoblacionForm);
    }
    
    restaurarPoblacionRegistro();

    if (elementos.filtroPoblacion.value) {
      await cargarTablaTerritorios();
    }
  } catch (error) {
    console.error("Error al inicializar la aplicación:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", inicializar);
} else {
  inicializar();
}
