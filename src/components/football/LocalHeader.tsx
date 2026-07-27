'use client';

import { useState } from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { useGame } from "@/lib/football/store";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/football/AuthModal";

/**
 * LocalHeader — encabezado fijo superior común a todas las pantallas del modo
 * local. Al tocar el título: si hay un partido en curso, pide confirmación
 * antes de volver al inicio; si no, vuelve directo, sin preguntar.
 * También muestra el estado de sesión (email / iniciar sesión) a la derecha.
 */
export function LocalHeader() {
  const { screen, setScreen } = useGame();
  const { user, signOut, loading: authLoading } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

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

          {!authLoading && (
            user ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User size={12} />
                  {user.email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={12} />
                  Salir
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded px-2 py-1"
                aria-label="Iniciar sesión"
              >
                <LogIn size={12} />
                Iniciar sesión
              </button>
            )
          )}
        </div>
      </header>

      <AuthModal
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        reason="Iniciá sesión para guardar y cargar equipos entre sesiones."
      />

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