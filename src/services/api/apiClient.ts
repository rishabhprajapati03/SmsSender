import { AppConfig, getSmsLogsUrl } from '../../config';

/**
 * Generates idempotency key for a batch
 */
function generateBatchId(messages: any[]): string {
  const base = messages
    .map(m => m.sms_uid)
    .sort()
    .join('|');

  let hash = 0;

  for (let i = 0; i < base.length; i++) {
    hash = (hash << 5) - hash + base.charCodeAt(i);
    hash |= 0;
  }

  return `batch_${Date.now()}_${Math.abs(hash)}`;
}

export async function sendSmsBatch(
  messages: Array<{
    sms_uid: string;
    sender: string;
    body: string;
    timestamp: number;
    device_id: string;
    status: string;
  }>,
): Promise<{ success: boolean; error?: string }> {
  const url = getSmsLogsUrl();

  if (!messages.length) {
    return { success: true };
  }

  const batchId = generateBatchId(messages);

  try {
    console.log('[API] Sending batch:', messages.length, 'BatchId:', batchId);

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, AppConfig.api.timeout);

    const response = await fetch(url, {
      method: 'POST',

      headers: {
        apikey: AppConfig.supabase.anonKey,
        Authorization: `Bearer ${AppConfig.supabase.anonKey}`,
        'Content-Type': 'application/json',

        // Idempotency (Supabase ignores, but logs help)
        'X-Batch-Id': batchId,

        Prefer: 'resolution=merge-duplicates,return=minimal',
      },

      body: JSON.stringify(messages),

      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // SUCCESS
    if (response.ok) {
      console.log('[API] Batch sent OK:', batchId);
      return { success: true };
    }

    // ERROR HANDLING
    const text = await response.text();

    console.error('[API] Error:', response.status, 'Batch:', batchId, text);

    // Duplicate / conflict = safe
    if (
      response.status === 409 ||
      text.includes('duplicate') ||
      text.includes('23505')
    ) {
      console.warn('[API] Duplicate batch, treating as success');
      return { success: true };
    }

    // Client error → bad data → don't retry
    if (response.status >= 400 && response.status < 500) {
      return {
        success: false,
        error: `Client error ${response.status}: ${text}`,
      };
    }

    // Server error → retryable
    return {
      success: false,
      error: `Server error ${response.status}`,
    };
  } catch (error: any) {
    console.error('[API] Request failed:', error);

    // Abort / timeout = unknown state → retry safe (UPSERT protects)
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Timeout',
      };
    }

    return {
      success: false,
      error: error?.message || 'Network error',
    };
  }
}
