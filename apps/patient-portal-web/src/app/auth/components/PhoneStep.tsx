"use client";
import React, { useState } from "react";
import dynamic from "next/dynamic";
import axios from "axios";
import { useRecaptcha } from "../../../hooks/useRecaptcha";

const InternationalPhoneInput = dynamic(() => import("./InternationalPhoneInput"), { 
  ssr: false,
  loading: () => (
    <input 
      type="tel" 
      placeholder="Loading phone input..." 
      disabled
      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-50"
    />
  )
});

type Props = {
  initialPhone?: string;
  onSent: (phone: string) => void;
};

export default function PhoneStep({ initialPhone = "", onSent }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isValidPhone, setIsValidPhone] = useState(false);
  const { executeRecaptcha, isReady } = useRecaptcha();

  async function sendOtp() {
    setErr(null);
    if (!phone) return setErr("Please enter your phone number");
    if (!isValidPhone) return setErr("Please enter a valid phone number");
    setLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('signup');
      
      if (!recaptchaToken) {
        setErr("Bot protection verification failed. Please try again.");
        setLoading(false);
        return;
      }

      const r = await axios.post(`/api/auth/send-otp`, { 
        phone,
        recaptchaToken 
      });
      if (r.data?.status === "otp_sent") {
        onSent(phone);
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
      {/* Phone Input */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Phone Number
        </label>
        <InternationalPhoneInput
          value={phone}
          onChange={setPhone}
          onEnter={sendOtp}
          onValidityChange={setIsValidPhone}
        />
      </div>

      {/* Error Message */}
      {err && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-shake">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-red-800 font-medium text-sm">{err}</p>
          </div>
        </div>
      )}

      {/* Send Button */}
      <button 
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-white
          transition-all duration-300 transform
          ${isValidPhone && isReady && !loading
            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' 
            : 'bg-gray-300 cursor-not-allowed'
          }
          flex items-center justify-center gap-2
        `}
        onClick={sendOtp} 
        disabled={loading || !isValidPhone || !isReady}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Sending Code...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Send Verification Code</span>
          </>
        )}
      </button>

      {/* Trust Line - Professional Left-Aligned */}
      <div className="flex items-start gap-2.5 px-1">
        <div className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 mt-0.5">
          <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div className="text-xs text-gray-600 leading-relaxed">
          <p className="font-medium">HIPAA compliant • Protected by reCAPTCHA</p>
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
