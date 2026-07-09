import type { MatchEvent } from "./types";

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function kickoff(): MatchEvent {
  return {
    minute: 0,
    kind: "kickoff",
    text: pick([
      "¡Rueda la pelotaaa! Arranca el partido, señoras y señores.",
      "Silbatazo inicial. Se pone en marcha este partidazo.",
      "¡Y arrancamos! Que el fútbol nos regale una tarde inolvidable.",
    ]),
  };
}

export function goal(minute: number, scorer: string, team: 0 | 1, teamName: string): MatchEvent {
  const templates = [
    `¡GOOOOOOL de ${teamName}! ¡La clavó ${scorer}! Un golazo para enmarcar al minuto ${minute}.`,
    `¡GOL, GOL, GOL! ${scorer} se hizo la fiesta y anota para ${teamName}. ¡Explota el banco!`,
    `¡Adentroooo! ${scorer} no perdona y pone en ventaja a ${teamName}. Bien merecido, hay que decirlo.`,
    `¡La pelota besó la red! ${scorer} marca para ${teamName}. Delicioso el pase que recibió.`,
    `¡GOOOOOL! ${scorer} apareció como los grandes. ${teamName} lo está ganando.`,
  ];
  return { minute, kind: "goal", team, text: pick(templates) };
}

export function chance(minute: number, player: string, teamName: string): MatchEvent {
  const templates = [
    `¡Uuuuh, la tuvo ${player}! Se le fue apenas ancha para ${teamName}. Se agarra la cabeza el técnico.`,
    `¡La pelota pegó en el palo! Increíble lo de ${player}. ${teamName} lo tuvo servido.`,
    `Buen intento de ${player}, pero el arquero rival respondió como los grandes.`,
    `${player} probó de media distancia. Se fue rozando el travesaño. Qué bronca para ${teamName}.`,
    `¡Se salvó! Un manotazo felino evitó el gol de ${player}.`,
  ];
  return { minute, kind: "chance", text: pick(templates) };
}

export function foulEv(minute: number, player: string): MatchEvent {
  return {
    minute,
    kind: "foul",
    text: pick([
      `Falta de ${player}. El juez la cobra sin dudar.`,
      `${player} llegó tarde. Silbatazo del árbitro.`,
      `Infracción de ${player}. Hay que tener cuidado, eh.`,
    ]),
  };
}

export function cornerEv(minute: number, teamName: string): MatchEvent {
  return {
    minute,
    kind: "corner",
    text: pick([
      `Tiro de esquina para ${teamName}. A ver qué inventan.`,
      `Córner para ${teamName}. Suben los grandotes al área.`,
    ]),
  };
}

export function yellow(minute: number, player: string): MatchEvent {
  return {
    minute,
    kind: "card",
    text: pick([
      `¡Amarilla para ${player}! Se pone caliente el partido.`,
      `Tarjeta amarilla para ${player}. Habrá que cuidarse el resto del partido.`,
    ]),
  };
}

export function red(minute: number, player: string, teamName: string): MatchEvent {
  return {
    minute,
    kind: "card",
    text: pick([
      `¡ROJA! ${player} se va a las duchas antes de tiempo. ${teamName} se queda con uno menos. Papelón.`,
      `¡Expulsado ${player}! Ni siquiera protestó, sabía lo que hizo. ${teamName} sufre en inferioridad.`,
    ]),
  };
}

export function subEv(minute: number, out: string, inn: string, teamName: string): MatchEvent {
  return {
    minute,
    kind: "sub",
    text: `Cambio en ${teamName}: sale ${out}, entra ${inn}. Mueve el banco el DT.`,
  };
}

export function halftime(): MatchEvent {
  return { minute: 45, kind: "info", text: "Se termina el primer tiempo. Vamos a los vestuarios." };
}

export function secondHalf(): MatchEvent {
  return { minute: 46, kind: "info", text: "Arranca el complemento. A ver qué ajustes trajeron los técnicos." };
}

export function fullTime(minute: number, score: [number, number], names: [string, string]): MatchEvent {
  let text: string;
  if (score[0] === score[1]) {
    text = `¡Final del partido! Empate ${score[0]} a ${score[1]}. Se reparten los puntos entre ${names[0]} y ${names[1]}.`;
  } else {
    const winner = score[0] > score[1] ? names[0] : names[1];
    text = `¡Final del partido! Se lo lleva ${winner} por ${Math.max(...score)} a ${Math.min(...score)}. Alegría inmensa en la parcialidad.`;
  }
  return { minute, kind: "final", text };
}

export function injuryEv(minute: number, player: string): MatchEvent {
  return {
    minute,
    kind: "info",
    text: `${player} queda tocado en el campo. Preocupación en el banco.`,
  };
}

export function tickComment(minute: number): MatchEvent {
  return {
    minute,
    kind: "info",
    text: pick([
      "Se juega en el medio, cero peligro por ahora.",
      "Traba y traba. Trabado el partido.",
      "Circula la pelota, buscan un espacio.",
      "Presiona alto la visita. Complicado sacar desde el fondo.",
      "Ritmo cansino, se hace largo esto.",
    ]),
  };
}

// ─── Eventos de automatización táctica ───────────────────────────────────────

export function autoClosingDown(minute: number, teamName: string): MatchEvent {
  return {
    minute,
    kind: "info",
    text: pick([
      `[AUTO] ${teamName} baja la línea y se pone defensivo. Hay que cuidar el resultado.`,
      `[AUTO] El equipo ajusta su posicionamiento: línea baja y mentalidad defensiva en ${teamName}.`,
      `[AUTO] Con la ventaja ajustada, ${teamName} cierra líneas y protege el arco. Orden táctico.`,
    ]),
  };
}

export function autoExploitRed(minute: number, teamName: string): MatchEvent {
  return {
    minute,
    kind: "info",
    text: pick([
      `[AUTO] ${teamName} sube la línea tras la expulsión rival. Hay que aprovecharlo.`,
      `[AUTO] El equipo ajusta su posicionamiento tras la expulsión. ${teamName} presiona más arriba.`,
      `[AUTO] Con un hombre menos el rival, ${teamName} adelanta la defensa para asfixiarlo.`,
    ]),
  };
}

export function autoStaminaAlert(minute: number, playerName: string, teamName: string): MatchEvent {
  return {
    minute,
    kind: "info",
    text: `[AVISO] ${playerName} (${teamName}) está bajando el rendimiento físico. Considerá un cambio.`,
  };
}

// ─── Eventos de sugerencias de IA (solo informativos) ────────────────────────

export function aiInsight(minute: number, text: string): MatchEvent {
  return { minute, kind: "insight" as MatchEvent["kind"], text: `[DT IA] ${text}` };
}
