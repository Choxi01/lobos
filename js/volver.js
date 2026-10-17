// Botón "‹ Juegos" para volver al hub Choxi Juegos, y pantalla completa en el celu.
// Es el mismo archivo en lobos y truco (y equivale a VolverAlHub.tsx de los juegos online).
(function () {
  "use strict";
  var HUB = "https://choxi01.github.io/choxi-juegos/";

  // Si llegamos desde el hub, "‹ Juegos" hace "atrás": vuelve sin apilar pantallas.
  var vinoDelHub = document.referrer.indexOf(HUB) === 0;

  var css =
    ".choxi-hub-fila{display:flex;margin:10px 0 0}" +
    ".choxi-hub{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 12px 0 6px;border-radius:999px;" +
    "background:rgba(20,17,31,.82);color:#f3eee6;text-decoration:none;font:800 13px/1 system-ui,-apple-system,'Segoe UI',sans-serif;" +
    "border:1.5px solid rgba(255,255,255,.18);box-shadow:0 3px 0 rgba(0,0,0,.35),0 8px 18px -8px rgba(0,0,0,.6);-webkit-tap-highlight-color:transparent}" +
    ".choxi-hub:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.35)}" +
    ".choxi-hub:focus-visible{outline:3px solid #ff5a36;outline-offset:3px}" +
    ".choxi-hub-flecha{font-size:18px;margin:-2px -2px 0 2px;opacity:.8}" +
    ".choxi-hub svg{width:22px;height:22px;border-radius:6px;transform:rotate(-6deg);flex:none}";
  var icono =
    '<svg viewBox="0 0 512 512" aria-hidden="true"><rect width="512" height="512" rx="112" fill="#14111f"/>' +
    '<g transform="translate(256 300)"><rect x="-78" y="-200" width="156" height="220" rx="22" fill="#17a589" transform="rotate(-22)"/>' +
    '<rect x="-78" y="-200" width="156" height="220" rx="22" fill="#ffc83d"/>' +
    '<rect x="-78" y="-200" width="156" height="220" rx="22" fill="#ff5a36" transform="rotate(22)"/></g></svg>';

  var estilo = document.createElement("style");
  estilo.textContent = css;
  document.head.appendChild(estilo);

  var fila = document.createElement("div");
  fila.className = "choxi-hub-fila";
  fila.innerHTML = '<a class="choxi-hub" href="' + HUB + '" aria-label="Volver a Choxi Juegos">' +
    '<span class="choxi-hub-flecha" aria-hidden="true">‹</span>' + icono + "<span>Juegos</span></a>";
  fila.firstChild.addEventListener("click", function (ev) {
    if (vinoDelHub && history.length > 1) { ev.preventDefault(); history.back(); }
  });
  var contenedor = document.querySelector(".wrap") || document.body;
  contenedor.insertBefore(fila, contenedor.firstChild);

  // En el celu, el primer toque pone la app en pantalla completa (una vez por carga).
  // En iPhone no existe; instalada a pantalla completa no hace falta.
  var raiz = document.documentElement;
  if (document.fullscreenEnabled && raiz.requestFullscreen &&
      window.matchMedia("(pointer: coarse)").matches &&
      !window.matchMedia("(display-mode: fullscreen)").matches) {
    var pedir = function () {
      document.removeEventListener("click", pedir, true);
      if (!document.fullscreenElement) raiz.requestFullscreen({ navigationUI: "hide" }).catch(function () {});
    };
    document.addEventListener("click", pedir, true);
  }
})();
