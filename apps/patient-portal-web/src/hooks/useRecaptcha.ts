'use client';

import { useEffect, useState, useCallback } from 'react';

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export type RecaptchaAction = 'signup' | 'signin' | 'submit' | 'verify';

export function useRecaptcha() {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  useEffect(() => {
    console.log('[reCAPTCHA] Site key exists:', !!siteKey);
    console.log('[reCAPTCHA] Site key (first 10 chars):', siteKey?.substring(0, 10) + '...');
    
    if (!siteKey) {
      console.error('reCAPTCHA site key is not configured');
      setIsLoading(false);
      return;
    }

    const loadRecaptchaScript = () => {
      if (typeof window !== 'undefined' && window.grecaptcha) {
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        window.grecaptcha.ready(() => {
          setIsReady(true);
          setIsLoading(false);
        });
      };

      script.onerror = () => {
        console.error('Failed to load reCAPTCHA script');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    loadRecaptchaScript();
  }, [siteKey]);

  const executeRecaptcha = useCallback(
    async (action: RecaptchaAction): Promise<string | null> => {
      if (!siteKey) {
        console.error('reCAPTCHA site key is not configured');
        return null;
      }

      if (!isReady) {
        console.warn('reCAPTCHA is not ready yet');
        return null;
      }

      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        return token;
      } catch (error) {
        console.error('reCAPTCHA execution failed:', error);
        return null;
      }
    },
    [siteKey, isReady]
  );

  return {
    executeRecaptcha,
    isReady,
    isLoading,
  };
}
