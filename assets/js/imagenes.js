/* =========================================================
   Piezas gráficas: cada una tiene una foto de fondo (subida, de un
   banco libre o ninguna) y un diseño
   { plantilla, paleta, fx, fy }. Los textos son de toda la
   publicación (S.pieza) y el dibujo lo hace Plantillas.
   ========================================================= */
window.Imagenes = (function () {
  var C = window.NOT_CONFIG;

  function disenoInicial(sugerido) {
    // cada pieza nueva nace con una semilla distinta: misma plantilla, otra composición
    return { plantilla: (sugerido && sugerido.plantilla) || "foto", paleta: (sugerido && sugerido.paleta) || "marino", fx: 0.5, fy: 0.5,
      semilla: 1 + Math.floor(Math.random() * 1e9), manual: false };
  }

  function nueva(datos) {
    return Object.assign({
      id: "img-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      nombre: "Pieza", original: null, base: null, usar: true, portada: false,
      diseno: null, credito: null, origen: "subida"
    }, datos);
  }

  function leerArchivo(file) {
    return new Promise(function (ok, mal) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = mal;
      fr.readAsDataURL(file);
    });
  }

  function cargarImg(src) {
    return new Promise(function (ok, mal) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.onerror = function () { mal(new Error("No se pudo abrir la imagen")); };
      im.src = src;
    });
  }

  function normalizar(src) {
    return cargarImg(src).then(function (im) {
      var k = Math.min(1, C.maxLadoImagen / Math.max(im.naturalWidth, im.naturalHeight));
      var c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.9);
    });
  }

  function desdeArchivo(file) {
    return leerArchivo(file).then(normalizar).then(function (dataUrl) {
      return nueva({ nombre: file.name, original: dataUrl, base: dataUrl, origen: "subida" });
    });
  }

  // Dibuja la pieza en el formato pedido. Devuelve Promise<canvas>.
  function render(img, formato, pieza, diseno) {
    var f = C.formatos[formato] || C.formatos["4:5"];
    var d = diseno || img.diseno || disenoInicial();
    var c = document.createElement("canvas");
    c.width = f.w; c.height = f.h;
    var pal = Plantillas.paletas[d.paleta] || Plantillas.paletas.marino;
    // Diseño hecho por la IA en HTML/CSS
    if (d.modo === "ia" && d.html && d.html.codigo) {
      var base = C.formatos[d.html.formato] || f;
      return DisenoHtml.dibujar(d.html.codigo, base.w, base.h, pal, img.base).then(function (dis) {
        if (base.w === f.w && base.h === f.h) { dis.info = { entra: !(d.html.problemas || []).length, escala: 1, ia: true }; return dis; }
        // otro formato: la placa entera centrada sobre una versión desenfocada de sí misma (o "Rediseñar para este formato")
        var x = c.getContext("2d");
        x.filter = "blur(40px) brightness(.8)";
        var kc = Math.max(f.w / base.w, f.h / base.h);
        x.drawImage(dis, (f.w - base.w * kc) / 2, (f.h - base.h * kc) / 2, base.w * kc, base.h * kc);
        x.filter = "none";
        var ki = Math.min(f.w / base.w, f.h / base.h);
        x.drawImage(dis, (f.w - base.w * ki) / 2, (f.h - base.h * ki) / 2, base.w * ki, base.h * ki);
        c.info = { entra: true, escala: 1, ia: true, adaptada: true };
        return c;
      });
    }
    return (img.base ? cargarImg(img.base) : Promise.resolve(null)).then(function (foto) {
      return Plantillas.dibujar(c, foto, pieza, d);
    }).then(function (info) { c.info = info; return c; });
  }

  function dataUrl(img, formato, pieza, diseno) {
    return render(img, formato, pieza, diseno).then(function (c) { return c.toDataURL("image/jpeg", 0.9); });
  }

  return { nueva: nueva, desdeArchivo: desdeArchivo, normalizar: normalizar, render: render, dataUrl: dataUrl, disenoInicial: disenoInicial };
})();
