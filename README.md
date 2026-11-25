# Gestor de participantes de un evento

Práctica DWEC · Unidad didáctica 1 (sesiones 1 a 7) · Curso 2026‑2027

Aplicación cliente (HTML, CSS y JavaScript sin frameworks) para dar de alta y borrar participantes, consultar estadísticas, intercambiar la colección en JSON, mostrar un panel en un iframe comunicado por `postMessage` y guardar preferencias mediante cookies.

---

## 1. Ejecución por HTTP

La aplicación **no** debe abrirse con `file://` (el iframe, `postMessage` con `location.origin` y las cookies necesitan un origen HTTP). Todas las páginas deben servirse desde el **mismo host y puerto**.

Live Server (VS Code): clic derecho sobre `index.html` → *Open with Live Server*.

Abrir `http://localhost:8000/` (no mezclar `localhost` con `127.0.0.1`: son hosts distintos).

## 2. Estructura del proyecto

```
gestor-participantes/
├── index.html        Página principal
├── panel.html        Documento incrustado en el iframe
├── ayuda.html        Ventana de ayuda (window.open)
├── css/
│   ├── estilos.css   Estilos de index.html y ayuda.html (temas y tamaños)
│   └── panel.css     Estilos del panel
└── js/
    ├── logica.js     Validación, clasificación, estadísticas, importación JSON (sin DOM)
    ├── cookies.js    leerCookie, guardarCookie, borrarCookie
    ├── app.js        Interfaz de la página principal (DOM, eventos, iframe, cookies, ayuda)
    ├── panel.js      Receptor de mensajes del panel y construcción de su DOM
    └── ayuda.js      Datos del navegador en la ayuda
```

Todos los scripts se cargan con `defer` en el `<head>`: se descargan en paralelo, se ejecutan **en orden** cuando el HTML ya está analizado. Por eso `app.js` puede usar las funciones de `logica.js` y `cookies.js` y encontrar los elementos del DOM.

## 3. Cómo se ha realizado cada funcionalidad

| Funcionalidad | Archivo | Funciones principales |
|---|---|---|
| Datos iniciales (3 participantes distintos) | app.js | `crearParticipantesIniciales`, `anadirParticipante` |
| Generación de id 100000‑999999 sin duplicados | logica.js | `generarId` (`do...while` con máximo 1000 intentos, `Math.random`, `Math.floor`), `existeId` |
| Validación del alta | logica.js | `validarParticipante`, `esVacio`, `convertirNumero`, `esTipoValido`, `esModalidadValida` |
| Mostrar errores y conservar valores | app.js | `gestionarAlta`, `mostrarErrores`, `limpiarErrores` |
| Clasificación de edad y experiencia | logica.js | `clasificarEdad` (ternario), `clasificarExperiencia` (`if / else if / else`) |
| Tarjetas | app.js | `crearTarjeta`, `anadirDato`, `crearEtiqueta` (createElement, textContent, append, classList, setAttribute) |
| Fecha en formato español | logica.js | `formatearFecha` (`toLocaleDateString("es-ES", …)`) |
| Bajas con confirmación | app.js / logica.js | `borrarParticipante` (`confirm`, `splice`, `remove`), `buscarIndicePorId` |
| Búsqueda y filtro combinados | logica.js / app.js | `filtrarParticipantes` (`trim`, `toLowerCase`, `includes`), `mostrarListado`, `actualizarMensajeLista` |
| Estadísticas | logica.js / app.js | `calcularEstadisticas` (for…of, contadores, acumuladores, `switch`, bucle con `continue`), `mostrarEstadisticas`, `formatearMedia` |
| Primer menor de edad | logica.js | `buscarPrimerMenor` (bucle con `break`) |
| Exportar / importar JSON | logica.js / app.js | `importarColeccion` (`try/catch`, `JSON.parse`, `Array.isArray`, validación completa), `exportarJSON`, `importarJSON` |
| Panel en iframe con postMessage | app.js / panel.js / logica.js | `recibirMensaje`, `enviarResumenPanel`, `crearResumenPanel`, `buscarMasReciente`, `esResumenValido`, `mostrarResumen` |
| Preferencias con cookies | cookies.js / app.js / logica.js | `leerCookie`, `guardarCookie`, `borrarCookie`, `cargarPreferencias`, `guardarPreferencias`, `restablecerPreferencias`, `normalizarTema`, `normalizarTamano` |
| Ventana de ayuda | app.js / ayuda.js | `abrirAyuda`, `cerrarAyuda` (`window.open`, `closed`, `close`), `anadirDatoNavegador` |
| Ejecución con el DOM disponible | app.js | `defer`, `iniciar`, `comprobarElementos` (si falta un elemento no se registra nada) |

