// =====================================================================
// logica.js
// Validación, clasificación y cálculos del gestor de participantes.
// Este archivo NO lee ni modifica el DOM: todas las funciones reciben
// los datos por parámetros y devuelven un resultado.
// =====================================================================

const ID_MINIMO = 100000;
const ID_MAXIMO = 999999;
const MAX_INTENTOS_ID = 1000;
const NOMBRE_MINIMO = 2;
const NOMBRE_MAXIMO = 60;
const EDAD_MAXIMA = 120;
const EXPERIENCIA_MAXIMA = 10;
const EDAD_MAYORIA = 18;
const CAMPOS_FORMULARIO = ["nombre", "edad", "tipo", "modalidad", "experiencia"];

// ---------------------------------------------------------------------
// Utilidades de validación
// ---------------------------------------------------------------------

/**
 * Indica si un valor debe considerarse vacío.
 * Se comprueba ANTES de convertir con Number, porque Number("") es 0.
 * @param {*} valor
 * @returns {boolean}
 */
function esVacio(valor) {
  if (valor === undefined || valor === null) {
    return true;
  }
  if (typeof valor === "string") {
    return valor.trim() === "";
  }
  return false;
}

/**
 * Convierte de forma explícita un valor a número.
 * Solo admite números o cadenas; cualquier otro tipo produce NaN
 * (así evitamos que Number(true) se convierta en 1).
 * Number exige que la cadena completa sea numérica: "18abc" -> NaN.
 * @param {*} valor
 * @returns {number}
 */
function convertirNumero(valor) {
  if (typeof valor === "number") {
    return valor;
  }
  if (typeof valor === "string") {
    return Number(valor.trim());
  }
  return NaN;
}

function esTipoValido(tipo) {
  return tipo === "estudiante" || tipo === "profesional" || tipo === "invitado";
}

function esModalidadValida(modalidad) {
  return modalidad === "presencial" || modalidad === "online";
}

/**
 * Comprueba que un texto es una fecha ISO válida, como la que produce
 * toISOString(): "2026-10-08T08:30:00.000Z".
 * @param {*} texto
 * @returns {boolean}
 */
function esFechaIsoValida(texto) {
  if (typeof texto !== "string") {
    return false;
  }
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) {
    return false;
  }
  // Si al volver a convertirla a ISO obtenemos el mismo texto, el formato es el esperado.
  return fecha.toISOString() === texto;
}

/**
 * Valida los datos de un participante (procedentes del formulario o de un JSON).
 * @param {object} datos Objeto con nombre, edad, tipo, modalidad y experiencia.
 * @returns {{valido: boolean, errores: object, participante: object|null}}
 *   errores tiene una propiedad por cada campo incorrecto con su mensaje.
 *   participante contiene los datos ya normalizados si todo es válido.
 */
