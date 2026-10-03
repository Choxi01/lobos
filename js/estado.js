// Estado de la partida y acciones del narrador.
// Cada acción recibe (S, datos), modifica S y devuelve {ok:true} o {ok:false, motivo}.
// crearJuego() agrega "deshacer" guardando una copia del estado antes de cada acción.
(function (raiz) {
  "use strict";
  const R = raiz.LoboRoles || (typeof require !== "undefined" ? require("./roles.js") : null);

  const VERSION = 1;
  const MAX_DESHACER = 80;
  const clonar = o => JSON.parse(JSON.stringify(o));
  const NO = motivo => ({ ok: false, motivo });
  const SI = { ok: true };

  const CAUSAS = {
    lobos: "atacado por los lobos",
    bruja: "envenenado por la bruja",
    linchado: "linchado por el pueblo",
    cazador: "baleado por el cazador",
    pena: "murió de pena",
    narrador: "sacado por el narrador",
  };

  function opcionesPorDefecto() {
    return { revelar: true, repetirProtegido: false, fingirMuertos: true, debate: 180 };
  }

  function configPorDefecto() {
    return { jugadores: [], cuentas: R.recomendar(8), auto: true, opciones: opcionesPorDefecto() };
  }

  function nocheVacia() {
    return { cupido: null, vidente: null, protegido: null, victima: null, curar: false, veneno: null };
  }

  function nuevaPartida(cfg, azar) {
    const nombres = cfg.jugadores.slice();
    const roles = R.sortear(nombres.length, cfg.cuentas, azar);
    return {
      v: VERSION,
      cfg: clonar({ jugadores: nombres, cuentas: cfg.cuentas, opciones: Object.assign(opcionesPorDefecto(), cfg.opciones || {}) }),
      fase: "reparto",          // reparto → noche ⇄ dia → fin
      jugadores: nombres.map((nombre, id) => ({ id, nombre, rol: roles[id], vivo: true, visto: false, muerte: null })),
      ronda: 0,
      pasos: [], i: 0,          // pasos de la noche actual
      etapa: null, retomar: null, // etapa del día: anuncio, cazador, disparo, debate, votacion, veredicto
      noche: nocheVacia(),
      mem: { ultimoProtegido: null, vida: true, muerte: true, ancianoHerido: false, enamorados: null, tontoRevelado: false },
      anuncio: [],              // muertes recién ocurridas: [{id, causa}]
      linchado: null,           // {id|null, tonto}
      cazadores: [],            // cazadores muertos que todavía no dispararon
      registro: [],
      ganador: null,
    };
  }

  /* ---------- Utilidades ---------- */
  const vivos = S => S.jugadores.filter(j => j.vivo);
  const conRol = (S, rol) => S.jugadores.filter(j => j.rol === rol);
  const actores = (S, rol) => conRol(S, rol).filter(j => j.vivo);
  const nombre = (S, id) => S.jugadores[id].nombre;
  const rolDe = (S, id) => R.ROLES[S.jugadores[id].rol].nombre;
  const nombres = lista => lista.map(j => j.nombre).join(" y ");
  const vivo = (S, id) => id != null && S.jugadores[id] && S.jugadores[id].vivo;

  function log(S, texto) {
    S.registro.push({ r: S.ronda, f: S.fase, t: texto });
  }

  function pasoActual(S) { return S.fase === "noche" ? S.pasos[S.i] : null; }

  function matar(S, id, causa) {
    const j = S.jugadores[id];
    if (!j || !j.vivo) return;
    j.vivo = false;
    j.muerte = { ronda: S.ronda, fase: S.fase, causa };
    S.anuncio.push({ id, causa });
    log(S, `☠ ${j.nombre} (${R.ROLES[j.rol].nombre}): ${CAUSAS[causa]}.`);
    if (j.rol === "cazador") S.cazadores.push(id);
    const e = S.mem.enamorados;
    if (e && e.includes(id)) matar(S, e[0] === id ? e[1] : e[0], "pena");
  }

  function hayGanador(S) { return R.ganador(S.jugadores, S.mem.enamorados); }

  /* ---------- Noche ---------- */
  function empezarNoche(S) {
    S.fase = "noche";
    S.ronda += 1;
    S.noche = nocheVacia();
    S.anuncio = [];
    S.linchado = null;
    S.etapa = null;
    S.i = 0;
    const hay = rol => conRol(S, rol).length > 0;
    const vive = rol => actores(S, rol).length > 0;
    S.pasos = R.pasosNoche(S.ronda, hay, vive, S.cfg.opciones.fingirMuertos);
  }

  // Qué hace cada paso de la noche al confirmarlo.
  const PASOS = {
    anochecer() { return SI; },

    cupido(S, d) {
      if (!actores(S, "cupido").length) return SI;
      const ids = (d.ids || []).filter(id => vivo(S, id));
      if (ids.length !== 2 || ids[0] === ids[1]) return NO("Elegí a los dos enamorados.");
      S.mem.enamorados = ids.slice();
      S.noche.cupido = ids.slice();
      log(S, `💘 Cupido (${nombres(actores(S, "cupido"))}) enamoró a ${nombre(S, ids[0])} y ${nombre(S, ids[1])}.`);
      return SI;
    },

    enamorados() { return SI; },

    vidente(S, d) {
      const v = actores(S, "vidente");
      if (!v.length) return SI;
      if (!vivo(S, d.id)) return NO("Tocá a quién señaló la vidente.");
      if (v.some(j => j.id === d.id)) return NO("La vidente no puede mirarse a sí misma.");
      S.noche.vidente = d.id;
      log(S, `🔮 La vidente (${nombres(v)}) miró a ${nombre(S, d.id)}: ${rolDe(S, d.id)}.`);
      return SI;
    },

    protector(S, d) {
      const p = actores(S, "protector");
      if (!p.length) return SI;
      if (!vivo(S, d.id)) return NO("Tocá a quién protege.");
      if (!S.cfg.opciones.repetirProtegido && d.id === S.mem.ultimoProtegido)
        return NO("No puede proteger a la misma persona dos noches seguidas.");
      S.noche.protegido = d.id;
      log(S, `🛡️ El protector (${nombres(p)}) cuidó a ${nombre(S, d.id)}.`);
      return SI;
    },

    lobos(S, d) {
      const l = actores(S, "lobo");
      if (!vivo(S, d.id)) return NO("Tocá a quién atacan los lobos.");
      if (S.jugadores[d.id].rol === "lobo") return NO("Los lobos no se pueden atacar entre ellos.");
      S.noche.victima = d.id;
      log(S, `🐺 Los lobos (${nombres(l)}) atacaron a ${nombre(S, d.id)}.`);
      return SI;
    },

    bruja(S, d) {
      const b = actores(S, "bruja");
      if (!b.length) return SI;
      const curar = !!d.curar;
      const veneno = d.veneno == null ? null : d.veneno;
      if (curar && !S.mem.vida) return NO("Ya usó la poción de vida.");
      if (curar && S.noche.victima == null) return NO("No hay a quién curar.");
      if (veneno != null && !S.mem.muerte) return NO("Ya usó la poción de muerte.");
      if (veneno != null && !vivo(S, veneno)) return NO("Ese jugador ya está muerto.");
      S.noche.curar = curar;
      S.noche.veneno = veneno;
      if (curar) { S.mem.vida = false; log(S, `🧪 La bruja (${nombres(b)}) usó la poción de vida en ${nombre(S, S.noche.victima)}.`); }
      if (veneno != null) { S.mem.muerte = false; log(S, `🧪 La bruja (${nombres(b)}) envenenó a ${nombre(S, veneno)}.`); }
      if (!curar && veneno == null) log(S, `🧪 La bruja (${nombres(b)}) no usó pociones.`);
      return SI;
    },
  };

  function amanecer(S) {
    const n = S.noche;
    S.anuncio = [];
    S.mem.ultimoProtegido = n.protegido;
    const v = n.victima;
    if (v != null && vivo(S, v)) {
      if (n.protegido === v) log(S, `🛡️ ${nombre(S, v)} estaba protegido y se salvó.`);
      else if (n.curar) log(S, `🧪 ${nombre(S, v)} se salvó gracias a la bruja.`);
      else if (S.jugadores[v].rol === "anciano" && !S.mem.ancianoHerido) {
        S.mem.ancianoHerido = true;
        log(S, `👴 ${nombre(S, v)} es el anciano: resistió el ataque (la próxima no).`);
      } else matar(S, v, "lobos");
    }
    if (n.veneno != null) matar(S, n.veneno, "bruja");
    S.fase = "dia";
    S.etapa = "anuncio";
    if (!S.anuncio.length) log(S, "☀ Amaneció sin muertos.");
  }

  /* ---------- Día ---------- */
  // Después de una muerte: primero disparan los cazadores, después se ve si alguien ganó.
  function seguir(S, destino) {
    if (S.cazadores.length) { S.etapa = "cazador"; S.retomar = destino; return; }
    const g = hayGanador(S);
    if (g) {
      S.fase = "fin"; S.etapa = null; S.ganador = g;
      log(S, `🏁 Fin de la partida: ${({ lobos: "ganan los lobos", aldea: "gana la aldea", enamorados: "ganan los enamorados", nadie: "no queda nadie" })[g]}.`);
      return;
    }
    if (destino === "noche") empezarNoche(S);
    else S.etapa = destino;
  }

  const ETAPAS = {
    anuncio(S) { seguir(S, "debate"); return SI; },

    cazador(S, d) {
      const tirador = S.cazadores[0];
      if (d.nadie) {
        S.cazadores.shift();
        S.anuncio = [];
        log(S, `🏹 ${nombre(S, tirador)} no disparó.`);
      } else {
        if (!vivo(S, d.id)) return NO("Tocá a quién le dispara el cazador.");
        S.cazadores.shift();
        S.anuncio = [];
        log(S, `🏹 ${nombre(S, tirador)} disparó a ${nombre(S, d.id)}.`);
        matar(S, d.id, "cazador");
      }
      S.disparo = { tirador, id: d.nadie ? null : d.id };
      S.etapa = "disparo";
      return SI;
    },

    disparo(S) { seguir(S, S.retomar); return SI; },

    debate(S) { S.etapa = "votacion"; return SI; },

    votacion(S, d) {
      S.anuncio = [];
      if (d.nadie) {
        S.linchado = { id: null };
        log(S, "⚖ El pueblo no linchó a nadie.");
      } else {
        if (!vivo(S, d.id)) return NO("Tocá al más votado, o elegí «Nadie».");
        const j = S.jugadores[d.id];
        if (j.rol === "tonto" && !S.mem.tontoRevelado) {
          S.mem.tontoRevelado = true;
          S.linchado = { id: d.id, tonto: true };
          log(S, `⚖ Votaron a ${j.nombre}, pero era el Tonto del pueblo: se salva y ya no vota.`);
        } else {
          S.linchado = { id: d.id };
          log(S, `⚖ El pueblo votó a ${j.nombre}.`);
          matar(S, d.id, "linchado");
        }
      }
      S.etapa = "veredicto";
      return SI;
    },

    veredicto(S) { seguir(S, "noche"); return SI; },
  };

  /* ---------- Acciones ---------- */
  const acciones = {
    verRol(S, d) {
      if (S.fase !== "reparto") return NO("El reparto ya terminó.");
      const j = S.jugadores[d.id];
      if (!j) return NO("No existe ese jugador.");
      j.visto = true;
      return SI;
    },

    cambiarRol(S, d) {
      if (S.fase !== "reparto") return NO("Los roles se cambian solo antes de empezar.");
      if (!R.ROLES[d.rol] || !S.jugadores[d.id]) return NO("Rol no válido.");
      S.jugadores[d.id].rol = d.rol;
      return SI;
    },

    resortear(S, d) {
      if (S.fase !== "reparto") return NO("Ya empezó la partida.");
      const roles = R.sortear(S.jugadores.length, S.cfg.cuentas, d && d.azar);
      S.jugadores.forEach((j, i) => { j.rol = roles[i]; j.visto = false; });
      return SI;
    },

    empezar(S) {
      if (S.fase !== "reparto") return NO("La partida ya empezó.");
      if (!S.jugadores.some(j => j.rol === "lobo")) return NO("No hay ningún lobo.");
      log(S, "🎴 Roles: " + S.jugadores.map(j => `${j.nombre} ${R.ROLES[j.rol].emoji}`).join(", ") + ".");
      empezarNoche(S);
      return SI;
    },

    // Botón "Siguiente": confirma el paso de la noche o la etapa del día.
    avanzar(S, d) {
      d = d || {};
      if (S.fase === "noche") {
        const p = pasoActual(S);
        const r = PASOS[p](S, d);
        if (!r.ok) return r;
        S.i += 1;
        if (S.i >= S.pasos.length) amanecer(S);
        return SI;
      }
      if (S.fase === "dia") return ETAPAS[S.etapa](S, d);
      return NO("No hay nada para avanzar.");
    },

    // Correcciones manuales del narrador.
    sacar(S, d) {
      if (!vivo(S, d.id)) return NO("Ya está muerto.");
      if (S.fase === "reparto" || S.fase === "fin") return NO("Solo durante la partida.");
      const j = S.jugadores[d.id];
      j.vivo = false;
      j.muerte = { ronda: S.ronda, fase: S.fase, causa: "narrador" };
      log(S, `✋ El narrador sacó a ${j.nombre}.`);
      return SI;
    },

    revivir(S, d) {
      const j = S.jugadores[d.id];
      if (!j || j.vivo) return NO("Está vivo.");
      if (S.fase === "reparto" || S.fase === "fin") return NO("Solo durante la partida.");
      j.vivo = true; j.muerte = null;
      S.cazadores = S.cazadores.filter(id => id !== d.id);
      log(S, `✋ El narrador revivió a ${j.nombre}.`);
      return SI;
    },
  };

  /* ---------- Juego con deshacer ---------- */
  function crearJuego(guardado) {
    let S = guardado && guardado.S && guardado.S.v === VERSION ? guardado.S : null;
    let pila = S && Array.isArray(guardado.pila) ? guardado.pila : [];
    return {
      get S() { return S; },
      get puedeDeshacer() { return pila.length > 0; },
      empezar(cfg) { if (S) pila.push(clonar(S)); S = nuevaPartida(cfg); recortar(); },
      revancha() {
        pila.push(clonar(S));
        S = nuevaPartida({ jugadores: S.cfg.jugadores, cuentas: S.cfg.cuentas, opciones: S.cfg.opciones });
        recortar();
      },
      hacer(nombreAccion, datos) {
        const copia = clonar(S);
        const r = acciones[nombreAccion](S, datos || {});
        if (r.ok) { pila.push(copia); recortar(); } else { S = copia; }
        return r;
      },
      deshacer() { if (pila.length) S = pila.pop(); },
      exportar() { return { S, pila }; },
    };
    function recortar() { while (pila.length > MAX_DESHACER) pila.shift(); }
  }

  const api = {
    VERSION, CAUSAS, opcionesPorDefecto, configPorDefecto, nuevaPartida, acciones, crearJuego,
    pasoActual, actores, vivos, hayGanador,
  };
  raiz.LoboEstado = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
