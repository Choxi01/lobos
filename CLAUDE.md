# Narrador de Lobos — notas para Claude Code

App web estática (sin build, sin dependencias) para narrar partidas de Lobos (Werewolf/Mafia).
Publicada con **GitHub Pages** desde `main` (carpeta raíz) e instalable como PWA. Uso privado con amigos.
Hermana de la app de truco: misma estructura, mismas tipografías.
Todo el texto de la interfaz, los commits y las respuestas van en **español rioplatense** (voseo).

## Cómo trabajar en este repo
1. `git pull` antes de tocar nada.
2. La lógica va en `js/roles.js` (puro) y `js/estado.js` (acciones), con prueba en `tests/reglas.test.js`.
3. `node tests/reglas.test.js` (o `npm test`) tiene que dar todo bien.
4. Si se agrega un archivo, sumarlo a `ARCHIVOS` en `sw.js`.
5. Commit corto en español, en presente (`Agrega rol de la niña`). `git push` a `main`.
6. Subir `VERSION` en `js/estado.js` solo si cambia la forma del estado guardado.

## Arquitectura
| Archivo | Qué tiene |
|---|---|
| `js/roles.js` | `ROLES` (nombre, emoji, equipo, peso para el balance, descripción), `recomendar(n)`, `validar`, `sortear`, `ganador`, `pasosNoche`. Expone `window.LoboRoles` |
| `js/estado.js` | Estado y acciones `(S, datos) → {ok}|{ok:false,motivo}`. `avanzar` confirma el paso de la noche o la etapa del día. `crearJuego()` agrega deshacer (máx. 80). `resultado`/`marcador` para el marcador entre partidas |
| `js/textos.js` | Frases para leer en voz alta (`NOCHE`, `DIA`, `FIN`). Editables |
| `js/app.js` | Render completo con innerHTML + delegación de eventos por `data-a`. La selección del paso actual (y los votos del contador) vive en `sel`, no en el estado |
| `css/estilos.css` | Tema noche (por defecto), día (`body[data-fase="dia"]`) y noche oscura (`body[data-fase="oscuro"]`). Clase `.secreto` se desenfoca en modo discreto |

- `localStorage`: `lobos-v1` (partida + deshacer), `lobos-config` (jugadores, roles y opciones de la última vez),
  `lobos-marcador` (partidas terminadas, por `id` de partida) y `lobos-reloj` (cuenta regresiva del debate).

## Flujo
reparto → noche (anochecer, vidente, protector, lobos) →
día (anuncio → [cazador → disparo] → debate → votación → veredicto → [cazador → disparo]) → noche…
Después de cada muerte (también si el narrador saca a alguien) disparan los cazadores pendientes y se revisa si alguien ganó.

## Reglas decididas
- Lobos ganan cuando son tantos como el resto. Aldea gana sin lobos.
- Protector no repite (configurable).
- Primera noche tranquila (opción, apagada por defecto): los lobos solo se reconocen y no atacan.
- Vidente solo pregunta «¿es lobo?»: pulgar arriba si es lobo, pulgar abajo si no (no ve el rol).
- Maldito: si lo atacan los lobos (sin protección) no muere, pasa a `rol: "lobo"` con `origen: "maldito"` y se despierta con la manada desde la noche siguiente.
- Votación: contador por jugador; con empate, segunda vuelta entre los empatados o decide la mesa.
- Se sacaron bruja, cupido, anciano y tonto del pueblo (no se usaban); están en el historial de git.
- Por defecto se llama a los roles muertos para disimular, y se revela el rol de cada muerto.

## Ideas pendientes
- Más roles: secuaz, lobo cachorro, alcalde (voto doble, va con el contador), aprendiz de vidente, bufón.
- Narración con voz (speechSynthesis), letra grande (A+), reparto en cadena (pasar directo al siguiente jugador),
  debate proporcional a los vivos.

## Dominio compartido
Truco (`/TrucoApp/`) y lobos (`/lobos/`) viven en `choxi01.github.io`: comparten `localStorage` y la Cache Storage.
Por eso las claves llevan prefijo (`lobos-*`) y `sw.js` solo borra cachés que empiezan con `lobos`. Nunca borrar datos del sitio entero.
