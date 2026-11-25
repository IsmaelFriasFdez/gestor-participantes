// =====================================================================
// app.js
// Código de interfaz: lee el formulario, actualiza el DOM, gestiona el
// iframe, las cookies y la ventana de ayuda. Los cálculos y la validación
// están en logica.js; las cookies en cookies.js.
// Se carga con defer, así que el DOM ya existe cuando se ejecuta.
// =====================================================================

const ORIGEN = location.origin;
const DIAS_PREFERENCIAS = 30;
const COOKIE_TEMA = "gp_tema";
const COOKIE_TAMANO = "gp_tamano";

// ---------- Estado de la aplicación ----------
let participantes = [];
let panelListo = false;
let ventanaAyuda = null;

// ---------- Referencias al DOM ----------
const formularioAlta = document.querySelector("#form-alta");
const campoNombre = document.getElementById("nombre");
const campoEdad = document.getElementById("edad");
const campoTipo = document.getElementById("tipo");
const campoModalidad = document.getElementById("modalidad");
const campoExperiencia = document.getElementById("experiencia");
const resumenErrores = document.getElementById("resumen-errores");
const listaErrores = document.getElementById("lista-errores");
const mensajeAlta = document.getElementById("mensaje-alta");

const campoBusqueda = document.getElementById("busqueda");
const filtroModalidad = document.getElementById("filtro-modalidad");
const mensajeLista = document.getElementById("mensaje-lista");
const contenedorTarjetas = document.getElementById("lista-participantes");

const zonaEstadisticas = document.querySelector("#estadisticas");

const visorPanel = document.getElementById("panel-evento");

const areaJSON = document.getElementById("area-json");
const botonExportar = document.getElementById("boton-exportar");
const botonImportar = document.getElementById("boton-importar");
const mensajeJSON = document.getElementById("mensaje-json");

const formularioPreferencias = document.querySelector("#form-preferencias");
const selectTema = document.getElementById("pref-tema");
const selectTamano = document.getElementById("pref-tamano");
const botonRestablecer = document.getElementById("boton-restablecer");
const estadoPreferencias = document.getElementById("estado-preferencias");

const botonAbrirAyuda = document.getElementById("boton-abrir-ayuda");
const botonCerrarAyuda = document.getElementById("boton-cerrar-ayuda");
const estadoAyuda = document.getElementById("estado-ayuda");

// Campos del formulario de alta indexados por el nombre del dato
const camposAlta = {
  nombre: campoNombre,
  edad: campoEdad,
  tipo: campoTipo,
  modalidad: campoModalidad,
  experiencia: campoExperiencia
};

// =====================================================================
// Datos iniciales
// =====================================================================

/**
 * Añade a la lista un participante ya validado con un id nuevo.
 * Devuelve el participante creado o null si no se pudo generar el id.
 */
function anadirParticipante(lista, datosValidados, fechaIso) {
  const id = generarId(lista);
  if (id === null) {
    return null;
  }
  const nuevo = {
    id: id,
    nombre: datosValidados.nombre,
    edad: datosValidados.edad,
    tipo: datosValidados.tipo,
    modalidad: datosValidados.modalidad,
    experiencia: datosValidados.experiencia,
    fechaInscripcion: fechaIso
  };
  lista.push(nuevo);
  return nuevo;
}

function crearParticipantesIniciales() {
  const lista = [];
  anadirParticipante(lista,
    { nombre: "Ana García", edad: 17, tipo: "estudiante", modalidad: "presencial", experiencia: 4 },
    "2026-10-08T08:30:00.000Z");
  anadirParticipante(lista,
    { nombre: "Luis Martín", edad: 34, tipo: "profesional", modalidad: "online", experiencia: 8.5 },
    "2026-10-09T15:45:00.000Z");
  anadirParticipante(lista,
    { nombre: "Carmen Ruiz", edad: 52, tipo: "invitado", modalidad: "presencial", experiencia: 2 },
    "2026-10-10T10:00:00.000Z");
  return lista;
}

// =====================================================================
// Formulario de alta
// =====================================================================

function limpiarErrores() {
  const parrafosError = document.querySelectorAll("#form-alta .error-campo");
  for (let i = 0; i < parrafosError.length; i++) {
    parrafosError[i].textContent = "";
  }
  const camposMarcados = document.querySelectorAll("#form-alta [aria-invalid]");
  for (let i = 0; i < camposMarcados.length; i++) {
    camposMarcados[i].removeAttribute("aria-invalid");
  }
  listaErrores.textContent = "";
  resumenErrores.classList.add("oculto");
}