Detalles de diseño:

- **Separación lógica / interfaz.** `validarParticipante`, `generarId` y `calcularEstadisticas` no tocan el DOM: reciben datos por parámetros y devuelven resultados. Están en `logica.js`; la interfaz está en `app.js`.
- **Datos no fiables.** El formulario usa `novalidate` e `input type="text"` para que la validación la haga JavaScript (y se pueda probar `18abc`). Antes de `Number` se comprueba la cadena vacía (`Number("")` es 0). `Number` rechaza `"18abc"` (da `NaN`), a diferencia de `parseInt`.
- **Valores ausentes.** Las medias, mínimos y máximos sin datos se devuelven como `null` y se muestran como “Sin datos”; nunca `NaN` ni `Infinity`. El mínimo y el máximo empiezan en `null`, no en un valor inventado.
- **Selectores.** `getElementById` para casi todos los controles; `querySelector` para formularios y estadísticas (`zonaEstadisticas.querySelector("#est-…")`); `querySelectorAll` para borrar las tarjetas antes de redibujar y para limpiar los mensajes de error.
- **Borrado.** Se elimina el dato con `splice` y su tarjeta con `remove`; el resto de tarjetas no se reconstruye. Después se hace una nueva consulta con `querySelectorAll` porque una NodeList guardada es estática.
- **Importación.** Se valida todo el array antes de sustituir nada: tipos (`edad` y `experiencia` deben ser números, no textos), rangos del formulario, id entero en rango y no repetido, y fecha ISO válida (`new Date(texto).toISOString() === texto`). Al primer error se informa del elemento y la colección se conserva entera.
- **postMessage.** La principal instala su receptor **antes** de asignar `src` al iframe. El panel instala el suyo y **después** envía `{ tipo: "panel-listo" }`. A partir de ahí la principal envía el resumen tras cada alta, baja o importación. `targetOrigin` es siempre `location.origin`, nunca `"*"`. Ambos receptores comprueban `origin`, `source` y la estructura, tipos y valores de `data`; si algo falla, `return` y no se toca la interfaz.
- **Cookies.** Dos cookies independientes (`gp_tema`, `gp_tamano`), `Path=/`, `SameSite=Lax`, `Max-Age=2592000` (30 días en segundos), `Secure` si `location.protocol === "https:"`. Valores codificados con `encodeURIComponent` y descodificados con `decodeURIComponent` dentro de `try/catch`. Lo leído se valida contra una lista cerrada y, si no es válido, se usa claro / normal. Tras guardar o borrar se comprueba **leyendo**. El aspecto se aplica aunque las cookies estén bloqueadas.

## 4. Casos de prueba

Partir siempre de la página recién cargada por HTTP, salvo que se indique otra cosa. Los ids son aleatorios.

### 4.1 Carga inicial
| Pasos | Resultado esperado |
|---|---|
| Abrir `index.html` | 3 tarjetas (Ana García 17 estudiante presencial, Luis Martín 34 profesional online, Carmen Ruiz 52 invitado presencial). Total 3, menores 1, mayores 2, edad media 34.33 años, mín. 17, máx. 52, presenciales 2, online 1, un participante de cada tipo, experiencia media presencial 3.00, primer menor Ana García. Panel: total 3, presencial 2, online 1, última inscripción Carmen Ruiz. Consola sin errores. |

### 4.2 Alta válida
| Datos | Resultado esperado |
|---|---|
| Nombre `  Marta Gil  `, edad `25`, profesional, online, experiencia `5.5` | Se crea la tarjeta “Marta Gil” (sin espacios), mayor de edad, experiencia intermedia, fecha y hora actuales en formato español. El formulario se limpia, el total pasa a 4 y el panel muestra a Marta Gil como última inscripción. |
| Nombre `Bebé`, edad `0`, invitado, presencial, experiencia `0` | Se acepta (la edad 0 es válida). Tarjeta con clase `menor` y experiencia inicial. |
| Nombre `<b>Ana</b>`, edad `30`, …, experiencia `10` | Se muestra literalmente `<b>Ana</b>` (textContent), experiencia avanzada. |

