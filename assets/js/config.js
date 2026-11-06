/* =========================================================
   Configuración de Noticias ADM.
   - apiBase: el mismo proxy de IA que MuniPoc y Muni-Niño (BRLDiscord).
     La clave de OpenRouter vive en el servidor, nunca en el front.
     Rutas: /ia/chat (redacción y, con perfil "diseno", el HTML de las piezas)
     y /ia/transcribe. Ver docs/proxy-ia.md.
   - El proxy sólo acepta los orígenes de ORIGENES_PERMITIDOS
     (GitHub Pages y http://localhost:5520). En otro origen se usa
     el modo local (borrador armado sin IA y voz del navegador).
     Para forzar la IA: index.html?ia=1
   ========================================================= */
window.NOT_CONFIG = {
  apiBase: "https://server.brl-vcmp.com",
  origenesIA: ["grossomaximiliano.github.io", "localhost:5520", "127.0.0.1:5520"],

  // Contexto institucional: se toma de Muni-Land (window.SITE en data.js).
  // Se prueba primero la copia local (carpeta hermana) y después la publicada.
  fuentesContexto: [
    "../MuniInicio/assets/js/data.js",
    "https://grossomaximiliano.github.io/MUNI_LAND/assets/js/data.js"
  ],

  // Dirección pública de cada noticia en Muni-Land.
  webBase: "https://grossomaximiliano.github.io/MUNI_LAND/",
  urlNoticia: function (slug) { return this.webBase + "noticias.html?id=" + encodeURIComponent(slug); },

  maxGrabacion: 120,   // segundos por audio
  // "ia": al redactar, la primera pieza la diseña la IA en HTML/CSS. "plantilla": sólo plantillas (más rápido, sin costo extra).
  disenoAuto: "ia",
  maxLadoImagen: 1600, // las fotos se achican a este lado máximo antes de editarlas

  // Redes. "api" describe qué hace falta para publicar de verdad; hoy la publicación es simulada.
  redes: [
    { id: "facebook", nombre: "Facebook", icono: "fa-brands fa-facebook", color: "#1877f2", limite: 63206,
      formato: "1:1", api: "Meta Graph API (página de Facebook). Viable: token de página con permisos pages_manage_posts.", estadoApi: "viable" },
    { id: "instagram", nombre: "Instagram", icono: "fa-brands fa-instagram", color: "#e1306c", limite: 2200,
      formato: "4:5", requiereImagen: true, linkNoClic: true,
      api: "Instagram Graph API (cuenta profesional vinculada a la página). Viable; exige imagen y el link no es clicable.", estadoApi: "viable" },
    { id: "tiktok", nombre: "TikTok", icono: "fa-brands fa-tiktok", color: "#111111", limite: 2200,
      formato: "9:16", requiereImagen: true, linkNoClic: true,
      api: "TikTok Content Posting API (modo foto). Requiere app aprobada por TikTok; hasta entonces publica como borrador privado.", estadoApi: "aprobacion" },
    { id: "x", nombre: "X (Twitter)", icono: "fa-brands fa-x-twitter", color: "#000000", limite: 280,
      formato: "16:9", api: "X API v2. Publicar requiere plan pago (Basic o superior).", estadoApi: "pago" }
  ],

  formatos: {
    "1:1":  { w: 1080, h: 1080, nombre: "Cuadrado 1:1 (feed)" },
    "4:5":  { w: 1080, h: 1350, nombre: "Vertical 4:5 (Instagram)" },
    "9:16": { w: 1080, h: 1920, nombre: "Historia / TikTok 9:16" },
    "16:9": { w: 1200, h: 675,  nombre: "Horizontal 16:9 (web, X)" }
  },

  categorias: ["Gestión", "Obras", "Desarrollo Humano", "Cultura", "Deportes", "Salud", "Turismo", "Producción", "Educación", "Emergencia"]
};
