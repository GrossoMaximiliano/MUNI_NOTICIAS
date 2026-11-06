/* =========================================================
   IA: redacción (/ia/chat), transcripción (/ia/transcribe) y
   a través del proxy de OpenRouter (los diseños de las piezas los hace disenoHtml.js).
   Si el origen no está permitido o el proxy falla, la redacción
   cae a un borrador local armado sin IA.
   ========================================================= */
/* Costo real de cada pedido (OpenRouter lo devuelve en usage.cost, en USD). Se acumula por día en este navegador. */
window.Costos = (function () {
  var KEY = "not-adm-costos";
  function hoy() { return new Date().toISOString().slice(0, 10); }
  function leer() { try { var c = JSON.parse(localStorage.getItem(KEY) || "{}"); return c.dia === hoy() ? c : { dia: hoy(), total: 0, redaccion: 0, diseno: 0, pedidos: 0 }; } catch (e) { return { dia: hoy(), total: 0, redaccion: 0, diseno: 0, pedidos: 0 }; } }
  var escuchas = [];
  return {
    sumar: function (tipo, usage) {
      if (!usage || typeof usage.cost !== "number") return;
      var c = leer();
      c.total += usage.cost; c[tipo] = (c[tipo] || 0) + usage.cost; c.pedidos++;
      try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* nada */ }
      escuchas.forEach(function (f) { f(c); });
    },
    hoy: leer,
    alCambiar: function (f) { escuchas.push(f); }
  };
})();

