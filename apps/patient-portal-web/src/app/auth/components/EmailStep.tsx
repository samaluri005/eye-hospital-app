"use client";
import React, { useState } from "react";
import axios from "axios";
import { validateEmail } from "../../../../lib/utils";
import { useRecaptcha } from "../../../hooks/useRecaptcha";

type Props = {
  initialEmail?: string;
  onSent: (email: string) => void;
};

export default function EmailStep({ initialEmail = "", onSent }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { executeRecaptcha, isReady } = useRecaptcha();

  async function sendOtp() {
    setErr(null);
    if (!email) return setErr("Please enter your email address");
    if (!validateEmail(email)) return setErr("Please enter a valid email address");
    
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('signin');
      
      if (!recaptchaToken) {
        setErr("Bot protection verification failed. Please try again.");
        setLoading(false);
        return;
      }

      const r = await axios.post(`/api/auth/send-email-otp`, { 
        email,
        recaptchaToken 
      });
      
      if (r.data?.status === "otp_sent") {
        onSent(email);
      } else {
        setErr("Unexpected response from server.");
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      sendOtp();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value.toLowerCase())}
          onKeyPress={handleKeyPress}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          placeholder="you@example.com"
          disabled={loading}
          autoFocus
        />
      </div>

      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-shake" role="alert" aria-live="polite">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-800">{err}</p>
          </div>
        </div>
      )}

      <button
        onClick={sendOtp}
        disabled={loading || !isReady}
        className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 transition-all duration-200 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending...
          </span>
        ) : (
          "Continue with Email"
        )}
      </button>

      <div className="text-center">
        <p className="text-xs text-gray-500">
          We'll send a verification code to your email address
        </p>
      </div>

      <div className="text-center">
        <div className="text-xs text-gray-400 space-y-2">
          <p className="text-gray-500 mt-0.5">
            Google{' '}
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Privacy Policy
            </a>
            {' '}and{' '}
            <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Terms of Service
            </a>
            {' '}apply
          </p>
        </div>
      </div>
    </div>
  );
}
