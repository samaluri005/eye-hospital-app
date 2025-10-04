# reCAPTCHA v3 Integration Guide

## Overview
This document describes the reCAPTCHA v3 integration implemented for bot protection in the Eye Hospital Management System patient authentication flows.

## Architecture

### Client-Side Implementation

#### 1. useRecaptcha Hook (`src/hooks/useRecaptcha.ts`)
Custom React hook that manages reCAPTCHA v3 script loading and token generation.

**Features:**
- Automatic script loading from Google's reCAPTCHA API
- Ready state management
- Type-safe action execution
- Error handling

**Usage:**
```typescript
import { useRecaptcha } from '../hooks/useRecaptcha';

const { executeRecaptcha, isReady, isLoading } = useRecaptcha();

// Execute reCAPTCHA for a specific action
const token = await executeRecaptcha('signup');
```

**Actions:**
- `signup` - Initial phone number submission
- `signin` - Sign-in attempts
- `verify` - OTP verification
- `submit` - Generic form submissions

#### 2. RecaptchaBadge Component (`src/components/RecaptchaBadge.tsx`)
Displays the required Google Terms & Privacy Policy disclosure.

**Usage:**
```tsx
import { RecaptchaBadge } from '../components/RecaptchaBadge';

<RecaptchaBadge />
```

### Server-Side Implementation

#### 1. Verification Utility (`src/lib/recaptcha/verify.ts`)

**Core Function: `verifyRecaptchaToken()`**
```typescript
const verification = await verifyRecaptchaToken(
  token,           // reCAPTCHA token from client
  'signup',        // Expected action
  0.7              // Threshold (optional, defaults based on action)
);

if (verification.isValid) {
  // Allow request
} else {
  // Block request: verification.reason contains error details
}
```

**Threshold Configuration:**
- `signup`: 0.7 (stricter - new account creation)
- `verify`: 0.6 (medium - OTP verification)
- `signin`: 0.5 (moderate - returning users)
- Default: 0.5

**Score Interpretation:**
- **0.9 - 1.0**: Very likely legitimate user (High confidence)
- **0.7 - 0.9**: Likely legitimate (Medium confidence)
- **0.5 - 0.7**: Uncertain, allow with caution (Low confidence)
- **0.0 - 0.5**: Very likely bot (Block or require additional verification)

## Integration Points

### 1. Phone Verification Step

**Component:** `src/app/auth/components/PhoneStep.tsx`
**API:** `src/app/api/auth/send-otp/route.ts`

**Flow:**
1. User enters phone number
2. Click "Send Verification Code"
3. Client executes reCAPTCHA with action `'signup'`
4. Token sent to API endpoint
5. Server verifies token (threshold 0.7)
6. If valid, OTP is sent via Twilio
7. If invalid (score < 0.7), request blocked with 403 error

### 2. OTP Verification Step

**Component:** `src/app/auth/components/OtpStep.tsx`
**API:** `src/app/api/auth/verify-otp/route.ts`

**Flow:**
1. User enters OTP code
2. Click "Verify"
3. Client executes reCAPTCHA with action `'verify'`
4. Token sent to API endpoint
5. Server verifies token (threshold 0.6)
6. If valid, OTP is verified
7. If invalid, request blocked

### 3. Resend OTP

**Flow:**
1. User clicks "Resend Code"
2. Client executes reCAPTCHA with action `'signup'`
3. Same verification as phone step
4. New OTP generated and sent

## Environment Variables

### Required Secrets

#### Client-Side (Public)
```bash
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here
```
This is safe to expose in client-side code and HTML.

#### Server-Side (Secret)
```bash
RECAPTCHA_SECRET_KEY=your_secret_key_here
```
**CRITICAL**: Never expose this in client code or commit to version control.

### Obtaining Keys
1. Visit [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Register a new site
3. Select **reCAPTCHA v3**
4. Add your domains (for development: `localhost`, `127.0.0.1`, Replit domains)
5. Copy Site Key → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
6. Copy Secret Key → `RECAPTCHA_SECRET_KEY`

## Security Best Practices

### ✅ DO
- Always verify tokens on the server-side
- Use action-specific thresholds
- Log verification failures for monitoring
- Implement fallback mechanisms for legitimate users who score low
- Use HTTPS in production
- Rotate secret keys periodically

### ❌ DON'T
- Never trust client-side scores
- Never skip server-side verification
- Never expose secret key in client code
- Never use the same token twice
- Never rely solely on reCAPTCHA (defense in depth)

## Error Handling

### Client-Side Errors
```typescript
const token = await executeRecaptcha('signup');
if (!token) {
  // reCAPTCHA script failed to load or execute
  setErr("Bot protection verification failed. Please try again.");
  return;
}
```

### Server-Side Errors
```typescript
if (!verification.isValid) {
  return NextResponse.json(
    {
      error: 'bot_detection_failed',
      message: 'Security verification failed. Please try again.',
      recaptchaScore: verification.score,
    },
    { status: 403 }
  );
}
```

## Testing

### Development Testing
reCAPTCHA v3 works in development environments but may return lower scores for localhost.

### Production Testing
- Monitor reCAPTCHA Admin Console for analytics
- Review score distribution
- Adjust thresholds based on false positive/negative rates

### Bypass for Testing (NOT FOR PRODUCTION)
For automated testing, you can temporarily add:
```typescript
if (process.env.NODE_ENV === 'test') {
  // Skip reCAPTCHA verification
  return { isValid: true, score: 1.0 };
}
```

## Monitoring & Analytics

### Google reCAPTCHA Console
- View request volume
- Analyze score distribution
- Identify suspicious patterns
- Monitor blocked requests

### Application Logs
Server logs include:
- ✅ Verification passed: Score logged
- ⚠️ Verification failed: Reason + Score logged
- ⚠️ Missing token: Warning logged

## Troubleshooting

### Issue: "reCAPTCHA site key is not configured"
**Solution:** Verify `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is set in environment variables.

### Issue: "reCAPTCHA is not ready yet"
**Solution:** Hook is still loading. Disable submit button until `isReady === true`.

### Issue: All requests blocked (score too low)
**Solution:** 
1. Check if using localhost (may have lower scores)
2. Verify secret key is correct
3. Consider lowering threshold temporarily
4. Check reCAPTCHA Admin Console for domain issues

### Issue: High false positive rate
**Solution:**
1. Lower threshold for that action
2. Implement secondary verification for low-scoring legitimate users
3. Monitor patterns in reCAPTCHA Console

## Performance Considerations

- **Script Size:** ~35KB gzipped
- **Load Time:** Async loading, non-blocking
- **Token Generation:** ~100-300ms
- **Server Verification:** ~200-500ms (Google API call)

## HIPAA Compliance Notes

- reCAPTCHA v3 does NOT collect or process PHI
- Only behavioral analytics (mouse movements, click patterns)
- No patient data is sent to Google
- Use in conjunction with HIPAA-compliant authentication

## Future Enhancements

1. **Risk-Based MFA**: Trigger additional verification for low scores
2. **Adaptive Thresholds**: Adjust based on patterns
3. **Custom Challenges**: Implement secondary verification for edge cases
4. **A/B Testing**: Test different threshold configurations
5. **Detailed Analytics**: Track conversion rates by score ranges

## References

- [Google reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- [Best Practices Guide](https://developers.google.com/recaptcha/docs/v3#best-practices)