function mostrarErrores(errores) {
  for (const campo of CAMPOS_FORMULARIO) {
    const parrafo = document.getElementById("error-" + campo);
    const mensaje = errores[campo] ?? "";
    if (parrafo !== null) {
      parrafo.textContent = mensaje;
    }
    if (mensaje !== "") {
      camposAlta[campo].setAttribute("aria-invalid", "true");
      const elemento = document.createElement("li");
      elemento.textContent = mensaje;
      listaErrores.append(elemento);
    }
  }
  resumenErrores.classList.remove("oculto");
}

function gestionarAlta(evento) {
  evento.preventDefault();
  limpiarErrores();
  mensajeAlta.textContent = "";

  // Los valores de los controles siempre llegan como texto
  const datos = {
    nombre: campoNombre.value,
    edad: campoEdad.value,
    tipo: campoTipo.value,
    modalidad: campoModalidad.value,
    experiencia: campoExperiencia.value
  };

  const resultado = validarParticipante(datos);
  if (!resultado.valido) {
    // No se limpia el formulario: el usuario conserva lo que escribió
    mostrarErrores(resultado.errores);
    mensajeAlta.textContent = "No se ha añadido el participante.";
    return;
  }

  const nuevo = anadirParticipante(participantes, resultado.participante, new Date().toISOString());
  if (nuevo === null) {
    mensajeAlta.textContent = "No se ha podido generar un identificador libre. Inténtalo de nuevo.";
    return;
  }

  formularioAlta.reset();
  campoNombre.focus();
  mensajeAlta.textContent = "Participante añadido: " + nuevo.nombre + ".";
  actualizarTodo();
}

// =====================================================================
// Tarjetas y listado
// =====================================================================

function anadirDato(lista, etiqueta, valor) {
  const termino = document.createElement("dt");
  termino.textContent = etiqueta;
  const definicion = document.createElement("dd");
  definicion.textContent = valor;
  lista.append(termino, definicion);
}

function crearEtiqueta(texto, clase) {
  const etiqueta = document.createElement("span");
  etiqueta.classList.add("etiqueta", clase);
  etiqueta.textContent = texto;
  return etiqueta;
}

/**
 * Crea la tarjeta de un participante con createElement, textContent y append.
 * Las clases y los atributos data-* representan sus estados.
 */
function crearTarjeta(participante) {
  const claseEdad = clasificarEdad(participante.edad);
  const claseExperiencia = clasificarExperiencia(participante.experiencia);

  const tarjeta = document.createElement("article");
  tarjeta.classList.add("tarjeta", claseEdad, "exp-" + claseExperiencia);
  tarjeta.setAttribute("data-id", String(participante.id));
  tarjeta.setAttribute("data-edad", claseEdad);
  tarjeta.setAttribute("data-experiencia", claseExperiencia);
  tarjeta.setAttribute("data-modalidad", participante.modalidad);

  const titulo = document.createElement("h3");
  titulo.textContent = participante.nombre;

  const etiquetas = document.createElement("p");
  etiquetas.classList.add("etiquetas");
  etiquetas.append(
    crearEtiqueta(claseEdad === "menor" ? "Menor de edad" : "Mayor de edad", "etiqueta-" + claseEdad),
    crearEtiqueta("Experiencia " + claseExperiencia, "etiqueta-" + claseExperiencia)
  );

  const datos = document.createElement("dl");
  anadirDato(datos, "Id", String(participante.id));
  anadirDato(datos, "Edad", participante.edad + " años");
  anadirDato(datos, "Tipo", participante.tipo);
  anadirDato(datos, "Modalidad", participante.modalidad);
  anadirDato(datos, "Experiencia", participante.experiencia + " / 10");
  anadirDato(datos, "Inscripción", formatearFecha(participante.fechaInscripcion));

  const botonBorrar = document.createElement("button");
  botonBorrar.type = "button";
  botonBorrar.classList.add("boton-borrar");
  botonBorrar.textContent = "Borrar";
  botonBorrar.setAttribute("aria-label", "Borrar a " + participante.nombre);
  botonBorrar.addEventListener("click", function () {
    borrarParticipante(participante.id, tarjeta);
  });

  tarjeta.append(titulo, etiquetas, datos, botonBorrar);
  return tarjeta;
}

function actualizarMensajeLista(numeroVisibles) {
  if (participantes.length === 0) {
    mensajeLista.textContent = "No hay participantes inscritos.";
  } else if (numeroVisibles === 0) {
    mensajeLista.textContent = "No hay participantes que coincidan con la búsqueda y el filtro.";
  } else {
    mensajeLista.textContent = "Mostrando " + numeroVisibles + " de " + participantes.length + " participantes.";
  }
}

