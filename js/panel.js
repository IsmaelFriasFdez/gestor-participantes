// =====================================================================
// panel.js
// Documento incrustado en el iframe. Recibe el resumen por postMessage,
// lo valida y construye su propio DOM. La página principal no toca
// este documento directamente.
// =====================================================================

const ORIGEN_PRINCIPAL = location.origin;
const contenedorResumen = document.getElementById("resumen");

function esEnteroNoNegativo(valor) {
  return Number.isInteger(valor) && valor >= 0;
}

/**
 * Comprueba la estructura, los tipos y los valores del mensaje recibido.
 * @param {*} datos
 * @returns {boolean}
 */
function esResumenValido(datos) {
  if (datos === null || typeof datos !== "object") return false;
  if (datos.tipo !== "resumen") return false;
  if (!esEnteroNoNegativo(datos.total)) return false;
  if (!esEnteroNoNegativo(datos.presencial)) return false;
  if (!esEnteroNoNegativo(datos.online)) return false;
  if (datos.presencial + datos.online !== datos.total) return false;

  if (datos.total === 0) {
    return datos.ultimo === null;
  }

  const ultimo = datos.ultimo;
  if (ultimo === null || typeof ultimo !== "object") return false;
  if (typeof ultimo.nombre !== "string") return false;
  const nombre = ultimo.nombre.trim();
  if (nombre.length < 2 || nombre.length > 60) return false;
  return esFechaIsoValida(ultimo.fecha);
}

function anadirFila(lista, etiqueta, valor) {
  const termino = document.createElement("dt");
  termino.textContent = etiqueta;
  const definicion = document.createElement("dd");
  definicion.textContent = valor;
  lista.append(termino, definicion);
}

function mostrarResumen(datos) {
  contenedorResumen.textContent = ""; // elimina el contenido anterior

  if (datos.total === 0) {
    const vacio = document.createElement("p");
    vacio.classList.add("vacio");
    vacio.textContent = "Sin inscripciones";
    contenedorResumen.append(vacio);
    return;
  }

  const lista = document.createElement("dl");
  anadirFila(lista, "Total de inscritos", String(datos.total));
  anadirFila(lista, "Presencial", String(datos.presencial));
  anadirFila(lista, "Online", String(datos.online));
  anadirFila(lista, "Última inscripción",
    datos.ultimo.nombre + " (" + formatearFecha(datos.ultimo.fecha) + ")");
  contenedorResumen.append(lista);
}

function recibirResumen(evento) {
  if (evento.origin !== ORIGEN_PRINCIPAL) return;
  if (evento.source !== window.parent) return;
  if (!esResumenValido(evento.data)) return; // mensajes inválidos: se ignoran sin tocar la interfaz
  mostrarResumen(evento.data);
}

if (contenedorResumen !== null) {
  window.addEventListener("message", recibirResumen);
  // Aviso de preparación DESPUÉS de instalar el receptor
  window.parent.postMessage({ tipo: "panel-listo" }, ORIGEN_PRINCIPAL);
} else {
  console.error("No se encuentra #resumen en panel.html.");
}
