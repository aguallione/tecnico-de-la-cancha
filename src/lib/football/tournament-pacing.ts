/**
 * tournament-pacing.ts — define el ritmo real↔juego de un partido de
 * torneo online en tiempo real: 1 minuto de juego cada 5 segundos reales,
 * con una pausa real de 60 segundos en el entretiempo (entre el minuto 45
 * y el 46). Se usa tanto en segundo plano (tournament-cron.ts, cada vez
 * que pasa el vigilante) como más adelante en vivo (4.4-6d, polling desde
 * el navegador) — el mismo cálculo sirve para las dos cosas, así el ritmo
 * percibido es siempre el mismo sin importar quién pregunta ni cuándo.
 */

export const SEGUNDOS_POR_MINUTO_DE_JUEGO = 5;
export const SEGUNDOS_PAUSA_ENTRETIEMPO = 60;
const MINUTO_ENTRETIEMPO = 45;

/**
 * Dado cuántos segundos reales pasaron desde el saque inicial, devuelve
 * a qué minuto de juego debería haber llegado el partido a esta altura.
 * No tiene en cuenta el fin del partido (90 + descuento) — eso lo maneja
 * tickMinute solo; acá simplemente no haría falta seguir llamando una vez
 * que state.finished ya es true.
 */
export function minutoObjetivo(segundosTranscurridos: number): number {
  const segundosHastaEntretiempo = MINUTO_ENTRETIEMPO * SEGUNDOS_POR_MINUTO_DE_JUEGO;
  if (segundosTranscurridos <= segundosHastaEntretiempo) {
    return Math.floor(segundosTranscurridos / SEGUNDOS_POR_MINUTO_DE_JUEGO);
  }
  const segundosTrasLlegar = segundosTranscurridos - segundosHastaEntretiempo;
  if (segundosTrasLlegar <= SEGUNDOS_PAUSA_ENTRETIEMPO) {
    return MINUTO_ENTRETIEMPO;
  }
  const segundosSegundoTiempo = segundosTrasLlegar - SEGUNDOS_PAUSA_ENTRETIEMPO;
  return MINUTO_ENTRETIEMPO + Math.floor(segundosSegundoTiempo / SEGUNDOS_POR_MINUTO_DE_JUEGO);
}