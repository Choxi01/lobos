// Pantalla: dibuja todo de nuevo en cada acción y conecta los botones (delegación de eventos).
(function () {
  "use strict";
  const R = window.LoboRoles, E = window.LoboEstado, T = window.LoboTextos;
  const CLAVE = "lobos-v1", CLAVE_CFG = "lobos-config", CLAVE_MAR = "lobos-marcador", CLAVE_RELOJ = "lobos-reloj";
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  function leer(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function escribir(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  let juego = E.crearJuego(leer(CLAVE));
  let cfg = Object.assign(E.configPorDefecto(), leer(CLAVE_CFG) || {});
  cfg.opciones = Object.assign(E.opcionesPorDefecto(), cfg.opciones || {});
  let tab = "narrador";
  let enConfig = !juego.S;
  let sel = selVacia();
  let velo = null;           // reparto: {id, ver}
  let discreto = false;
  const reloj = Object.assign({ clave: null, total: 0, resta: 0, corre: false, fin: 0 }, leer(CLAVE_RELOJ) || {});
  const mar = Object.assign({ partidas: {} }, leer(CLAVE_MAR) || {}); // marcador: {partidas: {id: resultado}}

  // votos: {id: cantidad} del contador. segunda: ids que van a la segunda vuelta. mano: el narrador eligió tocando.
  function selVacia() { return { ids: [], nadie: false, mano: false, votos: {}, segunda: null }; }
  const S = () => juego.S;
  const guardar = () => escribir(CLAVE, juego.exportar());
  const guardarCfg = () => escribir(CLAVE_CFG, cfg);
  const guardarReloj = () => escribir(CLAVE_RELOJ, reloj);
  const rol = r => R.ROLES[r];
  const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

  function hacer(accion, datos) {
    const r = juego.hacer(accion, datos);
    if (!r.ok) { aviso(r.motivo); return r; }
    sel = selVacia();
    guardar();
    render();
    if (accion === "avanzar" || accion === "empezar") window.scrollTo(0, 0);
    return r;
  }

  /* ---------- Aviso flotante ---------- */
  let avisoT = null;
  function aviso(texto) {
    const t = $("toast");
    t.textContent = texto; t.hidden = false;
    clearTimeout(avisoT);
    avisoT = setTimeout(() => (t.hidden = true), 2600);
  }

  /* ---------- Navegación ---------- */
  function irA(nuevo) {
    tab = nuevo;
    document.querySelectorAll(".tabs button").forEach(b => b.setAttribute("aria-selected", String(b.dataset.tab === tab)));
    $("config").hidden = !(tab === "narrador" && enConfig);
    $("narrador").hidden = !(tab === "narrador" && !enConfig);
    ["jugadores", "roles", "registro"].forEach(id => ($(id).hidden = tab !== id));
    if (history.replaceState) history.replaceState(null, "", "#" + tab);
    window.scrollTo(0, 0);
  }

  /* ======================================================================
     CONFIGURACIÓN
     ====================================================================== */
  function renderConfig() {
    const n = cfg.jugadores.length;
    if (cfg.auto) cfg.cuentas = R.recomendar(Math.max(n, R.MIN_JUGADORES));
    $("cuentaJug").textContent = n ? `· ${n}` : "";
    $("listaJug").innerHTML = n
      ? cfg.jugadores.map((nom, i) => `<span class="chip-jug">${esc(nom)}<button data-a="quitarJug" data-i="${i}" aria-label="Quitar a ${esc(nom)}">×</button></span>`).join("") +
        `<button class="link" data-a="borrarJug">Borrar todos</button>`
      : `<p class="vacio">Agregá a los que van a jugar (sin contar al narrador). Podés pegar varios nombres separados por coma.</p>`;

    const L = R.lobosRecomendados(Math.max(n, 1));
    $("recomendacion").innerHTML = n >= R.MIN_JUGADORES
      ? `<p class="reco">Para <b>${n} jugadores</b> se recomiendan <b>${plural(L, "lobo", "lobos")}</b>.
         ${cfg.auto ? `<span class="tenue">Los roles se ajustan solos a la cantidad.</span>` : `<button class="link" data-a="recomendar">Usar la recomendación</button>`}</p>`
      : `<p class="reco tenue">Mínimo ${R.MIN_JUGADORES} jugadores. Mientras tanto, se muestra una mesa de ${R.MIN_JUGADORES}.</p>`;

    const nn = Math.max(n, R.MIN_JUGADORES);
    $("listaRoles").innerHTML = R.ORDEN.map(r => {
      const d = rol(r);
      const cant = r === "aldeano" ? R.aldeanos(cfg.cuentas, nn) : (cfg.cuentas[r] || 0);
      const control = r === "aldeano"
        ? `<span class="cant solo">${cant}</span>`
        : `<button class="paso-btn" data-a="menos" data-rol="${r}" ${cant <= 0 ? "disabled" : ""} aria-label="Uno menos">−</button>
           <span class="cant">${cant}</span>
           <button class="paso-btn" data-a="mas" data-rol="${r}" ${cant >= d.max ? "disabled" : ""} aria-label="Uno más">+</button>`;
      return `<div class="fila-rol ${cant ? "" : "apagado"} eq-${d.equipo}">
        <span class="emoji">${d.emoji}</span>
        <div class="txt"><b>${d.nombre}</b><small>${r === "aldeano" ? "El resto de los jugadores" : esc(d.despierta)}</small></div>
        <div class="stepper">${control}</div></div>`;
    }).join("");

    const b = R.balance(cfg.cuentas, nn);
    const pos = Math.max(0, Math.min(100, 50 + b * 3));
    $("balance").innerHTML = `<div class="balance">
      <div class="balance-txt"><span>Balance</span><b>${R.textoBalance(b)}</b></div>
      <div class="balance-barra"><span class="lado l">🐺</span><div class="pista"><i style="left:${pos}%"></i></div><span class="lado a">🏘️</span></div></div>`;

    const o = cfg.opciones;
    const sino = (k, titulo, ayuda) => `<div class="opcion"><div><b>${titulo}</b><small>${ayuda}</small></div>
      <div class="seg"><button data-a="opt" data-k="${k}" data-v="1" aria-pressed="${!!o[k]}">Sí</button><button data-a="opt" data-k="${k}" data-v="0" aria-pressed="${!o[k]}">No</button></div></div>`;
    $("opciones").innerHTML =
      sino("revelar", "Revelar el rol al morir", "El narrador dice qué era cada muerto.") +
      sino("fingirMuertos", "Llamar a los roles muertos", "Se los llama igual de noche para que nadie sepa quién murió.") +
      sino("repetirProtegido", "El protector puede repetir", "Proteger a la misma persona dos noches seguidas.") +
      sino("oscuro", "Pantalla oscura de noche", "Fondo negro y letra tenue para que el brillo no delate nada.") +
      `<div class="opcion"><div><b>Tiempo de debate</b><small>Con cuenta regresiva durante el día.</small></div>
        <div class="seg">${[120, 180, 300, 480].map(s => `<button data-a="opt" data-k="debate" data-v="${s}" aria-pressed="${o.debate === s}">${s / 60}′</button>`).join("")}</div></div>`;

    const v = R.validar(cfg.cuentas, n);
    $("errorConfig").hidden = v.ok || n === 0;
    $("errorConfig").textContent = v.ok ? "" : v.motivo;
    $("volver").hidden = !S();
  }

  function agregarJugadores(texto) {
    const nuevos = texto.split(/[,\n;]+/).map(s => s.trim().replace(/\s+/g, " ")).filter(Boolean);
    let repetidos = 0;
    nuevos.forEach(nom => {
      nom = nom.slice(0, 16);
      if (cfg.jugadores.some(x => x.toLowerCase() === nom.toLowerCase())) { repetidos++; return; }
      if (cfg.jugadores.length < R.MAX_JUGADORES) cfg.jugadores.push(nom);
    });
    if (repetidos) aviso(repetidos === 1 ? "Ese nombre ya está." : "Algunos nombres ya estaban.");
    guardarCfg(); renderConfig();
  }

  /* ======================================================================
     NARRADOR
     ====================================================================== */
  function renderNarrador() {
    const s = S();
    if (!s) return;
    $("barra").innerHTML = barra(s);
    const f = { reparto: escenaReparto, noche: escenaNoche, dia: escenaDia, fin: escenaFin }[s.fase];
    $("escena").innerHTML = f(s);
    if (s.fase === "dia" && s.etapa === "debate") prepararReloj(s);
    pintarReloj();
  }

  function barra(s) {
    const vivos = E.vivos(s);
    const lobos = vivos.filter(j => j.rol === "lobo").length;
    const fase = s.fase === "reparto" ? "Reparto" : s.fase === "noche" ? `🌙 Noche ${s.ronda}` : s.fase === "dia" ? `☀ Día ${s.ronda}` : "Final";
    return `<span class="chip fuerte">${fase}</span>
      <span class="chip">${plural(vivos.length, "vivo", "vivos")}</span>
      <span class="chip secreto">🐺 ${lobos}</span>
      <span class="espacio"></span>
      <button class="icono" data-a="discreto" aria-pressed="${discreto}" title="Ocultar datos secretos" aria-label="Ocultar datos secretos">${discreto ? "🙈" : "👁"}</button>
      <button class="icono" data-a="nueva" title="Nueva partida" aria-label="Nueva partida">＋</button>`;
  }

  function pie(botones) { return `<div class="pie">${botones}</div>`; }
  function btnDeshacer() { return `<button class="btn" data-a="deshacer" ${juego.puedeDeshacer ? "" : "disabled"}>↶ Deshacer</button>`; }
  const leerTxt = t => t ? `<blockquote class="leer">${t}</blockquote>` : "";
  const nota = t => t ? `<p class="nota">${t}</p>` : "";
  const quien = (s, lista, prefijo) => lista.length
    ? `<div class="quien secreto">${prefijo || (lista.length > 1 ? "Se despiertan" : "Se despierta")}: ${lista.map(j => `<b>${esc(j.nombre)}</b> ${rol(j.rol).emoji}`).join(" · ")}</div>` : "";

  /* ---------- Reparto ---------- */
  function escenaReparto(s) {
    const vistos = s.jugadores.filter(j => j.visto).length;
    return `<h1>Reparto de roles</h1>
      <p class="aviso">Pasale el celu a cada jugador: toca su nombre, mira su rol a escondidas y lo oculta antes de devolverlo.</p>
      <div class="grilla">${s.jugadores.map(j => `<button class="jug ${j.visto ? "listo" : ""}" data-a="ver" data-id="${j.id}">${esc(j.nombre)}${j.visto ? " ✓" : ""}</button>`).join("")}</div>
      <p class="progreso">${vistos} de ${s.jugadores.length} ya vieron su rol</p>
      ${discreto ? `<p class="fingir">🙈 Los roles de todos están ocultos mientras pasa el celu. Para verlos o cambiarlos, tocá 👁 (solo el narrador).</p>` : `<details class="desplegable">
        <summary>Roles de todos (solo narrador)</summary>
        <p class="nota">Si repartieron cartas físicas, cambiá acá el rol de cada uno para que coincida.</p>
        <div class="lista-sel">${s.jugadores.map(j => `<label class="fila-sel"><span>${esc(j.nombre)}</span>
          <select data-a="cambiarRol" data-id="${j.id}">${R.ORDEN.map(r => `<option value="${r}" ${r === j.rol ? "selected" : ""}>${rol(r).emoji} ${rol(r).nombre}</option>`).join("")}</select></label>`).join("")}</div>
        <button class="btn" data-a="resortear">🎲 Volver a sortear</button>
      </details>`}` +
      pie(`${btnDeshacer()}<button class="btn-principal" data-a="empezar">🌙 Empezar la primera noche</button>`);
  }

  function renderVelo() {
    const v = $("velo");
    const s = S();
    if (!velo || !s) { v.hidden = true; v.innerHTML = ""; return; }
    const j = s.jugadores[velo.id];
    v.hidden = false;
    if (!velo.ver) {
      v.innerHTML = `<div class="velo-caja">
        <p class="tenue">Pasale el celu a</p>
        <h1 class="grande">${esc(j.nombre)}</h1>
        <p class="tenue">Que nadie más mire la pantalla.</p>
        <button class="btn-principal grande" data-a="mostrar">Soy ${esc(j.nombre)}: ver mi rol</button>
        <button class="btn" data-a="cerrarVelo">Cancelar</button></div>`;
    } else {
      const d = rol(j.rol);
      v.innerHTML = `<div class="velo-caja carta eq-${d.equipo}">
        <div class="carta-emoji">${d.emoji}</div>
        <p class="tenue">${esc(j.nombre)}, sos</p>
        <h1 class="grande">${E.nombreRol(j)}</h1>
        <p class="equipo">${d.equipo === "lobos" ? "Equipo de los lobos" : "Equipo de la aldea"}</p>
        <p>${esc(d.desc)}</p>
        <button class="btn-principal grande" data-a="ocultar">Listo, ocultar</button></div>`;
    }
  }

  /* ---------- Noche ---------- */
  function escenaNoche(s) {
    const p = E.pasoActual(s);
    const tx = T.NOCHE[p](s.ronda);
    const ultimo = s.i === s.pasos.length - 1;
    const actRol = { vidente: "vidente", protector: "protector", lobos: "lobo" }[p];
    const act = actRol ? E.actores(s, actRol) : [];
    const fingir = actRol && !act.length;
    let cuerpo = "";

    if (fingir) {
      cuerpo = `<div class="fingir">${T.FINGIR(rol(actRol).nombre)}</div>`;
    } else {
      cuerpo = quien(s, act) + nota(tx.nota);
      if (p === "vidente") cuerpo += selector(s, "vidente") + resultadoVidente(s);
      if (p === "protector") cuerpo += selector(s, "protector");
      if (p === "lobos") {
        const muertos = E.actores(s, "lobo").length < s.jugadores.filter(j => j.rol === "lobo").length;
        const c = s.mem.convertido;
        const nuevo = c && c.ronda === s.ronda - 1 && s.jugadores[c.id].vivo ? `<div class="fingir secreto">${T.NOCHE.convertido(esc(s.jugadores[c.id].nombre))}</div>` : "";
        cuerpo += nuevo + (muertos ? `<p class="nota secreto">Los lobos muertos ya no se despiertan.</p>` : "") + selector(s, "lobos");
      }
    }

    return `<div class="paso-num">Noche ${s.ronda} · paso ${s.i + 1} de ${s.pasos.length}</div>
      <h1>${tx.titulo}</h1>
      ${leerTxt(tx.leer)}
      ${cuerpo}
      ${tx.cerrar ? `<p class="etiqueta">Al terminar, leé:</p>${leerTxt(tx.cerrar)}` : ""}` +
      pie(`${btnDeshacer()}<button class="btn-principal" data-a="siguiente" ${listo(s) ? "" : "disabled"}>${ultimo ? "☀ Amanecer" : "Siguiente →"}</button>`);
  }

  function resultadoVidente(s) {
    const id = sel.ids[0];
    if (id == null) return "";
    const j = s.jugadores[id], d = rol(j.rol);
    const lobo = j.rol === "lobo";
    return `<div class="resultado ${lobo ? "malo" : "bueno"} secreto">
      <span class="carta-emoji chica">${d.emoji}</span>
      <div><b>${esc(j.nombre)}</b> es <b>${E.nombreRol(j)}</b><small>${lobo ? "👎 Pulgar abajo: es lobo" : "👍 Pulgar arriba: no es lobo"}</small></div></div>`;
  }

  // Lista de jugadores para tocar. modo define quién se puede elegir.
  function selector(s, modo) {
    const vivos = E.vivos(s);
    const anterior = s.mem.ultimoProtegido;
    const puede = j => {
      if (modo === "vidente" && j.rol === "vidente") return "es la vidente";
      if (modo === "lobos" && j.rol === "lobo") return "es lobo";
      if (modo === "protector" && !s.cfg.opciones.repetirProtegido && j.id === anterior) return "anoche";
      return "";
    };
    const botones = vivos.map(j => {
      const motivo = puede(j);
      return `<button class="jug" data-a="elegir" data-id="${j.id}" aria-pressed="${sel.ids.includes(j.id)}" ${motivo ? "disabled" : ""}>
        <span>${esc(j.nombre)}</span><small class="secreto">${rol(j.rol).emoji}${motivo ? " " + motivo : ""}</small></button>`;
    }).join("");
    const nadie = modo === "cazador" ? `<button class="jug nadie" data-a="nadie" aria-pressed="${sel.nadie}">No dispara</button>` : "";
    return `<div class="grilla elegir">${botones}${nadie}</div>`;
  }

  function listo(s) {
    if (s.fase === "noche") {
      const p = E.pasoActual(s);
      const actRol = { vidente: "vidente", protector: "protector", lobos: "lobo" }[p];
      if (!actRol || !E.actores(s, actRol).length) return true;
      return sel.ids.length === 1;
    }
    if (s.fase === "dia" && (s.etapa === "cazador" || s.etapa === "votacion")) return sel.ids.length === 1 || sel.nadie;
    return true;
  }

  /* ---------- Día ---------- */
  function lineasMuertes(s, lista) {
    return lista.map(({ id, causa }) => {
      const j = s.jugadores[id];
      return T.DIA.muerte[causa](esc(j.nombre)) + (s.cfg.opciones.revelar ? " " + T.DIA.era(`${E.nombreRol(j)} ${rol(j.rol).emoji}`) : "");
    });
  }

  function etiquetaSeguir(s, normal) {
    if (s.cazadores.length) return "🏹 Turno del cazador";
    if (E.hayGanador(s)) return "🏁 Ver el final";
    return normal;
  }

  function escenaDia(s) {
    const e = s.etapa;
    let h = `<div class="paso-num">Día ${s.ronda}</div>`;
    let boton = "Siguiente →";
    const secretoMuertos = lista => lista.length && !s.cfg.opciones.revelar
      ? `<p class="nota secreto">Solo para vos: ${lista.map(({ id }) => `${esc(s.jugadores[id].nombre)} era ${E.nombreRol(s.jugadores[id])}`).join(", ")}.</p>` : "";

    if (e === "anuncio") {
      const lineas = lineasMuertes(s, s.anuncio);
      h += `<h1>Amanece</h1>` + leerTxt(T.DIA.amanecer(s.ronda)) +
        (lineas.length ? lineas.map(leerTxt).join("") : leerTxt(T.DIA.sinMuertos)) +
        secretoMuertos(s.anuncio) + resumenNoche(s);
      boton = etiquetaSeguir(s, "🗣️ Pasar al debate");
    } else if (e === "cazador") {
      const c = s.jugadores[s.cazadores[0]];
      h += `<h1>El cazador</h1>` + leerTxt(T.DIA.cazador(esc(c.nombre))) + nota(T.DIA.cazadorNota) + selector(s, "cazador");
      boton = "Confirmar";
    } else if (e === "disparo") {
      const d = s.disparo || {};
      h += `<h1>El disparo</h1>` + (d.id == null
        ? leerTxt(T.DIA.noDisparo(esc(s.jugadores[d.tirador].nombre)))
        : lineasMuertes(s, s.anuncio).map(leerTxt).join("") + secretoMuertos(s.anuncio));
      boton = etiquetaSeguir(s, s.retomar === "noche" ? "🌙 Que caiga la noche" : "🗣️ Pasar al debate");
    } else if (e === "debate") {
      h += `<h1>Debate</h1>` + leerTxt(T.DIA.debate(minutos(s.cfg.opciones.debate))) + nota(T.DIA.debateNota) + `
        <div class="reloj" id="reloj">
          <div class="reloj-num" id="relojNum">0:00</div>
          <div class="reloj-btns">
            <button class="btn" data-a="reloj" data-v="play" id="relojPlay">▶ Empezar</button>
            <button class="btn" data-a="reloj" data-v="mas">+30″</button>
            <button class="btn" data-a="reloj" data-v="reset">↺</button>
          </div></div>`;
      boton = "🗳️ A votar";
    } else if (e === "votacion") {
      const segunda = sel.segunda ? T.DIA.segundaVuelta(sel.segunda.map(id => esc(s.jugadores[id].nombre)).join(" y ")) : "";
      h += `<h1>${sel.segunda ? "Segunda vuelta" : "Votación"}</h1>` + leerTxt(segunda || T.DIA.votacion) + nota(T.DIA.votacionNota) + contadorVotos(s);
      boton = "⚖ Confirmar";
    } else if (e === "veredicto") {
      const l = s.linchado || {};
      let lineas;
      if (l.id == null) lineas = [T.DIA.nadieLinchado];
      else lineas = lineasMuertes(s, s.anuncio);
      h += `<h1>Veredicto</h1>` + lineas.map(leerTxt).join("") + secretoMuertos(s.anuncio);
      boton = etiquetaSeguir(s, "🌙 Que caiga la noche");
    }
    return h + pie(`${btnDeshacer()}<button class="btn-principal" data-a="siguiente" ${listo(s) ? "" : "disabled"}>${boton}</button>`);
  }

  /* ---------- Contador de votos ---------- */
  const candidatos = s => E.vivos(s).filter(j => !sel.segunda || sel.segunda.includes(j.id));
  function lideres(s) {
    const c = candidatos(s);
    const max = Math.max(0, ...c.map(j => sel.votos[j.id] || 0));
    return { max, ids: max ? c.filter(j => (sel.votos[j.id] || 0) === max).map(j => j.id) : [] };
  }
  // Con un solo más votado, queda elegido. Con empate, se mantiene la elección a mano si es uno de los empatados.
  function recalcularVotos(s) {
    const l = lideres(s);
    if (l.ids.length === 1) { sel.ids = l.ids.slice(); sel.mano = false; }
    else if (!(sel.mano && l.ids.includes(sel.ids[0]))) { sel.ids = []; sel.mano = false; }
  }
  function contadorVotos(s) {
    const votantes = E.vivos(s).length;
    const c = candidatos(s);
    const total = c.reduce((t, j) => t + (sel.votos[j.id] || 0), 0);
    const l = lideres(s);
    const nom = id => esc(s.jugadores[id].nombre);
    const filas = c.map(j => {
      const n = sel.votos[j.id] || 0;
      return `<div class="fila-voto ${n && l.ids.includes(j.id) ? "lider" : ""}">
        <button class="voto-nombre" data-a="voto" data-id="${j.id}" data-v="1">${esc(j.nombre)}</button>
        <button class="paso-btn" data-a="voto" data-id="${j.id}" data-v="-1" ${n ? "" : "disabled"} aria-label="Un voto menos a ${esc(j.nombre)}">−</button>
        <span class="cant">${n}</span>
        <button class="paso-btn" data-a="voto" data-id="${j.id}" data-v="1" aria-label="Un voto más a ${esc(j.nombre)}">+</button></div>`;
    }).join("");
    let estado;
    if (sel.nadie) estado = `<p class="veredicto-votos">Hoy nadie va a la horca.</p>`;
    else if (!l.max) estado = "";
    else if (l.ids.length === 1) estado = `<p class="veredicto-votos">Va a la horca: <b>${nom(l.ids[0])}</b> (${plural(l.max, "voto", "votos")})</p>`;
    else estado = `<div class="empate"><p class="veredicto-votos">Empate entre ${l.ids.map(nom).join(" y ")} (${plural(l.max, "voto", "votos")} cada uno)</p>
        <button class="btn" data-a="segunda">🔁 Segunda vuelta entre ellos</button>
        <p class="etiqueta">O decide la mesa</p>
        <div class="grilla">${l.ids.map(id => `<button class="jug" data-a="elegir" data-id="${id}" aria-pressed="${sel.ids.includes(id)}">${nom(id)}</button>`).join("")}</div></div>`;
    return `<div class="lista-votos">${filas}</div>
      <p class="progreso ${total > votantes ? "error" : ""}">${plural(total, "voto", "votos")} de ${plural(votantes, "votante", "votantes")}${total > votantes ? ": hay más votos que vivos" : ""}</p>
      ${estado}
      <div class="grilla elegir"><button class="jug nadie" data-a="nadie" aria-pressed="${sel.nadie}">Nadie va a la horca</button></div>`;
  }

  function resumenNoche(s) {
    const items = s.registro.filter(x => x.r === s.ronda && x.f === "noche");
    if (!items.length) return "";
    return `<details class="desplegable secreto"><summary>Qué pasó esta noche (solo narrador)</summary>
      <ul class="lista-reg">${items.map(x => `<li>${esc(x.t)}</li>`).join("")}</ul></details>`;
  }

  const minutos = seg => seg % 60 ? `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")} minutos` : plural(seg / 60, "minuto", "minutos");

  /* ---------- Reloj del debate ---------- */
  function prepararReloj(s) {
    const clave = `${s.id}-${s.ronda}`;
    if (reloj.clave === clave) return;
    reloj.clave = clave; reloj.total = s.cfg.opciones.debate; reloj.resta = reloj.total; reloj.corre = false;
    guardarReloj();
  }
  function pintarReloj() {
    const n = $("relojNum");
    if (!n) return;
    const r = Math.ceil(reloj.resta);
    n.textContent = `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`;
    n.classList.toggle("poco", r <= 15 && r > 0);
    n.classList.toggle("cero", r === 0);
    $("relojPlay").textContent = reloj.corre ? "❚❚ Pausa" : (reloj.resta < reloj.total && reloj.resta > 0 ? "▶ Seguir" : "▶ Empezar");
  }
  function controlReloj(v) {
    if (v === "play") {
      if (reloj.corre) { reloj.corre = false; }
      else { if (reloj.resta <= 0) reloj.resta = reloj.total; reloj.corre = true; reloj.fin = Date.now() + reloj.resta * 1000; prepararAudio(); }
    } else if (v === "mas") {
      reloj.resta += 30; if (reloj.corre) reloj.fin += 30000;
    } else if (v === "reset") {
      reloj.corre = false; reloj.resta = reloj.total;
    }
    guardarReloj();
    pintarReloj();
  }
  setInterval(() => {
    if (!reloj.corre) return;
    reloj.resta = Math.max(0, (reloj.fin - Date.now()) / 1000);
    if (reloj.resta === 0) { reloj.corre = false; guardarReloj(); alarma(); }
    pintarReloj();
  }, 250);
  // El iPhone solo deja sonar audio preparado al tocar un botón: se prepara al tocar «Empezar».
  let audio = null;
  function prepararAudio() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") audio.resume();
      const src = audio.createBufferSource();
      src.buffer = audio.createBuffer(1, 1, 22050); src.connect(audio.destination); src.start(0);
    } catch (e) {}
  }
  function alarma() {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    try {
      const ctx = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.35, 0.7].forEach(t => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 660; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.3);
        o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.3);
      });
    } catch (e) {}
    aviso("⏰ ¡Se terminó el tiempo!");
  }

  /* ---------- Final ---------- */
  function escenaFin(s) {
    const f = T.FIN[s.ganador] || T.FIN.nadie;
    const ganoEquipo = j => R.equipo(j.rol) === s.ganador;
    return `<div class="final g-${s.ganador}"><h1 class="grande">${f.titulo}</h1>${leerTxt(f.leer)}</div>
      <h2>Quién era quién</h2>
      <div class="lista-final">${s.jugadores.map(j => `<div class="fila-final ${j.vivo ? "" : "muerto"} ${ganoEquipo(j) ? "gano" : ""}">
        <span class="emoji">${rol(j.rol).emoji}</span><b>${esc(j.nombre)}</b><span>${E.nombreRol(j)}</span>
        <small>${j.vivo ? "vivo" : textoMuerte(j)}</small></div>`).join("")}</div>
      <h2>Marcador</h2>${tablaMarcador(s.jugadores.map(j => j.nombre))}
      <div class="acciones">
        <button class="btn-principal" data-a="revancha">🎲 Revancha (mismos jugadores, roles nuevos)</button>
        <button class="btn" data-a="nueva">Nueva partida</button>
        <button class="btn" data-a="tab" data-tab="registro">Ver todo lo que pasó</button>
        <button class="link" data-a="deshacer">↶ Deshacer el último paso (si terminó por error)</button>
      </div>`;
  }

  /* ---------- Marcador entre partidas ---------- */
  // Guarda la partida actual si terminó, o la saca si se deshizo el final.
  function sincronizarMarcador() {
    const s = S();
    if (!s || !s.id) return;
    const r = E.resultado(s), antes = mar.partidas[s.id];
    if (r && (!antes || antes.ganador !== r.ganador)) mar.partidas[s.id] = r;
    else if (!r && antes) delete mar.partidas[s.id];
    else return;
    escribir(CLAVE_MAR, mar);
  }
  function tablaMarcador(soloEstos) {
    const lista = Object.values(mar.partidas);
    if (!lista.length) return `<p class="vacio">Acá se van a ir sumando las partidas que terminen.</p>`;
    const m = E.marcador(lista);
    const filtro = soloEstos && soloEstos.map(n => n.toLowerCase());
    const filas = m.jugadores.filter(j => !filtro || filtro.includes(j.nombre.toLowerCase()));
    return `<div class="resumen"><span class="chip">${plural(m.partidas, "partida", "partidas")}</span>
        <span class="chip">🏘️ aldea ${m.equipos.aldea}</span><span class="chip">🐺 lobos ${m.equipos.lobos}</span></div>
      <div class="tabla-wrap"><table><thead><tr><th>Jugador</th><th>Ganadas</th><th>Jugadas</th></tr></thead>
      <tbody>${filas.map(j => `<tr><td>${esc(j.nombre)}</td><td class="q">${j.ganadas}</td><td>${j.jugadas}</td></tr>`).join("")}</tbody></table></div>`;
  }

  function textoMuerte(j) {
    if (!j.muerte) return "";
    const m = j.muerte;
    return `${m.fase === "noche" ? "noche" : "día"} ${m.ronda} · ${E.CAUSAS[m.causa]}`;
  }

  /* ======================================================================
     JUGADORES
     ====================================================================== */
  function renderJugadores() {
    const s = S();
    const pieMarcador = `<h2>Marcador</h2>${tablaMarcador()}` +
      (Object.keys(mar.partidas).length ? `<button class="link" data-a="borrarMarcador">Borrar el marcador</button>` : "");
    if (!s) { $("tablaJug").innerHTML = `<p class="vacio">Todavía no hay partida. Armala desde la pestaña Narrador.</p>` + pieMarcador; return; }
    const vivos = E.vivos(s);
    const enJuego = s.fase === "noche" || s.fase === "dia";
    let h = `<div class="resumen">
      <span class="chip">${plural(vivos.length, "vivo", "vivos")}</span>
      <span class="chip secreto">🐺 ${vivos.filter(j => j.rol === "lobo").length} lobos</span>
      <span class="chip secreto">🏘️ ${vivos.filter(j => j.rol !== "lobo").length} del pueblo</span></div>`;
    h += `<div class="lista-jug">` + s.jugadores.map(j => {
      const d = rol(j.rol);
      const marcas = [];
      if (s.mem.ultimoProtegido === j.id && j.vivo) marcas.push("🛡️ protegido anoche");
      if (j.origen === "maldito") marcas.push("🧛 lo mordieron: ahora es lobo");
      return `<div class="fila-jug ${j.vivo ? "" : "muerto"} eq-${d.equipo}">
        <span class="emoji secreto">${d.emoji}</span>
        <div class="datos"><b>${esc(j.nombre)}</b> <span class="rol secreto">${E.nombreRol(j)}</span>
          ${marcas.length ? `<small class="marcas secreto">${marcas.join(" · ")}</small>` : ""}
          ${j.vivo ? "" : `<small>☠ ${textoMuerte(j)}</small>`}</div>
        ${enJuego ? `<button class="mini" data-a="${j.vivo ? "sacar" : "revivir"}" data-id="${j.id}">${j.vivo ? "Sacar" : "Revivir"}</button>` : ""}
      </div>`;
    }).join("") + `</div>`;
    if (enJuego) h += `<p class="nota">«Sacar» y «Revivir» son para corregir errores o si alguien se tiene que ir. Si sacás al cazador, dispara. Se pueden deshacer.</p>`;
    $("tablaJug").innerHTML = h + pieMarcador;
  }

  /* ======================================================================
     ROLES (referencia)
     ====================================================================== */
  function renderRoles() {
    const filas = [[5, 6], [7, 11], [12, 17], [18, 22], [23, 30]];
    $("rolesContenido").innerHTML = `
      <h2>Cómo se juega</h2>
      <ul class="lista-reglas">
        <li>El <b>narrador</b> no juega: guía la partida con esta app y sabe todo.</li>
        <li>Cada jugador recibe un rol secreto. Los <b>lobos</b> se conocen entre ellos; nadie más sabe quién es quién.</li>
        <li><b>De noche</b> todos cierran los ojos y el narrador va despertando a cada rol en orden.</li>
        <li><b>De día</b> se anuncia quién murió, el pueblo debate y vota a quién linchar.</li>
        <li><b>Gana la aldea</b> si mueren todos los lobos. <b>Ganan los lobos</b> cuando son tantos como el resto.</li>
        <li>Los muertos no hablan, no votan y no pueden dar pistas.</li>
      </ul>
      <h2>Orden de la noche</h2>
      <ol class="lista-reglas">
        <li>🔮 Vidente</li><li>🛡️ Protector</li><li>🐺 Lobos <span class="tenue">(con el Maldito, si ya lo mordieron)</span></li>
      </ol>
      <h2>Roles</h2>
      <div class="cartas-rol">${R.ORDEN.map(r => {
        const d = rol(r);
        return `<article class="carta-rol eq-${d.equipo}">
          <header><span class="emoji">${d.emoji}</span><div><h3>${d.nombre}</h3>
          <small>${d.equipo === "lobos" ? "Equipo lobos" : "Equipo aldea"} · ${esc(d.despierta)}</small></div></header>
          <p>${esc(d.desc)}</p><p class="consejo">💡 ${esc(d.consejo)}</p></article>`;
      }).join("")}</div>
      <h2>¿Cuántos lobos?</h2>
      <div class="tabla-wrap"><table>
        <thead><tr><th>Jugadores</th><th>Lobos</th></tr></thead>
        <tbody>${filas.map(([a, b]) => `<tr><td>${a} a ${b}</td><td class="q">${R.lobosRecomendados(a)}</td></tr>`).join("")}</tbody>
      </table></div>
      <p class="nota-pie">Roles que se suman solos según la cantidad: ${R.ESPECIALES.filter(r => r !== "lobo").map(r => `${rol(r).emoji} ${rol(r).nombre} desde ${R.DESDE[r]}`).join(" · ")}.</p>`;
  }

  /* ======================================================================
     REGISTRO
     ====================================================================== */
  function tituloGrupo(x) {
    if (x.r === 0) return "Reparto";
    if (x.f === "fin") return "Final";
    return x.f === "noche" ? `🌙 Noche ${x.r}` : `☀ Día ${x.r}`;
  }
  function renderRegistro() {
    const s = S();
    if (!s || !s.registro.length) { $("reg").innerHTML = `<p class="vacio">Acá va a quedar anotado todo lo que hace cada uno, noche por noche.</p>`; return; }
    let h = "", actual = null;
    s.registro.forEach(x => {
      const t = tituloGrupo(x);
      if (t !== actual) { if (actual) h += `</ul>`; h += `<h3 class="grupo">${t}</h3><ul class="lista-reg">`; actual = t; }
      h += `<li>${esc(x.t)}</li>`;
    });
    h += `</ul>`;
    $("reg").innerHTML = `<div class="reg-top"><h2>Registro</h2><button class="btn" data-a="copiar">📋 Copiar</button></div>
      <p class="nota secreto-aviso">Tiene todos los secretos: mostralo recién al final.</p><div class="secreto">${h}</div>`;
  }
  function textoRegistro() {
    const s = S();
    let actual = null, out = "Partida de Lobos\n";
    s.registro.forEach(x => {
      const t = tituloGrupo(x);
      if (t !== actual) { out += `\n${t}\n`; actual = t; }
      out += `• ${x.t}\n`;
    });
    return out;
  }

  /* ======================================================================
     RENDER GENERAL
     ====================================================================== */
  function render() {
    const s = S();
    sincronizarMarcador();
    let tema = s && (s.fase === "dia" || (s.fase === "fin" && s.ganador !== "lobos")) ? "dia" : "noche";
    if (s && s.fase === "noche" && !enConfig && s.cfg.opciones.oscuro) tema = "oscuro";
    if (document.body.dataset.fase !== tema) {
      document.body.dataset.fase = tema;
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.content = { dia: "#efdfbf", noche: "#0b0f24", oscuro: "#000000" }[tema];
    }
    document.body.classList.toggle("discreto", discreto);
    if (enConfig) renderConfig(); else renderNarrador();
    renderJugadores();
    renderRegistro();
    renderVelo();
  }

  /* ---------- Eventos ---------- */
  $("formJugador").addEventListener("submit", e => {
    e.preventDefault();
    const inp = $("nuevoJugador");
    if (inp.value.trim()) agregarJugadores(inp.value);
    inp.value = "";
    inp.focus();
  });

  document.addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.a === "cambiarRol") hacer("cambiarRol", { id: +t.dataset.id, rol: t.value });
  });

  document.addEventListener("click", e => {
    const b = e.target.closest("[data-a]");
    if (!b || b.disabled || b.tagName === "SELECT") return;
    const a = b.dataset.a, id = b.dataset.id === undefined || b.dataset.id === "" ? null : +b.dataset.id;
    const s = S();
    switch (a) {
      case "tab": irA(b.dataset.tab); break;

      // Configuración
      case "quitarJug": cfg.jugadores.splice(+b.dataset.i, 1); guardarCfg(); renderConfig(); break;
      case "borrarJug": cfg.jugadores = []; guardarCfg(); renderConfig(); break;
      case "mas": case "menos":
        if (cfg.auto) cfg.cuentas = R.recomendar(Math.max(cfg.jugadores.length, R.MIN_JUGADORES));
        cfg.auto = false;
        cfg.cuentas[b.dataset.rol] = Math.max(0, (cfg.cuentas[b.dataset.rol] || 0) + (a === "mas" ? 1 : -1));
        guardarCfg(); renderConfig(); break;
      case "recomendar": cfg.auto = true; guardarCfg(); renderConfig(); break;
      case "opt": {
        const k = b.dataset.k;
        cfg.opciones[k] = k === "debate" ? +b.dataset.v : b.dataset.v === "1";
        guardarCfg(); renderConfig(); break;
      }
      case "repartir": {
        const v = R.validar(cfg.cuentas, cfg.jugadores.length);
        if (!v.ok) { aviso(v.motivo); $("errorConfig").hidden = false; $("errorConfig").textContent = v.motivo; break; }
        if (s && (s.fase === "noche" || s.fase === "dia") && !confirm("Hay una partida en juego. ¿Dejarla y repartir una nueva? (Se puede deshacer.)")) break;
        juego.empezar(cfg); sel = selVacia(); discreto = true;
        guardar(); enConfig = false; irA("narrador"); render(); break;
      }
      case "volver": enConfig = false; irA("narrador"); render(); break;
      case "nueva": enConfig = true; irA("narrador"); render(); break;

      // Reparto
      case "ver": velo = { id, ver: false }; renderVelo(); break;
      case "mostrar": velo.ver = true; renderVelo(); break;
      case "cerrarVelo": velo = null; renderVelo(); break;
      case "ocultar": { const v = velo; velo = null; hacer("verRol", { id: v.id }); break; }
      case "resortear": hacer("resortear"); break;
      case "empezar": {
        const faltan = s.jugadores.filter(j => !j.visto).length;
        discreto = false;
        hacer("empezar");
        if (faltan) aviso(`Ojo: ${plural(faltan, "jugador no vio", "jugadores no vieron")} su rol en la app.`);
        break;
      }

      // Elegir jugadores
      case "elegir":
        sel.nadie = false; sel.mano = true;
        sel.ids = sel.ids.includes(id) ? [] : [id];
        renderNarrador(); break;
      case "nadie": sel.nadie = !sel.nadie; sel.ids = []; if (!sel.nadie && s.etapa === "votacion") recalcularVotos(s); renderNarrador(); break;
      case "voto":
        sel.votos[id] = Math.max(0, (sel.votos[id] || 0) + +b.dataset.v);
        sel.nadie = false; recalcularVotos(s); renderNarrador(); break;
      case "segunda":
        sel.segunda = lideres(s).ids; sel.votos = {}; sel.ids = []; sel.nadie = false; sel.mano = false;
        renderNarrador(); window.scrollTo(0, 0); break;
      case "siguiente":
        hacer("avanzar", { ids: sel.ids, id: sel.ids.length ? sel.ids[0] : null, nadie: sel.nadie, votos: sel.votos, segunda: !!sel.segunda });
        break;
      case "deshacer":
        if (juego.puedeDeshacer) { juego.deshacer(); sel = selVacia(); velo = null; guardar(); render(); aviso("Deshecho"); }
        break;
      case "reloj": controlReloj(b.dataset.v); break;

      // Otros
      case "discreto": discreto = !discreto; render(); break;
      case "sacar": hacer("sacar", { id }); break;
      case "revivir": hacer("revivir", { id }); break;
      case "revancha": juego.revancha(); sel = selVacia(); discreto = true; guardar(); render(); window.scrollTo(0, 0); break;
      case "borrarMarcador":
        if (confirm("¿Borrar el marcador de todas las partidas?")) { mar.partidas = {}; escribir(CLAVE_MAR, mar); render(); }
        break;
      case "copiar": {
        const t = textoRegistro();
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(() => aviso("Registro copiado"), () => aviso("No se pudo copiar"));
        else aviso("Tu navegador no deja copiar");
        break;
      }
    }
  });

  /* ---------- Pantalla siempre encendida durante la partida ---------- */
  let wakeLock = null;
  async function pedirPantallaEncendida() {
    if (!("wakeLock" in navigator) || wakeLock || document.visibilityState !== "visible") return;
    try {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => (wakeLock = null));
    } catch (e) { wakeLock = null; }
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pedirPantallaEncendida(); });
  document.addEventListener("pointerdown", pedirPantallaEncendida, { once: true });

  /* ---------- iPhone: sin zoom por doble toque ni pellizco ---------- */
  let ultimoToque = 0;
  document.addEventListener("touchend", e => {
    const ahora = Date.now();
    if (ahora - ultimoToque < 350 && !e.target.closest("input,select,textarea,label,summary")) {
      e.preventDefault();
      const b = e.target.closest("button");
      if (b && !b.disabled) b.click();
    }
    ultimoToque = ahora;
  }, { passive: false });
  ["gesturestart", "gesturechange"].forEach(t => document.addEventListener(t, e => e.preventDefault(), { passive: false }));

  /* ---------- Modo offline ---------- */
  let enMarco = true; try { enMarco = window.self !== window.top; } catch (e) {}
  if ("serviceWorker" in navigator && location.protocol === "https:" && !enMarco) {
    addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }

  /* ---------- Arranque ---------- */
  renderRoles();
  const h = location.hash.slice(1);
  irA(["narrador", "jugadores", "roles", "registro"].includes(h) ? h : "narrador");
  render();
})();