function validarParticipante(datos) {
  const errores = {};

  if (datos === null || typeof datos !== "object") {
    errores.general = "Los datos del participante no tienen el formato esperado.";
    return { valido: false, errores: errores, participante: null };
  }

  // Nombre: entre 2 y 60 caracteres después de trim
  let nombre = "";
  if (typeof datos.nombre !== "string" || datos.nombre.trim() === "") {
    errores.nombre = "El nombre es obligatorio.";
  } else {
    nombre = datos.nombre.trim();
    if (nombre.length < NOMBRE_MINIMO || nombre.length > NOMBRE_MAXIMO) {
      errores.nombre = "El nombre debe tener entre 2 y 60 caracteres.";
    }
  }

  // Edad: no vacía, numérica, finita, entera, entre 0 y 120 (0 es válida)
  let edad = NaN;
  if (esVacio(datos.edad)) {
    errores.edad = "La edad es obligatoria.";
  } else {
    edad = convertirNumero(datos.edad);
    if (!Number.isFinite(edad)) {
      errores.edad = "La edad debe ser un número (sin letras ni símbolos).";
    } else if (!Number.isInteger(edad)) {
      errores.edad = "La edad debe ser un número entero.";
    } else if (edad < 0 || edad > EDAD_MAXIMA) {
      errores.edad = "La edad debe estar entre 0 y 120.";
    }
  }

  // Tipo y modalidad: lista cerrada de valores
  const tipo = typeof datos.tipo === "string" ? datos.tipo.trim().toLowerCase() : "";
  if (!esTipoValido(tipo)) {
    errores.tipo = "Elige un tipo válido: estudiante, profesional o invitado.";
  }

  const modalidad = typeof datos.modalidad === "string" ? datos.modalidad.trim().toLowerCase() : "";
  if (!esModalidadValida(modalidad)) {
    errores.modalidad = "Elige una modalidad válida: presencial u online.";
  }

  // Experiencia: no vacía, numérica, finita, entre 0 y 10, admite decimales
  let experiencia = NaN;
  if (esVacio(datos.experiencia)) {
    errores.experiencia = "La experiencia es obligatoria.";
  } else {
    experiencia = convertirNumero(datos.experiencia);
    if (!Number.isFinite(experiencia)) {
      errores.experiencia = "La experiencia debe ser un número. Usa punto para los decimales (por ejemplo 7.5).";
    } else if (experiencia < 0 || experiencia > EXPERIENCIA_MAXIMA) {
      errores.experiencia = "La experiencia debe estar entre 0 y 10.";
    }
  }

  const valido = errores.nombre === undefined
    && errores.edad === undefined
    && errores.tipo === undefined
    && errores.modalidad === undefined
    && errores.experiencia === undefined;

  return {
    valido: valido,
    errores: errores,
    participante: valido
      ? { nombre: nombre, edad: edad, tipo: tipo, modalidad: modalidad, experiencia: experiencia }
      : null
  };
}

/**
 * Une en un solo texto los mensajes de error, en el orden de los campos.
 * @param {object} errores
 * @returns {string}
 */
function unirErrores(errores) {
  const mensajes = [];
  if (errores.general !== undefined) {
    mensajes.push(errores.general);
  }
  for (const campo of CAMPOS_FORMULARIO) {
    if (errores[campo] !== undefined) {
      mensajes.push(errores[campo]);
    }
  }
  return mensajes.join(" ");
}

// ---------------------------------------------------------------------
// Identificadores
// ---------------------------------------------------------------------

function existeId(participantes, id) {
  for (const participante of participantes) {
    if (participante.id === id) {
      return true;
    }
  }
  return false;
}

/**
 * Genera un identificador entero entre 100000 y 999999 que no esté en la colección.
 * Usa do...while con un límite de intentos para no bloquear nunca la pestaña.
 * @param {Array} participantes
 * @returns {number|null} El identificador o null si se agotan los intentos.
 */
function generarId(participantes) {
  let intentos = 0;
  let candidato;
  let repetido;

  do {
    candidato = Math.floor(Math.random() * (ID_MAXIMO - ID_MINIMO + 1)) + ID_MINIMO;
    repetido = existeId(participantes, candidato);
    intentos += 1;
  } while (repetido && intentos < MAX_INTENTOS_ID);

  return repetido ? null : candidato;
}

/**
 * Devuelve la posición de un participante en la colección o -1.
 */
