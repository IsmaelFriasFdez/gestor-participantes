// =====================================================================
// cookies.js
// Funciones reutilizables para las cookies de preferencias.
// Nombres fijos, Path=/, SameSite=Lax, Max-Age en segundos y valores
// codificados. Secure solo cuando la página se sirve por HTTPS.
// =====================================================================

/**
 * Devuelve el valor descodificado de una cookie o null si no existe
 * o si su valor no se puede descodificar.
 * @param {string} nombre
 * @returns {string|null}
 */
function leerCookie(nombre) {
  const prefijo = nombre + "=";
  const partes = document.cookie.split(";");
  for (let i = 0; i < partes.length; i++) {
    const parte = partes[i].trim();
    if (parte.startsWith(prefijo)) {
      try {
        return decodeURIComponent(parte.slice(prefijo.length));
      } catch (error) {
        return null;
      }
    }
  }
  return null;
}

/**
 * Guarda una cookie con la duración indicada en días.
 * @param {string} nombre
 * @param {string} valor
 * @param {number} dias
 */
function guardarCookie(nombre, valor, dias) {
  const segundos = Math.floor(dias * 24 * 60 * 60);
  let atributos = "; Path=/; Max-Age=" + segundos + "; SameSite=Lax";
  if (location.protocol === "https:") {
    atributos += "; Secure";
  }
  document.cookie = nombre + "=" + encodeURIComponent(valor) + atributos;
}

/**
 * Elimina una cookie reescribiéndola con Max-Age=0 y el mismo ámbito.
 * @param {string} nombre
 */
function borrarCookie(nombre) {
  let atributos = "; Path=/; Max-Age=0; SameSite=Lax";
  if (location.protocol === "https:") {
    atributos += "; Secure";
  }
  document.cookie = nombre + "=" + atributos;
}
