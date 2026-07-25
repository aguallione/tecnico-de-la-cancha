'use client';

import { useState } from "react";
import { useGame } from "@/lib/football/store";

/**
 * LocalHeader — encabezado fijo superior común a todas las pantallas del modo
 * local. Al tocar el título: si hay un partido en curso, pide confirmación
 * antes de volver al inicio; si no, vuelve directo, sin preguntar.
 */
export function LocalHeader() {
  const { screen, setScreen } = useGame();
  const [showModal, setShowModal] = useState(false);

  const partidoEnCurso = screen === "match";

  function handleClick() {
    if (partidoEnCurso) {
      setShowModal(true);
    } else {
      setScreen("home");
    }
  }

  function confirmarSalida() {
    setShowModal(false);
    setScreen("home");
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={handleClick}
            className="font-display text-lg font-black tracking-tight hover:opacity-70 transition-opacity"
            title="Volver al inicio"
          >
            DT Fútbol
          </button>
        </div>
      </header>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background text-foreground rounded-2xl w-full max-w-sm p-6 shadow-xl text-center">
            <h3 className="font-display text-xl font-black">Salir al inicio</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Vas a salir, se perderá el progreso de este partido. ¿Confirmás?
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>
                Cancelar
              </button>
              <button className="btn-primary" onClick={confirmarSalida}>
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}