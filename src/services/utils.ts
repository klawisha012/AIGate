export function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 10) + '-' +
         Math.random().toString(36).substring(2, 10);
}

export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function createAuditLog(event: string, status: string, details?: string): { timestamp: string; event: string; status: string; details?: string } {
  return {
    timestamp: new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    event,
    status,
    details,
  };
}
