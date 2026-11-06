/* =========================================================
   Íconos como dibujo vectorial (SVG de Font Awesome 6 Free, solid).
   Antes se dibujaban como letras de la fuente de Font Awesome: si la
   fuente no terminaba de cargar a tiempo (pasa a veces, más en el
   celular) el ícono salía como un cuadradito. Con el trazo SVG no
   dependen de ninguna fuente.
   API: Iconos.cargar(nombres) → Promise · Iconos.hay(nombre)
        Iconos.pintar(ctx, nombre, cx, cy, tam, color)  (canvas, centrado)
        Iconos.svg(nombre) → "<svg …>" para HTML (alto 1em, color del texto)
   ========================================================= */
window.Iconos = (function () {
  var BASE = "https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/svgs/solid/";
  var RESPALDO = "circle-info";
  var datos = {};     // nombre -> { w, h, d, path } | null (no existe)
  var pedidos = {};   // nombre -> Promise
  // Los que usan las plantillas y la lista que se le da a la IA: se piden al abrir.
  var BASICOS = ["circle-info", "arrow-right", "leaf", "bullhorn", "calendar-days", "clock", "location-dot", "phone", "envelope",
    "user-group", "people-group", "child", "paw", "dog", "cat", "tree", "seedling", "water", "cloud-rain", "house-flood-water",
    "trash-can", "recycle", "mosquito", "syringe", "kit-medical", "heart-pulse", "hand-holding-heart", "handshake",
    "graduation-cap", "book", "music", "futbol", "bicycle", "utensils", "bowl-food", "shirt", "bed", "lightbulb", "bolt",
    "road", "helmet-safety", "bus", "car", "store", "camera", "circle-exclamation", "triangle-exclamation", "ban", "check"];

  function normal(n) { return String(n || "").trim().toLowerCase().replace(/^fa-/, ""); }

  function cargarUno(n) {
    n = normal(n);
    if (!/^[a-z0-9-]{1,40}$/.test(n)) return Promise.resolve(null);
    if (datos[n] !== undefined) return Promise.resolve(datos[n]);
    if (pedidos[n]) return pedidos[n];
    pedidos[n] = fetch(BASE + n + ".svg").then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) throw new Error("icono " + r.status);
      return r.text();
    }).then(function (t) {
      if (!t) return (datos[n] = null);
      var vb = (t.match(/viewBox="([^"]+)"/) || [])[1], d = (t.match(/<path[^>]*\sd="([^"]+)"/) || [])[1];
      if (!vb || !d) return (datos[n] = null);
      var v = vb.split(/[\s,]+/).map(Number);
      return (datos[n] = { w: v[2], h: v[3], d: d, path: null });
    }).catch(function () { delete pedidos[n]; return null; }); // error de red: se puede reintentar
    return pedidos[n];
  }

  function cargar(nombres) {
    return Promise.all([RESPALDO].concat(nombres || []).filter(Boolean).map(cargarUno));
  }

  function obtener(n) { n = normal(n); return datos[n] || datos[RESPALDO] || null; }
  function hay(n) { return !!datos[normal(n)]; }

  function pintar(ctx, nombre, cx, cy, tam, color) {
    var ic = obtener(nombre);
    if (!ic) { // sin conexión al CDN: un punto, nunca un cuadrado
      ctx.save(); if (color) ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, tam * 0.18, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      return;
    }
    if (!ic.path) ic.path = new Path2D(ic.d);
    var s = tam / ic.h; // como la fuente: el alto del ícono = tamaño de letra
    ctx.save();
    if (color) ctx.fillStyle = color;
    ctx.translate(cx - ic.w * s / 2, cy - ic.h * s / 2);
    ctx.scale(s, s);
    ctx.fill(ic.path);
    ctx.restore();
  }

  function svg(nombre) {
    var ic = obtener(nombre);
    if (!ic) return "";
    var ancho = +(ic.w / ic.h).toFixed(4);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + ic.w + " " + ic.h + '" style="display:block;width:' + ancho +
      'em;height:1em;fill:currentColor" aria-hidden="true"><path d="' + ic.d + '"/></svg>';
  }

  var listo = cargar(BASICOS);
  return { cargar: cargar, hay: hay, pintar: pintar, svg: svg, listo: listo, basicos: BASICOS };
})();
