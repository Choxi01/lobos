// Roles del juego y reglas puras (sin pantalla, sin estado guardado).
// Para agregar o cambiar un rol, editá ROLES. Para cambiar los textos que lee el narrador, mirá js/textos.js.
(function (raiz) {
  "use strict";

  // peso: aporte al balance de la partida (positivo ayuda a la aldea, negativo a los lobos).
  const ROLES = {
    lobo: {
      nombre: "Lobo", plural: "Lobos", emoji: "🐺", equipo: "lobos", peso: -6, max: 10,
      despierta: "Todas las noches",
      desc: "Cada noche se despiertan todos los lobos juntos y eligen, en silencio, a quién se comen. De día se hacen pasar por aldeanos.",
      consejo: "No defiendas demasiado a tu compañero: si cae él, caés vos.",
    },
    aldeano: {
      nombre: "Aldeano", plural: "Aldeanos", emoji: "🧑‍🌾", equipo: "aldea", peso: 1, max: 99,
      despierta: "Nunca",
      desc: "No tiene poderes. Su arma es la palabra: observar, sospechar, debatir y votar bien.",
      consejo: "Fijate quién vota siempre igual que otro y quién cambia de opinión de golpe.",
    },
    vidente: {
      nombre: "Vidente", plural: "Videntes", emoji: "🔮", equipo: "aldea", peso: 7, max: 1,
      despierta: "Todas las noches",
      desc: "Cada noche señala a un jugador y el narrador le muestra su rol en secreto.",
      consejo: "Si te descubren, los lobos te van a buscar. Elegí bien cuándo contar lo que sabés.",
    },
    protector: {
      nombre: "Protector", plural: "Protectores", emoji: "🛡️", equipo: "aldea", peso: 3, max: 1,
      despierta: "Todas las noches, antes que los lobos",
      desc: "Cada noche elige a alguien (puede ser él mismo) y, si los lobos lo atacan, esa noche no muere. No puede proteger a la misma persona dos noches seguidas.",
      consejo: "Proteger a quien parece la vidente suele ser buena idea.",
    },
    cazador: {
      nombre: "Cazador", plural: "Cazadores", emoji: "🏹", equipo: "aldea", peso: 3, max: 1,
      despierta: "No se despierta: actúa al morir",
      desc: "Cuando muere (de noche o linchado) dispara su último tiro y se lleva a otro jugador con él.",
      consejo: "Pensá antes a quién te llevarías.",
    },
    maldito: {
      nombre: "Maldito", plural: "Malditos", emoji: "🧛", equipo: "aldea", peso: -2, max: 1,
      despierta: "Nunca (hasta que lo muerden)",
      desc: "Empieza en la aldea, pero si los lobos lo atacan no muere: se convierte en lobo y desde la noche siguiente se despierta con la manada. Mientras no lo muerdan, la vidente lo ve como aldeano.",
      consejo: "Si te convertís, nadie se entera: seguí actuando como antes.",
    },
  };

  // Orden en que se muestran los roles al configurar.
  const ORDEN = ["lobo", "vidente", "protector", "cazador", "maldito", "aldeano"];
  const ESPECIALES = ORDEN.filter(r => r !== "aldeano");

  const MIN_JUGADORES = 5;
  const MAX_JUGADORES = 30;

  function equipo(rol) { return ROLES[rol] ? ROLES[rol].equipo : "aldea"; }

  // Lobos recomendados según la cantidad de jugadores (a partir de las tablas del juego de mesa).
  function lobosRecomendados(n) {
    if (n <= 6) return 1;
    if (n <= 11) return 2;
    if (n <= 17) return 3;
    return 4 + Math.floor((n - 18) / 5);
  }

  // Desde cuántos jugadores conviene sumar cada rol especial.
  const DESDE = { vidente: 5, protector: 6, cazador: 8, maldito: 10 };

  function recomendar(n) {
    const c = { lobo: lobosRecomendados(n) };
    ESPECIALES.forEach(r => { if (r !== "lobo") c[r] = n >= DESDE[r] ? 1 : 0; });
    return c;
  }

  function totalEspeciales(cuentas) {
    return ESPECIALES.reduce((s, r) => s + (cuentas[r] || 0), 0);
  }

  function aldeanos(cuentas, n) { return Math.max(0, n - totalEspeciales(cuentas)); }

  function balance(cuentas, n) {
    let b = aldeanos(cuentas, n) * ROLES.aldeano.peso;
    ESPECIALES.forEach(r => { b += (cuentas[r] || 0) * ROLES[r].peso; });
    return b;
  }

  function textoBalance(b) {
    if (b > 8) return "Muy a favor de la aldea";
    if (b > 3) return "Un poco a favor de la aldea";
    if (b >= -3) return "Parejo";
    if (b >= -8) return "Un poco a favor de los lobos";
    return "Muy a favor de los lobos";
  }

  function validar(cuentas, n) {
    if (n < MIN_JUGADORES) return { ok: false, motivo: `Hacen falta al menos ${MIN_JUGADORES} jugadores.` };
    if (n > MAX_JUGADORES) return { ok: false, motivo: `Máximo ${MAX_JUGADORES} jugadores.` };
    const lobos = cuentas.lobo || 0;
    if (lobos < 1) return { ok: false, motivo: "Tiene que haber al menos un lobo." };
    if (lobos >= n - lobos) return { ok: false, motivo: "Hay demasiados lobos: ganarían antes de empezar." };
    if (totalEspeciales(cuentas) > n) return { ok: false, motivo: "Hay más roles que jugadores." };
    return { ok: true };
  }

  // Devuelve un rol por jugador, mezclado al azar.
  function sortear(n, cuentas, azar) {
    azar = azar || aleatorio;
    const mazo = [];
    ESPECIALES.forEach(r => { for (let k = 0; k < (cuentas[r] || 0); k++) mazo.push(r); });
    while (mazo.length < n) mazo.push("aldeano");
    mazo.length = n;
    for (let i = mazo.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [mazo[i], mazo[j]] = [mazo[j], mazo[i]];
    }
    return mazo;
  }

  function aleatorio() {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296;
    }
    return Math.random();
  }

  // ¿Quién ganó? null si la partida sigue. jugadores: [{id, rol, vivo}]
  function ganador(jugadores) {
    const vivos = jugadores.filter(j => j.vivo);
    if (!vivos.length) return "nadie";
    const lobos = vivos.filter(j => j.rol === "lobo").length;
    if (lobos === 0) return "aldea";
    if (lobos >= vivos.length - lobos) return "lobos";
    return null;
  }

  // Pasos de la noche. hay(rol): el rol está en la partida. vive(rol): alguien con ese rol sigue vivo.
  // fingir: llamar igual a los roles muertos para que nadie se dé cuenta.
  function pasosNoche(ronda, hay, vive, fingir) {
    const incluir = r => vive(r) || (fingir && hay(r));
    const p = ["anochecer"];
    if (incluir("vidente")) p.push("vidente");
    if (incluir("protector")) p.push("protector");
    p.push("lobos");
    return p;
  }

  const api = {
    ROLES, ORDEN, ESPECIALES, MIN_JUGADORES, MAX_JUGADORES, DESDE,
    equipo, lobosRecomendados, recomendar, totalEspeciales, aldeanos, balance, textoBalance,
    validar, sortear, ganador, pasosNoche,
  };
  raiz.LoboRoles = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
