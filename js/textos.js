// Lo que lee el narrador en voz alta (leer / cerrar) y las notas solo para él (nota).
// Editá libremente estas frases: se eligen según el número de noche para que no se repitan siempre.
(function (raiz) {
  "use strict";

  const elegir = (lista, n) => lista[(Math.max(1, n) - 1) % lista.length];

  const NOCHE = {
    anochecer: r => ({
      titulo: r === 1 ? "Cae la primera noche" : `Cae la noche ${r}`,
      leer: elegir([
        "El sol se esconde detrás de las montañas y el pueblo se va a dormir. Todos cierren los ojos y bajen la cabeza.",
        "Otra vez se hace de noche. Las puertas se cierran, las velas se apagan… Todos cierren los ojos.",
        "La luna sale sobre los tejados y algo se mueve en el bosque. Todos a dormir: ojos cerrados.",
        "El pueblo, cansado, se acuesta una noche más. ¿Cuántos verán el amanecer? Cierren los ojos.",
      ], r),
      nota: "Esperá a que todos tengan los ojos cerrados. Pediles que golpeen suave la mesa con las manos para tapar los ruidos.",
    }),
    vidente: () => ({
      titulo: "La vidente",
      leer: "Vidente, despertate. Señalá a la persona que sospechás que es lobo.",
      nota: "Tocá a quién señaló y mostrale el resultado con la mano: pulgar arriba si es lobo, pulgar abajo si no.",
      cerrar: "Vidente, cerrá los ojos.",
    }),
    protector: () => ({
      titulo: "El protector",
      leer: "Protector, despertate. ¿A quién vas a proteger esta noche?",
      nota: "Tocá a quién señala. Puede elegirse a sí mismo.",
      cerrar: "Protector, cerrá los ojos.",
    }),
    lobos: (r, tranquila) => tranquila ? {
      titulo: "Los lobos",
      leer: "Lobos, despierten. Mírense bien: ustedes son la manada. Esta primera noche solo se reconocen; mañana empieza la cacería.",
      nota: "Primera noche tranquila: dejá que se reconozcan unos segundos. No eligen víctima.",
      cerrar: "Lobos, cierren los ojos.",
    } : ({
      titulo: "Los lobos",
      leer: r === 1
        ? "Lobos, despierten. Mírense bien: ustedes son la manada. Pónganse de acuerdo en silencio… ¿a quién se comen esta noche?"
        : "Lobos, despierten. La manada tiene hambre… ¿a quién se comen esta noche?",
      nota: r === 1 ? "Primera noche: dejá que se reconozcan. Tienen que elegir una sola víctima, señalándola." : "Tienen que coincidir en una sola víctima.",
      cerrar: "Lobos, cierren los ojos.",
    }),
    convertido: n => `🧛 ${n} es el Maldito y anoche lo mordieron: ahora es lobo. Tocale la cabeza para que abra los ojos con la manada.`,
  };

  const DIA = {
    amanecer: r => elegir([
      "¡Amanece en el pueblo! Todos abren los ojos…",
      "Canta el gallo y sale el sol. Todos abran los ojos…",
      "Una mañana gris cae sobre el pueblo. Abran los ojos…",
      "El pueblo se despierta con un mal presentimiento. Ojos abiertos…",
    ], r),
    sinMuertos: "…y milagrosamente esta noche no murió nadie.",
    nocheTranquila: "…y la primera noche pasó en calma. Pero algo se movió en la oscuridad: ahora saben que hay lobos entre ustedes.",
    muerte: {
      lobos: n => `…y encuentran el cuerpo de ${n} en la plaza. Los lobos pasaron por acá.`,
      cazador: n => `¡PUM! ${n} cae bajo el disparo del cazador.`,
      linchado: n => `El pueblo decidió: ${n} es llevado a la horca.`,
      narrador: n => `${n} deja el juego.`,
    },
    era: rol => `Era… ${rol}.`,
    debate: min => `Ahora el pueblo debate: entre ustedes se esconde algún lobo. Tienen ${min} para decidir a quién linchar.`,
    debateNota: "Los muertos no hablan ni votan. Si el debate se estanca, podés cortarlo antes.",
    votacion: "Se terminó el tiempo. A la cuenta de tres, todos señalan a quien quieren linchar. Uno… dos… ¡tres!",
    votacionNota: "Preguntá por cada uno «¿Quién vota a…?» y sumá los votos con +. Los muertos no votan.",
    segundaVuelta: nombres => `¡Empate! Segunda vuelta: todos votan de nuevo, pero solo entre ${nombres}. Uno… dos… ¡tres!`,
    nadieLinchado: "El pueblo no se pone de acuerdo y hoy nadie va a la horca.",
    cazador: n => `${n} era el Cazador. Antes de caer, levanta la escopeta… ¿A quién te llevás con vos?`,
    cazadorNota: "Que señale a alguien. Puede decidir no disparar.",
    noDisparo: n => `${n} baja la escopeta y no dispara.`,
    anochece: "El día termina. Prepárense para la noche…",
  };

  const FIN = {
    lobos: { titulo: "¡Ganan los lobos!", leer: "Los lobos se comieron al último inocente. El pueblo quedó en manos de la manada." },
    aldea: { titulo: "¡Gana la aldea!", leer: "Cayó el último lobo. El pueblo por fin puede dormir tranquilo." },
    nadie: { titulo: "No queda nadie", leer: "El pueblo quedó vacío. Nadie gana esta vez." },
  };

  const FINGIR = rol => `${rol} está muerto/a, pero leé igual y esperá unos segundos para que nadie se dé cuenta.`;

  const api = { NOCHE, DIA, FIN, FINGIR };
  raiz.LoboTextos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
