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

  return { iniciar: iniciar, terminar: terminar, grabando: function () { return !!actual; }, modo: modo };
})();
