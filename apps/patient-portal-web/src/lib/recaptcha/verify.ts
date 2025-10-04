export type RecaptchaVerificationResult = {
  success: boolean;
  score: number;
  action: string;
  challengeTs: string;
  hostname: string;
  errorCodes?: string[];
};

export type RecaptchaVerificationResponse = {
  success: boolean;
  challenge_ts: string;
  hostname: string;
  score: number;
  action: string;
  'error-codes'?: string[];
};

const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const DEFAULT_THRESHOLD = 0.5;

export async function verifyRecaptchaToken(
  token: string,
  expectedAction?: string,
  threshold: number = DEFAULT_THRESHOLD
): Promise<{
  isValid: boolean;
  score: number;
  reason?: string;
}> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not configured');
    return {
      isValid: false,
      score: 0,
      reason: 'reCAPTCHA not configured',
    };
  }

  if (!token) {
    return {
      isValid: false,
      score: 0,
      reason: 'No reCAPTCHA token provided',
    };
  }

  try {
    const response = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error('reCAPTCHA verification request failed:', response.statusText);
      return {
        isValid: false,
        score: 0,
        reason: 'Verification request failed',
      };
    }

    const data: RecaptchaVerificationResponse = await response.json();

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.warn('reCAPTCHA verification failed:', errorCodes);
      return {
        isValid: false,
        score: 0,
        reason: `Verification failed: ${errorCodes.join(', ')}`,
      };
    }

    if (expectedAction && data.action !== expectedAction) {
      console.warn(
        `reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${data.action}`
      );
      return {
        isValid: false,
        score: data.score || 0,
        reason: `Action mismatch (expected: ${expectedAction}, got: ${data.action})`,
      };
    }

    const score = data.score || 0;

    if (score < threshold) {
      return {
        isValid: false,
        score,
        reason: `Score below threshold (${score} < ${threshold})`,
      };
    }

    return {
      isValid: true,
      score,
    };
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return {
      isValid: false,
      score: 0,
      reason: 'Verification error',
    };
  }
}

export function getActionThreshold(action: string): number {
  switch (action) {
    case 'signup':
      return 0.7;
    case 'signin':
      return 0.5;
    case 'verify':
      return 0.6;
    default:
      return DEFAULT_THRESHOLD;
  }
}

export function interpretRecaptchaScore(score: number): {
  level: 'high' | 'medium' | 'low' | 'bot';
  recommendation: string;
} {
  if (score >= 0.9) {
    return {
      level: 'high',
      recommendation: 'Very likely legitimate user - allow freely',
    };
  } else if (score >= 0.7) {
    return {
      level: 'medium',
      recommendation: 'Likely legitimate - allow with monitoring',
    };
  } else if (score >= 0.5) {
    return {
      level: 'low',
      recommendation: 'Uncertain - allow with caution or require MFA',
    };
  } else {
    return {
      level: 'bot',
      recommendation: 'Very likely bot - block or require intensive verification',
    };
  }
}
