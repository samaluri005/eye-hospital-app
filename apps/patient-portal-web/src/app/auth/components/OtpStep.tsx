"use client";
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useRecaptcha } from "../../../hooks/useRecaptcha";

type Props = {
  phone: string;
  onVerified: (data: any) => void;
  onBack: () => void;
};

export default function OtpStep({ phone, onVerified, onBack }: Props) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [err, setErr] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDisabledUntil, setResendDisabledUntil] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(3);
  const { executeRecaptcha } = useRecaptcha();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: any;
    if (resendDisabledUntil) {
      timer = setInterval(() => {
        if (Date.now() >= resendDisabledUntil) setResendDisabledUntil(null);
      }, 500);
    }
    return () => clearInterval(timer);
  }, [resendDisabledUntil]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setErr(null);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        // Move to previous input if current is empty
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    const digits = pastedData.match(/\d/g);
    
    if (digits && digits.length === 6) {
      setOtp(digits.slice(0, 6));
      inputRefs.current[5]?.focus();
    }
  };

  async function verify() {
    const otpString = otp.join("");
    if (otpString.length !== 6) return;

    setErr(null);
    setVerifyLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('verify');
      
      if (!recaptchaToken) {
        setErr("Security verification failed. Please try again.");
        setVerifyLoading(false);
        return;
      }

      const r = await axios.post(`/api/auth/verify-otp`, { 
        phone, 
        otp: otpString,
        recaptchaToken 
      });
      if (r.data?.status === "verified") {
        onVerified(r.data);
      } else {
        setErr("Verification failed");
      }
    } catch (e: any) {
      const server = e?.response?.data;
      setErr(server?.error || e.message || "Error");
      if (server?.attemptsLeft !== undefined) setAttemptsLeft(server.attemptsLeft);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function resend() {
    setErr(null);
    setResendLoading(true);
    try {
      const recaptchaToken = await executeRecaptcha('signup');
      
      if (!recaptchaToken) {
        setErr("Security verification failed. Please try again.");
        setResendLoading(false);
        return;
      }

      await axios.post(`/api/auth/send-otp`, { 
        phone,
        recaptchaToken 
      });
      // Clear OTP inputs
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      // disable resend for 15s quick UI; backend enforces server limits
      setResendDisabledUntil(Date.now() + 15000);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setResendLoading(false);
    }
  }

  const otpString = otp.join("");
  const isComplete = otpString.length === 6;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl mb-4 shadow-lg shadow-emerald-200">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Phone</h2>
        <p className="text-gray-600">
          We sent a 6-digit code to<br />
          <span className="font-semibold text-gray-900">{phone}</span>
        </p>
      </div>

      {/* OTP Input - Individual Boxes */}
      <div className="space-y-6">
        <div className="flex justify-center gap-2 sm:gap-3">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={`
                w-12 h-14 sm:w-14 sm:h-16 text-2xl font-bold text-center
                border-2 rounded-xl transition-all duration-200
                ${digit 
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                  : 'border-gray-300 bg-white text-gray-900'
                }
                focus:outline-none focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500
                hover:border-emerald-400
              `}
            />
          ))}
        </div>

        {/* Error Message */}
        {err && (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-shake" role="alert" aria-live="polite">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-semibold text-sm">{err}</p>
                {attemptsLeft !== null && (
                  <p className="text-red-600 text-sm mt-1">
                    {attemptsLeft} {attemptsLeft === 1 ? 'attempt' : 'attempts'} remaining
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={verify} 
            disabled={!isComplete || verifyLoading}
            className={`
              w-full py-4 px-6 rounded-xl font-semibold text-white
              transition-all duration-300 transform
              ${isComplete && !verifyLoading
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]' 
                : 'bg-gray-300 cursor-not-allowed'
              }
              flex items-center justify-center gap-2
            `}
          >
            {verifyLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Verify Code</span>
              </>
            )}
          </button>

          {/* Secondary Actions */}
          <div className="flex gap-3">
            <button 
              onClick={onBack}
              disabled={verifyLoading || resendLoading}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Change Phone
            </button>
            <button 
              onClick={resend}
              disabled={!!resendDisabledUntil || resendLoading || verifyLoading}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {resendLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                </>
              ) : resendDisabledUntil ? (
                `Resend (${Math.ceil((resendDisabledUntil - Date.now()) / 1000)}s)`
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Resend</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-center text-sm text-gray-500">
          Didn't receive the code? Check your messages or try resending
        </p>
      </div>
    </div>
  );
}
