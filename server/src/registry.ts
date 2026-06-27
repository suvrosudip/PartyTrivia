// Single source of truth mapping short room codes -> Colyseus roomIds.
// Lives in server memory, so keep the service to ONE instance (no autoscaling).
export const codeToRoom = new Map<string, string>();