### 4.3 Alta con entradas inválidas
| Datos | Resultado esperado |
|---|---|
| Nombre `A` | “El nombre debe tener entre 2 y 60 caracteres.” |
| Nombre solo espacios | “El nombre es obligatorio.” |
| Edad vacía | “La edad es obligatoria.” |
| Edad `18abc` | “La edad debe ser un número…” |
| Edad `17.5` | “La edad debe ser un número entero.” |
| Edad `-1` o `121` | “La edad debe estar entre 0 y 120.” |
| Tipo o modalidad sin elegir | Mensaje de valor no válido en ese campo |
| Experiencia `7,5` | “La experiencia debe ser un número. Usa punto…” |
| Experiencia `11` | “La experiencia debe estar entre 0 y 10.” |

En todos los casos: mensaje junto al campo, resumen visible arriba, campo con borde rojo (`aria-invalid`), **se conservan los valores escritos** y no se añade nada (el total no cambia).

### 4.4 Bajas
| Pasos | Resultado esperado |
|---|---|
| Pulsar «Borrar» en Ana y **Cancelar** | No cambia nada: 3 tarjetas, mismas estadísticas. |
| Pulsar «Borrar» en Ana y **Aceptar** | Desaparece solo su tarjeta. Total 2, menores 0, primer menor “No hay ningún menor de edad”, panel actualizado. |
| Borrar todos | “No hay participantes inscritos.”, medias y extremos “Sin datos”, panel “Sin inscripciones”. |

### 4.5 Búsqueda y filtro
| Pasos | Resultado esperado |
|---|---|
| Escribir `ANA` | Solo Ana García (no distingue mayúsculas). |
| Escribir `r` y elegir Presencial | Carmen Ruiz (y Ana García, que contiene “r”). |
| Escribir `ana` y elegir Online | “No hay participantes que coincidan con la búsqueda y el filtro.” |
| Con cualquier filtro activo | Las estadísticas siguen mostrando el total de la colección (3). |

### 4.6 Exportar e importar JSON
| Pasos / entrada | Resultado esperado |
|---|---|
| «Exportar colección» | El área contiene el array JSON con los 3 participantes. |
| `[{nombre: 'x'}` → Importar | “El texto no es JSON válido…”, la colección no cambia. |
| Área vacía → Importar | Aviso de área vacía, sin cambios. |
| `{"a":1}` | “El JSON debe ser un array…”, sin cambios. |
| Exportar, duplicar el primer objeto, Importar | “Elemento 2: el id … está repetido.”, sin cambios. |
| Cambiar una edad a `"30"` (texto) | “edad y experiencia deben ser números”, sin cambios. |
| Cambiar `fechaInscripcion` a `"2026-13-40"` | “fechaInscripcion debe ser una fecha ISO válida…”, sin cambios. |
| Primer elemento correcto y segundo con `"experiencia": 11` | Error en “Elemento 2”, **no** se importa el primero (sin importaciones parciales). |
| `[]` → Importar | Importación correcta de 0: lista vacía, “Sin datos”, panel “Sin inscripciones”. |
| Pegar de nuevo lo exportado → Importar | Vuelven las 3 tarjetas, estadísticas y panel actualizados. |

### 4.7 Panel en el iframe y mensajes rechazados
| Pasos | Resultado esperado |
|---|---|
| Cargar la página | El panel muestra el resumen inicial tras su aviso `panel-listo`. |
| Dar de alta / borrar / importar | El panel se actualiza en cada operación. |
| En la consola de la principal: `document.getElementById("panel-evento").contentWindow.postMessage({tipo:"resumen", total:-1, presencial:0, online:0, ultimo:null}, location.origin)` | Se ignora (total negativo). El panel no cambia y no hay errores. |
| Igual con `{tipo:"resumen", total:2, presencial:1, online:0, ultimo:null}` | Se ignora (las modalidades no suman el total). |
| Igual con `"texto"` o `null` | Se ignora. |
| En DevTools, cambiar el contexto de la consola a `panel.html` y ejecutar `window.postMessage({tipo:"resumen", total:0, presencial:0, online:0, ultimo:null}, location.origin)` | Se ignora: `source` es el propio panel, no `window.parent`. |
| En la consola de la principal: `window.postMessage({tipo:"panel-listo"}, location.origin)` | Se ignora: `source` no es el iframe. |
| Mensaje con `targetOrigin` distinto, p. ej. `"http://otro.example"` | El navegador no lo entrega. |

