export interface AuditEvent {
  action: string
  userId: string
  workspaceId?: string
  resourceId?: string
  metadata?: Record<string, unknown>
  ip?: string
}

export function auditLog(event: AuditEvent): void {
  const entry = {
    ...event,
    timestamp: new Date().toISOString(),
  }

  // Console logging for now — swap to DB/external service in production
  console.info("[AUDIT]", entry)
}
