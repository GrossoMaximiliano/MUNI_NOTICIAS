/* =========================================================
   Grabación de voz. Con IA: graba, pasa a WAV 16 kHz mono y
   transcribe con /ia/transcribe (igual que MuniPoc). Sin IA:
   usa el reconocimiento de voz del navegador (Chrome/Edge).
   API: Voz.iniciar({ alTick(seg), alTerminar(texto), alError(msj) }), Voz.terminar(cancelar)
   ========================================================= */
window.Voz = (function () {
  var C = window.NOT_CONFIG;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var puedeGrabar = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  var actual = null;

  function pcmAWav(pcm, rate) {
    var h = new DataView(new ArrayBuffer(44));
    function txt(o, s) { for (var i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); }
    txt(0, "RIFF"); h.setUint32(4, 36 + pcm.byteLength, true); txt(8, "WAVE");
    txt(12, "fmt "); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
    h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true);
    txt(36, "data"); h.setUint32(40, pcm.byteLength, true);
    return new Blob([h.buffer, pcm], { type: "audio/wav" });
  }

  function aWav(blob) {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    var ctx = new Ctx(), rate = 16000;
    return blob.arrayBuffer().then(function (b) { return ctx.decodeAudioData(b); }).then(function (audio) {
      ctx.close();
      var off = new OfflineAudioContext(1, Math.max(1, Math.ceil(audio.duration * rate)), rate);
      var src = off.createBufferSource();
      src.buffer = audio; src.connect(off.destination); src.start();
      return off.startRendering();
    }).then(function (r) {
      var d = r.getChannelData(0), pcm = new Int16Array(d.length);
      for (var i = 0; i < d.length; i++) { var s = Math.max(-1, Math.min(1, d[i])); pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
      return pcmAWav(pcm.buffer, rate);
    });
  }

  function aBase64(blob) {
    return new Promise(function (ok, mal) {
      var fr = new FileReader();
      fr.onload = function () { ok(String(fr.result).split(",")[1]); };
      fr.onerror = mal;
      fr.readAsDataURL(blob);
    });
  }

  function modo() { return IA.activa() && puedeGrabar ? "ia" : SR ? "navegador" : null; }

  function reloj(g, cb) {
    g.inicio = Date.now();
    g.tick = setInterval(function () {
      var seg = Math.floor((Date.now() - g.inicio) / 1000);
      cb.alTick && cb.alTick(seg);
      if (seg >= C.maxGrabacion) terminar(false);
    }, 250);
  }

  function iniciar(cb) {
    if (actual) return;
    var m = modo();
    if (!m) { cb.alError("Este navegador no permite grabar voz. Escribí el texto."); return; }

    if (m === "ia") {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        var rec = new MediaRecorder(stream);
        var g = actual = { tipo: "ia", rec: rec, stream: stream, partes: [], cancelada: false };
        rec.addEventListener("dataavailable", function (e) { if (e.data && e.data.size) g.partes.push(e.data); });
        rec.addEventListener("stop", function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          clearInterval(g.tick);
          actual = null;
          if (g.cancelada) return cb.alTerminar(null);
          if (Date.now() - g.inicio < 900) return cb.alError("El audio es muy corto. Mantené la grabación mientras hablás.");
          cb.alProcesando && cb.alProcesando();
          aWav(new Blob(g.partes, { type: rec.mimeType || "audio/webm" })).then(aBase64).then(IA.transcribir).then(function (t) {
            if (!t) throw new Error("vacío");
            cb.alTerminar(t);
          }).catch(function (e) {
            cb.alError(e.message === "vacío" ? "No se entendió el audio. Probá de nuevo." : "No se pudo transcribir el audio (" + e.message + ").");
          });
        });
        rec.start();
        reloj(g, cb);
      }).catch(function () { cb.alError("No se pudo usar el micrófono. Revisá los permisos del navegador."); });
      return;
    }

    // Reconocimiento del navegador
    var r = new SR();
    r.lang = "es-AR"; r.continuous = true; r.interimResults = true;
    var g = actual = { tipo: "navegador", rec: r, final: "", parcial: "", cancelada: false };
    r.onresult = function (e) {
      g.parcial = "";
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) g.final += e.results[i][0].transcript + " ";
        else g.parcial += e.results[i][0].transcript;
      }
      cb.alParcial && cb.alParcial((g.final + g.parcial).trim());
    };
    r.onerror = function (e) { if (e.error !== "no-speech" && e.error !== "aborted") cb.alError("Error del reconocimiento de voz: " + e.error); };
    r.onend = function () {
      clearInterval(g.tick);
      actual = null;
      if (g.cancelada) return cb.alTerminar(null);
      var t = (g.final + g.parcial).trim();
      t ? cb.alTerminar(t) : cb.alError("No se entendió el audio. Probá de nuevo.");
    };
    r.start();
    reloj(g, cb);
  }

  function terminar(cancelar) {
    if (!actual) return;
    actual.cancelada = !!cancelar;
    if (actual.tipo === "ia") { if (actual.rec.state !== "inactive") actual.rec.stop(); }
    else actual.rec.stop();
  }

  return { iniciar: iniciar, terminar: terminar, grabando: function () { return !!actual; }, modo: modo, pcmAWav: pcmAWav };
})();

