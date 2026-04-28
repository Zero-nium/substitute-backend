// callback.js — HMAC-signed callback sender
import crypto from 'crypto';

const HMAC_SECRET = process.env.CALLBACK_HMAC_SECRET || '';

export async function sendCallback(url, payload) {
  if (!url) return;
  try {
    const body = JSON.stringify(payload);
    const sig  = HMAC_SECRET
      ? `sha256=${crypto.createHmac('sha256', HMAC_SECRET).update(body).digest('hex')}`
      : '';
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        ...(sig ? { 'X-Substitute-Signature': sig } : {}),
      },
      body,
    });
  } catch (e) {
    console.warn('[callback] Failed to send callback to', url, e.message);
  }
}