function buscarIndicePorId(participantes, id) {
  for (let i = 0; i < participantes.length; i++) {
    if (participantes[i].id === id) {
      return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------
// Clasificaciones
// ---------------------------------------------------------------------

function clasificarEdad(edad) {
  return edad < EDAD_MAYORIA ? "menor" : "mayor";
}

function clasificarExperiencia(experiencia) {
  if (experiencia < 4) {
    return "inicial";
  } else if (experiencia < 7) {
    return "intermedia";
  } else {
    return "avanzada";
  }
}

// ---------------------------------------------------------------------
// Búsqueda y filtro
// ---------------------------------------------------------------------

/**
 * Devuelve un array nuevo con los participantes que coinciden con el texto
 * (sin distinguir mayúsculas y minúsculas) y con la modalidad elegida.
 * @param {Array} participantes
 * @param {string} texto Texto buscado en el nombre.
 * @param {string} modalidad "todas", "presencial" u "online".
 * @returns {Array}
 */
function filtrarParticipantes(participantes, texto, modalidad) {
  const busqueda = texto.trim().toLowerCase();
  const resultado = [];

  for (const participante of participantes) {
    const coincideNombre = participante.nombre.toLowerCase().includes(busqueda);
    const coincideModalidad = modalidad === "todas" || participante.modalidad === modalidad;
    if (coincideNombre && coincideModalidad) {
      resultado.push(participante);
    }
  }
  return resultado;
}

// ---------------------------------------------------------------------
// Estadísticas
// ---------------------------------------------------------------------

/**
 * Localiza al primer menor de edad en el orden de la colección.
 * Usa break para dejar de recorrer en cuanto lo encuentra.
 * @returns {object|null}
 */
function buscarPrimerMenor(participantes) {
  let primerMenor = null;
  for (const participante of participantes) {
    if (clasificarEdad(participante.edad) === "menor") {
      primerMenor = participante;
      break;
    }
  }
  return primerMenor;
}

/**
 * Calcula las estadísticas de la colección completa con bucles,
 * contadores y acumuladores. Los valores que no se pueden calcular
 * se devuelven como null (nunca NaN ni Infinity).
 * @param {Array} participantes
 * @returns {object}
 */
function calcularEstadisticas(participantes) {
  let menores = 0;
  let mayores = 0;
  let sumaEdades = 0;
  let edadMinima = null;
  let edadMaxima = null;
  const porModalidad = { presencial: 0, online: 0 };
  const porTipo = { estudiante: 0, profesional: 0, invitado: 0 };

  for (const participante of participantes) {
    if (clasificarEdad(participante.edad) === "menor") {
      menores += 1;
    } else {
      mayores += 1;
    }

    sumaEdades += participante.edad;

    if (edadMinima === null || participante.edad < edadMinima) {
      edadMinima = participante.edad;
    }
    if (edadMaxima === null || participante.edad > edadMaxima) {
      edadMaxima = participante.edad;
    }

    if (participante.modalidad === "presencial") {
      porModalidad.presencial += 1;
    } else {
      porModalidad.online += 1;
    }

    switch (participante.tipo) {
      case "estudiante":
        porTipo.estudiante += 1;
        break;
      case "profesional":
        porTipo.profesional += 1;
        break;
      case "invitado":
        porTipo.invitado += 1;
        break;
      default:
        // No debería ocurrir: los datos se validan antes de entrar en la colección.
        break;
    }
  }

  const total = participantes.length;
  const edadMedia = total > 0 ? sumaEdades / total : null;

  // Experiencia media de los presenciales: continue omite a los online
  let sumaExperiencia = 0;
  let presenciales = 0;
  for (let i = 0; i < participantes.length; i++) {
    if (participantes[i].modalidad === "online") {
      continue;
    }
    sumaExperiencia += participantes[i].experiencia;
    presenciales += 1;
  }
  const experienciaMediaPresencial = presenciales > 0 ? sumaExperiencia / presenciales : null;

  return {
    total: total,
    menores: menores,
    mayores: mayores,
    edadMedia: edadMedia,
    edadMinima: edadMinima,
    edadMaxima: edadMaxima,
    porModalidad: porModalidad,
    porTipo: porTipo,
    experienciaMediaPresencial: experienciaMediaPresencial,
    primerMenor: buscarPrimerMenor(participantes)
  };
}

// ---------------------------------------------------------------------
// Panel del iframe
// ---------------------------------------------------------------------

/**
 * Devuelve el participante con la fecha de inscripción más reciente o null.
 * Las fechas se comparan por su valor numérico (getTime).
 */
function buscarMasReciente(participantes) {
  let masReciente = null;
  let tiempoMasReciente = 0;
  for (const participante of participantes) {
    const tiempo = new Date(participante.fechaInscripcion).getTime();
    if (masReciente === null || tiempo > tiempoMasReciente) {
      masReciente = participante;
      tiempoMasReciente = tiempo;
    }
  }
  return masReciente;
}

/**
 * Construye el mensaje que se envía al panel mediante postMessage.
 */
function crearResumenPanel(participantes) {
  const estadisticas = calcularEstadisticas(participantes);
  const masReciente = buscarMasReciente(participantes);
  return {
    tipo: "resumen",
    total: estadisticas.total,
    presencial: estadisticas.porModalidad.presencial,
    online: estadisticas.porModalidad.online,
    ultimo: masReciente === null
      ? null
      : { nombre: masReciente.nombre, fecha: masReciente.fechaInscripcion }
  };
}

// ---------------------------------------------------------------------
// Importación JSON
// ---------------------------------------------------------------------

function crearFalloImportacion(mensaje) {
  return { valido: false, mensaje: mensaje, participantes: null };
}

/**
 * Interpreta un texto JSON y comprueba que es una colección válida.
 * No hay importaciones parciales: al primer error se devuelve el fallo
 * y quien llama conserva la colección anterior.
 * @param {string} texto
 * @returns {{valido: boolean, mensaje: string, participantes: Array|null}}
 */
function importarColeccion(texto) {
  if (typeof texto !== "string" || texto.trim() === "") {
    return crearFalloImportacion("El área de texto está vacía. Pega un JSON con un array de participantes.");
  }

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    return crearFalloImportacion("El texto no es JSON válido. Revisa comillas dobles, comas y corchetes. Detalle: " + error.message);
  }

  if (!Array.isArray(datos)) {
    return crearFalloImportacion("El JSON debe ser un array de participantes, por ejemplo [ {...}, {...} ].");
  }

  const nuevos = [];
  for (let i = 0; i < datos.length; i++) {
    const elemento = datos[i];
    const posicion = "Elemento " + (i + 1) + ": ";

    if (elemento === null || typeof elemento !== "object" || Array.isArray(elemento)) {
      return crearFalloImportacion(posicion + "no es un objeto.");
    }
    if (!Number.isInteger(elemento.id) || elemento.id < ID_MINIMO || elemento.id > ID_MAXIMO) {
      return crearFalloImportacion(posicion + "el id debe ser un entero entre 100000 y 999999.");
    }
    if (existeId(nuevos, elemento.id)) {
      return crearFalloImportacion(posicion + "el id " + elemento.id + " está repetido.");
    }
    if (typeof elemento.nombre !== "string" || typeof elemento.tipo !== "string"
      || typeof elemento.modalidad !== "string") {
      return crearFalloImportacion(posicion + "nombre, tipo y modalidad deben ser textos.");
    }
    if (typeof elemento.edad !== "number" || typeof elemento.experiencia !== "number") {
      return crearFalloImportacion(posicion + "edad y experiencia deben ser números (sin comillas).");
    }
    if (!esFechaIsoValida(elemento.fechaInscripcion)) {
      return crearFalloImportacion(posicion + "fechaInscripcion debe ser una fecha ISO válida, como 2026-10-08T08:30:00.000Z.");
    }

    const validacion = validarParticipante(elemento);
    if (!validacion.valido) {
      return crearFalloImportacion(posicion + unirErrores(validacion.errores));
    }

    nuevos.push({
      id: elemento.id,
      nombre: validacion.participante.nombre,
      edad: validacion.participante.edad,
      tipo: validacion.participante.tipo,
      modalidad: validacion.participante.modalidad,
      experiencia: validacion.participante.experiencia,
      fechaInscripcion: elemento.fechaInscripcion
    });
  }

  return {
    valido: true,
    mensaje: "Importación correcta: " + nuevos.length + " participante(s).",
    participantes: nuevos
  };
}

// ---------------------------------------------------------------------
// Preferencias (validación de los valores leídos de las cookies)
// ---------------------------------------------------------------------

function normalizarTema(valor) {
  return valor === "oscuro" ? "oscuro" : "claro";
}

function normalizarTamano(valor) {
  return valor === "grande" ? "grande" : "normal";
}

// ---------------------------------------------------------------------
// Formato
// ---------------------------------------------------------------------

/**
 * Fecha y hora en formato español a partir de un texto ISO.
 */
function formatearFecha(textoIso) {
  const fecha = new Date(textoIso);
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * Las medias se muestran con dos decimales; null se muestra como "Sin datos".
 * toFixed devuelve texto: solo se usa para mostrar, no para calcular.
 */
function formatearMedia(valor) {
  return valor === null ? "Sin datos" : valor.toFixed(2);
}