/* =========================================================
   Lector: lee en voz alta las respuestas del asistente.
   Con IA usa /ia/speech del proxy (la misma voz que MuniPoc y Muni-Niño;
   devuelve PCM crudo, al que se le agrega cabecera WAV). Si la IA no está
   activa o falla, usa la voz del navegador (speechSynthesis, español).
   API: Lector.alternar(clave, texto, alCambiar(estado)) · Lector.detener()
   estado: "cargando" | "sonando" | null
   ========================================================= */
window.Lector = (function () {
  var C = window.NOT_CONFIG;
  var reproductor = new Audio();
  var urls = {};          // clave -> objectURL ya generado (no se vuelve a pagar el audio)
  var actual = null;      // { clave, alCambiar }
  var MAX_CHARS = 1900;   // el proxy acepta hasta 2000

  // Texto apto para leer: sin marcadores, links ni emojis.
  function limpiar(t) {
    return String(t || "")
      .replace(/\{\{LINK\}\}/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\*\*/g, "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
      .replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
  }

  function avisar(estado) { if (actual && actual.alCambiar) actual.alCambiar(estado); }

  function detener() {
    reproductor.pause();
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (actual) { var a = actual; actual = null; if (a.alCambiar) a.alCambiar(null); }
  }

  function sintetizar(texto) {
    return fetch(C.apiBase + "/ia/speech", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: texto }) // modelo y voz los decide el proxy
    }).then(function (r) {
      if (!r.ok) throw new Error("voz " + r.status);
      var tipo = r.headers.get("Content-Type") || "";
      var rate = parseInt((tipo.match(/rate=(\d+)/) || [])[1], 10) || 24000;
      return r.arrayBuffer().then(function (buf) {
        return URL.createObjectURL(/wav|mpeg|mp3|ogg/.test(tipo) ? new Blob([buf], { type: tipo }) : Voz.pcmAWav(buf, rate));
      });
    });
  }

  function vozNavegador(texto, clave) {
    if (!window.speechSynthesis) return Promise.reject(new Error("Este navegador no puede leer en voz alta."));
    return new Promise(function (ok, mal) {
      var u = new SpeechSynthesisUtterance(texto);
      u.lang = "es-AR";
      var voces = speechSynthesis.getVoices();
      var v = voces.filter(function (x) { return /^es-(AR|419|US|MX)/i.test(x.lang); })[0] || voces.filter(function (x) { return /^es/i.test(x.lang); })[0];
      if (v) u.voice = v;
      u.rate = 1.02;
      u.onstart = function () { if (actual && actual.clave === clave) avisar("sonando"); ok(); };
      u.onend = function () { if (actual && actual.clave === clave) detener(); };
      u.onerror = function (e) { if (e.error !== "canceled" && e.error !== "interrupted") mal(new Error("No se pudo leer el texto.")); };
      speechSynthesis.speak(u);
    });
  }

  reproductor.addEventListener("ended", function () { detener(); });

  function alternar(clave, texto, alCambiar) {
    if (actual && actual.clave === clave) { detener(); return Promise.resolve(); }
    detener();
    texto = limpiar(texto);
    if (!texto) return Promise.resolve();
    actual = { clave: clave, alCambiar: alCambiar };
    var listo = urls[clave] ? Promise.resolve(urls[clave]) : (avisar("cargando"), IA.activa() ? sintetizar(texto) : Promise.reject(new Error("sin IA")));
    return listo.then(function (url) {
      urls[clave] = url;
      if (!actual || actual.clave !== clave) return;   // lo cancelaron mientras cargaba
      reproductor.src = url;
      return reproductor.play().then(function () { avisar("sonando"); });
    }).catch(function (e) {
      if (!actual || actual.clave !== clave) return;
      console.warn("Lector: se usa la voz del navegador", e);
      return vozNavegador(texto, clave).catch(function (e2) { detener(); throw e2; });
    });
  }

  return { alternar: alternar, detener: detener, sonando: function () { return actual && actual.clave; } };
})();
