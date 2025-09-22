"use client";
import React, { useState } from "react";
import axios from "axios";

type Props = {
  initialPhone?: string;
  onSent: (phone: string) => void;
};

export default function PhoneStep({ initialPhone = "", onSent }: Props) {
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function sendOtp() {
    setErr(null);
    if (!phone) return setErr("Please enter your phone number");
    if (!phone.startsWith('+')) return setErr("Phone number must include country code (e.g., +1 for US)");
    setLoading(true);
    try {
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      const r = await axios.post(`${backend}/signup/start`, { phone });
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
      {/* Information Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-blue-800 font-medium mb-1">Secure Phone Verification</h3>
            <p className="text-blue-700 text-sm leading-relaxed">
              We'll send a verification code to your phone to ensure the security of your medical information.
            </p>
          </div>
        </div>
      </div>

      {/* Phone Input Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <svg className="w-4 h-4 inline mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Phone Number
          </label>
          <input 
            className="medical-input" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="+1 (555) 123-4567" 
            type="tel"
            autoComplete="tel"
          />
          <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for United States)</p>
        </div>

        {/* Error Message */}
        {err && (
          <div className="status-error border rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-medium">Verification Failed</h4>
                <p className="text-sm mt-1">{err}</p>
              </div>
            </div>
          </div>
        )}

        {/* Send Button */}
        <button 
          className={`btn-primary w-full flex items-center justify-center space-x-2 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
          onClick={sendOtp} 
          disabled={loading}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Sending verification code...</span>
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
      </div>

      {/* Security Notice */}
      <div className="text-center">
        <p className="text-xs text-gray-500 leading-relaxed">
          <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Your phone number is encrypted and protected under HIPAA compliance
        </p>
      </div>
    </div>
  );
}