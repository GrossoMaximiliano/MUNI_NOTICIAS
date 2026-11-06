/* =========================================================
   Diseño con IA en HTML/CSS.
   Un modelo de texto (el mismo /ia/chat) escribe la composición de la
   placa en HTML+CSS siguiendo las reglas de marca de la Municipalidad y
   una "dirección de arte" que va rotando para que no se repita.
   Después:
   1. se sanea (sin scripts, sin recursos externos, sin eventos),
   2. se revisa en un iframe sin scripts (escudo presente, textos que no
      se salgan, sin emojis) y, si hay problemas, se le pide una corrección,
   3. se dibuja como imagen con SVG <foreignObject>, con las fuentes, la
      foto y el escudo incrustados como datos (nada se descarga al dibujar).
   ========================================================= */
window.DisenoHtml = (function () {
  var C = window.NOT_CONFIG;
  var KEY_RECIENTES = "not-adm-direcciones";

  /* ---------------- Direcciones de arte ---------------- */
  var DIRECCIONES = [
    { id: "bloque", foto: true, t: "Foto a sangre en todo el fondo; abajo un bloque de color sólido de la paleta (sin transparencia) que ocupa entre un tercio y la mitad, con borde superior recto o con una curva suave hecha con SVG. Título grande dentro del bloque y una etiqueta tipo píldora arriba a la izquierda sobre la foto." },
    { id: "tipografica", foto: true, t: "Composición tipográfica: el título enorme (Bebas Neue o Poppins 800) ocupa casi la mitad de la placa sobre fondo de color o papel; la foto va recortada en un círculo grande que se sale por un borde de la placa." },
    { id: "lateral", foto: true, t: "Foto en una franja lateral (40% del ancho) con el borde interno orgánico hecho con un path SVG o border-radius grande; el texto en la otra mitad sobre fondo papel claro (var(--fondo))." },
    { id: "diagonal", foto: true, t: "Foto a sangre cruzada por una banda diagonal ancha de color sólido (transform: rotate de -6 a -10 grados) que contiene el título; el resto del texto en una caja sólida abajo." },
    { id: "tarjeta", foto: true, t: "Foto a sangre y una tarjeta de fondo blanco o var(--claro), esquinas redondeadas de 24 a 40px, apoyada en la parte inferior o en un costado, con el título, el subtítulo y los datos. Sombra suave y corta." },
    { id: "marco", foto: true, t: "Marco grueso de color (60 a 90px) alrededor de la foto; el título va sobre el marco superior o inferior, que es más ancho; un detalle de color de acento en una esquina." },
    { id: "ventana", foto: true, t: "Fondo papel con la foto dentro de un arco tipo ventana (border-radius de 50% sólo arriba); alrededor formas planas simples de la paleta (círculo, medialuna, rectángulo redondeado) en tonos suaves." },
    { id: "cartel", foto: false, t: "Cartel de evento: fecha muy grande en Bebas Neue en un recuadro o círculos; debajo filas con hora, lugar y actividad separadas por líneas finas o bloques alternados de dos tonos de la paleta." },
    { id: "iconos", foto: false, t: "Sin foto: fondo de color claro con una forma orgánica grande de otro tono; título fuerte arriba; los ítems en una grilla de 2x2 o en filas, cada uno con su ícono dentro de un círculo de color." },
    { id: "ondulada", foto: true, t: "Foto en la mitad superior con el borde inferior ondulado (path SVG en el color de fondo encima de la foto); el texto abajo, centrado, con el título en dos tonos." }
  ];

  function recientes() { try { return JSON.parse(localStorage.getItem(KEY_RECIENTES) || "[]"); } catch (e) { return []; } }
  function elegirDireccion(conFoto, pieza) {
    var r = recientes();
    var aptas = DIRECCIONES.filter(function (d) { return conFoto ? d.foto || d.id === "iconos" && (pieza.items || []).length : !d.foto || d.id === "tipografica"; });
    if (pieza.fecha && pieza.fecha.dias && pieza.fecha.dias.length) aptas = aptas.concat(DIRECCIONES.filter(function (d) { return d.id === "cartel"; }));
    var nuevas = aptas.filter(function (d) { return r.indexOf(d.id) < 0; });
    var lista = nuevas.length ? nuevas : aptas;
    var d = lista[Math.floor(Math.random() * lista.length)];
    try { localStorage.setItem(KEY_RECIENTES, JSON.stringify([d.id].concat(r.filter(function (x) { return x !== d.id; })).slice(0, 4))); } catch (e) { /* nada */ }
    return d;
  }

  /* ---------------- Prompt ---------------- */
  function variablesPaleta(pal) {
    return "--primario:" + pal.primario + ";--secundario:" + pal.secundario + ";--acento:" + pal.acento + ";--claro:" + pal.claro +
      ";--fondo:" + pal.fondo + ";--tinta:" + pal.tinta + ";--oscuro:" + pal.oscuro + ";--sobre-acento:" + pal.sobreAcento;
  }

  function prompt(pieza, pal, W, H, conFoto, direccion) {
    var textos = {
      antetitulo: pieza.antetitulo, entrada: pieza.entrada, titulo: marcarDestacado(pieza.titulo, pieza.destacado),
      subtitulo: pieza.subtitulo, cta: pieza.cta, items: pieza.items, fecha: pieza.fecha, hora: pieza.hora, lugar: pieza.lugar
    };
    return [
      "Sos el diseñador gráfico del área de Comunicación de la Municipalidad de Las Toscas (Santa Fe, Argentina). Diseñás placas para Instagram y Facebook que parecen hechas a mano por un diseñador del municipio con Canva o Illustrator: limpias, planas, con buen contraste y sin ningún rasgo de \"hecho por IA\".",
      "Escribí el HTML y CSS de UNA placa de exactamente " + W + "x" + H + " px.",
      "DIRECCIÓN DE ARTE para esta placa: " + direccion.t,
      "ESTILO DE LA CASA (de publicaciones reales): antetítulo en píldora o pestaña de color; título en mayúsculas muy pesado (Poppins 800 o Bebas Neue) con 1 a 3 palabras resaltadas en otro color o dentro de un recuadro de color; subtítulo corto con la parte clave en negrita; recuadros redondeados de color claro para datos; íconos dentro de círculos; formas orgánicas planas; firma institucional abajo.",
      [
        "REGLAS OBLIGATORIAS:",
        "- Todo dentro de <div class=\"pieza\">, que mide " + W + "x" + H + "px, position:relative y overflow:hidden. Usá position:absolute o flex para ubicar; medidas en px.",
        "- Colores SOLO con estas variables (ya están definidas en .pieza): var(--primario), var(--secundario), var(--acento), var(--claro), var(--fondo), var(--tinta), var(--oscuro), var(--sobre-acento), más #fff y negro con transparencia para sombras. Podés usar color-mix(in srgb, ...) entre ellas.",
        "- Tipografías SOLO: 'Poppins' (400/500/600/700/800 e itálica), 'Montserrat' (600/700/800) y 'Bebas Neue'. Nada de otras fuentes.",
        conFoto ? "- La foto (real, del tema): usá background-image: var(--foto) con background-size: cover y background-position center, o <img src=\"{{FOTO}}\"> con object-fit: cover. NO definas --foto ni uses fotos de relleno (placeholder, picsum, unsplash): la foto ya está cargada en var(--foto). No le pongas filtros raros." : "- No hay foto: no uses imágenes; resolvé con color, formas planas e íconos.",
        "- No redefinas las variables de color: ya están en .pieza.",
        "- La firma es obligatoria y va tal cual: <div class=\"firma\"><img src=\"{{ESCUDO}}\"> <span>Municipalidad<br>de <b>Las Toscas</b></span></div> (o {{ESCUDO_BLANCO}} sobre fondos oscuros). El escudo mide entre 80 y 120px; la firma no se tapa con nada.",
        "- Íconos: <i class=\"fa-solid fa-NOMBRE\"></i>, sólo si suman, y SOLO con estos nombres: calendar-days, clock, location-dot, phone, envelope, user-group, people-group, child, paw, dog, cat, leaf, tree, seedling, water, cloud-rain, house-flood-water, trash-can, recycle, mosquito, syringe, kit-medical, heart-pulse, hand-holding-heart, handshake, graduation-cap, book, music, futbol, bicycle, utensils, bowl-food, shirt, bed, lightbulb, bolt, road, helmet-safety, bus, car, store, camera, bullhorn, circle-info, triangle-exclamation, ban, check, arrow-right. Nada de emojis.",
        "- Contraste: todo texto va sobre color sólido o sobre la foto con una capa oscura de al menos 55% de opacidad detrás. Tamaños mínimos: título 64px, subtítulo 30px, datos 28px, firma 26px.",
        "- Márgenes internos de al menos 60px. Ningún texto puede salirse de la placa ni quedar cortado.",
        "- PROHIBIDO (delata a la IA): degradados de colores tipo arcoíris, efectos de vidrio o desenfoque (backdrop-filter, blur), brillos, neones, sombras largas, bordes con degradado, textos con degradado, más de 2 tipografías, adornos genéricos (destellos, partículas).",
        "- Sin <script>, sin eventos, sin enlaces externos, sin @import, sin url() salvo var(--foto)."
      ].join("\n"),
      "TEXTOS (usá exactamente estos, cada uno UNA sola vez; podés partir el título en líneas; no agregues textos nuevos salvo la firma; los ** marcan negrita; en el título, lo que está entre [[ ]] va resaltado con color o recuadro, sin los corchetes y sin repetirlo):\n" + JSON.stringify(textos),
      "Respondé SOLO con un bloque ```html que tenga <style> y el <div class=\"pieza\">. Sin explicaciones."
    ].join("\n\n");
  }

  // "Al dengue le cerramos la puerta" + "la puerta" -> "Al dengue le cerramos [[la puerta]]"
  function marcarDestacado(titulo, destacado) {
    titulo = String(titulo || ""); destacado = String(destacado || "").trim();
    if (!destacado) return titulo;
    var i = titulo.toLowerCase().indexOf(destacado.toLowerCase());
    if (i >= 0) return titulo.slice(0, i) + "[[" + titulo.slice(i, i + destacado.length) + "]]" + titulo.slice(i + destacado.length);
    // palabras sueltas
    var set = destacado.toLowerCase().split(/\s+/);
    return titulo.split(/\s+/).map(function (p) { return set.indexOf(p.toLowerCase().replace(/[^\wáéíóúñü]/g, "")) >= 0 ? "[[" + p + "]]" : p; }).join(" ").replace(/\]\] \[\[/g, " ");
  }

  function extraer(texto) {
    var t = String(texto || "");
    var m = t.match(/```(?:html)?\s*([\s\S]*?)```/i);
    return (m ? m[1] : t).trim();
  }

  /* ---------------- Saneado ---------------- */
  var URL_OK = /^(\{\{(FOTO|ESCUDO|ESCUDO_BLANCO|ESCUDO_AUTO)\}\}|data:image\/)/;

  // Si la IA inventó la ruta del escudo (ej. "escudo.png"), se reemplaza por el escudo real;
  // cuál de los dos (azul o blanco) se decide al revisar, según el color del texto de la firma.
  function arreglarEscudos(codigo) {
    return String(codigo).replace(/<img\b[^>]*>/gi, function (tag) {
      var src = (tag.match(/\bsrc\s*=\s*(["'])(.*?)\1/i) || [])[2] || "";
      if (URL_OK.test(src.trim())) return tag;
      if (/escudo|logo|munic|firma|seal|crest/i.test(tag)) {
        return /\bsrc\s*=/.test(tag) ? tag.replace(/\bsrc\s*=\s*(["']).*?\1/i, 'src="{{ESCUDO_AUTO}}"') : tag.replace(/<img/i, '<img src="{{ESCUDO_AUTO}}"');
      }
      return "";
    });
  }
  function sanear(html) {
    var doc = new DOMParser().parseFromString("<!doctype html><html><body>" + html + "</body></html>", "text/html");
    $$(doc, "script,iframe,object,embed,link,meta,base,form,input,button,video,audio,canvas").forEach(function (n) { n.remove(); });
    $$(doc, "*").forEach(function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (a) {
        var nom = a.name.toLowerCase();
        if (/^on/.test(nom) || nom === "srcset" || (nom === "href" && !/^#/.test(a.value)) || nom === "xlink:href" && !/^#/.test(a.value)) n.removeAttribute(a.name);
        if (nom === "src" && !URL_OK.test(a.value.trim())) n.removeAttribute(a.name);
        if (nom === "style") n.setAttribute("style", limpiarCss(a.value));
      });
    });
    $$(doc, "style").forEach(function (s) { s.textContent = limpiarCss(s.textContent); });
    return doc;
  }
  function limpiarCss(css) {
    return String(css || "")
      // la foto y los colores de marca los pone el sistema: no se pueden redefinir
      .replace(/--(foto|primario|secundario|acento|claro|fondo|tinta|oscuro|sobre-acento)\s*:[^;}]*;?/gi, "")
      // @import completo (la URL puede tener ";" adentro, ej. wght@600;700)
      .replace(/@import\s+(url\(\s*(["']?)[^)]*?\2\s*\)|"[^"]*"|'[^']*')[^;]*;?/gi, "")
      .replace(/@import[^;\n]*;?/gi, "")
      .replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, function (m, q, u) { return /^(\{\{|data:image\/|#)/.test(u) ? m : "none"; })
      .replace(/(backdrop-)?filter\s*:\s*[^;}"]*blur[^;}"]*/gi, "")
      .replace(/expression\s*\(/gi, "");
  }
  function $$(root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }

  /* ---------------- Recursos incrustados ---------------- */
  function aDataUrl(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url); return r.blob(); }).then(function (b) {
      return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(b); });
    });
  }
  var fuentes = null;
  function cssFuentes() {
    if (fuentes) return fuentes;
    var gf = "https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Montserrat:wght@600;700;800&family=Bebas+Neue&display=block";
    fuentes = fetch(gf).then(function (r) { return r.text(); }).then(function (css) {
      // sólo el subconjunto latino (alcanza para el español)
      var bloques = css.match(/\/\*\s*latin\s*\*\/\s*@font-face\s*\{[^}]*\}/g) || [];
      return Promise.all(bloques.map(function (b) {
        var u = (b.match(/url\(([^)]+)\)/) || [])[1];
        return u ? aDataUrl(u.replace(/['"]/g, "")).then(function (d) { return b.replace(u, d); }) : b;
      }));
    }).then(function (bloques) {
      return aDataUrl("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/webfonts/fa-solid-900.woff2").then(function (fa) {
        return bloques.join("\n") + "\n@font-face{font-family:'Font Awesome 6 Free';font-style:normal;font-weight:900;src:url(" + fa + ") format('woff2');}";
      });
    }).catch(function (e) { fuentes = null; throw e; });
    return fuentes;
  }
  var escudos = null;
  function datosEscudo() {
    if (escudos) return escudos;
    escudos = new Promise(function (ok) {
      var im = new Image();
      im.onload = function () { ok(im); };
      im.src = "assets/img/escudo-256.png";
    }).then(function (im) {
      var c = document.createElement("canvas"); c.width = c.height = 256;
      var x = c.getContext("2d");
      x.drawImage(im, 0, 0, 256, 256);
      var normal = c.toDataURL("image/png");
      x.globalCompositeOperation = "source-in"; x.fillStyle = "#fff"; x.fillRect(0, 0, 256, 256);
      return { normal: normal, blanco: c.toDataURL("image/png") };
    });
    return escudos;
  }

  var CSS_BASE = ".pieza{box-sizing:border-box;font-family:Poppins,sans-serif;color:var(--tinta);-webkit-font-smoothing:antialiased}" +
    ".pieza *{box-sizing:border-box}.pieza p,.pieza h1,.pieza h2,.pieza h3{margin:0}" +
    ".pieza .fa-icono{font-family:'Font Awesome 6 Free';font-weight:900;font-style:normal;line-height:1;display:inline-block}" +
    ".pieza .firma{display:flex;align-items:center;gap:16px;line-height:1.15}";

  // Arma el HTML final (con iconos resueltos y recursos incrustados) para un ancho/alto.
  function preparar(codigo, W, H, pal, foto, esc) {
    var doc = sanear(codigo);
    $$(doc, "i[class*='fa-']").forEach(function (i) {
      var nombre = (i.className.match(/fa-(?!solid|regular|brands)([a-z0-9-]+)/) || [])[1];
      i.className = i.className.replace(/\bfa-(solid|regular|brands)\b/g, "").replace(/\bfa-[a-z0-9-]+\b/g, "").trim() + " fa-icono";
      i.textContent = nombre ? Plantillas.glifo(nombre) : "";
    });
    var cont = doc.createElement("div");
    while (doc.body.firstChild) cont.appendChild(doc.body.firstChild);
    var html = cont.innerHTML
      .replace(/\{\{FOTO\}\}/g, foto || "").replace(/\{\{ESCUDO_BLANCO\}\}/g, esc.blanco).replace(/\{\{ESCUDO(_AUTO)?\}\}/g, esc.normal);
    var vars = ".pieza{" + variablesPaleta(pal) + ";--foto:" + (foto ? "url(" + foto + ")" : "none") + ";width:" + W + "px;height:" + H + "px;position:relative;overflow:hidden}";
    return { html: html, css: CSS_BASE + vars };
  }

  /* ---------------- Revisión ---------------- */
  function revisar(codigo, W, H, pal, foto) {
    return datosEscudo().then(function (esc) {
      var prep = preparar(codigo, W, H, pal, foto, esc);
      return new Promise(function (ok) {
        var f = document.createElement("iframe");
        f.setAttribute("sandbox", "allow-same-origin"); // sin scripts
        f.style.cssText = "position:fixed;left:-20000px;top:0;width:" + W + "px;height:" + H + "px;border:0;visibility:hidden";
        f.srcdoc = "<!doctype html><html><head><meta charset='utf-8'><link rel='stylesheet' href='https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Montserrat:wght@600;700;800&family=Bebas+Neue&display=block'>" +
          "<style>html,body{margin:0}.fa-icono{font-family:'Font Awesome 6 Free'!important}" + prep.css + "</style></head><body>" + prep.html + "</body></html>";
        f.onload = function () {
          var d = f.contentDocument;
          (d.fonts ? d.fonts.ready : Promise.resolve()).then(function () {
            var p = [], raiz = d.querySelector(".pieza");
            if (!raiz) p.push("Falta el <div class=\"pieza\">.");
            var escs = $$(d, "img").filter(function (im) { return im.src.indexOf(esc.normal.slice(0, 60)) === 0 || im.src.indexOf(esc.blanco.slice(0, 60)) === 0; });
            var visible = escs.some(function (im) { var r = im.getBoundingClientRect(); return r.width >= 60 && r.left >= 0 && r.top >= 0 && r.right <= W && r.bottom <= H; });
            if (!visible) p.push("El escudo de la firma no aparece completo dentro de la placa (tiene que medir entre 80 y 120px).");
            $$(d, ".pieza *").forEach(function (el) {
              if (!el.childNodes.length || !Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); })) return;
              var r = el.getBoundingClientRect(), cs = d.defaultView.getComputedStyle(el);
              if (cs.visibility === "hidden" || cs.display === "none" || r.width === 0) return;
              var txt = el.textContent.trim().slice(0, 40);
              if (r.left < -2 || r.top < -2 || r.right > W + 2 || r.bottom > H + 2) p.push("El texto \"" + txt + "\" se sale de la placa.");
              else if (el.scrollWidth > el.clientWidth + 3 && cs.overflow !== "visible") p.push("El texto \"" + txt + "\" queda cortado a lo ancho.");
              else if (el.scrollHeight > el.clientHeight + 3 && cs.overflow !== "visible") p.push("El texto \"" + txt + "\" queda cortado a lo alto.");
            });
            // textos que se pisan entre sí
            var hojas = $$(d, ".pieza *").filter(function (el) {
              var r = el.getBoundingClientRect();
              return r.width > 0 && Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && n.textContent.trim(); });
            });
            for (var i = 0; i < hojas.length; i++) for (var j = i + 1; j < hojas.length; j++) {
              var a = hojas[i], b = hojas[j];
              if (a.contains(b) || b.contains(a)) continue;
              var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
              var ix = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left)), iy = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
              if (ix * iy > 0.15 * Math.min(ra.width * ra.height, rb.width * rb.height)) {
                p.push("El texto \"" + a.textContent.trim().slice(0, 30) + "\" se superpone con \"" + b.textContent.trim().slice(0, 30) + "\": separalos (usá flex en columna o más espacio).");
              }
            }
            if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(d.body.textContent)) p.push("Tiene emojis: sacalos.");
            // escudo automático: blanco si el texto de la firma es claro
            var codigoFinal = codigo;
            if (codigo.indexOf("{{ESCUDO_AUTO}}") >= 0) {
              var im0 = escs[0], col = im0 ? d.defaultView.getComputedStyle(im0.parentElement).color : "";
              var rgb = (col.match(/\d+/g) || [0, 0, 0]).map(Number);
              var claro = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) > 160;
              codigoFinal = codigo.replace(/\{\{ESCUDO_AUTO\}\}/g, claro ? "{{ESCUDO_BLANCO}}" : "{{ESCUDO}}");
            }
            // contraste real: se dibuja la placa y se mide el fondo detrás de cada texto
            var medidas = hojas.filter(function (el) { return !el.classList.contains("fa-icono") && /[A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(el.textContent); }).slice(0, 30).map(function (el) {
              var r = el.getBoundingClientRect(), cs = d.defaultView.getComputedStyle(el);
              var tam = parseFloat(cs.fontSize) || 30;
              return { txt: el.textContent.trim().slice(0, 30), r: { x: r.left, y: r.top, w: r.width, h: r.height }, color: cs.color, tam: el.closest(".firma") ? Math.max(tam, 40) : tam };
            });
            f.remove();
            dibujar(codigoFinal, W, H, pal, foto).then(function (canvas) {
              contraste(canvas, medidas).forEach(function (m) { p.push(m); });
            }, function () {}).then(function () {
              ok({ problemas: p.filter(function (x, i, a) { return a.indexOf(x) === i; }).slice(0, 6), codigo: codigoFinal });
            });
          });
        };
        document.body.appendChild(f);
      });
    });
  }

  /* ---------------- Contraste ---------------- */
  function lum(r, g, b) {
    var f = function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  }
  // Para cada texto toma una grilla de píxeles de su caja, descarta los del color del texto y
  // compara contra el fondo más parecido al texto (percentil 20): el caso peor razonable.
  function contraste(canvas, medidas) {
    var ctx = canvas.getContext("2d"), probs = [];
    medidas.forEach(function (m) {
      var tc = (m.color.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
      if (tc.length > 3 && tc[3] < 0.3) return;
      var x0 = Math.max(0, Math.floor(m.r.x)), y0 = Math.max(0, Math.floor(m.r.y));
      var w = Math.min(canvas.width - x0, Math.ceil(m.r.w)), h = Math.min(canvas.height - y0, Math.ceil(m.r.h));
      if (w < 4 || h < 4) return;
      var data = ctx.getImageData(x0, y0, w, h).data, fondos = [], todos = [];
      for (var gy = 0; gy < 12; gy++) for (var gx = 0; gx < 16; gx++) {
        var i = ((Math.floor((gy + 0.5) * h / 12)) * w + Math.floor((gx + 0.5) * w / 16)) * 4;
        var dr = data[i] - tc[0], dg = data[i + 1] - tc[1], db = data[i + 2] - tc[2];
        var lp = lum(data[i], data[i + 1], data[i + 2]);
        todos.push(lp);
        if (Math.sqrt(dr * dr + dg * dg + db * db) > 90) fondos.push(lp);
      }
      var lt = lum(tc[0], tc[1], tc[2]);
      if (fondos.length < 25) {
        // casi todo el recuadro es del color del texto: o el texto lo llena, o el fondo es igual al texto (invisible)
        todos.sort(function (a, b) { return a - b; });
        var lm = todos[Math.floor(todos.length / 2)], rm = (Math.max(lt, lm) + 0.05) / (Math.min(lt, lm) + 0.05);
        if (rm < 1.6 && m.r.w * m.r.h > 2000) probs.push("El texto \"" + m.txt + "\" casi no se ve: es del mismo color que su fondo.");
        return;
      }
      fondos.sort(function (a, b) { return Math.abs(a - lt) - Math.abs(b - lt); });
      var lb = fondos[Math.floor(fondos.length * 0.2)];
      var ratio = (Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05);
      var minimo = m.tam >= 40 ? 3 : 4.5;
      // por debajo de 2:1 el texto casi no se lee: cuenta como pieza rota
      if (ratio < 2) probs.push("El texto \"" + m.txt + "\" casi no se ve (contraste " + ratio.toFixed(1) + ":1): ponelo sobre un color sólido o una capa mucho más oscura/clara.");
      else if (ratio < minimo) probs.push("Poco contraste en \"" + m.txt + "\" (" + ratio.toFixed(1) + ":1, mínimo " + minimo + ":1): poné el texto sobre un color sólido o una capa más oscura/clara.");
    });
    return probs;
  }

  /* ---------------- Render a imagen ---------------- */
  function dibujar(codigo, W, H, pal, foto) {
    return Promise.all([cssFuentes(), datosEscudo()]).then(function (r) {
      var prep = preparar(codigo, W, H, pal, foto, r[1]);
      // pasar a XHTML para poder meterlo en el SVG
      var doc = document.implementation.createHTMLDocument("");
      var div = doc.createElement("div");
      div.innerHTML = "<style>" + r[0] + "\n" + prep.css + "</style>" + prep.html;
      var xhtml = new XMLSerializer().serializeToString(div);
      var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + W + "' height='" + H + "'><foreignObject x='0' y='0' width='100%' height='100%'>" + xhtml + "</foreignObject></svg>";
      return new Promise(function (ok, mal) {
        var im = new Image();
        im.onload = function () {
          var c = document.createElement("canvas"); c.width = W; c.height = H;
          var ctx = c.getContext("2d");
          ctx.fillStyle = pal.fondo; ctx.fillRect(0, 0, W, H);
          ctx.drawImage(im, 0, 0);
          ok(c);
        };
        im.onerror = function () { mal(new Error("No se pudo dibujar el diseño.")); };
        im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      });
    });
  }

  /* ---------------- Generar con la IA ---------------- */
  // El modelo razona antes de escribir el HTML (puede tardar 1 a 2 minutos). Si la conexión se corta, se reintenta una vez.
  function pedir(mensajes, reintento) {
    var ctrl = new AbortController(), corte = setTimeout(function () { ctrl.abort(); }, 180000);
    return fetch(C.apiBase + "/ia/chat", { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ messages: mensajes, perfil: "diseno" }, modeloPrueba ? { modelo: modeloPrueba } : {})) })
      .then(function (r) { clearTimeout(corte); if (!r.ok) throw new Error("chat " + r.status); return r.json(); })
      .then(function (j) {
        if (window.Costos) Costos.sumar("diseno", j.usage);
        var c = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content; if (!c) throw new Error("La IA no devolvió el diseño."); return c;
      })
      .catch(function (e) {
        clearTimeout(corte);
        if (!reintento && e instanceof TypeError) return new Promise(function (ok) { setTimeout(ok, 1500); }).then(function () { return pedir(mensajes, true); });
        throw e;
      });
  }

  // Problemas que rompen la pieza (no se publica así). El contraste justo se avisa pero no bloquea.
  function graves(problemas) {
    return problemas.filter(function (p) { return /se sale|cortado|superpone|no aparece|casi no se ve|Falta/.test(p); });
  }

  // Un intento: diseño + (si hace falta) una corrección. Devuelve { codigo, direccion, problemas }.
  function intento(pieza, pal, W, H, foto, direccion, alProgreso) {
    var msgs = [{ role: "user", content: prompt(pieza || {}, pal, W, H, !!foto, direccion) }];
    alProgreso && alProgreso("Diseñando (" + direccion.id + ")…");
    return pedir(msgs).then(function (resp) {
      var original = extraer(resp);
      return revisar(arreglarEscudos(original), W, H, pal, foto).then(function (r1) {
        if (!r1.problemas.length) return { codigo: r1.codigo, direccion: direccion.id, problemas: [] };
        alProgreso && alProgreso("Corrigiendo detalles…");
        msgs.push({ role: "assistant", content: "```html\n" + original + "\n```" });
        msgs.push({ role: "user", content: "Revisé la placa renderizada y tiene estos problemas:\n- " + r1.problemas.join("\n- ") + "\nCorregilos sin cambiar la idea del diseño. Si algo no entra, achicá tipografías o sacá aire, nunca dejes texto afuera. Recordá: el escudo es <img src=\"{{ESCUDO}}\"> o <img src=\"{{ESCUDO_BLANCO}}\"> tal cual. Respondé SOLO con el bloque ```html completo." });
        return pedir(msgs).then(function (r2) {
          return revisar(arreglarEscudos(extraer(r2)), W, H, pal, foto).then(function (r2b) {
            var mejor = graves(r2b.problemas).length <= graves(r1.problemas).length ? r2b : r1;
            return { codigo: mejor.codigo, direccion: direccion.id, problemas: mejor.problemas };
          });
        });
      });
    });
  }

  // Devuelve { codigo, direccion, problemas, prolijo }. Si el primer intento queda roto, prueba otra
  // dirección de arte; si tampoco, prolijo=false y la app se queda con la plantilla (que nunca se rompe).
  function generar(pieza, pal, W, H, foto, alProgreso) {
    var d1 = elegirDireccion(!!foto, pieza || {});
    return intento(pieza, pal, W, H, foto, d1, alProgreso).then(function (r1) {
      if (!graves(r1.problemas).length) return Object.assign(r1, { prolijo: true });
      var d2 = elegirDireccion(!!foto, pieza || {});
      if (d2.id === d1.id) d2 = elegirDireccion(!!foto, pieza || {});
      alProgreso && alProgreso("Probando otra composición…");
      return intento(pieza, pal, W, H, foto, d2, alProgreso).then(function (r2) {
        var mejor = graves(r2.problemas).length < graves(r1.problemas).length ? r2 : r1;
        return Object.assign(mejor, { prolijo: !graves(mejor.problemas).length });
      }, function () { return Object.assign(r1, { prolijo: false }); });
    });
  }

  // Sólo para comparar modelos con un proxy de prueba local; el proxy real ignora "modelo" (lo fija el perfil).
  var modeloPrueba = null;
  return { generar: generar, dibujar: dibujar, revisar: revisar, arreglarEscudos: arreglarEscudos, direcciones: DIRECCIONES,
    probarModelo: function (m) { modeloPrueba = m; } };
})();
