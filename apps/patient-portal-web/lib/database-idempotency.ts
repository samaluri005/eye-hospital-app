// Database-backed idempotency for webhooks
import { executeQuery } from './database';

export async function isEventProcessed(source: string, eventId: string): Promise<boolean> {
  const query = `
    SELECT id FROM webhook_events 
    WHERE source = $1 AND event_id = $2
  `;
  
  try {
    const result = await executeQuery(query, [source, eventId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Failed to check event idempotency:', error);
    return false;
  }
}

export async function markEventProcessed(source: string, eventId: string, eventType?: string): Promise<boolean> {
  const query = `
    INSERT INTO webhook_events (source, event_id, event_type, processed_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (source, event_id) DO NOTHING
  `;
  
  try {
    const result = await executeQuery(query, [source, eventId, eventType || null]);
    const wasNew = result.rowCount > 0;
    if (wasNew) {
      console.log(`✅ Event marked as processed: ${source}:${eventId}`);
    } else {
      console.log(`⚠️ Event already processed: ${source}:${eventId}`);
    }
    return wasNew;
  } catch (error) {
    console.error('❌ Failed to mark event as processed:', error);
    return false;
  }
}