function mostrarListado() {
  // Se eliminan las tarjetas actuales y se vuelven a crear las que pasan el filtro
  const tarjetasActuales = contenedorTarjetas.querySelectorAll(".tarjeta");
  for (let i = 0; i < tarjetasActuales.length; i++) {
    tarjetasActuales[i].remove();
  }

  const visibles = filtrarParticipantes(participantes, campoBusqueda.value, filtroModalidad.value);
  for (const participante of visibles) {
    contenedorTarjetas.append(crearTarjeta(participante));
  }
  actualizarMensajeLista(visibles.length);
}

function borrarParticipante(id, tarjeta) {
  const indice = buscarIndicePorId(participantes, id);
  if (indice === -1) {
    return;
  }

  const confirmado = confirm("¿Seguro que quieres borrar a " + participantes[indice].nombre
    + "? Esta acción no se puede deshacer.");
  if (!confirmado) {
    return; // Cancelar deja la aplicación sin cambios
  }

  participantes.splice(indice, 1);
  tarjeta.remove();

  // Nueva consulta: una NodeList guardada antes no reflejaría el borrado
  const visibles = contenedorTarjetas.querySelectorAll(".tarjeta").length;
  actualizarMensajeLista(visibles);
  mostrarEstadisticas();
  enviarResumenPanel();
}

// =====================================================================
// Estadísticas
// =====================================================================

function escribirEstadistica(id, texto) {
  const elemento = zonaEstadisticas.querySelector("#" + id);
  if (elemento !== null) {
    elemento.textContent = texto;
  }
}

function formatearEdad(valor) {
  return valor === null ? "Sin datos" : valor + " años";
}

function mostrarEstadisticas() {
  const estadisticas = calcularEstadisticas(participantes);

  escribirEstadistica("est-total", String(estadisticas.total));
  escribirEstadistica("est-menores", String(estadisticas.menores));
  escribirEstadistica("est-mayores", String(estadisticas.mayores));
  escribirEstadistica("est-edad-media", estadisticas.edadMedia === null
    ? "Sin datos"
    : formatearMedia(estadisticas.edadMedia) + " años");
  escribirEstadistica("est-edad-minima", formatearEdad(estadisticas.edadMinima));
  escribirEstadistica("est-edad-maxima", formatearEdad(estadisticas.edadMaxima));
  escribirEstadistica("est-presencial", String(estadisticas.porModalidad.presencial));
  escribirEstadistica("est-online", String(estadisticas.porModalidad.online));
  escribirEstadistica("est-estudiante", String(estadisticas.porTipo.estudiante));
  escribirEstadistica("est-profesional", String(estadisticas.porTipo.profesional));
  escribirEstadistica("est-invitado", String(estadisticas.porTipo.invitado));
  escribirEstadistica("est-experiencia", formatearMedia(estadisticas.experienciaMediaPresencial));
  escribirEstadistica("est-primer-menor", estadisticas.primerMenor === null
    ? "No hay ningún menor de edad"
    : estadisticas.primerMenor.nombre);
}

// =====================================================================
// Panel del evento (iframe + postMessage)
// =====================================================================

function enviarResumenPanel() {
  if (!panelListo || visorPanel.contentWindow === null) {
    return;
  }
  visorPanel.contentWindow.postMessage(crearResumenPanel(participantes), ORIGEN);
}

function recibirMensaje(evento) {
  if (evento.origin !== ORIGEN) return;
  if (evento.source !== visorPanel.contentWindow) return;
  const datos = evento.data;
  if (datos === null || typeof datos !== "object") return;
  if (datos.tipo !== "panel-listo") return;

  panelListo = true;
  enviarResumenPanel();
}

function actualizarTodo() {
  mostrarListado();
  mostrarEstadisticas();
  enviarResumenPanel();
}

// =====================================================================
// JSON
// =====================================================================

function mostrarMensajeJSON(texto, esError) {
  mensajeJSON.textContent = texto;
  mensajeJSON.classList.toggle("error", esError);
}

function exportarJSON() {
  areaJSON.value = JSON.stringify(participantes);
  mostrarMensajeJSON("Colección exportada: " + participantes.length + " participante(s).", false);
}

function importarJSON() {
  const resultado = importarColeccion(areaJSON.value);
  if (!resultado.valido) {
    // Se conserva íntegramente la colección anterior
    mostrarMensajeJSON("No se ha importado nada. " + resultado.mensaje, true);
    return;
  }
  participantes = resultado.participantes;
  actualizarTodo();
  mostrarMensajeJSON(resultado.mensaje, false);
}

// =====================================================================
// Preferencias (cookies)
// =====================================================================

function aplicarPreferencias(tema, tamano) {
  document.body.classList.toggle("tema-oscuro", tema === "oscuro");
  document.body.classList.toggle("letra-grande", tamano === "grande");
  selectTema.value = tema;
  selectTamano.value = tamano;
}

