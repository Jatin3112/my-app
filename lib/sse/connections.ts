// In-memory store of active SSE connections
// Key: userId, Value: writable stream controller
export const sseConnections = new Map<string, { write: (data: string) => void }>()
