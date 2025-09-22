"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";

type Props = {
  phone: string;
  onVerified: (patientId: string) => void;
  onBack: () => void;
};

export default function OtpStep({ phone, onVerified, onBack }: Props) {
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendDisabledUntil, setResendDisabledUntil] = useState<number | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(3);

  useEffect(() => {
    let timer: any;
    if (resendDisabledUntil) {
      timer = setInterval(()=> {
        if (Date.now() >= resendDisabledUntil) setResendDisabledUntil(null);
      }, 500);
    }
    return ()=> clearInterval(timer);
  }, [resendDisabledUntil]);

  async function verify() {
    setErr(null);
    setLoading(true);
    try {
      const r = await axios.post(`/api/auth/verify-otp`, { phone, otp });
      if (r.data?.status === "verified") {
        onVerified(r.data.patientId);
      } else {
        setErr("Verification failed");
      }
    } catch (e: any) {
      const server = e?.response?.data;
      setErr(server?.error || e.message || "Error");
      if (server?.attemptsLeft !== undefined) setAttemptsLeft(server.attemptsLeft);
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    setErr(null);
    setLoading(true);
    try {
      await axios.post(`/api/auth/send-otp`, { phone });
      // disable resend for 15s quick UI; backend enforces server limits
      setResendDisabledUntil(Date.now() + 15000);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Information Card */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <div>
            <h3 className="text-emerald-800 font-semibold mb-1">Verification Code Sent</h3>
            <p className="text-emerald-700 text-sm">Enter the 6-digit code sent to <strong>{phone}</strong></p>
          </div>
        </div>
      </div>

      {/* OTP Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            <svg className="w-4 h-4 inline mr-2 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Verification Code
          </label>
          <input 
            className="w-full px-4 py-3 text-lg text-center tracking-widest border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
            value={otp} 
            onChange={(e)=>setOtp(e.target.value)}
            placeholder="000000"
            maxLength={6}
          />
        </div>

        {/* Error Message */}
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-red-800 font-semibold">Verification Failed</h4>
                <p className="text-red-700 text-sm mt-1">{err}</p>
                {attemptsLeft !== null && (
                  <p className="text-red-600 text-sm mt-1">Attempts remaining: {attemptsLeft}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button 
            onClick={verify} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 w-full flex items-center justify-center space-x-2" 
            disabled={loading || !otp}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
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

          <div className="flex gap-3">
            <button 
              onClick={onBack} 
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Change Phone
            </button>
            <button 
              onClick={resend} 
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg transition-colors duration-200" 
              disabled={!!resendDisabledUntil}
            >
              {resendDisabledUntil ? `Resend (${Math.ceil((resendDisabledUntil - Date.now()) / 1000)}s)` : 'Resend Code'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}