'use client';

export function RecaptchaBadge() {
  return (
    <div className="text-xs text-gray-500 mt-4 text-center">
      This site is protected by reCAPTCHA and the Google{' '}
      <a
        href="https://policies.google.com/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Privacy Policy
      </a>{' '}
      and{' '}
      <a
        href="https://policies.google.com/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        Terms of Service
      </a>{' '}
      apply.
    </div>
  );
}
