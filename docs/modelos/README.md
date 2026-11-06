# Piezas diseñadas por cada modelo

Diseños en HTML/CSS de las mismas noticias de Muni-Land (Lengua de Señas, Congreso de Ecoturismo, Dengue y
Cementerio), hechos por distintos modelos con el mismo prompt, las mismas reglas de marca y la misma revisión
automática. Una carpeta por modelo; cada archivo es `rondaN-pieza.jpg`. Las imágenes son recortes de las hojas
comparativas (`../comparativo-modelos-diseno.jpg` y `../comparativo-gemini-kimi-glm.jpg`), en baja resolución.

- **Ronda 1**: Claude Haiku 5.5, Gemini 2.5 Flash, Gemini 3.1 Flash Lite y GPT-6 Luna, sobre los mismos textos.
- **Ronda 2**: Gemini 2.5 Flash, Kimi K3.1 Pro y GLM-5.3, sobre otros textos (otra redacción de las mismas noticias).

La dirección de arte (composición) se elige al azar en cada diseño, así que la comparación es de nivel general,
no de la misma composición exacta.

| Modelo | Ronda | Prolijas | USD por pieza | Segundos | Piezas marcadas con errores |
|---|---|---|---|---|---|
| **Kimi K3.1 Pro** (elegido para diseño) | 2 | 3 de 4 | 0,072 | 34 | iluminacion-cementerio |
| GLM-5.3 | 2 | 3 de 4 | 0,012 | 41 (7 a 133) | congreso-ecoturismo |
| Gemini 2.5 Flash | 1 y 2 | 4 de 4 y 4 de 4 | 0,011 y 0,017 | 17 y 27 | — |
| Gemini 3.1 Flash Lite | 1 | 3 de 4 | 0,0055 | 11 | iluminacion-cementerio |
| Claude Haiku 5.5 | 1 | 3 de 4 | 0,0036 | 20 | prevencion-dengue |
| GPT-6 Luna | 1 | 3 de 4 | 0,0025 | 27 | iluminacion-cementerio |

"Marcada con errores" = la revisión encontró textos fuera de la placa, pisados o casi ilegibles. En la app esas
piezas no se publican: quedan con la plantilla y la propuesta de la IA se puede ver o pedir otra.

Costos reales informados por OpenRouter (noviembre 2026), incluyendo la corrección automática cuando hizo falta.
