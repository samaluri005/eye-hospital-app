const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export interface RecaptchaVerificationResult {
  isValid: boolean;
  score?: number;
  reason?: string;
}

export function getActionThreshold(action: 'signup' | 'signin' | 'verify'): number {
  const thresholds = {
    signup: 0.7,
    signin: 0.5,
    verify: 0.6,
  };
  return thresholds[action] || 0.5;
}

export async function verifyRecaptchaToken(
  token: string,
  expectedAction: string,
  threshold: number
): Promise<RecaptchaVerificationResult> {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('⚠️  RECAPTCHA_SECRET_KEY not configured, skipping verification');
    return { isValid: true, score: 1.0, reason: 'recaptcha_disabled' };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();

    if (!data.success) {
      return {
        isValid: false,
        reason: `recaptcha_failed: ${data['error-codes']?.join(', ') || 'unknown'}`,
      };
    }

    if (data.action !== expectedAction) {
      return {
        isValid: false,
        score: data.score,
        reason: `action_mismatch: expected ${expectedAction}, got ${data.action}`,
      };
    }

    const score = data.score || 0;
    const isValid = score >= threshold;

    return {
      isValid,
      score,
      reason: isValid ? 'passed' : `score_too_low: ${score} < ${threshold}`,
    };
  } catch (error) {
    console.error('❌ reCAPTCHA verification error:', error);
    return {
      isValid: false,
      reason: 'verification_error',
    };
  }
}