window.IA = (function () {
  var C = window.NOT_CONFIG;
  var TIMEOUT_MS = 90000;
  var fotosSubidas = 0;
  var ICONOS = ["hand", "ban", "paw", "dog", "kiwi-bird", "frog", "fish", "leaf", "tree", "seedling", "water", "cloud-rain", "cloud-showers-heavy",
    "house-flood-water", "trash-can", "recycle", "bug", "mosquito", "syringe", "kit-medical", "heart-pulse", "phone", "calendar-days", "clock",
    "location-dot", "bus", "car", "road", "helmet-safety", "person-walking", "people-group", "child", "graduation-cap", "book", "music",
    "futbol", "bicycle", "utensils", "bowl-food", "shirt", "bed", "pump-soap", "box-open", "bolt", "triangle-exclamation", "circle-info",
    "bullhorn", "hand-holding-heart", "handshake", "store", "wheat-awn", "camera", "landmark", "lightbulb", "broom"];
  var MAX_HISTORIAL = 16;

  var activa = C.origenesIA.indexOf(location.host) >= 0 || C.origenesIA.indexOf(location.hostname) >= 0 || /[?&]ia=1\b/.test(location.search);

  function post(ruta, cuerpo, tipo) {
    var ctrl = new AbortController();
    var corte = setTimeout(function () { ctrl.abort(); }, TIMEOUT_MS);
    return fetch(C.apiBase + ruta, {
      method: "POST", signal: ctrl.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo)
    }).then(function (r) {
      clearTimeout(corte);
      if (!r.ok) {
        return r.json().catch(function () { return {}; }).then(function (j) {
          var e = new Error(j.error || (ruta + " " + r.status));
          e.status = r.status;
          throw e;
        });
      }
      return tipo === "blob" ? r.blob() : r.json();
    }, function (e) { clearTimeout(corte); throw e; });
  }

  /* ---------------- Prompt de redacción ---------------- */
  function prompt(borrador) {
    var hoy = new Date();
    var iso = hoy.toISOString().slice(0, 10);
    var redes = C.redes.map(function (r) { return r.id; }).join(", ");
    return [
      "Sos redactor/a del área de Comunicación de la Municipalidad de Las Toscas (Santa Fe, Argentina). Trabajás con el equipo de prensa: te cuentan un evento o acción del Municipio (muchas veces dictado por voz, con muletillas o desordenado) y vos lo convertís en una noticia institucional lista para la web y en los textos para redes sociales.",
      "Hoy es " + hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " (" + iso + ").",
      "CONTEXTO INSTITUCIONAL (de la web oficial):\n" + Contexto.paraPrompt(),
      "CATEGORÍAS DE LA WEB: " + Contexto.categorias().join(", ") + ".",
      [
        "CÓMO TRABAJAR:",
        "- Español rioplatense neutro e institucional, en tercera persona (\"La Municipalidad de Las Toscas, a través de...\"). Sin adjetivos exagerados ni opiniones políticas.",
        "- Nunca inventes datos: fechas, horarios, lugares, cifras, nombres o citas. Usá sólo lo que te dieron y el contexto institucional. Podés nombrar al intendente o a un secretario/a sólo si el tema corresponde a su área o te lo dijeron, y nunca le inventes una frase entre comillas.",
        "- Si falta algo imprescindible para entender la noticia (qué, cuándo o dónde, si es un evento a futuro), devolvé estado \"falta_info\" con hasta 3 preguntas cortas. Si con lo que hay ya se puede publicar, redactá (estado \"listo\") y, si querés, sumá en \"sugerencias\" datos que la mejorarían.",
        "- Si ya hay un BORRADOR ACTUAL y el equipo pide cambios, devolvé el borrador completo corregido aplicando sólo lo pedido.",
        "- Corregí nombres propios dudosos de la transcripción sólo si el contexto institucional lo confirma (por ejemplo, el nombre de un secretario/a)."
      ].join("\n"),
      [
        "NOTICIA WEB:",
        "- titulo: informativo, hasta 110 caracteres, sin punto final.",
        "- bajada: 1 o 2 oraciones (hasta 260 caracteres) con lo esencial.",
        "- cuerpo: entre 3 y 6 párrafos, de lo más importante a lo menos. Si es un evento, incluí día, hora, lugar y cómo participar. Cerrá con información de contacto o inscripción si te la dieron.",
        "- slug: en minúsculas, palabras separadas por guiones, sin tildes, hasta 60 caracteres. No repitas uno de estos: " + Contexto.slugsUsados().slice(0, 30).join(", ") + ".",
        "- fecha: la del día de publicación (" + iso + ") salvo que te pidan otra."
      ].join("\n"),
      [
        "REDES (" + redes + "): un texto para cada una, distinto y adaptado. Donde va el link a la noticia escribí exactamente {{LINK}}.",
        "- facebook: 2 a 4 párrafos cortos, cercano, con los datos clave, cerrando con \"Más información: {{LINK}}\". Hasta 3 hashtags al final (#LasToscas siempre).",
        "- instagram: gancho en la primera línea, 3 a 6 líneas cortas, algún emoji sobrio (📍🗓️🕘) si es un evento, \"Nota completa en el link de la bio 👉 {{LINK}}\" y 4 a 8 hashtags al final.",
        "- tiktok: muy breve (2 o 3 líneas), tono más joven pero respetuoso, \"Más info: {{LINK}}\" y 3 a 5 hashtags.",
        "- x: una sola publicación de hasta 230 caracteres CONTANDO {{LINK}} como 23 caracteres, con 1 o 2 hashtags."
      ].join("\n"),
      [
        "PIEZA GRÁFICA (\"pieza\"): los textos que van ESCRITOS sobre la imagen de Instagram/Facebook. La pieza la arma un diseñador con plantillas fijas; vos sólo elegís plantilla y paleta y escribís textos cortos, como las placas que publica la Municipalidad (\"¿Por qué hay animales silvestres?\", \"Si se viene la lluvia, la basura se queda en casa\", \"Al dengue le cerramos la puerta\", \"Cuidar la fauna es responsabilidad de todos\").",
        "- plantilla: \"campana\" (concientización/prevención, con foto ilustrativa al costado), \"foto\" (mensaje fuerte sobre una foto completa), \"evento\" (algo con fecha, hora y lugar), \"comunicado\" (convocatoria, aviso o información sin foto), \"recomendaciones\" (lista de 3 a 5 consejos o pasos), \"cronica\" (algo que ya pasó, con foto real del hecho), \"dividida\" (mitad foto, mitad color con título grande; anuncios, obras, inauguraciones), \"titular\" (frase corta muy grande, foto en círculo; mensajes de impacto, fechas patrias, saludos). Variá: no uses siempre la misma; mirá el último título publicado y elegí otra composición si encaja.",
        "- paleta: \"verde\" (ambiente, fauna, naturaleza), \"violeta\" (salud, dengue, clima/El Niño), \"marino\" (gestión, obras, institucional), \"terracota\" (turismo, cultura, patrimonio), \"rojo\" (social, solidaridad, emergencias), \"turquesa\" (educación, convenios, juventud).",
        "- antetitulo: 1 a 4 palabras (programa, campaña o categoría; ej. \"Fenómeno El Niño\", \"Convocatoria 2026\"). entrada: frase corta opcional que va antes del título (ej. \"Si se viene la lluvia,\").",
        "- titulo: 3 a 8 palabras, directo y en lenguaje de vecino (no el título periodístico). destacado: 1 a 3 palabras del título que van resaltadas en color.",
        "- subtitulo: 1 oración de hasta 18 palabras; marcá con **doble asterisco** la parte clave. cta: opcional, ej. \"Deslizá para conocer más\" (sólo si es carrusel o hay más info).",
        "- items: sólo para recomendaciones/comunicado: [{\"icono\":\"\",\"titulo\":\"hasta 4 palabras\",\"texto\":\"hasta 10 palabras\",\"no\":true si es algo que NO hay que hacer}]. icono: uno de " + ICONOS.join(", ") + ". icono (suelto): uno de esa lista para el tema.",
        "- fecha: {\"dias\":[\"26\",\"27\"],\"semana\":\"Jueves\",\"mes\":\"Noviembre 2026\",\"texto\":\"Jueves 26 de noviembre\"} sólo si hay fecha. hora: \"9:00 h\". lugar: \"Club Social LT\". No inventes ninguno.",
        "- foto_busqueda: 2 a 4 palabras en español para buscar una foto ilustrativa real en un banco libre (objeto o escena concreta, ej. \"ciervo de los pantanos\", \"mosquito aedes aegypti\", \"bolsas de residuos en la vereda\"). foto_busqueda_en: lo mismo en inglés.",
        "\"alt_imagen\" describe la foto principal para accesibilidad (si no sabés cómo es, describí el tema)."
      ].join("\n"),
      "FOTOS PROPIAS SUBIDAS POR EL EQUIPO: " + fotosSubidas + (fotosSubidas ? " (son del hecho real: preferí plantilla \"cronica\" o \"foto\")." : " (se va a buscar una foto ilustrativa con foto_busqueda o se usa una pieza sin foto)."),
      "BORRADOR ACTUAL (puede estar vacío; el equipo pudo editarlo a mano):\n" + (borrador ? JSON.stringify(borrador) : "(vacío)"),
      [
        "FORMATO DE RESPUESTA: respondé SOLO un objeto JSON válido, sin texto antes ni después ni bloques de código:",
        '{"estado":"listo"|"falta_info","mensaje":"1 o 2 oraciones para el equipo explicando qué hiciste o qué falta","preguntas":["..."],"sugerencias":["..."],',
        '"noticia":{"titulo":"","bajada":"","categoria":"","slug":"","fecha":"AAAA-MM-DD","cuerpo":["párrafo 1","párrafo 2"],"etiquetas":["..."]},',
        '"redes":{"facebook":"","instagram":"","tiktok":"","x":""},',
        '"pieza":{"plantilla":"","paleta":"","antetitulo":"","entrada":"","titulo":"","destacado":"","subtitulo":"","cta":"","icono":"","items":[],"fecha":null,"hora":"","lugar":"","foto_busqueda":"","foto_busqueda_en":""},"alt_imagen":""}',
        "Con estado \"falta_info\" podés omitir noticia y redes."
      ].join("\n")
    ].join("\n\n");
  }

  // Extrae el JSON aunque el modelo lo envuelva en ```json o agregue texto.
  function parsear(texto) {
    var t = String(texto || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
    var ini = t.indexOf("{"), fin = t.lastIndexOf("}");
    if (ini < 0 || fin <= ini) return null;
    try { return JSON.parse(t.slice(ini, fin + 1)); } catch (e) { return null; }
  }

  // historial: [{ rol: 'usuario'|'asistente', texto, crudo? }]
  function redactar(historial, borrador, forzarLocal) {
    if (!activa || forzarLocal) return Promise.resolve(local(historial, borrador));
    var mensajes = [{ role: "system", content: prompt(borrador) }].concat(historial.slice(-MAX_HISTORIAL).map(function (m) {
      return { role: m.rol === "usuario" ? "user" : "assistant", content: m.crudo || m.texto };
    }));
    return post("/ia/chat", { messages: mensajes, perfil: "redaccion" }).then(function (j) {
      Costos.sumar("redaccion", j.usage);
      var contenido = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      var datos = parsear(contenido);
      if (!datos) {
        // Respondió texto suelto: se muestra como mensaje.
        return { estado: "falta_info", mensaje: String(contenido || "No obtuve respuesta.").trim(), crudo: contenido };
      }
      datos.crudo = JSON.stringify(datos);
      return corregir(datos);
    });
  }

  /* El modelo barato del proxy a veces se equivoca en lo fijo (estado, marcador del link,
     nombre de la ciudad, hashtag). Se corrige acá para que no rompa la pantalla. */
  function corregirTexto(t) {
    return String(t || "")
      .replace(/Las\s+Tosc[áa]s/g, "Las Toscas")
      .replace(/#La\s?Toscas\b/gi, "#LasToscas");
  }
  function corregir(d) {
    var hayNoticia = d.noticia && d.noticia.titulo;
    if (d.estado !== "falta_info" && d.estado !== "listo") d.estado = hayNoticia ? "listo" : "falta_info";
    if (d.estado === "falta_info" && hayNoticia && !(d.preguntas && d.preguntas.length)) d.estado = "listo";
    if (hayNoticia) {
      var n = d.noticia;
      ["titulo", "bajada"].forEach(function (k) { n[k] = corregirTexto(n[k]); });
      if (Array.isArray(n.cuerpo)) n.cuerpo = n.cuerpo.map(corregirTexto);
    }
    if (d.redes) Object.keys(d.redes).forEach(function (k) {
      var t = corregirTexto(d.redes[k]).replace(/\{\{\s*L[IÍ]N[KCQ]\w*\s*\}\}|\{\s*LINK\s*\}|\[LINK\]/gi, "{{LINK}}");
      if (t && t.indexOf("{{LINK}}") < 0) t += (k === "x" ? " " : "\n\n" + (k === "instagram" ? "Nota completa en el link de la bio 👉 " : "Más información: ")) + "{{LINK}}";
      d.redes[k] = t;
    });
    if (d.pieza) {
      var p = d.pieza;
      ["antetitulo", "entrada", "titulo", "destacado", "subtitulo", "cta"].forEach(function (k) { if (p[k]) p[k] = corregirTexto(p[k]); });
      if (!Plantillas.nombres[p.plantilla]) p.plantilla = p.fecha || p.lugar ? "evento" : (p.items && p.items.length > 2 ? "recomendaciones" : "campana");
      if (!Plantillas.paletas[p.paleta]) p.paleta = "marino";
      if (!Array.isArray(p.items)) p.items = [];
      p.items = p.items.filter(function (it) { return it && (it.titulo || it.texto); }).map(function (it) {
        return { icono: ICONOS.indexOf(it.icono) >= 0 ? it.icono : "circle-info", titulo: corregirTexto(it.titulo), texto: corregirTexto(it.texto), no: !!it.no };
      });
      if (ICONOS.indexOf(p.icono) < 0) p.icono = "";
      if (p.fecha && !Array.isArray(p.fecha.dias)) p.fecha.dias = [];
    }
    if (d.mensaje) d.mensaje = corregirTexto(d.mensaje);
    return d;
  }

  /* ---------------- Borrador local (sin IA) ---------------- */
  function slugify(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9\s-]/g, "").trim().split(/\s+/).slice(0, 8).join("-").slice(0, 60) || "noticia";
  }

  function local(historial, borrador) {
    var texto = historial.filter(function (m) { return m.rol === "usuario"; }).map(function (m) { return m.texto; }).join(" ").replace(/\s+/g, " ").trim();
    if (texto.length < 40) {
      return { estado: "falta_info", local: true, mensaje: "Contame un poco más: qué se hizo o qué se va a hacer, cuándo, dónde y quién lo organiza.", preguntas: [] };
    }
    var oraciones = texto.match(/[^.!?]+[.!?]*/g).map(function (s) { return s.trim(); }).filter(Boolean)
      .map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1) + (/[.!?]$/.test(s) ? "" : "."); });
    var titulo = oraciones[0].replace(/[.!?]$/, "");
    if (titulo.length > 110) titulo = titulo.slice(0, 107).replace(/\s+\S*$/, "") + "…";
    var cuerpo = [];
    for (var i = 0; i < oraciones.length; i += 2) cuerpo.push(oraciones.slice(i, i + 2).join(" "));
    var bajada = (oraciones[1] || oraciones[0]).slice(0, 260);
    var resumen = oraciones.slice(0, 2).join(" ");
    return {
      estado: "listo", local: true,
      mensaje: "Armé un borrador básico sin IA: ordené tu texto en título, bajada y párrafos. Revisalo y completalo a mano.",
      noticia: { titulo: titulo, bajada: bajada, categoria: (borrador && borrador.categoria) || "Gestión", slug: slugify(titulo),
        fecha: new Date().toISOString().slice(0, 10), cuerpo: cuerpo, etiquetas: [] },
      redes: {
        facebook: resumen + "\n\nMás información: {{LINK}}\n\n#LasToscas",
        instagram: titulo + "\n\n" + resumen + "\n\nNota completa en el link de la bio 👉 {{LINK}}\n\n#LasToscas #SantaFe #Municipalidad",
        tiktok: titulo + "\nMás info: {{LINK}}\n#LasToscas #SantaFe",
        x: (titulo.length > 180 ? titulo.slice(0, 177) + "…" : titulo) + " {{LINK}} #LasToscas"
      },
      pieza: { plantilla: fotosSubidas ? "cronica" : "comunicado", paleta: "marino", antetitulo: (borrador && borrador.noticia && borrador.noticia.categoria) || "Municipalidad",
        titulo: titulo.split(" ").slice(0, 8).join(" "), destacado: "", subtitulo: (oraciones[1] || "").slice(0, 140), items: [], icono: "bullhorn",
        foto_busqueda: "", foto_busqueda_en: "" },
      alt_imagen: titulo
    };
  }

  /* ---------------- Transcripción ---------------- */
  function transcribir(b64wav) {
    return post("/ia/transcribe", { data: b64wav, format: "wav" }).then(function (j) { return String(j.text || "").trim(); });
  }

  return {
    setFotos: function (n) { fotosSubidas = n; },
    activa: function () { return activa; },
    desactivar: function () { activa = false; },
    redactar: redactar,
    transcribir: transcribir,
    slugify: slugify
  };
})();