### 4.8 Preferencias y cookies
| Pasos | Resultado esperado |
|---|---|
| Abrir sin cookies | Tema claro, letra normal, aviso de valores predeterminados. |
| Elegir Oscuro + Grande → Guardar | Cambian fondo y tamaño. “Preferencias aplicadas y guardadas durante 30 días.” En Application → Cookies aparecen `gp_tema=oscuro` y `gp_tamano=grande` con Path `/`, SameSite Lax y caducidad a 30 días. |
| Recargar | Se recuperan oscuro y grande. |
| En Application → Cookies cambiar `gp_tema` a `rojo` y recargar | Se aplica tema claro (valor no admitido). |
| Cambiar `gp_tamano` a `%E0%A4%A` (codificación rota) y recargar | `leerCookie` devuelve null y se aplica letra normal sin errores. |
| Borrar las cookies a mano y recargar | Tema claro y letra normal. |
| «Restablecer» | Se eliminan las dos cookies (Max‑Age=0), se aplican claro/normal y se confirma por lectura. |
| Bloquear cookies para localhost y Guardar | El aspecto cambia igualmente y se avisa: “no se ha podido confirmar su guardado”. |

### 4.9 Ayuda
| Pasos | Resultado esperado |
|---|---|
| «Abrir ayuda» | Se abre `ayuda.html` con instrucciones, idioma (`navigator.language`), origen (`location.origin`) y tamaño de pantalla (`screen.width × screen.height`). |
| «Abrir ayuda» con la ayuda abierta | Se reutiliza la misma ventana (“se reutiliza la misma ventana”). |
| «Cerrar ayuda» | Se cierra la ventana desde la principal. |
| «Cerrar ayuda» sin ventana abierta, o tras cerrarla a mano | “No hay ninguna ventana de ayuda abierta.” (se comprueba `closed`). |
| Bloquear las ventanas emergentes y pulsar «Abrir ayuda» | Aviso de que el navegador la ha bloqueado. |

## 5. Contenidos aplicados de cada sesión

| Sesión | Contenidos aplicados |
|---|---|
| 1. Arquitectura web | Separación HTML / CSS / JS en archivos; scripts externos con `defer`; uso de DevTools (Console, Elements, Sources, Network, Application); ejecución por HTTP con servidor local. |
| 2. Primeros programas | `const` por defecto y `let` solo con reasignación; operadores aritméticos, compuestos (`+=`), relacionales estrictos y lógicos; `typeof`; comentarios que explican decisiones; `console.error` cuando falta un elemento. |
| 3. Tipos, ámbito y decisiones | Conversión explícita con `Number` / `String`; comprobación de cadena vacía antes de convertir; `===` y `!==`; `if / else if / else` (clasificación de experiencia, mensajes de la lista), ternario (clasificación de edad, mensajes de estado), `switch` (recuento por tipo); `??` en `mostrarErrores`. |
| 4. Bucles | `for` (cookies, índices, experiencia presencial), `for...of` (estadísticas, filtros, existeId), `do...while` con límite de intentos (`generarId`), `break` (`buscarPrimerMenor`), `continue` (omitir online), contadores y acumuladores sin `reduce`. |
| 5. Objetos predefinidos | String (`trim`, `toLowerCase`, `includes`, `startsWith`, `slice`, `split`), Number (`isFinite`, `isInteger`, `isNaN`, `toFixed`), `Math.random` / `Math.floor`, `Date` (`toISOString`, `getTime`, `toLocaleDateString`), `JSON.stringify` / `JSON.parse` con `try/catch`, `confirm`, `navigator.language`, `location.origin`, `screen.width/height`. |
| 6. DOM | `getElementById`, `querySelector`, `querySelectorAll` (NodeList estática), `textContent` (nunca `innerHTML` con datos), `classList.add/remove/toggle`, `setAttribute/removeAttribute`, `createElement`, `append`, `remove`, `addEventListener` y `preventDefault` en `submit`. |
| 7. Ventanas, contextos y cookies | `window.open`, `closed`, `close`; iframe con `title`; política del mismo origen; `postMessage` con `targetOrigin` concreto y comprobación de `origin`, `source` y `data`; aviso de preparación; `document.cookie` con `Path`, `SameSite`, `Max-Age`, `Secure`, `encodeURIComponent` / `decodeURIComponent` y borrado con `Max-Age=0`. |