function cargarPreferencias() {
  const temaLeido = leerCookie(COOKIE_TEMA);
  const tamanoLeido = leerCookie(COOKIE_TAMANO);
  const tema = normalizarTema(temaLeido);
  const tamano = normalizarTamano(tamanoLeido);
  aplicarPreferencias(tema, tamano);

  const recuperadas = temaLeido === tema && tamanoLeido === tamano;
  estadoPreferencias.textContent = recuperadas
    ? "Preferencias recuperadas de las cookies."
    : "No hay preferencias guardadas válidas: se aplican tema claro y letra normal donde falten.";
}

function guardarPreferencias(evento) {
  evento.preventDefault();
  const tema = normalizarTema(selectTema.value);
  const tamano = normalizarTamano(selectTamano.value);
  aplicarPreferencias(tema, tamano);

  guardarCookie(COOKIE_TEMA, tema, DIAS_PREFERENCIAS);
  guardarCookie(COOKIE_TAMANO, tamano, DIAS_PREFERENCIAS);

  // La asignación a document.cookie no confirma nada: se comprueba leyendo
  const guardadas = leerCookie(COOKIE_TEMA) === tema && leerCookie(COOKIE_TAMANO) === tamano;
  estadoPreferencias.textContent = guardadas
    ? "Preferencias aplicadas y guardadas durante 30 días."
    : "Preferencias aplicadas solo durante esta visita: no se ha podido confirmar su guardado.";
}

function restablecerPreferencias() {
  borrarCookie(COOKIE_TEMA);
  borrarCookie(COOKIE_TAMANO);
  aplicarPreferencias("claro", "normal");

  const borradas = leerCookie(COOKIE_TEMA) === null && leerCookie(COOKIE_TAMANO) === null;
  estadoPreferencias.textContent = borradas
    ? "Preferencias restablecidas y cookies eliminadas."
    : "Aspecto restablecido, pero no se ha confirmado el borrado de las cookies.";
}

// =====================================================================
// Ventana de ayuda
// =====================================================================

function abrirAyuda() {
  if (ventanaAyuda !== null && !ventanaAyuda.closed) {
    ventanaAyuda.focus();
    estadoAyuda.textContent = "La ayuda ya estaba abierta: se reutiliza la misma ventana.";
    return;
  }

  ventanaAyuda = window.open("ayuda.html", "ayudaParticipantes");
  estadoAyuda.textContent = ventanaAyuda === null
    ? "El navegador ha bloqueado la ventana de ayuda. Permite las ventanas emergentes para este sitio."
    : "Ayuda abierta en otra ventana o pestaña.";
}

function cerrarAyuda() {
  if (ventanaAyuda !== null && !ventanaAyuda.closed) {
    ventanaAyuda.close();
    ventanaAyuda = null;
    estadoAyuda.textContent = "Ventana de ayuda cerrada.";
  } else {
    estadoAyuda.textContent = "No hay ninguna ventana de ayuda abierta.";
  }
}

// =====================================================================
// Arranque
// =====================================================================

function comprobarElementos(elementos) {
  for (const elemento of elementos) {
    if (elemento === null) {
      return false;
    }
  }
  return true;
}

function iniciar() {
  const elementos = [
    formularioAlta, campoNombre, campoEdad, campoTipo, campoModalidad, campoExperiencia,
    resumenErrores, listaErrores, mensajeAlta, campoBusqueda, filtroModalidad, mensajeLista,
    contenedorTarjetas, zonaEstadisticas, visorPanel, areaJSON, botonExportar, botonImportar,
    mensajeJSON, formularioPreferencias, selectTema, selectTamano, botonRestablecer,
    estadoPreferencias, botonAbrirAyuda, botonCerrarAyuda, estadoAyuda
  ];
  if (!comprobarElementos(elementos)) {
    console.error("Falta algún elemento en index.html: la aplicación no se puede iniciar.");
    return;
  }

  cargarPreferencias();

  participantes = crearParticipantesIniciales();
  mostrarListado();
  mostrarEstadisticas();

  formularioAlta.addEventListener("submit", gestionarAlta);
  campoBusqueda.addEventListener("input", mostrarListado);
  filtroModalidad.addEventListener("change", mostrarListado);
  botonExportar.addEventListener("click", exportarJSON);
  botonImportar.addEventListener("click", importarJSON);
  formularioPreferencias.addEventListener("submit", guardarPreferencias);
  botonRestablecer.addEventListener("click", restablecerPreferencias);
  botonAbrirAyuda.addEventListener("click", abrirAyuda);
  botonCerrarAyuda.addEventListener("click", cerrarAyuda);

  // Primero se instala el receptor y después se carga el iframe (sesión 7)
  window.addEventListener("message", recibirMensaje);
  visorPanel.src = "panel.html";
}

iniciar();
