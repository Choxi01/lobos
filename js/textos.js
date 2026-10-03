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
    cupido: () => ({
      titulo: "Cupido",
      leer: "Cupido, despertate. Señalá a las dos personas que se van a enamorar perdidamente.",
      nota: "Tocá a los dos que señale (puede elegirse a sí mismo). Después tocales la cabeza a los dos enamorados, despacito.",
      cerrar: "Cupido, cerrá los ojos.",
    }),
    enamorados: () => ({
      titulo: "Los enamorados",
      leer: "Las dos personas a las que les toqué la cabeza: abran los ojos y mírense. Están enamorados: si uno muere, el otro muere de pena.",
      nota: "Dejá que se reconozcan unos segundos.",
      cerrar: "Enamorados, cierren los ojos.",
    }),
    vidente: () => ({
      titulo: "La vidente",
      leer: "Vidente, despertate. Señalá a la persona cuyo verdadero rol querés conocer.",
      nota: "Tocá a quién señaló. Mostrale el resultado: la carta, o pulgar abajo si es lobo y arriba si no.",
      cerrar: "Vidente, cerrá los ojos.",
    }),
    protector: () => ({
      titulo: "El protector",
      leer: "Protector, despertate. ¿A quién vas a proteger esta noche?",
      nota: "Tocá a quién señala. Puede elegirse a sí mismo.",
      cerrar: "Protector, cerrá los ojos.",
    }),
    lobos: r => ({
      titulo: "Los lobos",
      leer: r === 1
        ? "Lobos, despierten. Mírense bien: ustedes son la manada. Pónganse de acuerdo en silencio… ¿a quién se comen esta noche?"
        : "Lobos, despierten. La manada tiene hambre… ¿a quién se comen esta noche?",
      nota: r === 1 ? "Primera noche: dejá que se reconozcan. Tienen que elegir una sola víctima, señalándola." : "Tienen que coincidir en una sola víctima.",
      cerrar: "Lobos, cierren los ojos.",
    }),
    bruja: () => ({
      titulo: "La bruja",
      leer: "Bruja, despertate. Esta noche los lobos atacaron a esta persona… (señalala). ¿Querés usar tu poción de vida para salvarla? ¿Y tu poción de muerte con alguien?",
      nota: "Señalale la víctima con el dedo. Ella responde con gestos: sí o no para la vida, y a quién para la muerte.",
      cerrar: "Bruja, cerrá los ojos.",
    }),
  };

  const DIA = {
    amanecer: r => elegir([
      "¡Amanece en el pueblo! Todos abren los ojos…",
      "Canta el gallo y sale el sol. Todos abran los ojos…",
      "Una mañana gris cae sobre el pueblo. Abran los ojos…",
      "El pueblo se despierta con un mal presentimiento. Ojos abiertos…",
    ], r),
    sinMuertos: "…y milagrosamente esta noche no murió nadie.",
    muerte: {
      lobos: n => `…y encuentran el cuerpo de ${n} en la plaza. Los lobos pasaron por acá.`,
      bruja: n => `…y ${n} no se despierta. Nadie sabe bien qué le pasó.`,
      pena: n => `${n} no soporta perder a su amor y muere de pena.`,
      cazador: n => `¡PUM! ${n} cae bajo el disparo del cazador.`,
      linchado: n => `El pueblo decidió: ${n} es llevado a la horca.`,
      narrador: n => `${n} deja el juego.`,
    },
    era: rol => `Era… ${rol}.`,
    debate: min => `Ahora el pueblo debate: entre ustedes se esconde algún lobo. Tienen ${min} para decidir a quién linchar.`,
    debateNota: "Los muertos no hablan ni votan. Si el debate se estanca, podés cortarlo antes.",
    votacion: "Se terminó el tiempo. A la cuenta de tres, todos señalan a quien quieren linchar. Uno… dos… ¡tres!",
    votacionNota: "Tocá al más votado. Si hay empate, decidan en la mesa si desempatan o no se lincha a nadie.",
    nadieLinchado: "El pueblo no se pone de acuerdo y hoy nadie va a la horca.",
    tonto: n => `¡Esperen! ${n} era el Tonto del pueblo. Lo perdonan por tonto, pero desde ahora ya no vota.`,
    cazador: n => `${n} era el Cazador. Antes de caer, levanta la escopeta… ¿A quién te llevás con vos?`,
    cazadorNota: "Que señale a alguien. Puede decidir no disparar.",
    noDisparo: n => `${n} baja la escopeta y no dispara.`,
    anochece: "El día termina. Prepárense para la noche…",
  };

  const FIN = {
    lobos: { titulo: "¡Ganan los lobos!", leer: "Los lobos se comieron al último inocente. El pueblo quedó en manos de la manada." },
    aldea: { titulo: "¡Gana la aldea!", leer: "Cayó el último lobo. El pueblo por fin puede dormir tranquilo." },
    enamorados: { titulo: "¡Ganan los enamorados!", leer: "Contra todo y contra todos, los dos enamorados quedan solos en el pueblo. El amor ganó." },
    nadie: { titulo: "No queda nadie", leer: "El pueblo quedó vacío. Nadie gana esta vez." },
  };

  const FINGIR = rol => `${rol} está muerto/a, pero leé igual y esperá unos segundos para que nadie se dé cuenta.`;

  const api = { NOCHE, DIA, FIN, FINGIR };
  raiz.LoboTextos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
