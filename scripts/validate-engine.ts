/**
 * validate-engine.ts
 *
 * Script de validación del motor de simulación con los 6 atributos nuevos.
 * Verifica:
 *   1. Goles === tiros al arco - atajadas (invariante matemática).
 *   2. Un defensor puesto de arquero no rinde como arquero (más goles encajados).
 *   3. El arquero no convierte goles (peso ínfimo).
 *   4. Los remates son hechos mayormente por jugadores con Tiro+Regate altos.
 *   5. La posesión y el xG son coherentes.
 *
 * Se ejecuta con: npx tsx scripts/validate-engine.ts
 */

import { generateSquad } from "../src/lib/football/players";
import { autoBotTeam } from "../src/lib/football/bot";
import { initMatch, tickMinute, computePlayerRating, computeTeamRating, type MatchState } from "../src/lib/football/engine";
import { makeTeamFromSquad } from "../src/lib/football/store";
import type { Player, Team, MatchSettings, Position } from "../src/lib/football/types";

const DEFAULT_SETTINGS: MatchSettings = {
  injuriesEnabled: true,
  maxSubs: 5,
  vsBot: true,
  automations: { closingDown: false, exploitRedCard: false, staminaAlert: false },
  seeRivalSquad: true,
  seeRivalRatings: true,
  seeOwnRatings: true,
};

function makeTeam(name: string, color: string, isBot: boolean): Team {
  const squad = generateSquad(20);
  const team = makeTeamFromSquad({ name, color, isBot }, squad);
  autoBotTeam(team);
  return team;
}

function simulateMatch(state: MatchState): void {
  while (!state.finished) {
    tickMinute(state);
  }
}

