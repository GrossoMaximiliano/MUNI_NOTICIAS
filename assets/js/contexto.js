/* =========================================================
   Contexto institucional para la IA, tomado de Muni-Land
   (window.SITE de MUNI_LAND/assets/js/data.js): municipio,
   intendente, gabinete, contactos y noticias publicadas
   (para respetar el estilo y no repetir temas).
   ========================================================= */
window.Contexto = (function () {
  var C = window.NOT_CONFIG;
  var origen = null; // de dónde se cargó

  var RESPALDO = {
    muni: { nombre: "Municipalidad de Las Toscas", provincia: "Provincia de Santa Fe", direccion: "Calle 12 N° 901, Las Toscas, Santa Fe",
      telefono: "(03482) 492-000", email: "intendencia@lastoscas.gob.ar", horario: "Lunes a viernes de 7:00 a 13:00 hs" },
    intendente: { nombre: "Iván Sánchez", cargo: "Intendente Municipal" },
    gabinete: [],
    noticias: []
  };

  function cargarScript(url) {
    return new Promise(function (ok, mal) {
      var s = document.createElement("script");
      s.src = url;
      s.onload = function () { window.SITE ? ok(url) : mal(new Error("sin SITE")); };
      s.onerror = function () { s.remove(); mal(new Error(url)); };
      document.head.appendChild(s);
    });
  }

  function cargar() {
    if (window.SITE) { origen = "precargado"; return Promise.resolve(window.SITE); }
    var fuentes = C.fuentesContexto.slice();
    function siguiente() {
      if (!fuentes.length) { origen = null; return Promise.resolve(RESPALDO); }
      var url = fuentes.shift();
      return cargarScript(url).then(function () { origen = url; return window.SITE; }, siguiente);
    }
    return siguiente();
  }

  function sitio() { return window.SITE || RESPALDO; }

  // Texto que se le pasa a la IA.
  function paraPrompt() {
    var S = sitio();
    var m = S.muni || {};
    var lineas = [
      "Municipio: " + m.nombre + " (" + (m.provincia || "Santa Fe") + ", Argentina).",
      "Dirección del Palacio Municipal: " + m.direccion + ". Teléfono: " + m.telefono + ". Correo: " + m.email + ". Atención: " + m.horario + ".",
      "Intendente: " + S.intendente.nombre + " (" + S.intendente.cargo + ")."
    ];
    if (S.gabinete && S.gabinete.length) {
      lineas.push("Gabinete:\n" + S.gabinete.map(function (g) { return "- " + g.area + ": " + g.nombre + ", " + g.cargo; }).join("\n"));
    }
    var notas = (S.noticias || []).slice().sort(function (a, b) { return b.fecha.localeCompare(a.fecha); });
    if (notas.length) {
      lineas.push("Últimos títulos publicados en la web:\n" + notas.slice(0, 8).map(function (n) { return "- (" + n.fecha + ", " + n.cat + ") " + n.titulo; }).join("\n"));
      var ej = notas[0];
      lineas.push("Ejemplo de estilo de una noticia publicada:\nTítulo: " + ej.titulo + "\nBajada: " + ej.bajada + "\nCuerpo:\n" + (ej.cuerpo || []).slice(0, 3).join("\n\n"));
    }
    return lineas.join("\n\n");
  }

  function categorias() {
    var S = sitio();
    var set = {};
    C.categorias.forEach(function (c) { set[c] = 1; });
    (S.noticias || []).forEach(function (n) { if (n.cat) set[n.cat] = 1; });
    return Object.keys(set);
  }

  return {
    cargar: cargar,
    sitio: sitio,
    paraPrompt: paraPrompt,
    categorias: categorias,
    origen: function () { return origen; },
    slugsUsados: function () { return (sitio().noticias || []).map(function (n) { return n.id; }); }
  };
})();
