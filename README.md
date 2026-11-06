# Noticias ADM · Las Toscas

Maqueta (HTML + CSS + JS puro, sin build) para el área de **Comunicación** de la Municipalidad de Las Toscas:
el equipo cuenta un evento o una acción del Municipio (por **audio** o escrito) y la IA redacta la **noticia para la web**
y las **versiones para cada red social**, listas para revisar, diseñar las imágenes y publicar todo junto.

## Flujo

1. **Dictar** (columna izquierda): chat con el asistente. El botón rojo graba un audio, que se transcribe con IA.
   Si falta algo imprescindible (qué, cuándo, dónde), el asistente pregunta; si alcanza, redacta. "Redactar ya con lo que conté" lo fuerza.
   Con una noticia ya armada se le pueden pedir cambios ("hacelo más corto", "sumá que hay inscripción").
   Cada respuesta tiene arriba un botón **Escuchar** que la lee en voz alta con `/ia/speech` (la misma voz que MuniPoc y
   Muni-Niño); el audio se genera una sola vez por mensaje. Sin IA usa la voz del navegador.
2. **Noticia web**: título, bajada, categoría, fecha, dirección (slug) y párrafos, todo editable. Muestra el link final de la nota en Muni-Land.
3. **Redes**: Facebook, Instagram, TikTok y X, cada una con interruptor, su texto, contador con el límite de la red y avisos
   (falta imagen, falta el link, se pasa del límite). `{{LINK}}` se reemplaza por el link de la nota.
4. **Imágenes (piezas)**: la IA **no dibuja** la placa, para que no parezca hecha por IA. Elige plantilla y colores y escribe
   los textos cortos (antetítulo, título, palabras destacadas, subtítulo, ítems con íconos, fecha/hora/lugar). El diseño lo arman
   plantillas en canvas con el estilo de las publicaciones de la Municipalidad, con Poppins, formas planas, el escudo y
   "Municipalidad de Las Toscas", y los textos siempre sobre fondos con contraste:
   - **Campaña** (foto con corte curvo al costado), **Foto + título** (degradado y título con palabra resaltada),
     **Evento** (días en círculos, panel, lugar y hora), **Comunicado** (sin foto, título en dos tonos, íconos),
     **Recomendaciones** (lista con señales de prohibido), **Crónica** (foto real y banda con título) y **Solo escudo**.
   - 6 paletas por tema: Ambiente, Salud, Institucional, Turismo, Social y Educación.
   - Si el texto no entra, la plantilla lo achica sola y avisa si quedó chico.
   - **Fondo**: fotos propias, **foto ilustrativa** de bancos libres (Wikimedia Commons y Openverse, sólo licencias que permiten
     modificarlas, con autor y licencia guardados) o **pieza sin foto**. No se usa ningún modelo de imágenes: las fotos son
     reales y los textos los pone el diseño (una foto inventada es lo que más delata a la IA).
     Si la IA redacta y no hay fotos, busca sola una ilustrativa con las palabras que eligió.
   - Encuadre de la foto y formatos 1:1, 4:5, 9:16 y 16:9.
   - **Variantes**: cada pieza nace con una semilla que cambia la composición dentro de la plantilla (lado de la foto,
     corte en curva/arco/círculo, título en Poppins/Montserrat/Bebas Neue, textura de fondo, adorno, foto natural/duotono/cálida,
     posición de la firma). "Otra variante" la cambia. Así dos publicaciones con la misma plantilla no salen iguales.
   - Plantillas extra: **Dividida** (mitad foto, mitad color, corte recto o diagonal) y **Titular** (frase enorme y foto en círculo o arco).
5. **Diseño IA (HTML/CSS)**: en vez de una plantilla, el modelo de texto escribe la composición en HTML+CSS con las reglas
   de marca (sólo los colores de la paleta, Poppins/Montserrat/Bebas, escudo obligatorio, contraste, márgenes) y una
   **dirección de arte** que rota y no repite las últimas 4 (foto con bloque de color, tipográfica con foto en círculo, franja
   lateral orgánica, banda diagonal, tarjeta flotante, marco, ventana en arco, cartel de evento, grilla de íconos, borde ondulado).
   Lista de prohibidos para que no "parezca IA": degradados arcoíris, vidrio/desenfoque, neones, emojis, textos con degradado.
   - Se sanea (sin scripts, eventos ni recursos externos) y se revisa sola en un iframe sin scripts: escudo visible, ningún
     texto fuera de la placa, cortado o pisado con otro, contraste medido sobre los píxeles reales, sin emojis. Si hay
     problemas, se le pide una corrección; si siguen, se prueba otra dirección de arte; si tampoco queda prolijo, la pieza
     se queda con la plantilla (nunca se publica una pieza rota) y la propuesta de la IA queda guardada para verla.
   - Se dibuja como imagen con SVG `foreignObject` con fuentes, foto y escudo incrustados (sin librerías).
   - Con `disenoAuto: "ia"` en `config.js`, la primera pieza se diseña sola al redactar. El código se puede ver y editar.
   - Modelo: Kimi K3.1 Pro (perfil `diseno` del proxy), ~35 s y ~USD 0,07 por pieza: el de mejor resultado visual en el
     comparativo. Lo que hizo cada modelo está en [docs/modelos](docs/modelos). Costos en [docs/proxy-ia.md](docs/proxy-ia.md).
