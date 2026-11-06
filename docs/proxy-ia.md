# Proxy de IA (BRLDiscord) para Noticias ADM

Noticias ADM usa el mismo proxy que MuniPoc y Muni-Niño (`https://server.brl-vcmp.com`, controlador
`BRLDiscord/controllers/IAProxyController.js`). La clave de OpenRouter queda en el servidor.

| Ruta | Para qué |
|---|---|
| `POST /ia/chat` con `perfil: "redaccion"` | Redactar la noticia, los textos de redes y los textos de la pieza |
| `POST /ia/chat` con `perfil: "diseno"` | Escribir el HTML/CSS de la pieza gráfica |
| `POST /ia/transcribe` | Pasar a texto el audio dictado |

No se usa ningún modelo de imágenes: el diseño es HTML/CSS escrito por un modelo de texto y dibujado en el
navegador sobre fotos reales (subidas por el equipo o de bancos libres).

## Perfiles de `/ia/chat`

El front sólo manda el nombre del perfil; el modelo y las opciones los fija el servidor (`PERFILES_CHAT`).
El perfil por defecto (`chat`) sigue igual porque lo usan MuniPoc y Muni-Niño.

| Perfil | Modelo | Opciones |
|---|---|---|
| `chat` (por defecto) | `~z-ai/glm-flash-latest` | razonamiento activado (sin cambios) |
| `redaccion` | `anthropic/claude-haiku-5.5` | sin razonamiento, `max_tokens` 4000, devuelve el costo (`usage`) |
| `diseno` | `moonshotai/kimi-k3.1-pro` | sin razonamiento, `max_tokens` 8000, devuelve el costo (`usage`) |

El proxy viejo ignora `perfil` y responde con el modelo por defecto: la redacción funciona igual (más lenta),
pero el diseño con IA no llega a terminar (tarda más de 3 minutos y el servidor corta la conexión).
**Hay que desplegar la versión nueva del controlador.**

## Costos medidos (noviembre 2026, precios de OpenRouter)

Medidos con el costo real que devuelve OpenRouter, sobre 4 noticias de Muni-Land:

- Redacción con Claude Haiku 5.5: 6 a 8 s y unos USD 0,0013 por noticia (antes ~50 s con el modelo por defecto).
- Diseño: comparativo con las mismas 4 piezas (ver `comparativo-modelos-diseno.jpg`, una fila por modelo):

| Modelo | Piezas prolijas | USD por pieza | Segundos |
|---|---|---|---|
| google/gemini-2.5-flash | 4 de 4 | 0,011 | 17 |
| google/gemini-3.1-flash-lite | 3 de 4 | 0,0055 | 11 |
| anthropic/claude-haiku-5.5 | 3 de 4 | 0,0036 | 20 |
| openai/gpt-6-luna | 3 de 4 | 0,0025 | 27 |

Segundo comparativo, con otras 4 piezas idénticas para los tres (ver `comparativo-gemini-kimi-glm.jpg`):

| Modelo | Piezas prolijas | USD por pieza | Segundos | Notas |
|---|---|---|---|---|
| google/gemini-2.5-flash | 4 de 4 | 0,017 | 27 | Confiable; a veces ordena raro el título resaltado |
| **moonshotai/kimi-k3.1-pro** (elegido) | 3 de 4 | 0,072 | 34 | El de mejor nivel visual; HTML largo y más correcciones |
| z-ai/glm-5.3 | 3 de 4 | 0,012 | 41 (7 a 133) | Muy buen nivel y barato, pero el razonamiento es obligatorio: a veces tarda 2 minutos |

Criterio: el texto lo hace un modelo económico (Haiku 5.5) y el diseño el de mejor resultado visual (Kimi K3.1 Pro).
Total por publicación (redacción + 1 pieza diseñada): **~USD 0,075**. 300 publicaciones por mes ≈ USD 22.
Para bajar el costo, cambiar `MODELO_DISENO` por `google/gemini-2.5-flash` (~USD 0,017) o `z-ai/glm-5.3`
(~USD 0,012; en ese caso hay que permitirle razonamiento con `effort: "low"`, porque no se puede apagar).
Las piezas que no salgan prolijas quedan automáticamente con la plantilla, que no tiene costo.
Las piezas de cada modelo están en `docs/modelos/`.

La página muestra el gasto del día en la etiqueta "IA conectada" (pasando el mouse se ve el detalle).

## Probar sin desplegar

Un servidor mínimo que monte sólo `crearRouterIA` en otro puerto (por ejemplo 5531) y, en la consola de la
página, `NOT_CONFIG.apiBase = "http://localhost:5531"`. `http://localhost:5520` ya está en los orígenes permitidos.