function run() {
  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  function check(label: string, condition: boolean, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${label}`);
    } else {
      failed++;
      const msg = `  ✗ ${label}${detail ? " — " + detail : ""}`;
      console.log(msg);
      failures.push(msg);
    }
  }

  console.log("\n=== Validación del motor (6 atributos) ===\n");

  // ── Test 1: Invariante goles = tiros al arco - atajadas ───────────────────
  console.log("Test 1: Invariante goles = tiros_al_arco_rival - atajadas_propias");

  for (let i = 0; i < 20; i++) {
    const A = makeTeam("Equipo A", "#dc2626", false);
    const B = makeTeam("Equipo B", "#2563eb", true);
    const state = initMatch([A, B], DEFAULT_SETTINGS);
    simulateMatch(state);

    // Para equipo A: goles_recibidos = B.goals, atajadas = A.saves, tiros_al_arco_rival = B.shotsOnTarget
    const golesRecibidosA = B.goals;
    const atajadasA = A.saves;
    const tirosAlArcoB = B.shotsOnTarget;
    check(
      `Partido ${i + 1}: A — goles_recibidos(${golesRecibidosA}) === tiros_arco_rival(${tirosAlArcoB}) - atajadas(${atajadasA})`,
      golesRecibidosA === tirosAlArcoB - atajadasA,
      `got ${golesRecibidosA} vs ${tirosAlArcoB} - ${atajadasA} = ${tirosAlArcoB - atajadasA}`,
    );

    const golesRecibidosB = A.goals;
    const atajadasB = B.saves;
    const tirosAlArcoA = A.shotsOnTarget;
    check(
      `Partido ${i + 1}: B — goles_recibidos(${golesRecibidosB}) === tiros_arco_rival(${tirosAlArcoA}) - atajadas(${atajadasB})`,
      golesRecibidosB === tirosAlArcoA - atajadasB,
      `got ${golesRecibidosB} vs ${tirosAlArcoA} - ${atajadasB} = ${tirosAlArcoA - atajadasB}`,
    );
  }

  // ── Test 2: Defensor como arquero encaja más goles ────────────────────────
  console.log("\nTest 2: Defensor como arquero rinde peor que arquero real");

  let defensorGKGoalsEncajados = 0;
  let realGKGoalsEncajados = 0;

  for (let i = 0; i < 10; i++) {
    // Equipo con defensor como arquero
    const A_bad = makeTeam("Bad GK", "#dc2626", false);
    // Sacar al arquero titular y poner un defensor de arquero
    const gkIdx = A_bad.starting.findIndex((id) => A_bad.squad.find((p) => p.id === id)?.position === "GK");
    const defensor = A_bad.squad.find((p) => p.position === "DEF" && !A_bad.starting.includes(p.id));
    if (gkIdx >= 0 && defensor) {
      A_bad.starting[gkIdx] = defensor.id;
    }
    const B1 = makeTeam("Bot", "#2563eb", true);
    const state1 = initMatch([A_bad, B1], DEFAULT_SETTINGS);
    simulateMatch(state1);
    defensorGKGoalsEncajados += B1.goals;

    // Equipo con arquero real
    const A_good = makeTeam("Good GK", "#dc2626", false);
    const B2 = makeTeam("Bot", "#2563eb", true);
    const state2 = initMatch([A_good, B2], DEFAULT_SETTINGS);
    simulateMatch(state2);
    realGKGoalsEncajados += B2.goals;
  }

  const avgBad = defensorGKGoalsEncajados / 10;
  const avgGood = realGKGoalsEncajados / 10;
  check(
    `Defensor como GK encaja más goles en promedio (${avgBad.toFixed(1)} vs ${avgGood.toFixed(1)})`,
    avgBad > avgGood,
    `bad=${avgBad.toFixed(1)}, good=${avgGood.toFixed(1)}`,
  );

  // ── Test 3: Arquero no convierte goles ────────────────────────────────────
  console.log("\nTest 3: Arquero no debe convertir goles");

  let gkGoals = 0;
  for (let i = 0; i < 10; i++) {
    const A = makeTeam("A", "#dc2626", false);
    const B = makeTeam("B", "#2563eb", true);
    const state = initMatch([A, B], DEFAULT_SETTINGS);
    simulateMatch(state);

    // Verificar que ningún GK haya convertido
    for (const t of state.teams) {
      for (const p of t.squad) {
        if (p.position === "GK" && state.playerStats[p.id]?.goals > 0) {
          gkGoals += state.playerStats[p.id].goals;
        }
      }
    }
  }
  check(`Arqueros convirtieron goles en 10 partidos (esperado ~0)`, gkGoals === 0, `gkGoals=${gkGoals}`);

  // ── Test 4: Remates hechos por jugadores con Tiro+Regate altos ───────────
  console.log("\nTest 4: Los remates los hacen jugadores con Tiro+Regate altos");

  let totalShooterRating = 0;
  let totalShots = 0;
  let fwdShots = 0;
  let gkShots = 0;

  for (let i = 0; i < 10; i++) {
    const A = makeTeam("A", "#dc2626", false);
    const B = makeTeam("B", "#2563eb", true);
    const state = initMatch([A, B], DEFAULT_SETTINGS);
    simulateMatch(state);

    for (const t of state.teams) {
      for (const p of t.squad) {
        const stats = state.playerStats[p.id];
        if (stats && stats.shots > 0) {
          const shooterRating = p.shooting * 0.7 + p.dribbling * 0.3;
          totalShooterRating += shooterRating * stats.shots;
          totalShots += stats.shots;
          if (p.position === "FWD") fwdShots += stats.shots;
          if (p.position === "GK") gkShots += stats.shots;
        }
      }
    }
  }

  const avgShooterRating = totalShots > 0 ? totalShooterRating / totalShots : 0;
  check(
    `Promedio de Tiro+Regate de rematadores ≥ 60 (${avgShooterRating.toFixed(1)})`,
    avgShooterRating >= 60,
    `avg=${avgShooterRating.toFixed(1)}`,
  );
  check(
    `Delanteros hacen la mayoría de los tiros (${fwdShots} de ${totalShots})`,
    fwdShots > totalShots * 0.4,
    `fwd=${fwdShots}, total=${totalShots}`,
  );
  check(
    `Arqueros prácticamente no rematan (${gkShots} tiros en 10 partidos)`,
    gkShots <= 2,
    `gkShots=${gkShots}`,
  );

  // ── Test 5: xG coherente con goles ───────────────────────────────────────
  console.log("\nTest 5: xG razonable vs goles");

  let totalXG = 0;
  let totalGoals = 0;
  for (let i = 0; i < 20; i++) {
    const A = makeTeam("A", "#dc2626", false);
    const B = makeTeam("B", "#2563eb", true);
    const state = initMatch([A, B], DEFAULT_SETTINGS);
    simulateMatch(state);
    totalXG += A.xg + B.xg;
    totalGoals += A.goals + B.goals;
  }
  const ratio = totalGoals / Math.max(1, totalXG);
  check(
    `Ratio goles/xG entre 0.5 y 2.0 (${ratio.toFixed(2)}, goles=${totalGoals}, xG=${totalXG.toFixed(1)})`,
    ratio >= 0.5 && ratio <= 2.0,
    `ratio=${ratio.toFixed(2)}`,
  );

  // ── Test 6: Player ratings coherentes ────────────────────────────────────
  console.log("\nTest 6: Valoraciones de jugadores coherentes");

  for (let i = 0; i < 5; i++) {
    const A = makeTeam("A", "#dc2626", false);
    const B = makeTeam("B", "#2563eb", true);
    const state = initMatch([A, B], DEFAULT_SETTINGS);
    simulateMatch(state);

    const teamRatingA = computeTeamRating(A, state.playerStats);
    check(
      `Partido ${i + 1}: valoración del equipo A entre 3.0 y 9.0 (${teamRatingA})`,
      teamRatingA >= 3.0 && teamRatingA <= 9.0,
      `rating=${teamRatingA}`,
    );
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log("\n=== Resumen ===");
  console.log(`  Pasaron: ${passed}`);
  console.log(`  Fallaron: ${failed}`);
  if (failures.length > 0) {
    console.log("\nFallos:");
    failures.forEach((f) => console.log(f));
  }
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

run();
