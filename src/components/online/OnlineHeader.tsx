'use client';

import { useState } from "react";
import { useOnlineGame } from "@/lib/online/store";
import { abandonarSala } from "@/lib/online/server-fns";

/**
 * OnlineHeader — encabezado fijo superior común a todas las pantallas del modo online.
 * Muestra el nombre de la app como título. Al tocarlo, abre un modal de confirmación
 * de abandono de la sala.
 */
export function OnlineHeader() {
  const { partida, miJugador, salir, refrescar } = useOnlineGame();
  const [showModal, setShowModal] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleAbandonar() {
    if (!partida || !miJugador) {
      await salir();
      setShowModal(false);
      return;
    }
    setLeaving(true);
    try {
      await abandonarSala({
        data: { partida_id: partida.id, jugador_id: miJugador.id },
      });
      await salir();
    } catch {
      // Si falla el server fn, igual sacamos al cliente de la sala
      await salir();
    } finally {
      setLeaving(false);
      setShowModal(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => setShowModal(true)}
            className="font-display text-lg font-black tracking-tight hover:opacity-70 transition-opacity"
            title="Abandonar sala"
          >
            DT Online
          </button>
          {partida && (
            <span className="text-xs text-muted-foreground tabular-nums">
              Sala: {partida.codigo}
            </span>
          )}
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background text-foreground rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <h3 className="font-display text-xl font-black">Abandonar la sala</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Vas a abandonar la sala.
              {partida?.estado === "jugando"
                ? " Si tu equipo no tiene otros jugadores humanos, el rival ganará automáticamente."
                : ""}
              <br />
              <br />
              ¿Confirmás?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                className="btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={leaving}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleAbandonar}
                disabled={leaving}
              >
                {leaving ? "Saliendo…" : "Abandonar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
