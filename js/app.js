// Pantalla: dibuja todo de nuevo en cada acción y conecta los botones (delegación de eventos).
(function () {
  "use strict";
  const R = window.LoboRoles, E = window.LoboEstado, T = window.LoboTextos;
  const CLAVE = "lobos-v1", CLAVE_CFG = "lobos-config";
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
  const reloj = { clave: null, total: 0, resta: 0, corre: false, fin: 0 };

  function selVacia() { return { ids: [], curar: false, veneno: null, nadie: false }; }
  const S = () => juego.S;
  const guardar = () => escribir(CLAVE, juego.exportar());
  const guardarCfg = () => escribir(CLAVE_CFG, cfg);
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
      <details class="desplegable">
        <summary>Roles de todos (solo narrador)</summary>
        <p class="nota">Si repartieron cartas físicas, cambiá acá el rol de cada uno para que coincida.</p>
        <div class="lista-sel">${s.jugadores.map(j => `<label class="fila-sel"><span>${esc(j.nombre)}</span>
          <select data-a="cambiarRol" data-id="${j.id}">${R.ORDEN.map(r => `<option value="${r}" ${r === j.rol ? "selected" : ""}>${rol(r).emoji} ${rol(r).nombre}</option>`).join("")}</select></label>`).join("")}</div>
        <button class="btn" data-a="resortear">🎲 Volver a sortear</button>
      </details>` +
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
        <h1 class="grande">${d.nombre}</h1>
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
    const actRol = { cupido: "cupido", vidente: "vidente", protector: "protector", lobos: "lobo", bruja: "bruja" }[p];
    const act = actRol ? E.actores(s, actRol) : [];
    const fingir = actRol && !act.length;
    let cuerpo = "";

    if (fingir) {
      cuerpo = `<div class="fingir">${T.FINGIR(rol(actRol).nombre)}</div>`;
    } else if (p === "enamorados") {
      const e = s.mem.enamorados || [];
      cuerpo = quien(s, e.map(id => s.jugadores[id]), "Se despiertan los enamorados") + nota(tx.nota);
    } else {
      cuerpo = quien(s, act) + nota(tx.nota);
      if (p === "cupido") cuerpo += selector(s, "cupido");
      if (p === "vidente") cuerpo += selector(s, "vidente") + resultadoVidente(s);
      if (p === "protector") cuerpo += selector(s, "protector");
      if (p === "lobos") {
        const muertos = E.actores(s, "lobo").length < s.jugadores.filter(j => j.rol === "lobo").length;
        cuerpo += (muertos ? `<p class="nota secreto">Los lobos muertos ya no se despiertan.</p>` : "") + selector(s, "lobos");
      }
      if (p === "bruja") cuerpo += panelBruja(s);
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
      <div><b>${esc(j.nombre)}</b> es <b>${d.nombre}</b><small>${lobo ? "👎 Pulgar abajo: es lobo" : "👍 Pulgar arriba: no es lobo"}</small></div></div>`;
  }

  function panelBruja(s) {
    const v = s.noche.victima;
    const vj = v != null ? s.jugadores[v] : null;
    let extra = "";
    if (vj && s.noche.protegido === v) extra = " — el protector la cuidó, se salva igual";
    else if (vj && vj.rol === "anciano" && !s.mem.ancianoHerido) extra = " — es el anciano, resiste este ataque";
    const b = E.actores(s, "bruja")[0];
    return `<div class="victima secreto">Víctima de los lobos: <b>${vj ? esc(vj.nombre) : "nadie"}</b> ${vj ? rol(vj.rol).emoji : ""}<small>${extra}</small></div>
      <div class="pocion">
        <div class="pocion-tit">🧪 Poción de vida ${s.mem.vida ? "" : "<em>(ya la usó)</em>"}</div>
        <div class="seg ancho"><button data-a="curar" data-v="1" aria-pressed="${sel.curar}" ${s.mem.vida && vj ? "" : "disabled"}>Salvar a ${vj ? esc(vj.nombre) : "—"}</button><button data-a="curar" data-v="0" aria-pressed="${!sel.curar}">No usar</button></div>
      </div>
      <div class="pocion">
        <div class="pocion-tit">☠️ Poción de muerte ${s.mem.muerte ? "" : "<em>(ya la usó)</em>"}</div>
        ${s.mem.muerte ? selector(s, "veneno", b) : ""}
      </div>`;
  }

  // Lista de jugadores para tocar. modo define quién se puede elegir.
  function selector(s, modo, extra) {
    const vivos = E.vivos(s);
    const anterior = s.mem.ultimoProtegido;
    const puede = j => {
      if (modo === "vidente" && j.rol === "vidente") return "es la vidente";
      if (modo === "lobos" && j.rol === "lobo") return "es lobo";
      if (modo === "protector" && !s.cfg.opciones.repetirProtegido && j.id === anterior) return "anoche";
      if (modo === "veneno" && extra && j.id === extra.id) return "es la bruja";
      return "";
    };
    const marcado = modo === "veneno" ? (j => sel.veneno === j.id) : (j => sel.ids.includes(j.id));
    const accion = modo === "veneno" ? "veneno" : "elegir";
    const botones = vivos.map(j => {
      const motivo = puede(j);
      return `<button class="jug" data-a="${accion}" data-id="${j.id}" aria-pressed="${marcado(j)}" ${motivo ? "disabled" : ""}>
        <span>${esc(j.nombre)}</span><small class="secreto">${rol(j.rol).emoji}${motivo ? " " + motivo : ""}</small></button>`;
    }).join("");
    const nadie = modo === "veneno"
      ? `<button class="jug nadie" data-a="veneno" data-id="" aria-pressed="${sel.veneno == null}">Nadie</button>`
      : (modo === "votacion" || modo === "cazador")
        ? `<button class="jug nadie" data-a="nadie" aria-pressed="${sel.nadie}">${modo === "votacion" ? "Nadie" : "No dispara"}</button>` : "";
    const ayuda = modo === "cupido" ? `<p class="etiqueta">Elegí dos (${sel.ids.length}/2)</p>` : "";
    return `${ayuda}<div class="grilla elegir">${botones}${nadie}</div>`;
  }

  function listo(s) {
    if (s.fase === "noche") {
      const p = E.pasoActual(s);
      const actRol = { cupido: "cupido", vidente: "vidente", protector: "protector", lobos: "lobo" }[p];
      if (!actRol || !E.actores(s, actRol).length) return true;
      return p === "cupido" ? sel.ids.length === 2 : sel.ids.length === 1;
    }
    if (s.fase === "dia" && (s.etapa === "cazador" || s.etapa === "votacion")) return sel.ids.length === 1 || sel.nadie;
    return true;
  }

  /* ---------- Día ---------- */
  function lineasMuertes(s, lista) {
    return lista.map(({ id, causa }) => {
      const j = s.jugadores[id];
      return T.DIA.muerte[causa](esc(j.nombre)) + (s.cfg.opciones.revelar ? " " + T.DIA.era(`${rol(j.rol).nombre} ${rol(j.rol).emoji}`) : "");
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
      ? `<p class="nota secreto">Solo para vos: ${lista.map(({ id }) => `${esc(s.jugadores[id].nombre)} era ${rol(s.jugadores[id].rol).nombre}`).join(", ")}.</p>` : "";

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
          </div></div>` + noVotan(s);
      boton = "🗳️ A votar";
    } else if (e === "votacion") {
      h += `<h1>Votación</h1>` + leerTxt(T.DIA.votacion) + nota(T.DIA.votacionNota) + noVotan(s) + selector(s, "votacion");
      boton = "⚖ Confirmar";
    } else if (e === "veredicto") {
      const l = s.linchado || {};
      let lineas;
      if (l.id == null) lineas = [T.DIA.nadieLinchado];
      else if (l.tonto) lineas = [T.DIA.tonto(esc(s.jugadores[l.id].nombre))];
      else lineas = lineasMuertes(s, s.anuncio);
      h += `<h1>Veredicto</h1>` + lineas.map(leerTxt).join("") + secretoMuertos(s.anuncio);
      boton = etiquetaSeguir(s, "🌙 Que caiga la noche");
    }
    return h + pie(`${btnDeshacer()}<button class="btn-principal" data-a="siguiente" ${listo(s) ? "" : "disabled"}>${boton}</button>`);
  }

  function noVotan(s) {
    const t = s.jugadores.find(j => j.rol === "tonto" && j.vivo && s.mem.tontoRevelado);
    return t ? `<p class="nota">🤪 ${esc(t.nombre)} no vota (es el Tonto del pueblo).</p>` : "";
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
    const clave = `${s.ronda}`;
    if (reloj.clave === clave) return;
    reloj.clave = clave; reloj.total = s.cfg.opciones.debate; reloj.resta = reloj.total; reloj.corre = false;
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
      else { if (reloj.resta <= 0) reloj.resta = reloj.total; reloj.corre = true; reloj.fin = Date.now() + reloj.resta * 1000; }
    } else if (v === "mas") {
      reloj.resta += 30; if (reloj.corre) reloj.fin += 30000;
    } else if (v === "reset") {
      reloj.corre = false; reloj.resta = reloj.total;
    }
    pintarReloj();
  }
  setInterval(() => {
    if (!reloj.corre) return;
    reloj.resta = Math.max(0, (reloj.fin - Date.now()) / 1000);
    if (reloj.resta === 0) { reloj.corre = false; alarma(); }
    pintarReloj();
  }, 250);
  function alarma() {
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
    const e = s.mem.enamorados || [];
    const ganoEquipo = j => s.ganador === "enamorados" ? e.includes(j.id) : R.equipo(j.rol) === (s.ganador === "lobos" ? "lobos" : "aldea");
    return `<div class="final g-${s.ganador}"><h1 class="grande">${f.titulo}</h1>${leerTxt(f.leer)}</div>
      <h2>Quién era quién</h2>
      <div class="lista-final">${s.jugadores.map(j => `<div class="fila-final ${j.vivo ? "" : "muerto"} ${ganoEquipo(j) ? "gano" : ""}">
        <span class="emoji">${rol(j.rol).emoji}</span><b>${esc(j.nombre)}</b><span>${rol(j.rol).nombre}${e.includes(j.id) ? " 💞" : ""}</span>
        <small>${j.vivo ? "vivo" : textoMuerte(j)}</small></div>`).join("")}</div>
      <div class="acciones">
        <button class="btn-principal" data-a="revancha">🎲 Revancha (mismos jugadores, roles nuevos)</button>
        <button class="btn" data-a="nueva">Nueva partida</button>
        <button class="btn" data-a="tab" data-tab="registro">Ver todo lo que pasó</button>
      </div>`;
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
    if (!s) { $("tablaJug").innerHTML = `<p class="vacio">Todavía no hay partida. Armala desde la pestaña Narrador.</p>`; return; }
    const vivos = E.vivos(s);
    const e = s.mem.enamorados || [];
    const hayBruja = s.jugadores.some(j => j.rol === "bruja");
    const enJuego = s.fase === "noche" || s.fase === "dia";
    let h = `<div class="resumen">
      <span class="chip">${plural(vivos.length, "vivo", "vivos")}</span>
      <span class="chip secreto">🐺 ${vivos.filter(j => j.rol === "lobo").length} lobos</span>
      <span class="chip secreto">🏘️ ${vivos.filter(j => j.rol !== "lobo").length} del pueblo</span>
      ${hayBruja ? `<span class="chip secreto">🧪 vida ${s.mem.vida ? "✓" : "✗"} · muerte ${s.mem.muerte ? "✓" : "✗"}</span>` : ""}</div>`;
    h += `<div class="lista-jug">` + s.jugadores.map(j => {
      const d = rol(j.rol);
      const marcas = [];
      if (e.includes(j.id)) marcas.push("💞 enamorado");
      if (s.mem.ultimoProtegido === j.id && j.vivo) marcas.push("🛡️ protegido anoche");
      if (j.rol === "anciano" && s.mem.ancianoHerido) marcas.push("🩹 ya lo atacaron");
      if (j.rol === "tonto" && s.mem.tontoRevelado) marcas.push("🚫 no vota");
      return `<div class="fila-jug ${j.vivo ? "" : "muerto"} eq-${d.equipo}">
        <span class="emoji secreto">${d.emoji}</span>
        <div class="datos"><b>${esc(j.nombre)}</b> <span class="rol secreto">${d.nombre}</span>
          ${marcas.length ? `<small class="marcas secreto">${marcas.join(" · ")}</small>` : ""}
          ${j.vivo ? "" : `<small>☠ ${textoMuerte(j)}</small>`}</div>
        ${enJuego ? `<button class="mini" data-a="${j.vivo ? "sacar" : "revivir"}" data-id="${j.id}">${j.vivo ? "Sacar" : "Revivir"}</button>` : ""}
      </div>`;
    }).join("") + `</div>`;
    if (enJuego) h += `<p class="nota">«Sacar» y «Revivir» son para corregir errores o si alguien se tiene que ir. Se pueden deshacer.</p>`;
    $("tablaJug").innerHTML = h;
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
        <li>💘 Cupido <span class="tenue">(solo la primera noche)</span></li>
        <li>💞 Enamorados se reconocen <span class="tenue">(solo la primera noche)</span></li>
        <li>🔮 Vidente</li><li>🛡️ Protector</li><li>🐺 Lobos</li><li>🧪 Bruja</li>
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
    const tema = s && (s.fase === "dia" || (s.fase === "fin" && s.ganador !== "lobos")) ? "dia" : "noche";
    if (document.body.dataset.fase !== tema) {
      document.body.dataset.fase = tema;
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.content = tema === "dia" ? "#efdfbf" : "#0b0f24";
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
        juego.empezar(cfg); sel = selVacia(); reloj.clave = null;
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
        hacer("empezar");
        if (faltan) aviso(`Ojo: ${plural(faltan, "jugador no vio", "jugadores no vieron")} su rol en la app.`);
        break;
      }

      // Elegir jugadores
      case "elegir": {
        const p = s.fase === "noche" ? E.pasoActual(s) : s.etapa;
        sel.nadie = false;
        if (sel.ids.includes(id)) sel.ids = sel.ids.filter(x => x !== id);
        else if (p === "cupido") { sel.ids.push(id); if (sel.ids.length > 2) sel.ids.shift(); }
        else sel.ids = [id];
        renderNarrador(); break;
      }
      case "nadie": sel.nadie = !sel.nadie; sel.ids = []; renderNarrador(); break;
      case "veneno": sel.veneno = id; renderNarrador(); break;
      case "curar": sel.curar = b.dataset.v === "1"; renderNarrador(); break;
      case "siguiente":
        hacer("avanzar", { ids: sel.ids, id: sel.ids.length ? sel.ids[0] : null, curar: sel.curar, veneno: sel.veneno, nadie: sel.nadie });
        break;
      case "deshacer":
        if (juego.puedeDeshacer) { juego.deshacer(); sel = selVacia(); velo = null; guardar(); render(); aviso("Deshecho"); }
        break;
      case "reloj": controlReloj(b.dataset.v); break;

      // Otros
      case "discreto": discreto = !discreto; render(); break;
      case "sacar": hacer("sacar", { id }); break;
      case "revivir": hacer("revivir", { id }); break;
      case "revancha": juego.revancha(); sel = selVacia(); reloj.clave = null; guardar(); render(); window.scrollTo(0, 0); break;
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
