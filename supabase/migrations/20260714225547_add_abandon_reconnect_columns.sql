/*
# Add abandonment and reconnection tracking columns

1. Modified Tables

## jugadores_online
- `desconectado_en` (timestamptz, nullable): When the player's heartbeat
  expires, the server sets this to the current timestamp. A NULL value means
  the player is connected (or was never marked disconnected). When a player
  reconnects, this is reset to NULL.
- This column enables the 90-second reconnection window: the server can
  check `desconectado_en` to determine if a player is within the grace period
  before permanently removing them from the partida.

## partidas_online
- `abandono_forfeit` (boolean, default false): Set to true when a player
  abandons during a match and their team had no other human players, causing
  the rival team to win automatically. Lets the stats screen show the reason.

2. Security
- No new RLS policies needed; existing policies on both tables already cover
  the new columns (they are updated via the same client/server paths).

3. Important Notes
- Both columns are nullable/optional so existing rows are unaffected.
- The server functions (tickPartida, abandonarSala) will manage these
  columns; the client reads them via existing SELECT policies.
*/

ALTER TABLE jugadores_online
  ADD COLUMN IF NOT EXISTS desconectado_en timestamptz;

ALTER TABLE partidas_online
  ADD COLUMN IF NOT EXISTS abandono_forfeit boolean NOT NULL DEFAULT false;