De las sesiones posteriores se usa lo imprescindible: funciones con `return` y contrato documentado (sesión 8), `push`, `splice` y `Array.isArray` (sesión 9), objetos literales y acceso con corchetes `errores[campo]` (sesión 10) y los eventos `input` y `change` (sesión 11).

### 5.1 Carga del script y arquitectura cliente‑servidor
El navegador (cliente) pide `index.html` al servidor HTTP local, lo analiza y al encontrar CSS y scripts pide esos recursos (visible en Network con código 200). El servidor solo entrega archivos estáticos: **toda la lógica se ejecuta en el navegador**. Los scripts llevan `defer`: se descargan en paralelo con el análisis y se ejecutan en orden al terminarlo, así que el DOM existe y las funciones de `logica.js` y `cookies.js` están disponibles para `app.js`. Con `async` no se garantizaría el orden. Como todo ocurre en el cliente, la validación mejora la experiencia, pero en una aplicación real el servidor tendría que volver a validar.

### 5.2 Ámbitos y hoisting
- Ámbito global del script: constantes de configuración y el estado (`participantes`, `panelListo`, `ventanaAyuda`), reducido al mínimo.
- Ámbito de función: parámetros y variables locales (`errores`, `sumaEdades`…) solo existen dentro de su función.
- Ámbito de bloque: `let` / `const` dentro de `if` y bucles (`const parte` en `leerCookie`, `let i` en los `for`).
- Hoisting: las declaraciones `function` se registran completas antes de ejecutar el ámbito, por eso `iniciar()` puede llamar a funciones escritas antes o después. Las variables con `let` / `const` existen pero están en la *zona temporal muerta* hasta su línea: usarlas antes produce `ReferenceError`. Con `var` se obtendría `undefined` (no se usa `var`).
- Varios scripts clásicos comparten el ámbito global: por eso `app.js` ve `validarParticipante` y `leerCookie`.

### 5.3 Truthy y falsy
Son falsy `false`, `0`, `-0`, `0n`, `""`, `null`, `undefined` y `NaN`; todo lo demás es truthy (incluidos `"0"`, `"false"`, `[]` y `{}`). Por eso no se escribe `if (edad)`: rechazaría la edad 0, que es válida. Las comprobaciones son explícitas (`=== null`, `=== ""`, `Number.isFinite`), y para errores se usa `resultado === null`, no `!resultado`.

### 5.4 Diferencia entre `||` y `??`
`a || b` devuelve `b` si `a` es **falsy**; `a ?? b` solo si `a` es `null` o `undefined`. Con `0 || 10` se obtiene 10 (se pierde un 0 válido); con `0 ?? 10`, 0. En `mostrarErrores` se usa `errores[campo] ?? ""`: se sustituye solo cuando el campo no tiene mensaje (`undefined`). Por la misma razón nunca se aplica `||` a edades o experiencias, donde 0 es un valor correcto.

### 5.5 Restricciones entre orígenes
Un origen es esquema + host + puerto. La política del mismo origen impide que un documento lea el DOM o los datos de otro origen, aunque tenga una referencia a su ventana (`contentWindow`, `window.parent`, `opener`). Aunque aquí ambos documentos son del mismo origen, la principal **no** rellena el panel accediendo a su `document`: le envía datos con `postMessage` y el panel construye su DOM. Ese mecanismo también funcionaría entre orígenes distintos si ambas páginas cooperan, y por eso hay que fijar `targetOrigin` y comprobar `origin` y `source` al recibir. CORS regula peticiones de red, no el acceso al DOM entre documentos. `localhost` y `127.0.0.1` son orígenes distintos, y `file://` tiene reglas especiales: por eso se usa un servidor HTTP. Las cookies tienen otro ámbito (host y Path, no puerto).

## 6. Uso de la inteligencia artificial

- Enlace al chat utilizado: `PEGAR AQUÍ EL ENLACE`

