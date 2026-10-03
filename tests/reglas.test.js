// Pruebas de las reglas: node tests/reglas.test.js
"use strict";
const R = require("../js/roles.js");
globalThis.LoboRoles = R;
const E = require("../js/estado.js");

let fallas = 0, total = 0;
function prueba(nombre, fn) {
  total++;
  try { fn(); console.log("  ✓ " + nombre); }
  catch (e) { fallas++; console.log("  ✗ " + nombre + "\n      " + e.message); }
}
function igual(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error((msg || "") + ` esperaba ${B} y dio ${A}`);
}
function ok(r) { if (!r.ok) throw new Error("falló la acción: " + r.motivo); }

// Arma una partida con roles fijos (en el orden de los nombres).
function partida(roles, opciones) {
  const nombres = roles.map((r, i) => "J" + i);
  const juego = E.crearJuego(null);
  juego.empezar({ jugadores: nombres, cuentas: { lobo: 1 }, opciones });
  juego.S.jugadores.forEach((j, i) => { j.rol = roles[i]; });
  ok(juego.hacer("empezar"));
  return juego;
}
const av = (juego, d) => juego.hacer("avanzar", d);
const paso = juego => E.pasoActual(juego.S);
// Avanza la noche respondiendo cada paso con lo que diga "resp".
function noche(juego, resp) {
  while (juego.S.fase === "noche") {
    const p = paso(juego);
    ok(av(juego, resp[p] || {}));
  }
}

console.log("Recomendaciones");
prueba("lobos recomendados", () => {
  igual([5, 6, 7, 11, 12, 17, 18, 23].map(R.lobosRecomendados), [1, 1, 2, 2, 3, 3, 4, 5]);
});
prueba("recomendación de 8 jugadores", () => {
  const c = R.recomendar(8);
  igual([c.lobo, c.vidente, c.protector, c.bruja, c.cazador], [2, 1, 1, 1, 0]);
  igual(R.aldeanos(c, 8), 3);
});
prueba("validación", () => {
  igual(R.validar({ lobo: 1 }, 4).ok, false);
  igual(R.validar({ lobo: 0 }, 8).ok, false);
  igual(R.validar({ lobo: 4 }, 8).ok, false);
  igual(R.validar({ lobo: 2, vidente: 1 }, 8).ok, true);
});
prueba("sorteo reparte la cantidad justa", () => {
  const m = R.sortear(10, { lobo: 2, vidente: 1, bruja: 1 });
  igual(m.length, 10);
  igual(m.filter(r => r === "lobo").length, 2);
  igual(m.filter(r => r === "aldeano").length, 6);
});

console.log("Ganador");
const J = (roles, muertos = []) => roles.map((rol, id) => ({ id, rol, vivo: !muertos.includes(id) }));
prueba("aldea gana sin lobos", () => igual(R.ganador(J(["lobo", "aldeano", "aldeano"], [0]), null), "aldea"));
prueba("lobos ganan con paridad", () => igual(R.ganador(J(["lobo", "aldeano", "aldeano"], [1]), null), "lobos"));
prueba("sigue la partida", () => igual(R.ganador(J(["lobo", "aldeano", "aldeano", "aldeano"]), null), null));
prueba("enamorados de distinto equipo ganan solos", () =>
  igual(R.ganador(J(["lobo", "aldeano", "aldeano"], [2]), [0, 1]), "enamorados"));

