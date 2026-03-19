import crypto from 'crypto';

const HMAC_SECRET = process.env.CALLBACK_HMAC_SECRET || '';

export async function sendCallback(url, payload) {
  const body = JSON.stringify(payload);
  const sig = HMAC_SECRET
    ? `sha256=${crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex')}`
    : undefined;

  const headers = { 'Content-Type': 'application/json' };
  if (sig) headers['X-Substitute-Signature'] = sig;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { method: 'POST', headers, body });
      if (res.ok) return;
      console.warn(`[callback] Non-OK response from ${url}: ${res.status}`);
    } catch (e) {
      console.warn(`[callback] Attempt ${attempt + 1} failed for ${url}:`, e.message);
    }
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
  }
  throw new Error(`Callback to ${url} failed after 3 attempts.`);
}
