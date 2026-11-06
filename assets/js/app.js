/* =========================================================
   Noticias ADM — pantalla principal.
   Flujo: el equipo dicta o escribe → la IA redacta noticia + redes →
   se edita, se diseñan las imágenes → Publicar (web + redes elegidas).
   La publicación es simulada: queda en el historial (localStorage) y
   se descarga la entrada lista para pegar en MUNI_LAND/assets/js/data.js.
   ========================================================= */
(function () {
  var C = window.NOT_CONFIG;
  var KEY_BORRADOR = "not-adm-borrador-v2";
  var KEY_HISTORIAL = "not-adm-historial-v1";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- Utilidades ---------------- */
  function esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function hora() { var d = new Date(); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
  function hoyISO() { var d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function fechaLarga(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  }
  function leer(k, def) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function toast(msj, tipo) {
    var t = document.createElement("div");
    t.className = "toast toast--" + (tipo || "ok");
    t.innerHTML = '<i class="fa-solid ' + (tipo === "error" ? "fa-triangle-exclamation" : tipo === "info" ? "fa-circle-info" : "fa-circle-check") + '"></i><span>' + esc(msj) + "</span>";
    $("#toasts").appendChild(t);
    setTimeout(function () { t.classList.add("toast--fuera"); setTimeout(function () { t.remove(); }, 300); }, tipo === "error" ? 6000 : 3500);
  }
  function descargar(nombre, contenido, tipo) {
    var a = document.createElement("a");
    a.href = typeof contenido === "string" && contenido.indexOf("data:") === 0 ? contenido : URL.createObjectURL(new Blob([contenido], { type: tipo || "text/plain" }));
    a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove();
  }
  function copiar(texto) {
    (navigator.clipboard ? navigator.clipboard.writeText(texto) : Promise.reject()).then(function () { toast("Copiado al portapapeles."); }, function () { toast("No se pudo copiar.", "error"); });
  }

  /* ---------------- Estado ---------------- */
  function estadoVacio() {
    var redes = {};
    C.redes.forEach(function (r) { redes[r.id] = { on: r.id !== "x", texto: "" }; });
    return { id: "n-" + Date.now().toString(36), chat: [], noticia: null, redes: redes, imagenes: [], pieza: null, altImagen: "",
      sugerencias: [], slugManual: false, actualizado: null };
  }
  var S = leer(KEY_BORRADOR, null) || estadoVacio();
  var historial = leer(KEY_HISTORIAL, []);
  var ocupado = false;
  var imgSel = null;     // id de la imagen en el diseñador
  var formatoSel = "4:5";
  var cache = {};        // renders ya hechos

  function persistir(avisar) {
    S.actualizado = new Date().toISOString();
    var ok = guardar(KEY_BORRADOR, S);
    if (!ok) { // fotos muy pesadas para localStorage: se guarda sin imágenes
      var sin = Object.assign({}, S, { imagenes: [] });
      ok = guardar(KEY_BORRADOR, sin);
      if (avisar) toast(ok ? "Borrador guardado sin las fotos (son muy pesadas para el navegador)." : "No se pudo guardar el borrador en este navegador.", ok ? "info" : "error");
    } else if (avisar) toast("Borrador guardado.");
    pintarEstado();
  }
  var persistirLuego = (function () { var t; return function () { clearTimeout(t); t = setTimeout(function () { persistir(false); }, 600); }; })();

  function link() { return S.noticia && S.noticia.slug ? C.urlNoticia(S.noticia.slug) : C.urlNoticia("…"); }
  function conLink(t) { return String(t || "").replace(/\{\{LINK\}\}/g, link()); }
  function redesActivas() { return C.redes.filter(function (r) { return S.redes[r.id] && S.redes[r.id].on; }); }
  function imgsUsadas() { return S.imagenes.filter(function (i) { return i.usar; }); }
  function portada() { var u = imgsUsadas(); return u.filter(function (i) { return i.portada; })[0] || u[0] || null; }

  /* ---------------- Cabecera ---------------- */
  function pintarPills() {
    var ia = $("#pill-ia");
    ia.className = "pill " + (IA.activa() ? "pill--ok" : "pill--warn");
    var cos = Costos.hoy();
    ia.innerHTML = '<i class="fa-solid fa-circle"></i> ' + (IA.activa() ? "IA conectada" + (cos.pedidos ? " · US$ " + cos.total.toFixed(3) + " hoy" : "") : "Modo local (sin IA)");
    ia.title = IA.activa() ? "Proxy " + C.apiBase + (cos.pedidos ? "\nHoy: " + cos.pedidos + " pedidos · redacción US$ " + (cos.redaccion || 0).toFixed(4) + " · diseño US$ " + (cos.diseno || 0).toFixed(4) : "") : "Este origen no está habilitado en el proxy. Usá http://localhost:5520 o GitHub Pages, o agregá ?ia=1.";
    var ctx = $("#pill-ctx"), o = Contexto.origen();
    ctx.className = "pill " + (o ? "pill--ok" : "pill--warn");
    ctx.innerHTML = '<i class="fa-solid fa-circle"></i> ' + (o ? "Contexto Muni-Land" : "Contexto básico");
    ctx.title = o ? "Datos tomados de " + o : "No se pudo leer data.js de Muni-Land: se usan datos básicos.";
    $("#chat-modo").textContent = Voz.modo() === "ia" ? "Audio transcripto con IA" : Voz.modo() === "navegador" ? "Dictado con la voz del navegador" : "Escribí el texto";
    $("#cuenta-historial").textContent = historial.length;
  }

  function pintarEstado() {
    var e = $("#estado");
    if (!S.noticia) e.innerHTML = '<i class="fa-regular fa-circle"></i> Sin borrador';
    else e.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> Borrador · ' + redesActivas().length + " red(es) · " + imgsUsadas().length + " foto(s)" +
      (S.actualizado ? ' <span class="tenue">· guardado ' + new Date(S.actualizado).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) + "</span>" : "");
    $("#btn-publicar").disabled = !S.noticia;
    $("#btn-publicar").innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar en ' + (1 + redesActivas().length) + " destino" + (redesActivas().length ? "s" : "");
    $("#cuenta-redes").textContent = redesActivas().length;
    $("#cuenta-imgs").textContent = imgsUsadas().length;
  }

  /* ---------------- Chat ---------------- */
  var EJEMPLOS = [
    { t: "Descacharrado en barrio San Felipe", x: "El sábado que viene, 15 de noviembre, de 8 a 12, hacemos un operativo de descacharrado en barrio San Felipe por la prevención del dengue. Pasa el camión por las calles 20 a 26, los vecinos tienen que dejar los cacharros en la vereda desde el viernes a la noche. Lo organiza Desarrollo Humano con Servicios Públicos. Consultas al 3482 303995." },
    { t: "Cierre de escuelita de fútbol", x: "Ayer se hizo el cierre anual de la escuelita municipal de fútbol infantil en el polideportivo, participaron como 120 chicos de 5 a 12 años, hubo entrega de medallas y una merienda. Estuvo el secretario de deportes Pablo Verón y agradeció a los profes y a las familias. En marzo vuelven las inscripciones." },
    { t: "Corte de calle por obra", x: "A partir del lunes cortamos calle 9 entre 12 y 14 por la obra de cordón cuneta, dura más o menos 10 días hábiles si no llueve. Pedimos circular por calle 11." }
  ];

  function saludo() {
    return "¡Hola! Contame la noticia como te salga: qué pasó o qué se viene, cuándo, dónde, quién lo organiza y cualquier dato útil (horarios, teléfonos, inscripción). Podés grabar un audio. Con eso redacto la nota para la web y las versiones para cada red.";
  }

  function pintarChat() {
    var cont = $("#chat-mensajes");
    var msjs = [{ rol: "asistente", texto: saludo(), hora: "" }].concat(S.chat);
    cont.innerHTML = msjs.map(function (m) {
      var extra = "";
      if (m.preguntas && m.preguntas.length) extra += "<ul>" + m.preguntas.map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>";
      if (m.listo) extra += '<button type="button" class="mini mini--claro" data-ir="web"><i class="fa-solid fa-arrow-right"></i> Ver y editar la noticia</button>';
      return '<div class="msj msj--' + m.rol + (m.local ? " msj--local" : "") + '"><div class="burbuja">' +
        (m.voz ? '<span class="msj__voz"><i class="fa-solid fa-microphone"></i> Audio transcripto</span>' : "") +
        esc(m.texto).replace(/\n/g, "<br>") + extra + '</div><span class="msj__hora">' + (m.hora || "") + "</span></div>";
    }).join("") + (ocupado ? '<div class="msj msj--asistente"><div class="burbuja escribiendo"><span></span><span></span><span></span></div></div>' : "");
    cont.scrollTop = cont.scrollHeight;

    var chips = $("#chat-chips");
    chips.hidden = S.chat.length > 0;
    chips.innerHTML = S.chat.length ? "" : '<span class="chips__titulo">Probar con un ejemplo:</span>' + EJEMPLOS.map(function (e, i) { return '<button type="button" class="chip" data-ej="' + i + '">' + esc(e.t) + "</button>"; }).join("");
    $("#btn-forzar").hidden = !S.chat.some(function (m) { return m.rol === "usuario"; }) || ocupado;
    $("#btn-enviar").disabled = ocupado;
    $("#btn-mic").disabled = ocupado;
  }

  function borradorParaIA() {
    if (!S.noticia) return null;
    var r = {};
    C.redes.forEach(function (x) { r[x.id] = S.redes[x.id].texto; });
    return { noticia: S.noticia, redes: r, pieza: S.pieza };
  }

  function enviar(texto, voz) {
    texto = String(texto || "").trim();
    if (!texto || ocupado) return;
    S.chat.push({ rol: "usuario", texto: texto, hora: hora(), voz: !!voz });
    pedir();
  }

  function pedir() {
    ocupado = true;
    pintarChat();
    IA.setFotos(S.imagenes.filter(function (i) { return i.origen === "subida"; }).length);
    IA.redactar(S.chat, borradorParaIA()).catch(function (e) {
      console.warn("IA no disponible, se usa el borrador local:", e);
      toast("No se pudo conectar con la IA (" + (e.name === "AbortError" ? "tardó demasiado" : e.message) + "). Armé un borrador local; podés volver a intentar.", "error");
      return IA.redactar(S.chat, borradorParaIA(), true);
    }).then(aplicarRespuesta).catch(function (e) {
      S.chat.push({ rol: "asistente", texto: "No pude redactar: " + e.message, hora: hora() });
    }).then(function () {
      ocupado = false;
      pintarChat();
      persistir(false);
    });
  }

  function aplicarRespuesta(r) {
    var listo = r.estado === "listo" && r.noticia && r.noticia.titulo;
    S.chat.push({ rol: "asistente", texto: r.mensaje || (listo ? "Listo, redacté la noticia." : "Necesito un poco más de información."),
      preguntas: r.preguntas || [], hora: hora(), crudo: r.crudo, local: !!r.local, listo: !!listo });
    if (!listo) return;
    var n = r.noticia;
    var cuerpo = Array.isArray(n.cuerpo) ? n.cuerpo : String(n.cuerpo || "").split(/\n\s*\n/);
    var slugPrevio = S.noticia && S.slugManual ? S.noticia.slug : null;
    S.noticia = {
      titulo: n.titulo || "", bajada: n.bajada || "", categoria: n.categoria || "Gestión",
      slug: slugPrevio || IA.slugify(n.slug || n.titulo), fecha: /^\d{4}-\d{2}-\d{2}$/.test(n.fecha || "") ? n.fecha : hoyISO(),
      cuerpo: cuerpo.map(function (p) { return String(p).trim(); }).filter(Boolean),
      etiquetas: Array.isArray(n.etiquetas) ? n.etiquetas : []
    };
    if (r.redes) C.redes.forEach(function (x) { if (r.redes[x.id]) S.redes[x.id].texto = String(r.redes[x.id]).trim(); });
    if (r.pieza) {
      S.pieza = r.pieza;
      // las piezas que el equipo no tocó toman la plantilla y los colores que eligió la IA
      S.imagenes.forEach(function (i) {
        if (i.diseno && !i.diseno.manual) {
          i.diseno.paleta = r.pieza.paleta;
          if (i.base || r.pieza.plantilla !== "foto") i.diseno.plantilla = i.origen === "subida" && r.pieza.plantilla === "comunicado" ? "cronica" : r.pieza.plantilla;
        }
      });
    }
    if (r.alt_imagen) S.altImagen = r.alt_imagen;
    S.sugerencias = r.sugerencias || [];
    cache = {};
    pintarTodo();
    toast(r.local ? "Borrador local listo para revisar." : "Noticia redactada. Revisala en el editor.");
    // diseño automático con IA de la primera pieza (si ya hay piezas, ahora; si no, cuando se agregue la foto)
    if (C.disenoAuto === "ia" && IA.activa() && !r.local) {
      var primera = portada() || S.imagenes[0];
      if (primera && !(primera.diseno && primera.diseno.manual)) disenarIA(primera); else if (!primera) autoIAPendiente = true;
    }
    piezaAutomatica();
  }

  /* ---------------- Noticia web ---------------- */
  function pintarWeb() {
    var hay = !!S.noticia;
    $("#web-vacio").hidden = hay;
    $("#form-web").hidden = !hay;
    if (!hay) return;
    var n = S.noticia;
    var sel = $("#f-categoria");
    var cats = Contexto.categorias();
    if (cats.indexOf(n.categoria) < 0) cats.push(n.categoria);
    sel.innerHTML = cats.map(function (c) { return "<option" + (c === n.categoria ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("");
    $("#f-titulo").value = n.titulo;
    $("#f-bajada").value = n.bajada;
    $("#f-fecha").value = n.fecha;
    $("#f-slug").value = n.slug;
    $("#f-etiquetas").value = (n.etiquetas || []).join(", ");
    pintarParrafos();
    pintarLink();
    contadores();
    var sug = $("#sugerencias");
    sug.hidden = !(S.sugerencias && S.sugerencias.length);
    sug.innerHTML = '<strong><i class="fa-regular fa-lightbulb"></i> Para mejorarla, sumá si podés:</strong><ul>' + (S.sugerencias || []).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("") + "</ul>";
  }

  function pintarParrafos() {
    $("#f-cuerpo").innerHTML = S.noticia.cuerpo.map(function (p, i) {
      return '<div class="parrafo"><span class="parrafo__n">' + (i + 1) + '</span><textarea data-p="' + i + '" rows="3">' + esc(p) + '</textarea>' +
        '<div class="parrafo__acc"><button type="button" class="ico ico--mini" data-subir="' + i + '" title="Subir"' + (i ? "" : " disabled") + '><i class="fa-solid fa-arrow-up"></i></button>' +
        '<button type="button" class="ico ico--mini" data-borrar="' + i + '" title="Quitar párrafo"><i class="fa-solid fa-trash-can"></i></button></div></div>';
    }).join("");
    $$("#f-cuerpo textarea").forEach(autoAlto);
  }
  function autoAlto(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }
  function pintarLink() { var a = $("#f-link"); a.href = link(); a.textContent = link(); }
  function contadores() {
    $$(".contador[data-de]").forEach(function (c) {
      var n = $("#" + c.getAttribute("data-de")).value.length, max = +c.getAttribute("data-max");
      c.textContent = n + " / " + max;
      c.classList.toggle("contador--pasado", n > max);
    });
  }

  function enlazarWeb() {
    var f = $("#form-web");
    f.addEventListener("input", function (e) {
      var t = e.target, n = S.noticia;
      if (!n) return;
      if (t.id === "f-titulo") { n.titulo = t.value; if (!S.slugManual) { n.slug = IA.slugify(t.value); $("#f-slug").value = n.slug; pintarLink(); } }
      else if (t.id === "f-bajada") n.bajada = t.value;
      else if (t.id === "f-fecha") n.fecha = t.value;
      else if (t.id === "f-slug") { S.slugManual = true; n.slug = IA.slugify(t.value.replace(/-/g, " ")) ; pintarLink(); }
      else if (t.id === "f-etiquetas") n.etiquetas = t.value.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
      else if (t.hasAttribute("data-p")) { n.cuerpo[+t.getAttribute("data-p")] = t.value; autoAlto(t); }
      contadores();
      persistirLuego();
    });
    f.addEventListener("change", function (e) {
      if (e.target.id === "f-categoria") { S.noticia.categoria = e.target.value; persistirLuego(); }
      if (e.target.id === "f-slug") e.target.value = S.noticia.slug;
    });
    f.addEventListener("submit", function (e) { e.preventDefault(); });
    $("#f-cuerpo").addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var c = S.noticia.cuerpo;
      if (b.hasAttribute("data-borrar")) c.splice(+b.getAttribute("data-borrar"), 1);
      if (b.hasAttribute("data-subir")) { var i = +b.getAttribute("data-subir"); c.splice(i - 1, 0, c.splice(i, 1)[0]); }
      pintarParrafos(); persistirLuego();
    });
    $("#btn-parrafo").addEventListener("click", function () {
      S.noticia.cuerpo.push(""); pintarParrafos();
      var ts = $$("#f-cuerpo textarea"); ts[ts.length - 1].focus();
    });
    $("#btn-copiar-link").addEventListener("click", function () { copiar(link()); });
  }

  /* ---------------- Redes ---------------- */
  var ESTADO_API = {
    viable: { t: "API disponible", c: "ok" },
    aprobacion: { t: "Requiere aprobación de la app", c: "warn" },
    pago: { t: "API paga", c: "warn" }
  };

  function largoFinal(red, texto) {
    // X cuenta cualquier link como 23 caracteres
    return red.id === "x" ? texto.replace(/\{\{LINK\}\}/g, "x".repeat(23)).length : conLink(texto).length;
  }

  function avisosRed(red) {
    var a = [], r = S.redes[red.id];
    if (!r.texto.trim()) a.push("Falta el texto.");
    if (largoFinal(red, r.texto) > red.limite) a.push("Supera el límite de " + red.limite + " caracteres.");
    if (red.requiereImagen && !imgsUsadas().length) a.push("Necesita al menos una imagen.");
    if (r.texto && r.texto.indexOf("{{LINK}}") < 0) a.push("No incluye el link a la nota.");
    return a;
  }

  function pintarRedes() {
    $("#redes").innerHTML = C.redes.map(function (red) {
      var r = S.redes[red.id], api = ESTADO_API[red.estadoApi];
      var largo = largoFinal(red, r.texto), avisos = avisosRed(red);
      return '<article class="red' + (r.on ? " red--on" : "") + '" data-red="' + red.id + '" style="--red:' + red.color + '">' +
        '<header class="red__cabeza"><label class="switch"><input type="checkbox" data-on' + (r.on ? " checked" : "") + '><span></span></label>' +
        '<i class="' + red.icono + ' red__icono"></i><strong>' + red.nombre + "</strong>" +
        '<span class="badge badge--' + api.c + '" title="' + esc(red.api) + '">' + api.t + "</span></header>" +
        '<textarea data-texto rows="6" placeholder="' + (S.noticia ? "Escribí el texto para " + red.nombre : "Se completa cuando la IA redacta la noticia") + '">' + esc(r.texto) + "</textarea>" +
        '<footer class="red__pie"><span class="contador' + (largo > red.limite ? " contador--pasado" : "") + '">' + largo + " / " + red.limite + "</span>" +
        '<span class="red__formato"><i class="fa-regular fa-image"></i> ' + red.formato + (red.linkNoClic ? ' · <span title="En esta red el link no es clicable en el texto">link no clicable</span>' : "") + "</span>" +
        '<button type="button" class="mini" data-copiar><i class="fa-regular fa-copy"></i> Copiar</button></footer>' +
        (r.on && avisos.length ? '<p class="red__aviso"><i class="fa-solid fa-triangle-exclamation"></i> ' + avisos.join(" ") + "</p>" : "") +
        "</article>";
    }).join("");
    $$("#redes textarea").forEach(autoAlto);
  }

  function enlazarRedes() {
    var cont = $("#redes");
    cont.addEventListener("change", function (e) {
      if (!e.target.hasAttribute("data-on")) return;
      var id = e.target.closest("[data-red]").getAttribute("data-red");
      S.redes[id].on = e.target.checked;
      pintarRedes(); pintarEstado(); persistirLuego();
    });
    cont.addEventListener("input", function (e) {
      if (!e.target.hasAttribute("data-texto")) return;
      var card = e.target.closest("[data-red]"), id = card.getAttribute("data-red");
      var red = C.redes.filter(function (r) { return r.id === id; })[0];
      S.redes[id].texto = e.target.value;
      autoAlto(e.target);
      var c = $(".contador", card), largo = largoFinal(red, e.target.value);
      c.textContent = largo + " / " + red.limite;
      c.classList.toggle("contador--pasado", largo > red.limite);
      persistirLuego();
    });
    cont.addEventListener("focusout", function (e) { if (e.target.hasAttribute("data-texto")) pintarRedes(); });
    cont.addEventListener("click", function (e) {
      if (!e.target.closest("[data-copiar]")) return;
      copiar(conLink(S.redes[e.target.closest("[data-red]").getAttribute("data-red")].texto));
    });
  }

  /* ---------------- Imágenes ---------------- */
  function piezaActual() { return S.pieza || {}; }
  function claveCache(img, formato) { return img.id + "|" + formato + "|" + (img.base ? img.base.length : 0) + "|" + JSON.stringify(img.diseno) + "|" + JSON.stringify(S.pieza); }
  function renderCache(img, formato, diseno) {
    var k = claveCache(img, formato) + (diseno ? JSON.stringify(diseno) : "");
    if (cache[k]) return Promise.resolve(cache[k]);
    return Imagenes.dataUrl(img, formato, piezaActual(), diseno).then(function (u) { cache[k] = u; return u; });
  }
  function sugerido() { var p = piezaActual(); return { plantilla: p.plantilla, paleta: p.paleta }; }
  function asegurarDiseno(img) { if (!img.diseno) img.diseno = Imagenes.disenoInicial(sugerido()); }

  function pintarGaleria() {
    var g = $("#galeria");
    g.innerHTML = S.imagenes.map(function (img) {
      var etiqueta = img.origen === "banco" ? '<span class="foto__ia"><i class="fa-solid fa-magnifying-glass"></i> Banco</span>'
        : !img.base ? '<span class="foto__ia"><i class="fa-solid fa-palette"></i> Sin foto</span>' : "";
      return '<figure class="foto' + (img.usar ? " foto--usar" : "") + (img.id === imgSel ? " foto--sel" : "") + '" data-img="' + img.id + '">' +
        '<button type="button" class="foto__img" data-elegir title="Diseñar esta pieza"><img alt="' + esc(img.nombre) + '"></button>' +
        '<figcaption><label class="check"><input type="checkbox" data-usar' + (img.usar ? " checked" : "") + "> Usar</label>" +
        '<button type="button" class="ico ico--mini' + (img.portada ? " ico--oro" : "") + '" data-portada title="Portada de la noticia"><i class="fa-' + (img.portada ? "solid" : "regular") + ' fa-star"></i></button>' +
        '<button type="button" class="ico ico--mini" data-quitar title="Quitar"><i class="fa-solid fa-trash-can"></i></button></figcaption>' +
        etiqueta + "</figure>";
    }).join("");
    S.imagenes.forEach(function (img) {
      asegurarDiseno(img);
      renderCache(img, "4:5").then(function (u) { var el = $('[data-img="' + img.id + '"] img'); if (el) el.src = u; });
    });
    $("#disenador").hidden = !imgSel;
    $("#soltar").classList.toggle("soltar--chico", S.imagenes.length > 0);
  }

  function imgActual() { return S.imagenes.filter(function (i) { return i.id === imgSel; })[0]; }

  var pintarLienzo = (function () {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(function () {
        var img = imgActual(); if (!img) return;
        Imagenes.render(img, formatoSel, piezaActual()).then(function (c) {
          var l = $("#lienzo");
          l.width = c.width; l.height = c.height;
          l.getContext("2d").drawImage(c, 0, 0);
          var av = $("#aviso-entra");
          av.hidden = c.info.entra && c.info.escala > 0.8;
          av.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> ' + (!c.info.entra ? "El texto no entra en esta plantilla y formato: acortá el título, el subtítulo o los ítems." : "El texto quedó chico para que entre. Conviene acortarlo.");
        });
      }, 90);
    };
  })();

  var CAMPOS = [
    { k: "antetitulo", l: "Antetítulo", ph: "Fenómeno El Niño" },
    { k: "entrada", l: "Frase antes del título", ph: "Si se viene la lluvia," },
    { k: "titulo", l: "Título de la pieza", ph: "La basura se queda en casa" },
    { k: "destacado", l: "Palabras destacadas", ph: "en casa" },
    { k: "subtitulo", l: "Subtítulo (**negrita**)", ph: "Una bolsa en la calle **puede tapar los desagües**.", area: true },
    { k: "cta", l: "Llamado a la acción", ph: "Deslizá para conocer más" },
    { k: "fecha.dias", l: "Días (círculos)", ph: "26, 27" },
    { k: "fecha.mes", l: "Mes y año", ph: "Noviembre 2026" },
    { k: "fecha.semana", l: "Día de la semana", ph: "Jueves" },
    { k: "hora", l: "Hora", ph: "9:00 h" },
    { k: "lugar", l: "Lugar", ph: "Club Social LT" }
  ];
  function leerCampo(p, k) {
    var partes = k.split("."), v = partes.length > 1 ? (p[partes[0]] || {})[partes[1]] : p[k];
    return Array.isArray(v) ? v.join(", ") : v || "";
  }
  function escribirCampo(p, k, v) {
    var partes = k.split(".");
    if (partes.length > 1) {
      p[partes[0]] = p[partes[0]] || {};
      p[partes[0]][partes[1]] = partes[1] === "dias" ? v.split(/[,\s]+/).filter(Boolean) : v;
      var f = p.fecha;
      if (f) f.texto = [f.semana, (f.dias || []).join(" y "), f.mes ? "de " + f.mes.replace(/\s*\d{4}$/, "").toLowerCase() : ""].filter(Boolean).join(" ");
    } else p[k] = v;
  }

  function pintarTextos() {
    var p = piezaActual();
    $("#op-textos").innerHTML = CAMPOS.map(function (c) {
      var v = esc(leerCampo(p, c.k));
      return '<label class="campo campo--chico">' + c.l + (c.area ? '<textarea rows="2" data-campo="' + c.k + '" placeholder="' + esc(c.ph) + '">' + v + "</textarea>"
        : '<input data-campo="' + c.k + '" value="' + v + '" placeholder="' + esc(c.ph) + '">') + "</label>";
    }).join("");
    pintarItems();
  }
  function pintarItems() {
    var items = piezaActual().items || [];
    $("#op-items").innerHTML = items.map(function (it, i) {
      return '<div class="item-ed" data-item="' + i + '"><button type="button" class="ico ico--mini item-ed__ico" data-icono title="Cambiar ícono"><i class="fa-solid fa-' + esc(it.icono || "circle-info") + '"></i></button>' +
        '<input data-it="titulo" value="' + esc(it.titulo) + '" placeholder="Título"><input data-it="texto" value="' + esc(it.texto) + '" placeholder="Texto">' +
        '<label class="check" title="Mostrar como prohibido"><input type="checkbox" data-it="no"' + (it.no ? " checked" : "") + '> No</label>' +
        '<button type="button" class="ico ico--mini" data-quitar-item title="Quitar"><i class="fa-solid fa-xmark"></i></button></div>';
    }).join("");
  }

  function pintarDisenador() {
    var img = imgActual();
    if (!img) { $("#disenador").hidden = true; return; }
    asegurarDiseno(img);
    $("#disenador").hidden = false;
    var d = img.diseno;
    $("#formatos").innerHTML = Object.keys(C.formatos).map(function (k) {
      return '<button type="button" class="chip' + (k === formatoSel ? " chip--on" : "") + '" data-formato="' + k + '">' + C.formatos[k].nombre + "</button>";
    }).join("");
    $("#op-plantilla").innerHTML = Object.keys(Plantillas.nombres).map(function (k) {
      return '<button type="button" data-v="' + k + '" class="' + (k === d.plantilla ? "on" : "") + '">' + Plantillas.nombres[k] + "</button>";
    }).join("");
    $("#op-paleta").innerHTML = Object.keys(Plantillas.paletas).map(function (k) {
      var pl = Plantillas.paletas[k];
      return '<button type="button" data-v="' + k + '" class="' + (k === d.paleta ? "on" : "") + '" title="' + pl.nombre + '" style="--a:' + pl.primario + ';--b:' + pl.secundario + ';--c:' + pl.claro + '"><span></span>' + pl.nombre + "</button>";
    }).join("");
    $("#op-encuadre").hidden = !img.base;
    $("#op-fx").value = d.fx; $("#op-fy").value = d.fy;
    var cr = $("#credito");
    cr.hidden = !img.credito;
    if (img.credito) cr.innerHTML = '<i class="fa-regular fa-copyright"></i> ' + esc(img.credito.autor) + " · " + esc(img.credito.licencia) + " · " +
      '<a href="' + esc(img.credito.pagina) + '" target="_blank" rel="noopener">' + esc(img.credito.fuente) + "</a>";
    // modo de diseño: plantilla o IA (HTML)
    var modoIA = d.modo === "ia";
    $$("#op-modo button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-v") === (modoIA ? "ia" : "plantilla")); });
    $("#op-ia").hidden = !modoIA;
    $("#op-plantilla-campo").hidden = modoIA;
    $("#btn-diseno-todas").hidden = modoIA;
    if (modoIA) {
      var h = d.html, gen = generandoIA[img.id];
      $("#ia-estado").textContent = gen ? gen : h ? "Dirección de arte: " + h.direccion + " · pensado para " + h.formato + (h.formato !== formatoSel ? " (en este formato se adapta; tocá \"Otra propuesta\" para uno a medida)" : "") : "Todavía no hay diseño de la IA para esta pieza.";
      var pr = (h && h.problemas) || [];
      $("#ia-problemas").hidden = !pr.length;
      $("#ia-problemas").innerHTML = pr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
      var b = $("#btn-disenar-ia");
      b.disabled = !!gen;
      b.innerHTML = gen ? '<span class="girando"></span> ' + esc(gen) : '<i class="fa-solid fa-wand-magic-sparkles"></i> ' + (h ? "Otra propuesta" : "Diseñar con IA");
      if (document.activeElement !== $("#ia-codigo")) $("#ia-codigo").value = h ? h.codigo : "";
    }
    pintarLienzo();
  }

  // Diseño de la pieza hecho por la IA (HTML/CSS → imagen).
  var generandoIA = {};
  function disenarIA(img) {
    if (!img || generandoIA[img.id]) return;
    if (!IA.activa()) { toast("El diseño con IA necesita la conexión con la IA (http://localhost:5520 o GitHub Pages).", "error"); return; }
    if (!S.pieza || !S.pieza.titulo) { toast("Primero redactá la noticia para tener los textos de la pieza.", "info"); return; }
    asegurarDiseno(img);
    img.diseno.modo = "ia";
    var formato = formatoSel, F = C.formatos[formato];
    var pal = Plantillas.paletas[img.diseno.paleta] || Plantillas.paletas.marino;
    generandoIA[img.id] = "Diseñando…";
    if (img.id === imgSel) pintarDisenador();
    DisenoHtml.generar(S.pieza, pal, F.w, F.h, img.base, function (msj) { generandoIA[img.id] = msj; if (img.id === imgSel) pintarDisenador(); })
      .then(function (r) {
        img.diseno.html = { codigo: r.codigo, formato: formato, direccion: r.direccion, problemas: r.problemas };
        img.diseno.manual = true;
        if (!r.prolijo) {
          // no se publica una pieza rota: queda la plantilla y la propuesta de la IA se puede ver en "Diseño IA"
          img.diseno.modo = "plantilla";
          toast("La IA no logró un diseño prolijo para esta pieza; quedó la plantilla. Podés ver su propuesta en \"Diseño IA\" o pedir otra.", "info");
        } else toast(r.problemas.length ? "Diseño listo, con detalles para revisar." : "Diseño de la IA listo.", r.problemas.length ? "info" : "ok");
      })
      .catch(function (e) { toast("No se pudo diseñar con IA: " + (e.name === "AbortError" ? "tardó demasiado" : e.message), "error"); })
      .then(function () {
        delete generandoIA[img.id];
        refrescarMiniatura(img); persistirLuego();
        if (img.id === imgSel) pintarDisenador();
      });
  }

  function cambiarDiseno(cambios) {
    var img = imgActual(); if (!img) return;
    Object.assign(img.diseno, cambios, { manual: true });
    pintarDisenador();
    refrescarMiniatura(img);
    persistirLuego();
  }
  var refrescarMiniatura = (function () {
    var t;
    return function (img) {
      clearTimeout(t);
      t = setTimeout(function () {
        (img ? [img] : S.imagenes).forEach(function (i) { renderCache(i, "4:5").then(function (u) { var el = $('[data-img="' + i.id + '"] img'); if (el) el.src = u; }); });
      }, 350);
    };
  })();

  function agregarPiezas(nuevas, seleccionar) {
    nuevas.forEach(function (n) { if (!n.diseno) n.diseno = Imagenes.disenoInicial(sugerido()); });
    if (!S.imagenes.some(function (i) { return i.portada; }) && nuevas[0]) nuevas[0].portada = true;
    S.imagenes = S.imagenes.concat(nuevas);
    if (seleccionar !== false || !imgSel) imgSel = nuevas[0].id;
    pintarGaleria(); pintarDisenador(); pintarEstado(); pintarRedes(); persistirLuego();
    if (autoIAPendiente) { autoIAPendiente = false; disenarIA(nuevas[0]); }
  }
  var autoIAPendiente = false;

  function agregarArchivos(files) {
    var lista = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); });
    if (!lista.length) return;
    toast("Procesando " + lista.length + " imagen(es)…", "info");
    Promise.all(lista.map(Imagenes.desdeArchivo)).then(function (nuevas) {
      // fotos propias del hecho: si la IA no eligió otra cosa, crónica
      nuevas.forEach(function (n) { n.diseno = Imagenes.disenoInicial({ plantilla: S.pieza && S.pieza.plantilla !== "comunicado" ? S.pieza.plantilla : "cronica", paleta: sugerido().paleta }); });
      agregarPiezas(nuevas);
    }).catch(function (e) { toast(e.message, "error"); });
  }

  function piezaSinFoto() {
    agregarPiezas([Imagenes.nueva({ nombre: "Pieza sin foto", origen: "color", diseno: Imagenes.disenoInicial({ plantilla: S.pieza && S.pieza.plantilla === "foto" ? "comunicado" : (S.pieza && S.pieza.plantilla) || "comunicado", paleta: sugerido().paleta }) })]);
  }

  // Buscar una foto ilustrativa: modal con resultados de bancos libres.
  function abrirBuscador(q) {
    var p = piezaActual();
    q = q || p.foto_busqueda || (S.noticia && S.noticia.titulo) || "";
    abrirModal("Buscar foto ilustrativa",
      '<form class="buscador" id="form-buscar"><input id="buscar-q" value="' + esc(q) + '" placeholder="Ej.: ciervo de los pantanos"><button class="btn btn--pri" type="submit"><i class="fa-solid fa-magnifying-glass"></i> Buscar</button></form>' +
      '<p class="ayuda">Fotos de Wikimedia Commons y Openverse con licencia libre. Se guarda el autor y la licencia para dar crédito.</p>' +
      '<div class="resultados" id="resultados"></div>' +
      '<p class="ayuda">¿Ninguna sirve? Probá otras palabras o usá una <strong>pieza sin foto</strong> (comunicado con colores e íconos).</p>',
      '<button type="button" class="btn btn--ghost-osc" data-cerrar>Cerrar</button>');
    $(".modal__caja").classList.add("modal__caja--ancha");
    var resultados = [];
    function buscar() {
      var texto = $("#buscar-q").value.trim(); if (!texto) return;
      $("#resultados").innerHTML = '<p class="tenue"><span class="girando girando--osc"></span> Buscando…</p>';
      var en = texto === p.foto_busqueda ? p.foto_busqueda_en : texto;
      Fotos.buscar(texto, en).then(function (r) {
        resultados = r;
        $("#resultados").innerHTML = r.length ? r.map(function (x, i) {
          return '<button type="button" class="resultado" data-r="' + i + '" title="' + esc(x.titulo) + '"><img loading="lazy" src="' + esc(x.miniatura) + '" alt="' + esc(x.titulo) + '"><span>' + esc(x.autor).slice(0, 40) + " · " + esc(x.licencia) + "</span></button>";
        }).join("") : '<p class="tenue">Sin resultados. Probá con otras palabras (objetos o escenas concretas funcionan mejor).</p>';
      });
    }
    $("#form-buscar").addEventListener("submit", function (e) { e.preventDefault(); buscar(); });
    $("#resultados").addEventListener("click", function (e) {
      var b = e.target.closest("[data-r]"); if (!b || b.disabled) return;
      var x = resultados[+b.getAttribute("data-r")];
      b.disabled = true; b.classList.add("resultado--cargando");
      usarFotoBanco(x).then(cerrarModal, function (err) { b.disabled = false; b.classList.remove("resultado--cargando"); toast(err.message, "error"); });
    });
    if (q) buscar();
  }

  function usarFotoBanco(x, sinSeleccionar) {
    return Fotos.aDataUrl(x).then(function (u) {
      agregarPiezas([Imagenes.nueva({ nombre: x.titulo || "Foto ilustrativa", original: u, base: u, origen: "banco",
        credito: { autor: x.autor, licencia: x.licencia, fuente: x.fuente, pagina: x.pagina } })], !sinSeleccionar);
    });
  }

  // Si la IA redactó y no hay ninguna pieza: buscar sola una foto ilustrativa (o armar una sin foto).
  function piezaAutomatica() {
    var p = piezaActual();
    if (S.imagenes.length || !S.noticia) return;
    if (!p.foto_busqueda || p.plantilla === "comunicado") { piezaSinFoto(); return; }
    toast("Buscando una foto ilustrativa para la pieza…", "info");
    Fotos.buscar(p.foto_busqueda, p.foto_busqueda_en).then(function (r) {
      var i = 0;
      (function probar() {
        if (S.imagenes.length) return;
        if (i >= Math.min(r.length, 4)) { piezaSinFoto(); return; }
        usarFotoBanco(r[i++]).then(function () { toast("Agregué una foto ilustrativa. Podés cambiarla en Imágenes."); }, probar);
      })();
    });
  }


  function enlazarImagenes() {
    var input = $("#f-imgs"), zona = $("#soltar");
    input.addEventListener("change", function () { agregarArchivos(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.add("soltar--sobre"); }); });
    ["dragleave", "drop"].forEach(function (ev) { zona.addEventListener(ev, function (e) { e.preventDefault(); zona.classList.remove("soltar--sobre"); }); });
    zona.addEventListener("drop", function (e) { agregarArchivos(e.dataTransfer.files); });
    $("#btn-buscar-foto").addEventListener("click", function () { abrirBuscador(); });
    $("#btn-sin-foto").addEventListener("click", piezaSinFoto);

    $("#galeria").addEventListener("click", function (e) {
      var fig = e.target.closest("[data-img]"); if (!fig) return;
      var id = fig.getAttribute("data-img"), img = S.imagenes.filter(function (i) { return i.id === id; })[0];
      if (e.target.closest("[data-elegir]")) { imgSel = id; pintarGaleria(); pintarDisenador(); $("#disenador").scrollIntoView({ behavior: "smooth", block: "nearest" }); }
      else if (e.target.closest("[data-portada]")) { S.imagenes.forEach(function (i) { i.portada = i.id === id; }); img.usar = true; pintarGaleria(); persistirLuego(); }
      else if (e.target.closest("[data-quitar]")) {
        S.imagenes = S.imagenes.filter(function (i) { return i.id !== id; });
        if (img.portada && S.imagenes[0]) S.imagenes[0].portada = true;
        if (imgSel === id) imgSel = S.imagenes[0] ? S.imagenes[0].id : null;
        pintarGaleria(); pintarDisenador(); pintarEstado(); pintarRedes(); persistirLuego();
      }
    });
    $("#galeria").addEventListener("change", function (e) {
      if (!e.target.hasAttribute("data-usar")) return;
      var id = e.target.closest("[data-img]").getAttribute("data-img");
      S.imagenes.forEach(function (i) { if (i.id === id) i.usar = e.target.checked; });
      e.target.closest("figure").classList.toggle("foto--usar", e.target.checked);
      pintarEstado(); pintarRedes(); persistirLuego();
    });

    $("#formatos").addEventListener("click", function (e) { var b = e.target.closest("[data-formato]"); if (b) { formatoSel = b.getAttribute("data-formato"); pintarDisenador(); } });
    $("#op-plantilla").addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) cambiarDiseno({ plantilla: b.getAttribute("data-v") }); });
    $("#op-paleta").addEventListener("click", function (e) { var b = e.target.closest("[data-v]"); if (b) cambiarDiseno({ paleta: b.getAttribute("data-v") }); });
    $("#btn-variante").addEventListener("click", function () { cambiarDiseno({ semilla: 1 + Math.floor(Math.random() * 1e9) }); });
    $("#op-modo").addEventListener("click", function (e) {
      var b = e.target.closest("[data-v]"), img = imgActual(); if (!b || !img) return;
      cambiarDiseno({ modo: b.getAttribute("data-v") });
      if (b.getAttribute("data-v") === "ia" && !img.diseno.html) disenarIA(img);
    });
    $("#btn-disenar-ia").addEventListener("click", function () { disenarIA(imgActual()); });
    $("#ia-codigo").addEventListener("input", function (e) {
      var img = imgActual(); if (!img || !img.diseno.html) return;
      img.diseno.html.codigo = e.target.value;
      pintarLienzo(); refrescarMiniatura(img); persistirLuego();
    });
    ["op-fx", "op-fy"].forEach(function (id) {
      $("#" + id).addEventListener("input", function (e) {
        var img = imgActual(); if (!img) return;
        img.diseno[id === "op-fx" ? "fx" : "fy"] = +e.target.value; img.diseno.manual = true;
        pintarLienzo(); refrescarMiniatura(img); persistirLuego();
      });
    });

    // Textos compartidos de la pieza
    $("#op-textos").addEventListener("input", function (e) {
      var k = e.target.getAttribute("data-campo"); if (!k) return;
      S.pieza = S.pieza || {};
      escribirCampo(S.pieza, k, e.target.value);
      pintarLienzo(); refrescarMiniatura(); persistirLuego();
    });
    $("#op-items").addEventListener("input", function (e) {
      var row = e.target.closest("[data-item]"), campo = e.target.getAttribute("data-it"); if (!row || !campo) return;
      var it = S.pieza.items[+row.getAttribute("data-item")];
      it[campo] = campo === "no" ? e.target.checked : e.target.value;
      pintarLienzo(); refrescarMiniatura(); persistirLuego();
    });
    $("#op-items").addEventListener("change", function (e) { if (e.target.getAttribute("data-it") === "no") e.target.dispatchEvent(new Event("input", { bubbles: true })); });
    $("#op-items").addEventListener("click", function (e) {
      var row = e.target.closest("[data-item]"); if (!row) return;
      var i = +row.getAttribute("data-item");
      if (e.target.closest("[data-quitar-item]")) { S.pieza.items.splice(i, 1); pintarItems(); pintarLienzo(); refrescarMiniatura(); persistirLuego(); }
      if (e.target.closest("[data-icono]")) elegirIcono(i);
    });
    $("#btn-item").addEventListener("click", function () {
      S.pieza = S.pieza || {}; S.pieza.items = S.pieza.items || [];
      S.pieza.items.push({ icono: "circle-info", titulo: "", texto: "", no: false });
      pintarItems(); $$("#op-items [data-it=titulo]").pop().focus();
    });

    $("#btn-diseno-todas").addEventListener("click", function () {
      var img = imgActual(); if (!img) return;
      imgsUsadas().forEach(function (i) { i.diseno = Object.assign({}, i.diseno, { plantilla: img.diseno.plantilla, paleta: img.diseno.paleta, manual: true }); });
      pintarGaleria(); persistirLuego();
      toast("Plantilla y colores aplicados a " + imgsUsadas().length + " pieza(s).");
    });
  }

  var ICONOS_ELEGIBLES = ["hand", "ban", "paw", "dog", "kiwi-bird", "frog", "fish", "leaf", "tree", "seedling", "water", "cloud-rain", "house-flood-water",
    "trash-can", "recycle", "bug", "mosquito", "syringe", "kit-medical", "heart-pulse", "phone", "calendar-days", "clock", "location-dot", "car", "road",
    "helmet-safety", "person-walking", "people-group", "child", "graduation-cap", "book", "music", "futbol", "bicycle", "utensils", "bowl-food", "shirt",
    "bed", "pump-soap", "box-open", "bolt", "triangle-exclamation", "circle-info", "bullhorn", "hand-holding-heart", "handshake", "store", "camera", "lightbulb", "broom"];
  function elegirIcono(i) {
    abrirModal("Elegir ícono", '<div class="iconos">' + ICONOS_ELEGIBLES.map(function (n) {
      return '<button type="button" data-icono="' + n + '" title="' + n + '"><i class="fa-solid fa-' + n + '"></i></button>';
    }).join("") + "</div>", '<button type="button" class="btn btn--ghost-osc" data-cerrar>Cerrar</button>');
    $(".iconos").addEventListener("click", function (e) {
      var b = e.target.closest("[data-icono]"); if (!b) return;
      S.pieza.items[i].icono = b.getAttribute("data-icono");
      cerrarModal(); pintarItems(); pintarLienzo(); refrescarMiniatura(); persistirLuego();
    });
  }

  /* ---------------- Vista previa ---------------- */
  function pintarPrevia() {
    var p = $("#previa");
    if (!S.noticia) { p.innerHTML = '<div class="vacio"><i class="fa-regular fa-eye"></i><h2>Nada para mostrar</h2><p>Cuando haya una noticia vas a ver acá cómo queda en la web y en cada red.</p></div>'; return; }
    var n = S.noticia, por = portada();
    var html = '<section class="prev-web"><div class="prev-web__barra"><span></span><span></span><span></span><em>' + esc(link()) + "</em></div>" +
      '<article class="prev-web__nota"><p class="prev-web__miga">Inicio › Noticias › ' + esc(n.categoria) + "</p>" +
      '<span class="prev-web__cat">' + esc(n.categoria) + '</span><time>' + fechaLarga(n.fecha) + "</time>" +
      "<h1>" + esc(n.titulo) + '</h1><p class="prev-web__bajada">' + esc(n.bajada) + "</p>" +
      (por ? '<img class="prev-web__img" data-prev="' + por.id + '|16:9|web" alt="' + esc(S.altImagen) + '">' : "") +
      n.cuerpo.filter(Boolean).map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("") +
      "</article></section>";
    var activas = redesActivas();
    html += '<h3 class="prev-titulo">Redes seleccionadas (' + activas.length + ")</h3>";
    html += activas.length ? '<div class="prev-redes">' + activas.map(function (red) {
      var imgs = imgsUsadas();
      var media = imgs.length ? '<div class="prev-red__media prev-red__media--' + red.formato.replace(":", "x") + '">' +
        '<img data-prev="' + (portada() || imgs[0]).id + "|" + red.formato + '" alt="">' +
        (imgs.length > 1 ? '<span class="prev-red__mas">1 / ' + imgs.length + "</span>" : "") + "</div>" : "";
      var texto = esc(conLink(S.redes[red.id].texto)).replace(/\n/g, "<br>").replace(/(#[\wáéíóúñÁÉÍÓÚÑ]+)/g, '<span class="hash">$1</span>');
      return '<article class="prev-red" style="--red:' + red.color + '"><header><img src="assets/img/escudo-256.png" alt=""><div><strong>Municipalidad de Las Toscas</strong><span><i class="' + red.icono + '"></i> ' + red.nombre + " · ahora</span></div></header>" +
        (red.id === "instagram" || red.id === "tiktok" ? media + '<p class="prev-red__texto">' + texto + "</p>" : '<p class="prev-red__texto">' + texto + "</p>" + media) + "</article>";
    }).join("") + "</div>" : '<p class="tenue">No elegiste ninguna red. Activalas en la pestaña Redes.</p>';
    p.innerHTML = html;
    $$("[data-prev]", p).forEach(function (el) {
      var x = el.getAttribute("data-prev").split("|");
      var img = S.imagenes.filter(function (i) { return i.id === x[0]; })[0];
      if (img) { asegurarDiseno(img); renderCache(img, x[1], x[2] === "web" && img.base ? { plantilla: "original", paleta: img.diseno.paleta, fx: img.diseno.fx, fy: img.diseno.fy } : null).then(function (u) { el.src = u; }); }
    });
  }

  /* ---------------- Tabs y vistas ---------------- */
  function irTab(id) {
    $$(".tab").forEach(function (t) { var on = t.getAttribute("data-tab") === id; t.classList.toggle("activo", on); t.setAttribute("aria-selected", on); });
    $$(".panel").forEach(function (p) { p.classList.toggle("activo", p.getAttribute("data-panel") === id); });
    if (id === "previa") pintarPrevia();
    if (id === "redes") pintarRedes();
    if (id === "imagenes") { pintarGaleria(); pintarDisenador(); }
    vistaMovil("trabajo");
  }
  function vistaMovil(v) {
    $("#app").setAttribute("data-vista", v);
    $$(".vista-movil button").forEach(function (b) { b.classList.toggle("activo", b.getAttribute("data-vista") === v); });
  }

  function pintarTodo() {
    pintarPills(); pintarChat(); pintarWeb(); pintarRedes(); pintarTextos(); pintarGaleria(); pintarDisenador(); pintarEstado();
    if ($(".panel.activo").getAttribute("data-panel") === "previa") pintarPrevia();
  }

  /* ---------------- Publicar ---------------- */
  function problemas() {
    var p = [], n = S.noticia;
    if (!n.titulo.trim()) p.push({ d: "Web", t: "Falta el título." });
    if (!n.cuerpo.filter(function (x) { return x.trim(); }).length) p.push({ d: "Web", t: "Falta el cuerpo de la noticia." });
    if (!n.slug) p.push({ d: "Web", t: "Falta la dirección (slug)." });
    if (historial.some(function (h) { return h.slug === n.slug && h.id !== S.id; }) || (Contexto.slugsUsados().indexOf(n.slug) >= 0)) p.push({ d: "Web", t: "Ya existe una noticia con la dirección “" + n.slug + "”." });
    redesActivas().forEach(function (red) { avisosRed(red).forEach(function (a) { p.push({ d: red.nombre, t: a }); }); });
    return p;
  }

  function abrirModal(titulo, cuerpo, pie) {
    $("#modal-titulo").textContent = titulo;
    $("#modal-cuerpo").innerHTML = cuerpo;
    $("#modal-pie").innerHTML = pie;
    $("#modal").hidden = false;
  }
  function cerrarModal() { $("#modal").hidden = true; }

  function confirmarPublicacion() {
    var probs = problemas();
    var bloquean = probs.filter(function (p) { return p.d === "Web" || /límite|imagen|Falta el texto/.test(p.t); });
    var destinos = [{ nombre: "Web Muni-Land", icono: "fa-solid fa-globe", detalle: link() }].concat(redesActivas().map(function (r) {
      return { nombre: r.nombre, icono: r.icono, detalle: r.api };
    }));
    var cuerpo = '<p>Se va a publicar <strong>“' + esc(S.noticia.titulo) + '”</strong> con ' + imgsUsadas().length + " imagen(es) en:</p>" +
      '<ul class="destinos">' + destinos.map(function (d) { return '<li><i class="' + d.icono + '"></i><div><strong>' + esc(d.nombre) + "</strong><small>" + esc(d.detalle) + "</small></div></li>"; }).join("") + "</ul>" +
      (probs.length ? '<div class="alerta' + (bloquean.length ? " alerta--error" : "") + '"><strong>' + (bloquean.length ? "Corregí antes de publicar:" : "Revisá:") + "</strong><ul>" +
        probs.map(function (p) { return "<li><b>" + esc(p.d) + ":</b> " + esc(p.t) + "</li>"; }).join("") + "</ul></div>" : "") +
      '<p class="tenue"><i class="fa-solid fa-flask"></i> Maqueta: la publicación es simulada. Queda en el historial y podés descargar la entrada para la web y las imágenes por red.</p>';
    var pie = '<button type="button" class="btn btn--ghost-osc" data-cerrar>Cancelar</button>' +
      '<button type="button" class="btn btn--pri" id="btn-confirmar"' + (bloquean.length ? " disabled" : "") + '><i class="fa-solid fa-paper-plane"></i> Publicar ahora</button>';
    abrirModal("Publicar noticia", cuerpo, pie);
    var b = $("#btn-confirmar");
    if (b) b.addEventListener("click", publicar);
  }

  function publicar() {
    var destinos = [{ id: "web", nombre: "Web Muni-Land", icono: "fa-solid fa-globe" }].concat(redesActivas().map(function (r) { return { id: r.id, nombre: r.nombre, icono: r.icono }; }));
    $("#modal-cuerpo").innerHTML = '<ul class="progreso">' + destinos.map(function (d) {
      return '<li data-dest="' + d.id + '"><i class="' + d.icono + '"></i><span>' + esc(d.nombre) + '</span><em><span class="girando girando--osc"></span> En cola</em></li>';
    }).join("") + "</ul>";
    $("#modal-pie").innerHTML = "";
    var i = 0;
    (function siguiente() {
      if (i >= destinos.length) return terminarPublicacion(destinos);
      var li = $('[data-dest="' + destinos[i].id + '"]');
      $("em", li).innerHTML = '<span class="girando girando--osc"></span> Publicando…';
      setTimeout(function () {
        li.classList.add("ok");
        $("em", li).innerHTML = '<i class="fa-solid fa-check"></i> ' + (destinos[i].id === "web" ? "Publicada" : "Publicado (simulado)");
        i++; siguiente();
      }, 700 + Math.random() * 700);
    })();
  }

  function entradaDataJs() {
    var n = S.noticia;
    var e = { id: n.slug, fecha: n.fecha, cat: n.categoria, titulo: n.titulo, bajada: n.bajada, img: portada() ? "assets/img/" + n.slug + ".jpg" : undefined, cuerpo: n.cuerpo.filter(function (x) { return x.trim(); }) };
    return "/* Pegar dentro de SITE.noticias en MUNI_LAND/assets/js/data.js" + (portada() ? " y copiar la imagen en assets/img/" + n.slug + ".jpg" : "") + " */\n" +
      JSON.stringify(e, null, 2).replace(/^(\s*)"(\w+)":/gm, "$1$2:") + ",\n";
  }

  function terminarPublicacion(destinos) {
    var por = portada();
    var guardarEnHistorial = function (mini) {
      var registro = { id: S.id, slug: S.noticia.slug, titulo: S.noticia.titulo, fecha: new Date().toISOString(), link: link(),
        destinos: destinos.map(function (d) { return d.id; }), miniatura: mini || null,
        snapshot: { noticia: S.noticia, redes: S.redes, pieza: S.pieza, altImagen: S.altImagen } };
      historial = historial.filter(function (h) { return h.id !== S.id; });
      historial.unshift(registro);
      if (!guardar(KEY_HISTORIAL, historial)) { registro.miniatura = null; guardar(KEY_HISTORIAL, historial); }
      pintarPills();
    };
    (por ? Imagenes.render(por, "1:1", piezaActual()).then(function (c) {
      var m = document.createElement("canvas"); m.width = m.height = 160; m.getContext("2d").drawImage(c, 0, 0, 160, 160);
      return m.toDataURL("image/jpeg", 0.7);
    }) : Promise.resolve(null)).then(guardarEnHistorial);

    $("#modal-titulo").textContent = "¡Publicada!";
    $("#modal-cuerpo").insertAdjacentHTML("beforeend",
      '<div class="publicada"><p><i class="fa-solid fa-link"></i> <a href="' + esc(link()) + '" target="_blank" rel="noopener">' + esc(link()) + "</a></p>" +
      '<p class="tenue">Para que aparezca de verdad en Muni-Land, descargá la entrada y pegala en <code>data.js</code>.</p>' +
      '<div class="fila fila--wrap"><button type="button" class="btn btn--sec" id="dl-entrada"><i class="fa-solid fa-file-code"></i> Entrada para data.js</button>' +
      (imgsUsadas().length ? '<button type="button" class="btn btn--sec" id="dl-imgs"><i class="fa-solid fa-images"></i> Imágenes por red</button>' : "") +
      '<button type="button" class="btn btn--sec" id="dl-textos"><i class="fa-regular fa-file-lines"></i> Textos para redes</button></div></div>');
    $("#modal-pie").innerHTML = '<button type="button" class="btn btn--ghost-osc" data-cerrar>Seguir editando</button><button type="button" class="btn btn--pri" id="btn-otra"><i class="fa-solid fa-plus"></i> Nueva noticia</button>';
    $("#dl-entrada").addEventListener("click", function () { descargar("noticia-" + S.noticia.slug + ".js", entradaDataJs(), "text/javascript"); });
    $("#dl-textos").addEventListener("click", function () {
      var t = "# " + S.noticia.titulo + "\n" + link() + "\n\n" + redesActivas().map(function (r) { return "## " + r.nombre + "\n" + conLink(S.redes[r.id].texto); }).join("\n\n") + "\n";
      descargar("redes-" + S.noticia.slug + ".txt", t);
    });
    var dl = $("#dl-imgs");
    if (dl) dl.addEventListener("click", descargarImagenes);
    $("#btn-otra").addEventListener("click", function () { cerrarModal(); nueva(true); });
  }

  function descargarImagenes() {
    var slug = S.noticia.slug, tareas = [];
    if (portada()) tareas.push({ img: portada(), f: "16:9", nombre: slug + ".jpg", d: portada().base ? { plantilla: "original", paleta: portada().diseno.paleta, fx: portada().diseno.fx, fy: portada().diseno.fy } : null });
    redesActivas().forEach(function (r) {
      imgsUsadas().forEach(function (img, i) { tareas.push({ img: img, f: r.formato, nombre: slug + "-" + r.id + "-" + (i + 1) + ".jpg" }); });
    });
    var i = 0;
    (function sig() {
      if (i >= tareas.length) return toast(tareas.length + " imagen(es) descargadas.");
      var t = tareas[i++];
      renderCache(t.img, t.f, t.d).then(function (u) { descargar(t.nombre, u); setTimeout(sig, 250); });
    })();
  }

  /* ---------------- Historial ---------------- */
  function pintarHistorial() {
    var h = $("#historial");
    h.innerHTML = historial.length ? historial.map(function (x) {
      return '<article class="hist" data-h="' + x.id + '">' + (x.miniatura ? '<img src="' + x.miniatura + '" alt="">' : '<span class="hist__sin"><i class="fa-regular fa-newspaper"></i></span>') +
        "<div><strong>" + esc(x.titulo) + "</strong><small>" + new Date(x.fecha).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + "</small>" +
        '<div class="hist__redes">' + x.destinos.map(function (d) {
          var r = C.redes.filter(function (y) { return y.id === d; })[0];
          return '<i class="' + (r ? r.icono : "fa-solid fa-globe") + '" title="' + (r ? r.nombre : "Web") + '"></i>';
        }).join("") + "</div>" +
        '<div class="hist__acc"><button type="button" class="mini" data-abrir>Abrir</button><button type="button" class="mini" data-link>Copiar link</button></div></div></article>';
    }).join("") : '<p class="tenue centro">Todavía no publicaste noticias desde acá.</p>';
  }

  function nueva(confirmado) {
    if (!confirmado && S.noticia && !confirm("¿Empezar una noticia nueva? Se descarta el borrador actual.")) return;
    S = estadoVacio(); imgSel = null; cache = {};
    persistir(false);
    pintarTodo(); irTab("web"); vistaMovil("chat");
    $("#chat-input").focus();
  }

  /* ---------------- Eventos generales ---------------- */
  function enlazar() {
    var input = $("#chat-input");
    $("#chat-form").addEventListener("submit", function (e) { e.preventDefault(); var t = input.value; input.value = ""; enviar(t); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#chat-form").requestSubmit(); } });
    $("#chat-chips").addEventListener("click", function (e) { var b = e.target.closest("[data-ej]"); if (b) { input.value = EJEMPLOS[+b.getAttribute("data-ej")].x; input.focus(); } });
    $("#chat-mensajes").addEventListener("click", function (e) { var b = e.target.closest("[data-ir]"); if (b) irTab(b.getAttribute("data-ir")); });
    $("#btn-forzar").addEventListener("click", function () { enviar("Con lo que te conté alcanza: redactá la noticia y los textos para redes ahora, sin preguntar más. No inventes lo que falta."); });

    // Voz
    var mic = $("#btn-mic");
    function modoGrabando(on) {
      $("#chat-grabando").hidden = !on;
      $("#chat-form").classList.toggle("grabando", on);
      mic.innerHTML = on ? '<i class="fa-solid fa-stop"></i>' : '<i class="fa-solid fa-microphone"></i>';
      mic.setAttribute("aria-label", on ? "Terminar y enviar audio" : "Grabar audio");
      $("#voz-texto").textContent = "Grabando…";
      $("#voz-reloj").textContent = "0:00";
    }
    mic.addEventListener("click", function () {
      if (Voz.grabando()) { Voz.terminar(false); return; }
      modoGrabando(true);
      Voz.iniciar({
        alTick: function (s) { $("#voz-reloj").textContent = Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); },
        alParcial: function (t) { $("#voz-texto").textContent = t.length > 60 ? "…" + t.slice(-60) : t; },
        alProcesando: function () { modoGrabando(false); ocupado = true; pintarChat(); toast("Transcribiendo audio…", "info"); },
        alTerminar: function (t) { modoGrabando(false); ocupado = false; if (t) enviar(t, true); else pintarChat(); },
        alError: function (m) { modoGrabando(false); ocupado = false; pintarChat(); toast(m, "error"); }
      });
    });
    $("#btn-cancelar-voz").addEventListener("click", function () { Voz.terminar(true); });

    $$(".tab").forEach(function (t) { t.addEventListener("click", function () { irTab(t.getAttribute("data-tab")); }); });
    $$(".vista-movil button").forEach(function (b) { b.addEventListener("click", function () { vistaMovil(b.getAttribute("data-vista")); }); });

    $("#btn-guardar").addEventListener("click", function () { persistir(true); });
    $("#btn-publicar").addEventListener("click", confirmarPublicacion);
    $("#btn-nueva").addEventListener("click", function () { nueva(false); });
    $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal" || e.target.closest("[data-cerrar]")) cerrarModal(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") { cerrarModal(); $("#cajon").hidden = true; } });

    $("#btn-historial").addEventListener("click", function () { pintarHistorial(); $("#cajon").hidden = false; });
    $("#btn-cerrar-cajon").addEventListener("click", function () { $("#cajon").hidden = true; });
    $("#historial").addEventListener("click", function (e) {
      var art = e.target.closest("[data-h]"); if (!art) return;
      var x = historial.filter(function (h) { return h.id === art.getAttribute("data-h"); })[0];
      if (e.target.closest("[data-link]")) copiar(x.link);
      if (e.target.closest("[data-abrir]")) {
        if (S.noticia && S.id !== x.id && !confirm("¿Abrir esta publicación? Se reemplaza el borrador actual.")) return;
        S = estadoVacio(); S.id = x.id;
        S.noticia = JSON.parse(JSON.stringify(x.snapshot.noticia));
        S.redes = JSON.parse(JSON.stringify(x.snapshot.redes));
        S.pieza = x.snapshot.pieza || null; S.altImagen = x.snapshot.altImagen; S.slugManual = true;
        S.chat = [{ rol: "asistente", texto: "Abrí “" + x.titulo + "” para editarla. Las fotos no se guardan en el historial: volvé a subirlas si hace falta.", hora: hora() }];
        imgSel = null; cache = {};
        $("#cajon").hidden = true;
        pintarTodo(); irTab("web"); persistir(false);
      }
    });
    $("#btn-reiniciar").addEventListener("click", function () {
      if (!confirm("¿Borrar el historial y el borrador de esta demo en este navegador?")) return;
      try { localStorage.removeItem(KEY_BORRADOR); localStorage.removeItem(KEY_HISTORIAL); } catch (e) { /* nada */ }
      historial = []; $("#cajon").hidden = true; nueva(true);
    });

    enlazarWeb(); enlazarRedes(); enlazarImagenes();
  }

  /* ---------------- Arranque ---------------- */
  enlazar();
  pintarTodo();
  Costos.alCambiar(pintarPills);
  Contexto.cargar().then(function () { pintarPills(); if (S.noticia) pintarWeb(); });
})();