console.log("Noche");
prueba("pasos de la primera noche con cupido", () => {
  const j = partida(["lobo", "vidente", "protector", "bruja", "cupido", "aldeano"]);
  igual(j.S.pasos, ["anochecer", "cupido", "enamorados", "vidente", "protector", "lobos", "bruja"]);
});
prueba("ataque de lobos mata", () => {
  const j = partida(["lobo", "aldeano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { lobos: { id: 1 } });
  igual(j.S.fase, "dia");
  igual(j.S.anuncio, [{ id: 1, causa: "lobos" }]);
});
prueba("protector salva y no repite", () => {
  const j = partida(["lobo", "protector", "aldeano", "aldeano", "aldeano"]);
  noche(j, { protector: { id: 2 }, lobos: { id: 2 } });
  igual(j.S.anuncio, []);
  ok(av(j)); ok(av(j)); ok(av(j, { nadie: true })); ok(av(j)); // anuncio, debate, votación, veredicto
  igual(j.S.fase, "noche");
  ok(av(j)); // anochecer
  igual(av(j, { id: 2 }).ok, false, "no debería repetir");
});
prueba("bruja cura y envenena", () => {
  const j = partida(["lobo", "bruja", "aldeano", "aldeano", "aldeano", "lobo", "aldeano"]);
  noche(j, { lobos: { id: 2 }, bruja: { curar: true, veneno: 5 } });
  igual(j.S.anuncio, [{ id: 5, causa: "bruja" }]);
  igual([j.S.mem.vida, j.S.mem.muerte], [false, false]);
});
prueba("anciano resiste el primer ataque", () => {
  const j = partida(["lobo", "anciano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { lobos: { id: 1 } });
  igual(j.S.anuncio, []);
  igual(j.S.mem.ancianoHerido, true);
});
prueba("enamorado muere de pena", () => {
  const j = partida(["lobo", "cupido", "aldeano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { cupido: { ids: [2, 3] }, lobos: { id: 2 } });
  igual(j.S.anuncio, [{ id: 2, causa: "lobos" }, { id: 3, causa: "pena" }]);
});
prueba("roles muertos se llaman igual para disimular", () => {
  const j = partida(["lobo", "vidente", "aldeano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { vidente: { id: 0 }, lobos: { id: 1 } });
  ok(av(j)); ok(av(j)); ok(av(j, { nadie: true })); ok(av(j));
  igual(j.S.pasos, ["anochecer", "vidente", "lobos"]);
  ok(av(j)); ok(av(j)); // la vidente muerta no necesita elegir
  igual(paso(j), "lobos");
});

console.log("Día");
prueba("cazador dispara al morir y después gana la aldea", () => {
  const j = partida(["lobo", "cazador", "aldeano", "aldeano", "aldeano"]);
  noche(j, { lobos: { id: 1 } });
  ok(av(j)); // anuncio
  igual(j.S.etapa, "cazador");
  ok(av(j, { id: 0 }));
  igual(j.S.etapa, "disparo");
  ok(av(j));
  igual([j.S.fase, j.S.ganador], ["fin", "aldea"]);
});
prueba("tonto del pueblo se salva una vez", () => {
  const j = partida(["lobo", "tonto", "aldeano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { lobos: { id: 2 } });
  ok(av(j)); ok(av(j));
  ok(av(j, { id: 1 }));
  igual(j.S.jugadores[1].vivo, true);
  igual(j.S.mem.tontoRevelado, true);
});
prueba("linchar al último lobo termina la partida", () => {
  const j = partida(["lobo", "aldeano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { lobos: { id: 1 } });
  ok(av(j)); ok(av(j)); ok(av(j, { id: 0 })); ok(av(j));
  igual(j.S.ganador, "aldea");
});
prueba("lobos ganan al llegar a la paridad", () => {
  const j = partida(["lobo", "aldeano", "aldeano", "aldeano", "aldeano"]);
  noche(j, { lobos: { id: 1 } });
  ok(av(j)); ok(av(j)); ok(av(j, { id: 2 })); ok(av(j));
  noche(j, { lobos: { id: 3 } });
  ok(av(j));
  igual(j.S.ganador, "lobos");
});
prueba("deshacer vuelve al paso anterior", () => {
  const j = partida(["lobo", "aldeano", "aldeano", "aldeano", "aldeano"]);
  ok(av(j));
  igual(paso(j), "lobos");
  j.deshacer();
  igual(paso(j), "anochecer");
});

console.log(`\n${total - fallas}/${total} bien`);
process.exit(fallas ? 1 : 0);
