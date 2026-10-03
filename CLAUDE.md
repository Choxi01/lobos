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
| `js/estado.js` | Estado y acciones `(S, datos) → {ok}|{ok:false,motivo}`. `avanzar` confirma el paso de la noche o la etapa del día. `crearJuego()` agrega deshacer (máx. 80) |
| `js/textos.js` | Frases para leer en voz alta (`NOCHE`, `DIA`, `FIN`). Editables |
| `js/app.js` | Render completo con innerHTML + delegación de eventos por `data-a`. La selección de jugadores del paso actual vive en `sel` (no en el estado) |
| `css/estilos.css` | Tema noche (por defecto) y día (`body[data-fase="dia"]`). Clase `.secreto` se desenfoca en modo discreto |

- `localStorage`: `lobos-v1` (partida + deshacer) y `lobos-config` (jugadores, roles y opciones de la última vez).

## Flujo
reparto → noche (anochecer, cupido*, enamorados*, vidente, protector, lobos, bruja; *solo noche 1) →
día (anuncio → [cazador → disparo] → debate → votación → veredicto → [cazador → disparo]) → noche…
Después de cada muerte disparan los cazadores pendientes y se revisa si alguien ganó.

## Reglas decididas
- Lobos ganan cuando son tantos como el resto. Aldea gana sin lobos. Enamorados de distinto equipo ganan si quedan solos.
- Protector no repite (configurable). Bruja: 1 poción de vida y 1 de muerte, puede usar las dos la misma noche.
- Anciano resiste el primer ataque de lobos. Tonto del pueblo se salva del primer linchamiento y deja de votar.
- Por defecto se llama a los roles muertos para disimular, y se revela el rol de cada muerto.

## Ideas pendientes
- Más roles (niña, lobo blanco, alcalde con voto doble, ladrón).
- Contador de votos por jugador. Narración con voz (speechSynthesis).
