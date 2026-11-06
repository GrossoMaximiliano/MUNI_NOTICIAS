/* =========================================================
   Plantillas de diseño con el estilo de las publicaciones de la
   Municipalidad (Instagram/Facebook). La IA NO dibuja la pieza:
   elige plantilla, paleta y escribe los textos; el diseño lo arma
   este código con tipografía real (Poppins / Bebas Neue), formas
   planas, el escudo y textos siempre sobre fondos con contraste.

   Plantillas:
   - campana         Fondo claro + foto con borde curvo a la derecha (ej. "¿Por qué hay animales silvestres?")
   - foto            Foto completa con degradado y título grande abajo (ej. "La basura se queda en casa")
   - evento          Fecha en círculos, título en panel, lugar/hora y banda inferior (ej. Congreso de Ecoturismo)
   - comunicado      Sin foto (o foto muy tenue): título en dos tonos, íconos y recuadro de info (ej. Voluntariado)
   - recomendaciones Franja de foto a la izquierda + lista con íconos (ej. "Cuidar la fauna")
   - cronica         Foto real arriba y banda de color con título (ej. "CreARTE · Firma de convenios")
   - escudo          La foto tal cual, sólo con el escudo
   - original        La foto sin nada (portada de la web)
   ========================================================= */
window.Plantillas = (function () {
  var FUENTE = "Poppins, 'Segoe UI', sans-serif";
  var CONDENSADA = "'Bebas Neue', Impact, sans-serif";
  var ICONOS = "'Font Awesome 6 Free'";

  var PALETAS = {
    verde:     { nombre: "Ambiente",     fondo: "#f1f5e9", claro: "#e2f0d6", primario: "#14581f", secundario: "#2f7d32", acento: "#8bc34a", tinta: "#1f2a1f", oscuro: "#0d3a14", sobreAcento: "#0d3a14" },
    violeta:   { nombre: "Salud",        fondo: "#f4f1fb", claro: "#dce9ff", primario: "#5a1fa0", secundario: "#7d4bc7", acento: "#c9b6f5", tinta: "#1b1b2f", oscuro: "#1c1660", sobreAcento: "#1c1660" },
    marino:    { nombre: "Institucional", fondo: "#f2f6fb", claro: "#e3eef9", primario: "#0b2a4a", secundario: "#1f5fa8", acento: "#c9a227", tinta: "#16202e", oscuro: "#071d35", sobreAcento: "#071d35" },
    terracota: { nombre: "Turismo",      fondo: "#fbeee4", claro: "#f6dccd", primario: "#7a3b33", secundario: "#c27866", acento: "#6f8a5e", tinta: "#3b201b", oscuro: "#5a2a24", sobreAcento: "#ffffff" },
    rojo:      { nombre: "Social",       fondo: "#f7f4f5", claro: "#f8e6ea", primario: "#d1213f", secundario: "#0a1f7a", acento: "#d1213f", tinta: "#1a1a2a", oscuro: "#0a1f7a", sobreAcento: "#ffffff" },
    turquesa:  { nombre: "Educación",    fondo: "#eef8f9", claro: "#d8f0f3", primario: "#138a9a", secundario: "#0e5f6b", acento: "#f2b705", tinta: "#123238", oscuro: "#0b4952", sobreAcento: "#123238" }
  };

  var NOMBRES = {
    campana: "Campaña", foto: "Foto + título", evento: "Evento", comunicado: "Comunicado",
    recomendaciones: "Recomendaciones", cronica: "Crónica", dividida: "Dividida", titular: "Titular", escudo: "Solo escudo"
  };

  /* ---------------- Recursos ---------------- */
  var escudo = new Image(), escudoBlanco = null;
  var listo = Promise.all([
    new Promise(function (ok) { escudo.onload = ok; escudo.onerror = ok; escudo.src = "assets/img/escudo-256.png"; }),
    document.fonts ? Promise.all([
      "400 40px Poppins", "italic 400 40px Poppins", "500 40px Poppins", "600 40px Poppins", "700 40px Poppins", "800 40px Poppins",
      "italic 600 40px Poppins", "400 40px 'Bebas Neue'", "900 40px 'Font Awesome 6 Free'"
    ].map(function (f) { return document.fonts.load(f).catch(function () {}); })) : null
  ]).then(function () {
    if (!escudo.naturalWidth) return;
    var c = document.createElement("canvas");
    c.width = escudo.naturalWidth; c.height = escudo.naturalHeight;
    var x = c.getContext("2d");
    x.drawImage(escudo, 0, 0);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    escudoBlanco = c;
  });

  // Carácter de un ícono de Font Awesome a partir de su nombre ("paw", "location-dot"…).
  var glifos = {};
  function glifo(nombre) {
    nombre = String(nombre || "circle-info").replace(/^fa-/, "");
    if (glifos[nombre] !== undefined) return glifos[nombre] || glifo("circle-info");
    var i = document.createElement("i");
    i.className = "fa-solid fa-" + nombre;
    i.style.cssText = "position:absolute;left:-9999px";
    document.body.appendChild(i);
    var c = getComputedStyle(i, "::before").content;
    i.remove();
    c = c && c !== "none" && c !== "normal" ? c.replace(/^["']|["']$/g, "") : "";
    glifos[nombre] = c;
    return c || (nombre === "circle-info" ? "i" : glifo("circle-info"));
  }

  /* ---------------- Ayudas de dibujo ---------------- */
  function cover(ctx, img, x, y, w, h, fx, fy) {
    var k = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    var iw = img.naturalWidth * k, ih = img.naturalHeight * k;
    var px = x + (w - iw) * (fx == null ? 0.5 : fx), py = y + (h - ih) * (fy == null ? 0.5 : fy);
    ctx.drawImage(img, px, py, iw, ih);
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function fuente(peso, tam, fam, italica) { return (italica ? "italic " : "") + peso + " " + Math.round(tam) + "px " + (fam || FUENTE); }
  function norm(s) { return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ]/g, ""); }
  function sombra(ctx, on, k) {
    ctx.shadowColor = on ? "rgba(0,0,0,.28)" : "transparent";
    ctx.shadowBlur = on ? 22 * k : 0; ctx.shadowOffsetY = on ? 6 * k : 0;
  }

  /* Flujo vertical de bloques: mide (dibujar=false) o dibuja. Si algo no entra, marca desborde. */
  function Flujo(ctx, x, y, w, dibujar, align) {
    this.ctx = ctx; this.x = x; this.y = y; this.w = w; this.dib = dibujar; this.align = align || "left"; this.desborde = false;
  }
  Flujo.prototype.gap = function (n) { this.y += n; return this; };
  Flujo.prototype.xLinea = function (ancho, align) {
    var a = align || this.align;
    return a === "center" ? this.x + (this.w - ancho) / 2 : a === "right" ? this.x + this.w - ancho : this.x;
  };

  // Título con palabras destacadas (caja de color o color distinto).
  Flujo.prototype.titulo = function (texto, o) {
    if (!texto) return this;
    var ctx = this.ctx;
    if (o.principal && TIPOS[V.tipo]) {
      // el título principal toma la tipografía de la variante
      var tp = TIPOS[V.tipo];
      o = Object.assign({}, o, { familia: tp.fam, peso: tp.peso, tam: o.tam * tp.f, lh: tp.lh || o.lh, mayus: o.mayus || tp.mayus });
    }
    var t = o.mayus ? String(texto).toUpperCase() : String(texto);
    var dest = {};
    String(o.destacado || "").split(/\s+/).forEach(function (p) { if (norm(p)) dest[norm(p)] = 1; });
    ctx.font = fuente(o.peso || 800, o.tam, o.familia);
    var esp = ctx.measureText(" ").width, padCaja = o.tam * 0.16;
    // las palabras destacadas seguidas van en una sola caja
    var palabras = [];
    t.split(/\s+/).filter(Boolean).forEach(function (p) {
      var d = !!dest[norm(p)], ant = palabras[palabras.length - 1];
      if (d && ant && ant.d && o.estilo === "caja") ant.t += " " + p; else palabras.push({ t: p, d: d });
    });
    palabras.forEach(function (p) { p.w = ctx.measureText(p.t).width; });
    var lineas = [], linea = [], ancho = 0;
    var self = this;
    palabras.forEach(function (p) {
      var extra = p.d ? padCaja * 2 : 0;
      var nuevo = ancho + (linea.length ? esp : 0) + p.w + extra;
      if (nuevo > self.w && linea.length) { lineas.push(linea); linea = [p]; ancho = p.w + extra; }
      else { linea.push(p); ancho = nuevo; }
      if (p.w > self.w) self.desborde = true;
    });
    if (linea.length) lineas.push(linea);
    if (o.maxLineas && lineas.length > o.maxLineas) this.desborde = true;
    var lh = o.tam * (o.lh || 1.05);
    if (this.dib) {
      ctx.textBaseline = "alphabetic";
      lineas.forEach(function (l, i) {
        var anchoL = l.reduce(function (a, p, j) { return a + p.w + (j ? esp : 0) + (p.d && o.estilo === "caja" ? padCaja * 2 : 0); }, 0);
        var x = self.xLinea(anchoL, o.align), base = self.y + i * lh + o.tam * 0.86;
        l.forEach(function (p, j) {
          if (j) x += esp;
          if (p.d && o.estilo === "caja") {
            ctx.fillStyle = o.fondoDest;
            ctx.fillRect(x, base - o.tam * 0.86, p.w + padCaja * 2, o.tam * 1.02);
            ctx.fillStyle = o.colorDest; ctx.fillText(p.t, x + padCaja, base);
            x += p.w + padCaja * 2;
          } else {
            ctx.fillStyle = p.d ? o.colorDest : o.color;
            if (o.contorno) { ctx.lineWidth = o.tam * 0.12; ctx.strokeStyle = o.contorno; ctx.lineJoin = "round"; ctx.strokeText(p.t, x, base); }
            ctx.fillText(p.t, x, base);
            x += p.w;
          }
        });
      });
    }
    this.y += lineas.length * lh;
    return this;
  };

  // Texto con **negritas**.
  Flujo.prototype.rico = function (texto, o) {
    if (!texto) return this;
    var ctx = this.ctx, self = this;
    var palabras = [];
    var finConEspacio = true;
    String(texto).split(/(\*\*[^*]+\*\*)/).forEach(function (seg) {
      if (!seg) return;
      var b = /^\*\*[^*]+\*\*$/.test(seg);
      var limpio = seg.replace(/\*\*/g, "");
      // pegado al anterior (ej. "." después de una negrita): sin espacio en el medio
      var pegado = palabras.length && !finConEspacio && !/^\s/.test(limpio);
      limpio.split(/\s+/).filter(Boolean).forEach(function (p, i) { palabras.push({ t: p, b: b, pegado: i === 0 && pegado }); });
      finConEspacio = /\s$/.test(limpio);
    });
    var f = function (b) { return fuente(b ? (o.pesoNegrita || 700) : (o.peso || 400), o.tam, null, o.italica && !b); };
    ctx.font = f(false);
    var esp = ctx.measureText(" ").width;
    palabras.forEach(function (p) { ctx.font = f(p.b); p.w = ctx.measureText(p.t).width; });
    var lineas = [], linea = [], ancho = 0;
    palabras.forEach(function (p) {
      var nuevo = ancho + (linea.length && !p.pegado ? esp : 0) + p.w;
      if (nuevo > self.w && linea.length && !p.pegado) { lineas.push(linea); linea = [p]; ancho = p.w; }
      else { linea.push(p); ancho = nuevo; }
    });
    if (linea.length) lineas.push(linea);
    if (o.maxLineas && lineas.length > o.maxLineas) this.desborde = true;
    var lh = o.tam * (o.lh || 1.3);
    if (this.dib) {
      ctx.textBaseline = "alphabetic";
      lineas.forEach(function (l, i) {
        var anchoL = l.reduce(function (a, p, j) { return a + p.w + (j && !p.pegado ? esp : 0); }, 0);
        var x = self.xLinea(anchoL, o.align);
        l.forEach(function (p, j) {
          if (j && !p.pegado) x += esp;
          ctx.font = f(p.b);
          ctx.fillStyle = p.b ? (o.colorNegrita || o.color) : o.color;
          ctx.fillText(p.t, x, self.y + i * lh + o.tam);
          x += p.w;
        });
      });
    }
    this.y += lineas.length * lh;
    return this;
  };

  // Píldora (antetítulo o llamado a la acción).
  Flujo.prototype.pildora = function (texto, o) {
    if (!texto) return this;
    var ctx = this.ctx;
    ctx.font = fuente(o.peso || 600, o.tam, null, o.italica);
    var tw = ctx.measureText(texto).width, flecha = o.flecha ? o.tam * 1.5 : 0;
    var px = o.tam * 1.1, h = o.tam * 2;
    var w = Math.min(this.w, tw + px * 2 + flecha);
    if (tw + px * 2 + flecha > this.w) this.desborde = true;
    if (o.ancho === "lleno") w = Math.max(w, Math.min(this.w, o.anchoMin || 0));
    var x = this.xLinea(w, o.align);
    if (this.dib) {
      rr(ctx, x, this.y, w, h, h / 2);
      if (o.fondo) { ctx.fillStyle = o.fondo; ctx.fill(); }
      if (o.borde) { ctx.lineWidth = Math.max(2, o.tam * 0.1); ctx.strokeStyle = o.borde; ctx.stroke(); }
      ctx.fillStyle = o.color; ctx.textBaseline = "middle";
      ctx.fillText(texto, x + (w - tw - flecha) / 2, this.y + h / 2 + o.tam * 0.04);
      if (o.flecha) {
        var cx = x + w - px - o.tam * 0.55, cy = this.y + h / 2, r = o.tam * 0.55;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = o.color; ctx.fill();
        ctx.font = fuente(900, o.tam * 0.6, ICONOS); ctx.fillStyle = o.fondo || "#fff"; ctx.textAlign = "center";
        ctx.fillText(glifo("arrow-right"), cx, cy + o.tam * 0.03); ctx.textAlign = "left";
      }
      ctx.textBaseline = "alphabetic";
    }
    this.y += h;
    return this;
  };

  // Fila con ícono + texto (lugar, hora, fecha).
  Flujo.prototype.dato = function (icono, texto, o) {
    if (!texto) return this;
    var ctx = this.ctx;
    ctx.font = fuente(o.peso || 500, o.tam);
    var tw = ctx.measureText(texto).width, iw = o.tam * 1.5;
    if (tw + iw > this.w) this.desborde = true;
    var x = this.xLinea(Math.min(this.w, tw + iw), o.align);
    if (this.dib) {
      ctx.fillStyle = o.colorIcono || o.color;
      ctx.font = fuente(900, o.tam * 0.9, ICONOS); ctx.fillText(glifo(icono), x, this.y + o.tam);
      ctx.font = fuente(o.peso || 500, o.tam); ctx.fillStyle = o.color; ctx.fillText(texto, x + iw, this.y + o.tam);
    }
    this.y += o.tam * 1.45;
    return this;
  };

  // Escudo + "Municipalidad de Las Toscas". Devuelve el ancho.
  function firma(ctx, x, y, s, color, blanco, dibujar, align) {
    ctx.font = fuente(500, s * 0.3);
    var t1 = ctx.measureText("Municipalidad").width;
    ctx.font = fuente(400, s * 0.3);
    var de = ctx.measureText("de ").width;
    ctx.font = fuente(700, s * 0.3);
    var t2 = de + ctx.measureText("Las Toscas").width;
    var ancho = s + s * 0.18 + Math.max(t1, t2);
    if (!dibujar) return ancho;
    if (align === "center") x -= ancho / 2;
    if (align === "right") x -= ancho;
    var img = blanco ? escudoBlanco : escudo;
    if (img) ctx.drawImage(img, x, y, s, s);
    var tx = x + s * 1.18;
    ctx.fillStyle = color; ctx.textBaseline = "alphabetic";
    ctx.font = fuente(500, s * 0.3); ctx.fillText("Municipalidad", tx, y + s * 0.46);
    ctx.font = fuente(400, s * 0.3); ctx.fillText("de ", tx, y + s * 0.82);
    ctx.font = fuente(700, s * 0.3); ctx.fillText("Las Toscas", tx + de, y + s * 0.82);
    return ancho;
  }

  // Ícono dentro de un círculo; con "no" lleva el aro rojo con la barra (señal de prohibido).
  function iconoCirculo(ctx, cx, cy, r, nombre, o) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = o.fondo; ctx.fill();
    ctx.font = fuente(900, r * (o.no ? 0.95 : 0.9), ICONOS);
    ctx.fillStyle = o.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(glifo(nombre), cx, cy + r * 0.04);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    if (o.no) {
      ctx.lineWidth = r * 0.16; ctx.strokeStyle = "#e3463c";
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.65, cy - r * 0.65); ctx.lineTo(cx + r * 0.65, cy + r * 0.65); ctx.stroke();
    }
  }

  // Borde curvo (como el corte orgánico de las piezas de la Muni).
  function curvaVertical(ctx, x, H, amp, haciaDerecha) {
    var s = haciaDerecha ? 1 : -1;
    ctx.lineTo(x, 0);
    ctx.bezierCurveTo(x - s * amp * 1.2, H * 0.22, x + s * amp * 0.9, H * 0.42, x - s * amp * 0.3, H * 0.6);
    ctx.bezierCurveTo(x - s * amp * 1.4, H * 0.76, x + s * amp * 0.6, H * 0.9, x - s * amp * 0.1, H);
  }

  /* ---------------- Variantes ----------------
     Cada pieza tiene una semilla: con ella se eligen, siempre igual para la misma semilla, el lado de la foto,
     la forma del corte, la tipografía del título, la textura, el adorno, el tratamiento de la foto y dónde va la firma.
     Semilla 0 = la versión clásica. Así dos publicaciones no salen iguales aunque usen la misma plantilla. */
  var V = {};
  function rng(semilla) {
    var a = semilla >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function variante(semilla) {
    if (!semilla) return { lado: "der", forma: "curva", tipo: "poppins", textura: "papel", foto: "natural", adorno: "ninguno", firma: "", alt: false, alt2: false };
    var r = rng(semilla), pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    return {
      lado: pick(["der", "izq"]), forma: pick(["curva", "curva", "arco", "circulo"]),
      tipo: pick(["poppins", "poppins", "bebas", "montserrat"]), textura: pick(["papel", "lineas", "manchas", "icono"]),
      foto: pick(["natural", "natural", "natural", "duotono", "calido"]), adorno: pick(["ninguno", "puntos", "anillos", "hojas"]),
      firma: pick(["izq", "der", "centro"]), alt: r() < 0.5, alt2: r() < 0.5
    };
  }
  var TIPOS = {
    poppins: { fam: FUENTE, peso: 800, f: 1, lh: null },
    montserrat: { fam: "Montserrat, " + FUENTE, peso: 800, f: 0.94, lh: null },
    bebas: { fam: CONDENSADA, peso: 400, f: 1.34, lh: 0.94, mayus: true }
  };

  function fondoPapel(ctx, W, H, color, pal, icono) {
    ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
    var k = Math.min(W, H) / 1080, r = rng((V.semilla || 7) * 31);
    ctx.save();
    if (pal && V.textura === "lineas") {
      ctx.strokeStyle = hexA(pal.primario, 0.05); ctx.lineWidth = 3 * k;
      for (var x = -H; x < W; x += 34 * k) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + H, H); ctx.stroke(); }
    } else if (pal && V.textura === "manchas") {
      [[0.9, 0.08, 0.32], [0.05, 0.92, 0.38], [0.75, 0.85, 0.18]].forEach(function (c, i) {
        ctx.beginPath(); ctx.arc(c[0] * W, c[1] * H, c[2] * Math.max(W, H), 0, Math.PI * 2);
        ctx.fillStyle = hexA(i === 1 ? pal.acento : pal.claro, i === 1 ? 0.1 : 0.55); ctx.fill();
      });
    } else if (pal && V.textura === "icono") {
      ctx.font = fuente(900, Math.max(W, H) * 0.55, ICONOS); ctx.fillStyle = hexA(pal.primario, 0.045);
      ctx.textBaseline = "middle"; ctx.textAlign = "center";
      ctx.translate(W * 0.8, H * 0.72); ctx.rotate(-0.25);
      ctx.fillText(glifo(icono || "leaf"), 0, 0);
    }
    ctx.restore();
    // grano muy sutil para que no quede un plano "digital"
    var n = Math.round(W * H / 900);
    for (var i = 0; i < n; i++) {
      ctx.fillStyle = r() < 0.5 ? "rgba(0,0,0,.018)" : "rgba(255,255,255,.05)";
      ctx.fillRect(r() * W, r() * H, 2, 2);
    }
  }

  // Foto con el tratamiento de la variante (natural, duotono con el color de la paleta o cálido).
  function fotoTratada(ctx, img, x, y, w, h, d, pal) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (V.foto === "duotono") ctx.filter = "grayscale(1) contrast(1.08) brightness(1.05)";
    else if (V.foto === "calido") ctx.filter = "saturate(1.12) contrast(1.04)";
    cover(ctx, img, x, y, w, h, d.fx, d.fy);
    ctx.filter = "none";
    if (V.foto === "duotono") { ctx.globalCompositeOperation = "multiply"; ctx.fillStyle = mezclar(pal.primario, "#ffffff", 0.25); ctx.fillRect(x, y, w, h); }
    if (V.foto === "calido") { ctx.globalCompositeOperation = "soft-light"; ctx.fillStyle = hexA(pal.acento, 0.35); ctx.fillRect(x, y, w, h); }
    ctx.restore();
  }

  // Adorno chico en una esquina libre (puntos, anillos u hojas), siempre tenue.
  function adorno(ctx, x, y, tam, color) {
    if (!V.adorno || V.adorno === "ninguno") return;
    ctx.save(); ctx.fillStyle = color; ctx.strokeStyle = color;
    if (V.adorno === "puntos") {
      for (var i = 0; i < 5; i++) for (var j = 0; j < 4; j++) { ctx.beginPath(); ctx.arc(x + i * tam * 0.22, y + j * tam * 0.22, tam * 0.035, 0, Math.PI * 2); ctx.fill(); }
    } else if (V.adorno === "anillos") {
      ctx.lineWidth = tam * 0.035;
      for (var n = 1; n <= 3; n++) { ctx.beginPath(); ctx.arc(x + tam * 0.5, y + tam * 0.5, tam * 0.17 * n, Math.PI * 0.9, Math.PI * 2.1); ctx.stroke(); }
    } else if (V.adorno === "hojas") {
      ctx.font = fuente(900, tam * 0.42, ICONOS); ctx.translate(x + tam * 0.3, y + tam * 0.5); ctx.rotate(-0.5);
      ctx.fillText(glifo("leaf"), 0, 0); ctx.rotate(0.9); ctx.fillText(glifo("leaf"), tam * 0.3, -tam * 0.05);
    }
    ctx.restore();
  }

  // Firma en la posición de la variante (o la que trae la plantilla).
  function firmaV(ctx, W, yTop, m, s, color, blanco, defecto) {
    var pos = V.firma || defecto;
    if (pos === "centro") firma(ctx, W / 2, yTop, s, color, blanco, true, "center");
    else if (pos === "der") firma(ctx, W - m, yTop, s, color, blanco, true, "right");
    else firma(ctx, m, yTop, s, color, blanco, true);
  }

  // Ramas/formas de fondo cuando no hay foto (en vez de un plano liso).
  function formasFondo(ctx, W, H, color) {
    ctx.save();
    ctx.strokeStyle = color; ctx.lineCap = "round";
    var k = Math.min(W, H) / 1080;
    [[0.15, -0.05, 0.05, 0.4, 0.3, 0.7, 70], [0.95, 0.1, 0.75, 0.45, 0.98, 0.8, 55], [0.4, 1.05, 0.55, 0.8, 0.9, 0.95, 45]].forEach(function (c) {
      ctx.lineWidth = c[6] * k;
      ctx.beginPath(); ctx.moveTo(c[0] * W, c[1] * H); ctx.quadraticCurveTo(c[2] * W, c[3] * H, c[4] * W, c[5] * H); ctx.stroke();
    });
    ctx.restore();
  }

  /* ---------------- Plantillas ----------------
     Cada una recibe (ctx, W, H, k, foto, p, pal, dib, d) y devuelve true si todo entró. */

  function campana(ctx, W, H, k, foto, p, pal, dib, d) {
    var vertical = H / W > 1.45, ancho = W / H > 1.4;
    var m = 90 * k * (ancho ? 0.9 : 1);
    var izq = V.lado === "izq" && !vertical;            // foto a la izquierda y texto a la derecha
    var anchoFoto = W * (ancho ? 0.42 : 0.4);
    if (dib) {
      fondoPapel(ctx, W, H, pal.fondo, pal, p.icono);
      ctx.save(); ctx.beginPath();
      if (vertical) {
        var yb = H * 0.42;
        if (V.forma === "circulo") ctx.arc(W * 0.62, H * 0.2, W * 0.52, 0, Math.PI * 2);
        else { ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, yb); ctx.bezierCurveTo(W * 0.7, yb + 60 * k, W * 0.35, yb - 70 * k, 0, yb + 30 * k); ctx.closePath(); }
      } else if (V.forma === "arco") {
        // arco tipo ventana, separado del borde
        var aw = anchoFoto * 0.95, ax = izq ? m * 0.6 : W - m * 0.6 - aw, ay = H * 0.1, ah = H * 0.8;
        ctx.moveTo(ax, ay + ah); ctx.lineTo(ax, ay + aw / 2); ctx.arc(ax + aw / 2, ay + aw / 2, aw / 2, Math.PI, 0); ctx.lineTo(ax + aw, ay + ah); ctx.closePath();
      } else if (V.forma === "circulo") {
        // el borde del círculo termina donde empieza la columna de texto
        var rc = H * 0.56;
        ctx.arc(izq ? anchoFoto + 30 * k - rc : W - anchoFoto - 30 * k + rc, H * 0.5, rc, 0, Math.PI * 2);
      } else {
        var xc = izq ? anchoFoto * 0.85 : W - anchoFoto * 0.85;
        if (izq) { ctx.moveTo(0, 0); ctx.lineTo(xc, 0); curvaVertical(ctx, xc, H, 70 * k, true); ctx.lineTo(0, H); }
        else { ctx.moveTo(W, 0); ctx.lineTo(xc, 0); curvaVertical(ctx, xc, H, 70 * k, false); ctx.lineTo(W, H); }
        ctx.closePath();
      }
      ctx.clip();
      if (foto) fotoTratada(ctx, foto, vertical ? 0 : (izq ? 0 : W - anchoFoto - 80 * k), 0, vertical ? W : anchoFoto + 80 * k, vertical ? H * 0.5 : H, d, pal);
      else { ctx.fillStyle = pal.primario; ctx.fillRect(0, 0, W, H); formasFondo(ctx, W, H, "rgba(255,255,255,.08)"); }
      ctx.restore();
      adorno(ctx, izq ? W - m - 150 * k : m, m * 0.5, 160 * k, hexA(pal.primario, 0.22));
    }
    var x = vertical ? m : (izq ? W - (W - anchoFoto) + m * 0.6 : m);
    var w = vertical ? W - m * 2 : W - anchoFoto - m * 1.8;
    var top = vertical ? H * 0.5 : H * (V.alt ? 0.22 : 0.17);
    var f = new Flujo(ctx, x, top, w, dib);
    if (V.alt2) f.titulo(p.antetitulo, { tam: 34 * k, peso: 600, color: pal.secundario, maxLineas: 1, italica: true });
    else f.pildora(p.antetitulo, { tam: 30 * k, fondo: pal.primario, color: "#fff", peso: 500, italica: true, ancho: "lleno", anchoMin: w * 0.85 });
    if (p.antetitulo) f.gap((V.alt2 ? 18 : 46) * k);
    f.titulo(p.titulo, { principal: true, tam: 92 * k, peso: 800, mayus: true, color: pal.primario, destacado: p.destacado, colorDest: pal.secundario, lh: 1.02, maxLineas: 4, contorno: "#fff" });
    f.gap(44 * k);
    f.rico(p.subtitulo, { tam: 38 * k, color: pal.tinta, lh: 1.25, maxLineas: 4 });
    if (p.cta) f.gap(40 * k).pildora(p.cta, { tam: 30 * k, borde: pal.primario, color: pal.primario, peso: 500, flecha: true });
    var sFirma = 92 * k;
    if (dib) firma(ctx, x, H - m * 0.7 - sFirma, sFirma, pal.tinta, false, true);
    return !f.desborde && f.y < H - m - sFirma - 20 * k;
  }

  function foto(ctx, W, H, k, img, p, pal, dib, d) {
    var m = 80 * k, ancho = W / H > 1.4;
    var izqTexto = V.alt;                                  // texto alineado a la izquierda en vez de centrado
    var al = izqTexto ? "left" : "center";
    var w = W - m * 2 * (ancho ? 2.2 : 1);
    var sFirma = 84 * k;
    var med = new Flujo(ctx, m, 0, w, false, al);
    bloque(med);
    var alto = med.y, top = H - m * 0.9 - sFirma - 40 * k - alto;
    if (dib) {
      if (img) fotoTratada(ctx, img, 0, 0, W, H, d, pal); else { fondoPapel(ctx, W, H, pal.secundario, pal, p.icono); formasFondo(ctx, W, H, "rgba(255,255,255,.07)"); }
      var g = ctx.createLinearGradient(0, Math.max(0, top - H * 0.28), 0, top + 40 * k);
      g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, hexA(pal.oscuro, 0.9));
      ctx.fillStyle = g; ctx.fillRect(0, Math.max(0, top - H * 0.28), W, H);
      ctx.fillStyle = hexA(pal.oscuro, 0.9); ctx.fillRect(0, top + 40 * k, W, H);
      var gt = ctx.createLinearGradient(0, 0, 0, 220 * k);
      gt.addColorStop(0, "rgba(0,0,0,.35)"); gt.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gt; ctx.fillRect(0, 0, W, 220 * k);
      var arriba = new Flujo(ctx, m, m * 0.8, W * 0.6, true);
      arriba.pildora(p.antetitulo, { tam: 28 * k, fondo: V.alt2 ? "#fff" : pal.primario, color: V.alt2 ? pal.primario : "#fff", peso: 700 });
      if (escudoBlanco) ctx.drawImage(escudoBlanco, W - m - 130 * k, m * 0.6, 130 * k, 130 * k);
    }
    var x = ancho ? m * 2.2 : m;
    var f = new Flujo(ctx, x, top, w, dib, al);
    bloque(f);
    if (dib) {
      if (izqTexto) firma(ctx, x, H - m * 0.8 - sFirma, sFirma, "#fff", true, true);
      else firma(ctx, W / 2, H - m * 0.8 - sFirma, sFirma, "#fff", true, true, "center");
    }
    return !f.desborde && top > H * 0.3;

    function bloque(fl) {
      fl.rico(p.entrada, { tam: 36 * k, color: "rgba(255,255,255,.9)", align: al, maxLineas: 2 });
      if (p.entrada) fl.gap(14 * k);
      if (izqTexto && fl.dib) { fl.ctx.fillStyle = pal.acento; fl.ctx.fillRect(fl.x, fl.y, 90 * k, 9 * k); }
      if (izqTexto) fl.gap(26 * k);
      fl.titulo(p.titulo, { principal: true, tam: 88 * k, peso: 800, mayus: true, color: "#fff", destacado: p.destacado, estilo: izqTexto ? "color" : "caja", fondoDest: pal.primario, colorDest: izqTexto ? pal.acento : "#fff", align: al, maxLineas: 4, lh: 1.08 });
      if (p.subtitulo) {
        if (izqTexto) { fl.gap(26 * k).rico(p.subtitulo, { tam: 36 * k, color: "rgba(255,255,255,.92)", colorNegrita: "#fff", maxLineas: 4, lh: 1.25 }); }
        else {
          fl.gap(34 * k);
          var t0 = fl.y, pad = 30 * k, cx = fl.x, cw = fl.w;
          fl.x = cx + pad; fl.w = cw - pad * 2; fl.y += pad;
          var medir = new Flujo(fl.ctx, fl.x, fl.y, fl.w, false, "center");
          medir.rico(p.subtitulo, { tam: 36 * k, color: pal.tinta, pesoNegrita: 700, align: "center", maxLineas: 4, lh: 1.25 });
          if (fl.dib) { rr(fl.ctx, cx, t0, cw, medir.y - t0 + pad, 26 * k); fl.ctx.fillStyle = pal.claro; fl.ctx.fill(); }
          fl.rico(p.subtitulo, { tam: 36 * k, color: pal.tinta, pesoNegrita: 700, align: "center", maxLineas: 4, lh: 1.25 });
          if (medir.desborde) fl.desborde = true;
          fl.y += pad; fl.x = cx; fl.w = cw;
        }
      }
      if (p.cta) fl.gap(28 * k).pildora(p.cta, { tam: 28 * k, borde: "#fff", color: "#fff", peso: 500, flecha: true, align: al });
    }
  }

  function evento(ctx, W, H, k, img, p, pal, dib, d) {
    var m = 80 * k, ancho = W / H > 1.4;
    var banda = 150 * k;
    var calendario = V.alt;                                // fecha como hoja de calendario en vez de círculos
    if (dib) {
      if (img) { fotoTratada(ctx, img, 0, 0, W, H, d, pal); ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(0, 0, W, H); }
      else { fondoPapel(ctx, W, H, pal.secundario, pal, p.icono); formasFondo(ctx, W, H, hexA(pal.oscuro, 0.35)); }
      ctx.fillStyle = pal.primario;
      if (V.alt2) ctx.fillRect(0, H - banda, W, banda); else { rr(ctx, -40 * k, H - banda, W + 80 * k, banda + 60 * k, 60 * k); ctx.fill(); }
      firmaV(ctx, W, H - banda + (banda - 78 * k) / 2, m, 78 * k, "#fff", true, "centro");
    }
    var cw = ancho ? W * 0.55 : W - m * 2;
    var cx = ancho ? (V.lado === "izq" ? m : W - m - cw) : m;
    var y = m;
    var fe = p.fecha || {};
    var dias = (fe.dias || []).filter(Boolean).slice(0, 3);
    if (dias.length && calendario) {
      var cwc = 250 * k + (dias.length - 1) * 120 * k, chc = 250 * k, ccx = V.lado === "izq" && !ancho ? cx : cx + cw - cwc;
      if (dib) {
        ctx.save(); sombra(ctx, true, k); ctx.fillStyle = "#fff"; rr(ctx, ccx, y, cwc, chc, 28 * k); ctx.fill(); ctx.restore();
        ctx.save(); rr(ctx, ccx, y, cwc, 70 * k, 28 * k); ctx.clip(); ctx.fillStyle = pal.primario; ctx.fillRect(ccx, y, cwc, 70 * k); ctx.restore();
        ctx.fillStyle = "#fff"; ctx.font = fuente(700, 32 * k); ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(fe.mes || "").toUpperCase().replace(/\s*\d{4}$/, ""), ccx + cwc / 2, y + 37 * k);
        ctx.fillStyle = pal.oscuro; ctx.font = fuente(400, 150 * k, CONDENSADA);
        ctx.fillText(dias.join("·"), ccx + cwc / 2, y + 70 * k + (chc - 70 * k) / 2 + 8 * k);
        ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      }
      y += chc + 30 * k;
    } else if (dias.length) {
      var r = 92 * k, tot = r * 2 + (dias.length - 1) * r * 1.55;
      var x0 = cx + (cw - tot) / 2 + r;
      dias.forEach(function (dia, i) {
        if (dib) {
          ctx.save(); sombra(ctx, true, k);
          ctx.beginPath(); ctx.arc(x0 + i * r * 1.55, y + r, r, 0, Math.PI * 2);
          ctx.fillStyle = i % 2 ? pal.acento : mezclar(pal.acento, "#ffffff", 0.35); ctx.fill(); ctx.restore();
          ctx.font = fuente(700, r * 0.95); ctx.fillStyle = i % 2 ? pal.sobreAcento : pal.oscuro; ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(dia), x0 + i * r * 1.55, y + r + r * 0.05); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        }
      });
      y += r * 2 + 18 * k;
      var fm = new Flujo(ctx, cx, y, cw, dib, "center");
      fm.titulo([fe.semana, fe.mes].filter(Boolean).join(" · "), { tam: 40 * k, peso: 700, mayus: true, color: "#fff", align: "center", maxLineas: 1 });
      y = fm.y + 40 * k;
    }
    var pad = 44 * k;
    var med = new Flujo(ctx, cx + pad, 0, cw - pad * 2, false);
    contenido(med);
    var ph = med.y + pad * 2;
    if (dib) {
      ctx.save(); sombra(ctx, true, k);
      ctx.fillStyle = hexA(V.alt2 ? pal.oscuro : pal.primario, 0.94); rr(ctx, cx, y, cw, ph, (V.alt2 ? 12 : 40) * k); ctx.fill(); ctx.restore();
      if (V.alt2) { ctx.fillStyle = pal.acento; ctx.fillRect(cx, y + 30 * k, 12 * k, ph - 60 * k); }
    }
    var f = new Flujo(ctx, cx + pad, y + pad, cw - pad * 2, dib);
    contenido(f);
    y += ph + 30 * k;
    var g = new Flujo(ctx, cx, y, cw, false);
    datos(g);
    if (g.y > y) {
      if (dib) { ctx.fillStyle = hexA(pal.oscuro, 0.82); rr(ctx, cx, y, cw, g.y - y + 36 * k, 30 * k); ctx.fill(); }
      var g2 = new Flujo(ctx, cx + 36 * k, y + 22 * k, cw - 72 * k, dib);
      datos(g2);
      y = g2.y + 14 * k;
    }
    return !f.desborde && !g.desborde && !med.desborde && y < H - banda - 20 * k;

    function contenido(fl) {
      fl.titulo(p.antetitulo, { tam: 34 * k, peso: 500, color: "rgba(255,255,255,.85)", maxLineas: 2 });
      if (p.antetitulo) fl.gap(8 * k);
      fl.titulo(p.titulo, { principal: true, tam: 70 * k, peso: 700, color: "#fff", destacado: p.destacado, colorDest: pal.acento, maxLineas: 4, lh: 1.08 });
      if (p.subtitulo) fl.gap(18 * k).rico(p.subtitulo, { tam: 32 * k, color: "rgba(255,255,255,.92)", maxLineas: 3 });
    }
    function datos(fl) {
      if (calendario && fe.texto) fl.dato("calendar-days", fe.texto, { tam: 36 * k, color: "#fff", colorIcono: pal.acento, peso: 600 });
      fl.dato("location-dot", p.lugar, { tam: 36 * k, color: "#fff", colorIcono: pal.acento, peso: 600 });
      fl.dato("clock", p.hora, { tam: 36 * k, color: "#fff", colorIcono: pal.acento, peso: 600 });
    }
  }

  function comunicado(ctx, W, H, k, img, p, pal, dib, d) {
    var m = 90 * k, ancho = W / H > 1.4;
    var centrado = V.alt && !ancho;                       // encabezado centrado con ícono arriba
    var fondo = V.alt2 ? pal.fondo : "#ffffff";
    if (dib) {
      fondoPapel(ctx, W, H, fondo, pal, p.icono);
      if (img) { ctx.globalAlpha = 0.1; cover(ctx, img, 0, 0, W, H, d.fx, d.fy); ctx.globalAlpha = 1; }
      ctx.fillStyle = pal.secundario;
      if (V.alt2) ctx.fillRect(0, 0, W, 18 * k); else ctx.fillRect(0, H - 18 * k, W, 18 * k);
      adorno(ctx, W - m - 170 * k, H * 0.42, 170 * k, hexA(pal.primario, 0.18));
    }
    var y = m * 1.1;
    var al = centrado ? "center" : "left";
    if (centrado) {
      if (dib) iconoCirculo(ctx, W / 2, y + 70 * k, 70 * k, p.icono || "bullhorn", { fondo: pal.claro, color: pal.primario });
      y += 160 * k;
      var fa = new Flujo(ctx, m, y, W - m * 2, dib, "center");
      fa.titulo(p.antetitulo, { tam: 36 * k, peso: 700, mayus: true, color: pal.secundario, align: "center", maxLineas: 1 });
      y = fa.y + (p.antetitulo ? 24 * k : 0);
    } else {
      if (p.antetitulo && dib) {
        ctx.font = fuente(700, 40 * k);
        var tw = ctx.measureText(p.antetitulo).width;
        ctx.fillStyle = pal.secundario; rr(ctx, -30 * k, y, tw + m + 70 * k, 84 * k, 18 * k); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.textBaseline = "middle"; ctx.fillText(p.antetitulo, m, y + 44 * k); ctx.textBaseline = "alphabetic";
      }
      if (p.antetitulo) y += 84 * k + 50 * k;
      if (dib) iconoCirculo(ctx, W - m - 70 * k, m * 1.1 + 70 * k, 70 * k, p.icono || "bullhorn", { fondo: pal.claro, color: pal.primario });
    }
    var w = ancho ? W * 0.62 : W - m * 2;
    var f = new Flujo(ctx, m, y, w, dib, al);
    f.titulo(p.titulo, { principal: true, tam: 96 * k, peso: 800, mayus: true, color: pal.secundario, destacado: p.destacado, colorDest: pal.primario, maxLineas: 3, lh: 1.02, align: al });
    f.gap(34 * k).rico(p.subtitulo, { tam: 36 * k, color: pal.tinta, colorNegrita: pal.tinta, lh: 1.3, maxLineas: 5, align: al });
    y = f.y + 46 * k;
    var items = (p.items || []).slice(0, 4);
    if (items.length && !ancho) {
      var colW = (W - m * 2) / items.length, r = Math.min(62 * k, colW * 0.3);
      if (dib) { ctx.fillStyle = hexA(V.alt2 ? "#ffffff" : pal.claro, 0.8); rr(ctx, m * 0.8, y, W - m * 1.6, r * 2 + 170 * k, 30 * k); ctx.fill(); }
      items.forEach(function (it, i) {
        var cx = m + colW * i + colW / 2;
        if (dib) iconoCirculo(ctx, cx, y + 30 * k + r, r, it.icono, { fondo: pal.secundario, color: "#fff" });
        var fl = new Flujo(ctx, cx - colW / 2 + 8 * k, y + 50 * k + r * 2, colW - 16 * k, dib, "center");
        fl.rico(it.titulo ? "**" + it.titulo + "** " + (it.texto || "") : it.texto, { tam: 28 * k, color: pal.tinta, colorNegrita: pal.primario, align: "center", lh: 1.2, maxLineas: 3 });
        if (fl.desborde) f.desborde = true;
      });
      y += r * 2 + 170 * k + 30 * k;
    }
    var g = new Flujo(ctx, m + 40 * k, y + 30 * k, W - m * 2 - 80 * k, false);
    datos(g);
    if (g.y > y + 30 * k) {
      if (dib) { ctx.fillStyle = hexA(V.alt2 ? "#ffffff" : pal.claro, 0.8); rr(ctx, m * 0.8, y, W - m * 1.6, g.y - y + 20 * k, 30 * k); ctx.fill(); }
      var g2 = new Flujo(ctx, m + 40 * k, y + 30 * k, W - m * 2 - 80 * k, dib);
      datos(g2); y = g2.y + 20 * k;
    }
    var sFirma = 86 * k;
    if (dib) firmaV(ctx, W, H - m * 0.6 - sFirma, m, sFirma, pal.tinta, false, centrado ? "centro" : "der");
    return !f.desborde && !g.desborde && y < H - m * 0.6 - sFirma - 20 * k;

    function datos(fl) {
      fl.dato("location-dot", p.lugar, { tam: 36 * k, color: pal.secundario, colorIcono: pal.primario, peso: 700 });
      fl.dato("clock", p.hora, { tam: 34 * k, color: pal.tinta, colorIcono: pal.primario, peso: 500 });
      if (p.fecha && p.fecha.texto) fl.dato("calendar-days", p.fecha.texto, { tam: 34 * k, color: pal.tinta, colorIcono: pal.primario, peso: 500 });
    }
  }

  function recomendaciones(ctx, W, H, k, img, p, pal, dib, d) {
    var ancho = W / H > 1.4, vertical = H / W > 1.45;
    var tira = vertical ? 0 : W * (ancho ? 0.28 : 0.32);
    var der = V.lado === "der" && V.semilla;               // la variante puede poner la franja de foto a la derecha
    var m = 70 * k;
    if (dib) {
      fondoPapel(ctx, W, H, pal.fondo, pal, p.icono);
      if (tira) {
        ctx.save(); ctx.beginPath();
        if (der) { ctx.moveTo(W, 0); ctx.lineTo(W - tira, 0); curvaVertical(ctx, W - tira, H, 50 * k, false); ctx.lineTo(W, H); }
        else { ctx.moveTo(0, 0); ctx.lineTo(tira, 0); curvaVertical(ctx, tira, H, 50 * k, true); ctx.lineTo(0, H); }
        ctx.closePath(); ctx.clip();
        if (img) fotoTratada(ctx, img, der ? W - tira - 80 * k : 0, 0, tira + 80 * k, H, d, pal);
        else { ctx.fillStyle = pal.primario; ctx.fillRect(0, 0, W, H); formasFondo(ctx, W, H, "rgba(255,255,255,.08)"); }
        ctx.restore();
      } else if (img) {
        fotoTratada(ctx, img, 0, 0, W, H * 0.22, d, pal);
      }
      ctx.fillStyle = pal.primario; ctx.fillRect(0, H - 16 * k, W, 16 * k);
    }
    var x = tira ? (der ? m : tira + m * 0.7) : m, w = tira ? W - tira - m * 1.5 : W - m * 1.8;
    var y = vertical && img ? H * 0.22 + m * 0.6 : m * 1.4;
    var r = 66 * k;
    if (dib) iconoCirculo(ctx, x + r, y + r, r, p.icono || "leaf", { fondo: pal.primario, color: "#fff" });
    var f = new Flujo(ctx, x + r * 2 + 26 * k, y + 6 * k, w - r * 2 - 26 * k, dib);
    f.titulo(p.titulo, { principal: true, tam: 62 * k, peso: 800, mayus: true, color: pal.primario, destacado: p.destacado, colorDest: pal.secundario, maxLineas: 2, lh: 1 });
    f.rico(p.subtitulo, { tam: 34 * k, color: pal.tinta, maxLineas: 2, lh: 1.2 });
    y = Math.max(y + r * 2, f.y) + 50 * k;
    var items = (p.items || []).slice(0, 6), desb = f.desborde;
    var ir = 54 * k, pad = 24 * k;
    var numerado = V.alt && !items.some(function (it) { return it.no; }); // pasos numerados cuando no son prohibiciones
    items.forEach(function (it, n) {
      var tx = x + ir * 2 + 30 * k;
      var fl = new Flujo(ctx, tx, 0, w - ir * 2 - 50 * k, false);
      fl.titulo(it.titulo, { tam: 38 * k, peso: 800, mayus: true, color: pal.primario, maxLineas: 2, lh: 1 }).gap(6 * k).rico(it.texto, { tam: 28 * k, color: pal.tinta, maxLineas: 3, lh: 1.2 });
      var hh = Math.max(ir * 2, fl.y) + pad * 2;
      if (dib) {
        ctx.fillStyle = V.alt2 ? "#ffffff" : pal.claro; rr(ctx, x + ir, y, w - ir, hh, (V.alt2 ? 10 : 22) * k); ctx.fill();
        ctx.save(); sombra(ctx, true, k * 0.5);
        if (numerado) {
          ctx.beginPath(); ctx.arc(x + ir, y + hh / 2, ir, 0, Math.PI * 2); ctx.fillStyle = pal.primario; ctx.fill(); ctx.restore();
          ctx.fillStyle = "#fff"; ctx.font = fuente(400, ir * 1.3, CONDENSADA); ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(String(n + 1), x + ir, y + hh / 2 + ir * 0.06); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
        } else { iconoCirculo(ctx, x + ir, y + hh / 2, ir, it.icono, { fondo: "#ffffff", color: "#1d1d1d", no: it.no }); ctx.restore(); }
        var fl2 = new Flujo(ctx, tx, y + (hh - fl.y) / 2, w - ir * 2 - 50 * k, true);
        fl2.titulo(it.titulo, { tam: 38 * k, peso: 800, mayus: true, color: pal.primario, maxLineas: 2, lh: 1 }).gap(6 * k).rico(it.texto, { tam: 28 * k, color: pal.tinta, colorNegrita: pal.tinta, maxLineas: 3, lh: 1.2 });
      }
      if (fl.desborde) desb = true;
      y += hh + 20 * k;
    });
    var sFirma = 80 * k;
    if (dib) firma(ctx, der ? x : W - m, H - m * 0.5 - sFirma, sFirma, pal.tinta, false, true, der ? "left" : "right");
    return !desb && y < H - m * 0.5 - sFirma - 10 * k;
  }

  function cronica(ctx, W, H, k, img, p, pal, dib, d) {
    var m = 70 * k;
    var tarjeta = V.alt;                                   // tarjeta flotante sobre la foto en vez de banda completa
    var sFirma = 110 * k;
    var w = tarjeta ? W * 0.72 - m * 2 : W - m * 2 - sFirma - 40 * k;
    var med = new Flujo(ctx, m, 0, w, false);
    bloque(med);
    var banda = Math.max(med.y + m * 1.3, sFirma + m * 1.2);
    if (dib) {
      if (img) fotoTratada(ctx, img, 0, 0, W, tarjeta ? H : H - banda + 30 * k, d, pal);
      else { fondoPapel(ctx, W, H, pal.claro, pal, p.icono); formasFondo(ctx, W, H - banda, hexA(pal.secundario, 0.25)); }
      if (tarjeta) {
        var g = ctx.createLinearGradient(0, H * 0.45, 0, H);
        g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.45)"); ctx.fillStyle = g; ctx.fillRect(0, H * 0.45, W, H * 0.55);
        ctx.save(); sombra(ctx, true, k); ctx.fillStyle = pal.primario; rr(ctx, m * 0.7, H - banda - m * 0.5, w + m * 1.3, banda, 18 * k); ctx.fill(); ctx.restore();
        ctx.save(); sombra(ctx, true, k);
        ctx.beginPath(); ctx.arc(W - m - 75 * k, m + 75 * k, 85 * k, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.fill(); ctx.restore();
        if (escudo.naturalWidth) ctx.drawImage(escudo, W - m - 150 * k, m, 150 * k, 150 * k);
      } else {
        ctx.fillStyle = pal.primario; ctx.fillRect(0, H - banda, W, banda);
        if (escudoBlanco) ctx.drawImage(escudoBlanco, W - m - sFirma, H - banda + (banda - sFirma) / 2, sFirma, sFirma);
      }
      ctx.fillStyle = pal.acento; ctx.fillRect(tarjeta ? m * 1.35 : m, H - banda + m * 0.5 - 4 * k - (tarjeta ? m * 0.5 : 0), 110 * k, 8 * k);
    }
    var f = new Flujo(ctx, tarjeta ? m * 1.35 : m, H - banda + m * 0.75 - (tarjeta ? m * 0.5 : 0), w, dib);
    bloque(f);
    return !med.desborde && banda < H * 0.42;

    function bloque(fl) {
      fl.titulo(p.titulo, { principal: true, tam: 64 * k, peso: 700, color: "#fff", destacado: p.destacado, colorDest: pal.acento === pal.primario ? "#fff" : pal.acento, maxLineas: 3, lh: 1.08 });
      if (p.subtitulo) fl.gap(10 * k).rico(p.subtitulo, { tam: 32 * k, color: "rgba(255,255,255,.88)", maxLineas: 2, lh: 1.2 });
    }
  }

  // Mitad foto, mitad color con un título grande. El corte puede ser recto o en diagonal.
  function dividida(ctx, W, H, k, img, p, pal, dib, d) {
    var ancho = W / H > 1.2, m = 80 * k;
    var diagonal = V.alt;
    var fotoPrimero = V.lado === "izq";                    // foto arriba/izquierda o abajo/derecha
    var corte = ancho ? W * 0.5 : H * 0.48;
    var zona = ancho ? { x: fotoPrimero ? corte : 0, y: 0, w: W - corte, h: H } : { x: 0, y: fotoPrimero ? corte : 0, w: W, h: H - corte };
    if (dib) {
      ctx.fillStyle = pal.primario; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.beginPath();
      var dd = diagonal ? 90 * k : 0;
      if (ancho) {
        if (fotoPrimero) { ctx.moveTo(0, 0); ctx.lineTo(corte + dd, 0); ctx.lineTo(corte - dd, H); ctx.lineTo(0, H); }
        else { ctx.moveTo(W, 0); ctx.lineTo(corte + dd, 0); ctx.lineTo(corte - dd, H); ctx.lineTo(W, H); }
      } else if (fotoPrimero) { ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, corte - dd); ctx.lineTo(0, corte + dd); }
      else { ctx.moveTo(0, H); ctx.lineTo(W, H); ctx.lineTo(W, corte - dd); ctx.lineTo(0, corte + dd); }
      ctx.closePath(); ctx.clip();
      if (img) fotoTratada(ctx, img, 0, 0, W, H, d, pal); else { fondoPapel(ctx, W, H, pal.claro, pal, p.icono); formasFondo(ctx, W, H, hexA(pal.secundario, 0.25)); }
      ctx.restore();
      // sello en la unión
      var sx = ancho ? corte : W - m - 75 * k, sy = ancho ? H - m - 75 * k : corte;
      ctx.save(); sombra(ctx, true, k); ctx.beginPath(); ctx.arc(sx, sy, 88 * k, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill(); ctx.restore();
      if (escudo.naturalWidth) ctx.drawImage(escudo, sx - 70 * k, sy - 70 * k, 140 * k, 140 * k);
      adorno(ctx, zona.x + zona.w - m - 150 * k, zona.y + m * 0.6, 150 * k, "rgba(255,255,255,.25)");
    }
    var pad = m;
    var f = new Flujo(ctx, zona.x + pad, zona.y + pad * (ancho ? 1.3 : (fotoPrimero ? 1.4 : 0.9)), zona.w - pad * 2 - (ancho ? 0 : 0), dib);
    f.titulo(p.antetitulo, { tam: 32 * k, peso: 600, color: pal.acento === pal.primario ? "#fff" : mezclar(pal.acento, "#ffffff", 0.3), mayus: true, maxLineas: 1 });
    if (p.antetitulo) f.gap(18 * k);
    f.titulo(p.titulo, { principal: true, tam: 86 * k, peso: 800, color: "#fff", destacado: p.destacado, colorDest: pal.acento === pal.primario ? pal.claro : pal.acento, maxLineas: 4, lh: 1.04 });
    if (p.subtitulo) f.gap(26 * k).rico(p.subtitulo, { tam: 34 * k, color: "rgba(255,255,255,.9)", colorNegrita: "#fff", maxLineas: 3, lh: 1.25 });
    if (p.lugar || p.hora) f.gap(20 * k);
    f.dato("location-dot", p.lugar, { tam: 32 * k, color: "#fff", colorIcono: pal.acento, peso: 600 });
    f.dato("clock", p.hora, { tam: 32 * k, color: "#fff", colorIcono: pal.acento, peso: 600 });
    var sFirma = 74 * k, limite = zona.y + zona.h - pad * 0.6 - sFirma - 16 * k;
    if (dib) firma(ctx, zona.x + pad, zona.y + zona.h - pad * 0.6 - sFirma, sFirma, "#fff", true, true);
    return !f.desborde && f.y < limite;
  }

  // Tipográfica: título enorme sobre color o papel, con la foto en un círculo o arco que se asoma.
  function titular(ctx, W, H, k, img, p, pal, dib, d) {
    var m = 90 * k, ancho = W / H > 1.4, vertical = H / W > 1.45;
    var oscuro = V.alt2;
    var fondo = oscuro ? pal.primario : pal.fondo, tinta = oscuro ? "#fff" : pal.primario;
    var r = (ancho ? H * 0.42 : W * 0.3);
    var cx = V.lado === "izq" ? r * 0.75 : W - r * 0.75, cy = ancho ? H * 0.5 : (vertical ? H * 0.2 : H * 0.24);
    if (dib) {
      fondoPapel(ctx, W, H, fondo, pal, p.icono);
      if (img) {
        ctx.save(); ctx.beginPath();
        if (V.forma === "arco") { ctx.moveTo(cx - r, cy + r * 1.3); ctx.lineTo(cx - r, cy); ctx.arc(cx, cy, r, Math.PI, 0); ctx.lineTo(cx + r, cy + r * 1.3); ctx.closePath(); }
        else ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip(); fotoTratada(ctx, img, cx - r, cy - r, r * 2, r * 2.3, d, pal); ctx.restore();
        ctx.lineWidth = 14 * k; ctx.strokeStyle = pal.acento; ctx.beginPath(); ctx.arc(cx, cy, r + 26 * k, Math.PI * 0.15, Math.PI * 0.75); ctx.stroke();
      } else { iconoCirculo(ctx, cx, cy, r * 0.6, p.icono || "bullhorn", { fondo: oscuro ? pal.secundario : pal.claro, color: oscuro ? "#fff" : pal.primario }); }
      adorno(ctx, V.lado === "izq" ? W - m - 160 * k : m, H * 0.05, 160 * k, oscuro ? "rgba(255,255,255,.22)" : hexA(pal.primario, 0.2));
    }
    var x = ancho ? (V.lado === "izq" ? r * 1.8 + m * 0.5 : m) : m;
    var w = ancho ? W - r * 1.8 - m * 1.5 : W - m * 2;
    var top = ancho ? m * 1.1 : cy + r + (img ? 70 : 40) * k;
    var f = new Flujo(ctx, x, top, w, dib);
    f.titulo(p.antetitulo, { tam: 34 * k, peso: 600, color: oscuro ? mezclar(pal.acento, "#ffffff", 0.2) : pal.secundario, mayus: true, maxLineas: 1 });
    if (p.antetitulo) f.gap(12 * k);
    f.titulo(p.titulo, { principal: true, tam: 112 * k, peso: 800, mayus: true, color: tinta, destacado: p.destacado, colorDest: oscuro ? pal.acento : pal.secundario, maxLineas: 4, lh: 0.98 });
    if (p.subtitulo) f.gap(30 * k).rico(p.subtitulo, { tam: 38 * k, color: oscuro ? "rgba(255,255,255,.9)" : pal.tinta, colorNegrita: oscuro ? "#fff" : pal.tinta, maxLineas: 3, lh: 1.25 });
    if (p.cta) f.gap(30 * k).pildora(p.cta, { tam: 30 * k, fondo: oscuro ? "#fff" : pal.primario, color: oscuro ? pal.primario : "#fff", peso: 600, flecha: true });
    var sFirma = 84 * k;
    if (dib) firmaV(ctx, W, H - m * 0.6 - sFirma, m, sFirma, oscuro ? "#fff" : pal.tinta, oscuro, "izq");
    return !f.desborde && f.y < H - m * 0.6 - sFirma - 20 * k;
  }

  function soloEscudo(ctx, W, H, k, img, p, pal, dib, d) {
    if (!dib) return true;
    if (img) cover(ctx, img, 0, 0, W, H, d.fx, d.fy); else { ctx.fillStyle = pal.primario; ctx.fillRect(0, 0, W, H); }
    var s = 140 * k, m = 50 * k;
    ctx.save(); sombra(ctx, true, k);
    ctx.beginPath(); ctx.arc(W - m - s / 2, m + s / 2, s / 2 + 12 * k, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,.95)"; ctx.fill(); ctx.restore();
    if (escudo.naturalWidth) ctx.drawImage(escudo, W - m - s, m, s, s);
    return true;
  }

  function original(ctx, W, H, k, img, p, pal, dib, d) {
    if (dib) { if (img) cover(ctx, img, 0, 0, W, H, d.fx, d.fy); else return evento(ctx, W, H, k, img, p, pal, dib, d); }
    return true;
  }

  var FUNCIONES = { titular: titular, dividida: dividida, campana: campana, foto: foto, evento: evento, comunicado: comunicado, recomendaciones: recomendaciones, cronica: cronica, escudo: soloEscudo, original: original };

  /* ---------------- Color ---------------- */
  function hexRGB(h) { h = h.replace("#", ""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function hexA(h, a) { var c = hexRGB(h); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function mezclar(a, b, t) { var x = hexRGB(a), y = hexRGB(b); return "rgb(" + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(",") + ")"; }

  /* ---------------- Render ----------------
     foto: Image | null · pieza: textos compartidos · diseno: { plantilla, paleta, fx, fy } */
  function dibujar(canvas, foto, pieza, diseno) {
    return listo.then(function () {
      var W = canvas.width, H = canvas.height, ctx = canvas.getContext("2d");
      V = variante(diseno.semilla); V.semilla = diseno.semilla || 0;
      var fn = FUNCIONES[diseno.plantilla] || FUNCIONES.foto;
      var pal = PALETAS[diseno.paleta] || PALETAS.marino;
      var p = pieza || {};
      var base = Math.min(W, H) / 1080;
      // achicar hasta que todo entre
      var k = base, ok = false;
      for (var i = 0; i < 12 && !ok; i++) {
        ctx.save(); ok = fn(ctx, W, H, k, foto, p, pal, false, diseno); ctx.restore();
        if (!ok) k *= 0.93;
      }
      ctx.clearRect(0, 0, W, H);
      ctx.save(); fn(ctx, W, H, k, foto, p, pal, true, diseno); ctx.restore();
      return { escala: k / base, entra: ok };
    });
  }

  return { variante: variante, dibujar: dibujar, paletas: PALETAS, nombres: NOMBRES, glifo: glifo, listo: listo };
})();
