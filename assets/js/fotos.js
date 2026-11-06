/* =========================================================
   Fotos ilustrativas para cuando no hay fotos propias.
   Bancos libres que se pueden usar desde el navegador (CORS):
   - Wikimedia Commons (API con origin=*)
   - Openverse (Flickr y otros, licencias Creative Commons de uso comercial)
   Cada resultado guarda autor, licencia y fuente para dar crédito.
   ========================================================= */
window.Fotos = (function () {
  var C = window.NOT_CONFIG;

  function limpiarHTML(t) { var d = document.createElement("div"); d.innerHTML = t || ""; return (d.textContent || "").trim(); }

  function wikimedia(q) {
    var url = "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrnamespace=6" +
      "&gsrsearch=" + encodeURIComponent(q + " filetype:bitmap") + "&gsrlimit=18&prop=imageinfo&iiprop=url|extmetadata|size&iiurlwidth=1600";
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      var ps = j.query ? Object.values(j.query.pages) : [];
      return ps.sort(function (a, b) { return a.index - b.index; }).map(function (p) {
        var ii = p.imageinfo && p.imageinfo[0];
        if (!ii || ii.width < 900 || /\.(svg|tif|tiff)$/i.test(ii.url)) return null;
        var md = ii.extmetadata || {};
        if (/\b(ND|NC)\b|fair use/i.test((md.LicenseShortName && md.LicenseShortName.value) || "")) return null;
        return {
          id: "wm-" + p.pageid, fuente: "Wikimedia Commons",
          miniatura: ii.thumburl.replace(/\/\d+px-/, "/480px-"), completa: ii.thumburl,
          ancho: ii.width, alto: ii.height,
          titulo: p.title.replace(/^File:/, "").replace(/\.[a-z]+$/i, ""),
          autor: limpiarHTML(md.Artist && md.Artist.value) || "Autor desconocido",
          licencia: (md.LicenseShortName && md.LicenseShortName.value) || "Ver en la fuente",
          pagina: ii.descriptionurl
        };
      }).filter(Boolean);
    }).catch(function () { return []; });
  }

  function openverse(q) {
    // Sólo licencias que permiten uso comercial Y modificar la foto (ponerle textos es una obra derivada): sin ND ni NC.
    var url = "https://api.openverse.org/v1/images/?q=" + encodeURIComponent(q) + "&license=cc0,pdm,by,by-sa&page_size=18&mature=false";
    return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
      return (j.results || []).filter(function (x) { return (x.width || 0) >= 900; }).map(function (x) {
        return {
          id: "ov-" + x.id, fuente: "Openverse · " + (x.source || x.provider || ""),
          miniatura: x.thumbnail, completa: x.url, respaldo: x.thumbnail,
          ancho: x.width, alto: x.height, titulo: x.title || "",
          autor: x.creator || "Autor desconocido",
          licencia: ("CC " + (x.license || "").toUpperCase() + " " + (x.license_version || "")).replace("CC CC0", "CC0").replace("CC PDM", "Dominio público").trim(),
          pagina: x.foreign_landing_url
        };
      });
    }).catch(function () { return []; });
  }

  // q: búsqueda en español (Wikimedia); qEn: en inglés (Openverse tiene más resultados en inglés).
  function buscar(q, qEn) {
    return Promise.all([wikimedia(q), openverse(qEn || q)]).then(function (r) {
      var a = r[0], b = r[1], mix = [];
      for (var i = 0; i < Math.max(a.length, b.length); i++) { if (b[i]) mix.push(b[i]); if (a[i]) mix.push(a[i]); }
      return mix;
    });
  }

  function cargar(url) {
    return new Promise(function (ok, mal) {
      var im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = function () { ok(im); };
      im.onerror = function () { mal(new Error("No se pudo descargar la foto")); };
      im.src = url;
    });
  }

  // Descarga la foto elegida y la deja como dataURL (máx. maxLadoImagen).
  function aDataUrl(res) {
    return cargar(res.completa).catch(function () { if (res.respaldo) return cargar(res.respaldo); throw new Error("La foto no permite usarse desde la página. Probá con otra."); }).then(function (im) {
      var k = Math.min(1, C.maxLadoImagen / Math.max(im.naturalWidth, im.naturalHeight));
      var c = document.createElement("canvas");
      c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      try { return c.toDataURL("image/jpeg", 0.9); } catch (e) { throw new Error("La foto no permite usarse desde la página. Probá con otra."); }
    });
  }

  return { buscar: buscar, aDataUrl: aDataUrl };
})();
