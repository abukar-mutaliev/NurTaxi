/** В push-канал уходит только обезличенный идентификатор события (FZ-02.4). */
export function sanitizePushData(data: Record<string, unknown> | undefined): Record<string, string> {
  if (!data) return {};
  const eventId = data.eventId ?? data.eventType ?? data.type;
  if (eventId == null || eventId === '') return {};
  return { eventId: String(eventId) };
}
