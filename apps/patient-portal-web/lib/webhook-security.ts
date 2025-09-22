// Webhook signature verification for security
import crypto from 'crypto';

// Verify Twilio webhook signature  
export function verifyTwilioSignature(
  signature: string | null,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  if (!signature || !authToken) {
    console.log('⚠️ Missing Twilio signature or auth token');
    return false;
  }

  try {
    // Twilio signature verification algorithm
    const data = Object.keys(params)
      .sort()
      .map(key => key + params[key])
      .join('');
    
    const computedSignature = crypto
      .createHmac('sha1', authToken)
      .update(url + data)
      .digest('base64');

    const expectedSignature = signature.replace('sha1=', '');
    
    const isValid = crypto.timingSafeEqual(
      Buffer.from(computedSignature, 'base64'),
      Buffer.from(expectedSignature, 'base64')
    );

    if (!isValid) {
      console.log('❌ Invalid Twilio signature');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Twilio signature verification error:', error);
    return false;
  }
}

// Verify Stripe webhook signature
export function verifyStripeSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) {
    console.log('⚠️ Missing Stripe signature or secret');
    return false;
  }

  try {
    const elements = signature.split(',');
    let timestamp = '';
    let v1 = '';

    elements.forEach(element => {
      const [key, value] = element.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1 = value;
    });

    if (!timestamp || !v1) {
      console.log('❌ Invalid Stripe signature format');
      return false;
    }

    // Check timestamp (prevent replay attacks)
    const timestampMs = parseInt(timestamp) * 1000;
    const currentTime = Date.now();
    const tolerance = 300000; // 5 minutes

    if (Math.abs(currentTime - timestampMs) > tolerance) {
      console.log('❌ Stripe webhook timestamp too old');
      return false;
    }

    // Verify signature
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(timestamp + '.' + payload)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(v1, 'hex'),
      Buffer.from(computedSignature, 'hex')
    );

    if (!isValid) {
      console.log('❌ Invalid Stripe signature');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Stripe signature verification error:', error);
    return false;
  }
}

// Note: In-memory idempotency has been replaced with database-backed idempotency
// See database-idempotency.ts for production-ready implementation