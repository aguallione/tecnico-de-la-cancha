'use client';
/**
 * AuthModal
 *
 * Modal de login / registro con email y contraseña.
 * Se abre programáticamente desde SquadOriginSelector cuando el usuario
 * intenta guardar un equipo sin sesión iniciada.
 *
 * Props:
 *   open       — controla la visibilidad
 *   onClose    — callback al cerrar (sin iniciar sesión)
 *   onSuccess  — callback al iniciar/crear sesión correctamente
 *   reason     — texto opcional que explica por qué se requiere la sesión
 */

import { useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  reason?: string;
}

type FormMode = "login" | "register";

export function AuthModal({ open, onClose, onSuccess, reason }: Props) {
  const { signIn, signUp } = useAuth();
  const [formMode, setFormMode] = useState<FormMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  if (!open) return null;

  function reset() {
    setEmail("");
    setPassword("");
    setError(null);
    setConfirmMessage(null);
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function switchMode(m: FormMode) {
    setFormMode(m);
    setError(null);
    setConfirmMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    setConfirmMessage(null);

    if (formMode === "login") {
      const result = await signIn(email.trim(), password);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        reset();
        onSuccess?.();
        onClose();
      }
    } else {
      const result = await signUp(email.trim(), password);
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else if (result.needsConfirm) {
        setConfirmMessage(
          "Te enviamos un email de confirmación. Revisá tu casilla y volvé a iniciar sesión.",
        );
      } else {
        reset();
        onSuccess?.();
        onClose();
      }
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={formMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
    >
      <div className="card w-full max-w-sm p-6 relative">
        {/* Cerrar */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Cerrar"
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={18} />
        </button>

        {/* Encabezado */}
        <h2 className="font-display text-xl font-bold">
          {formMode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h2>

        {reason && (
          <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
        )}

        {/* Tabs login / registro */}
        <div className="mt-4 flex rounded-lg bg-muted p-1 gap-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              formMode === "login"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition-colors ${
              formMode === "register"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Crear cuenta
          </button>
        </div>

        {/* Formulario */}
        {confirmMessage ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-primary">{confirmMessage}</p>
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="btn-secondary w-full text-sm"
            >
              Ir a Iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Contraseña
              </label>
              <input
                type="password"
                autoComplete={formMode === "login" ? "current-password" : "new-password"}
                className="input w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
              />
              {formMode === "register" && (
                <p className="mt-1 text-[11px] text-muted-foreground">Mínimo 6 caracteres.</p>
              )}
            </div>

            {error && (
              <p className="text-xs text-destructive-foreground bg-destructive rounded px-2 py-1.5">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading
                ? formMode === "login"
                  ? "Iniciando sesión..."
                  : "Creando cuenta..."
                : formMode === "login"
                  ? "Iniciar sesión"
                  : "Crear cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
