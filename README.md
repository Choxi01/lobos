# Narrador de Lobos

**👉 Abrir la app: https://choxi01.github.io/lobos/**

App para narrar partidas de **Lobos** (Werewolf / Mafia) desde el celu o la compu.
Cargás a los jugadores, te recomienda cuántos lobos y qué roles usar, reparte los roles
en secreto pasando el celu, y después te va guiando noche por noche y día por día:
qué leer en voz alta, quién se despierta, a quién eligió cada uno y quién murió.
Funciona sin internet una vez abierta.

## Roles incluidos
🐺 Lobo · 🧑‍🌾 Aldeano · 🔮 Vidente · 🛡️ Protector · 🏹 Cazador · 🧛 Maldito

Además: contador de votos con segunda vuelta, marcador entre partidas y pantalla oscura de noche.

## Usarla en el celu
1. Abrí el link en **Safari** (iPhone) o **Chrome** (Android).
2. Compartir → **Agregar a pantalla de inicio**.
3. Abrila una vez con internet para que quede guardada.

## Personalizarla
| Quiero cambiar… | Archivo |
|---|---|
| Lo que lee el narrador | `js/textos.js` |
| Roles, descripciones, cuántos lobos se recomiendan | `js/roles.js` |
| Colores (noche y día) | `css/estilos.css` |

## Archivos
| Archivo | Qué tiene |
|---|---|
| `index.html` | Estructura de las pantallas |
| `css/estilos.css` | Colores de noche y de día, tipografías, diseño |
| `js/roles.js` | Roles, recomendaciones, balance, quién gana, orden de la noche |
| `js/estado.js` | La partida: pasos de la noche, día, votación, muertes, deshacer |
| `js/textos.js` | Las frases para leer en voz alta |
| `js/app.js` | Dibuja la pantalla y conecta los botones |
| `sw.js` | Modo offline |
| `tests/reglas.test.js` | Pruebas: `node tests/reglas.test.js` |
| `fonts/` | Tipografías Alegreya (licencia OFL, ver `fonts/OFL.txt`) |