6. **Vista previa**: la nota como se ve en Muni-Land y una tarjeta por cada red elegida, con su recorte de imagen.
7. **Publicar**: revisa lo que falta, publica en la web y en las redes elegidas (simulado) y deja descargar
   la entrada para `MUNI_LAND/assets/js/data.js`, las imágenes por red y los textos. Queda en **Publicadas**.

## Conexiones

| Qué | De dónde |
|---|---|
| Contexto institucional (municipio, intendente, gabinete, noticias publicadas) | `window.SITE` de Muni-Land: `../MuniInicio/assets/js/data.js` o, si no está, la versión publicada en GitHub Pages |
| Redacción | `POST https://server.brl-vcmp.com/ia/chat` con `perfil: "redaccion"` (Claude Haiku 5.5, ~USD 0,0013 por noticia) |
| Diseño de las piezas | `POST /ia/chat` con `perfil: "diseno"` (Kimi K3.1 Pro, ~USD 0,07 por pieza) |
| Transcripción del audio | `POST /ia/transcribe` (WAV 16 kHz mono en base64) |
| Escuchar las respuestas | `POST /ia/speech` (ya existe en el proxy publicado; devuelve PCM, se le agrega cabecera WAV) |
| Fotos ilustrativas | Wikimedia Commons y Openverse, directo desde el navegador (sin clave) |

Los perfiles están en `BRLDiscord/controllers/IAProxyController.js` y **falta desplegarlos** en el servidor: el proxy publicado
los ignora (la redacción anda más lenta y el diseño con IA no llega a terminar). El gasto del día se ve en la etiqueta
"IA conectada". La clave de OpenRouter queda en el servidor. El proxy sólo acepta `grossomaximiliano.github.io` y `http://localhost:5520`.
En otro origen (o si el proxy falla) se usa el **modo local**: el texto se ordena en un borrador sin IA y el dictado usa
el reconocimiento de voz del navegador. Para forzar la IA en otro origen permitido: `index.html?ia=1`.

## Redes: qué hace falta para publicar de verdad

| Red | API | Estado |
|---|---|---|
| Facebook | Meta Graph API, token de página con `pages_manage_posts` | Viable |
| Instagram | Instagram Graph API (cuenta profesional vinculada a la página). Exige imagen; el link no es clicable en el texto | Viable |
| TikTok | Content Posting API (modo foto). La app tiene que ser aprobada por TikTok; mientras tanto sólo publica privado | Requiere aprobación |
| X (Twitter) | X API v2. Publicar requiere plan pago | Pago |

Las publicaciones reales deberían hacerse desde el servidor (los tokens no pueden ir en el front). En el front todo pasa por
`publicar()` en `assets/js/app.js`, que hoy simula cada destino.

## Archivos

```
index.html
assets/css/styles.css      Paleta y tipografías de Muni-Land
assets/js/config.js        Proxy, orígenes, redes (límites, formatos, estado de API) y formatos de imagen
assets/js/contexto.js      Carga window.SITE de Muni-Land y arma el contexto para la IA
assets/js/ia.js            Prompt de redacción, /ia/chat, /ia/transcribe, borrador local y contador de costos
assets/js/disenoHtml.js    Diseño con IA en HTML/CSS: direcciones de arte, saneado, revisión y render a imagen
assets/js/voz.js           Grabación → WAV → transcripción (o dictado del navegador)
assets/js/plantillas.js    Plantillas de diseño estilo Municipalidad (canvas), paletas, íconos y firma con el escudo
assets/js/fotos.js         Búsqueda de fotos ilustrativas con licencia libre (Wikimedia Commons, Openverse)
assets/js/imagenes.js      Piezas: foto de fondo + plantilla, carga y render por formato
assets/js/app.js           Pantalla: chat, editor, redes, imágenes, vista previa, publicación e historial
docs/proxy-ia.md           Perfiles del proxy, modelos y costos medidos
```

El borrador y el historial quedan en el `localStorage` del navegador ("Borrar datos de la demo" en Publicadas).

## Probar en local

Desde la carpeta `Municipalidad` (así también se lee el `data.js` de Muni-Land y el proxy acepta el origen):

```bash
python -m http.server 5520
```

Abrir http://localhost:5520/MUNI_NOTICIAS_ADM/
