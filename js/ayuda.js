// =====================================================================
// ayuda.js
// Muestra información descriptiva del navegador
// =====================================================================

const listaDatos = document.getElementById("datos-navegador");
const botonCerrar = document.getElementById("boton-cerrar");

function anadirDatoNavegador(etiqueta, valor) {
  const termino = document.createElement("dt");
  termino.textContent = etiqueta;
  const definicion = document.createElement("dd");
  definicion.textContent = valor;
  listaDatos.append(termino, definicion);
}

if (listaDatos !== null) {
  anadirDatoNavegador("Idioma del navegador (navigator.language)", navigator.language);
  anadirDatoNavegador("Origen de la página (location.origin)", location.origin);
  anadirDatoNavegador("Pantalla (screen.width × screen.height)", screen.width + " × " + screen.height + " píxeles");
}

if (botonCerrar !== null) {
  botonCerrar.addEventListener("click", function () {
    window.close();
  });
}
