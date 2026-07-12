'use client';
/**
 * TransferirAdminModal.tsx
 *
 * Modal (solo visible para el Admin) que lista los jugadores conectados
 * (heartbeat reciente) y permite transferir el control a otro device.
 */

import { useState } from "react";
import { X } from "lucide-react";
import { estaConectado, type JugadorOnline } from "@/lib/online/types";
import { transferirAdmin } from "@/server/tick-partida";

interface Props {
  partidaId: string;
  jugadores: JugadorOnline[];
  adminDeviceId: string;
  onClose: () => void;
  onDone: () => void;
}

export function TransferirAdminModal({
  partidaId,
  jugadores,
  adminDeviceId,
  onClose,
  onDone,
}: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Un candidato por device_id (excluyendo el admin actual), conectado.
  const vistos = new Set<string>();
  const candidatos = jugadores.filter((j) => {
    if (j.device_id === adminDeviceId) return false;
    if (!estaConectado(j)) return false;
    if (vistos.has(j.device_id)) return false;
    vistos.add(j.device_id);
    return true;
  });

  async function handleTransfer(deviceId: string) {
    setLoading(deviceId);
    setError(null);
    try {
      await transferirAdmin({ data: { partida_id: partidaId, nuevo_device_id: deviceId } });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al transferir el control.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-background text-foreground rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-black">Transferir control</h3>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Elegí a quién pasarle el rol de Admin. Solo aparecen jugadores conectados.
        </p>

        {error && (
          <p className="mt-3 text-xs text-destructive-foreground bg-destructive rounded px-2 py-1">{error}</p>
        )}

        <div className="mt-4 space-y-2">
          {candidatos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay otros jugadores conectados.</p>
          ) : (
            candidatos.map((j) => (
              <button
                key={j.id}
                type="button"
                onClick={() => handleTransfer(j.device_id)}
                disabled={loading !== null}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary transition-colors disabled:opacity-50"
              >
                <span className="font-medium truncate">{j.nombre}</span>
                <span className="text-xs text-muted-foreground">
                  Equipo {j.equipo_idx + 1}
                  {loading === j.device_id ? " · transfiriendo..." : ""}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
