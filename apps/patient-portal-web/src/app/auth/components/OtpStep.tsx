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
    <div>
      <p>OTP sent to <strong>{phone}</strong></p>
      <div className="mt-2">
        <label>Enter OTP</label>
        <input className="border p-2 w-full" value={otp} onChange={(e)=>setOtp(e.target.value)} />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <button onClick={verify} className="px-3 py-2 bg-green-600 text-white" disabled={loading}>Verify</button>
        <button onClick={onBack} className="px-3 py-2 border">Change phone</button>
        <button onClick={resend} className="px-3 py-2 border" disabled={!!resendDisabledUntil}>Resend</button>
      </div>
      <div className="mt-2">
        {err && <p className="text-red-600">{err}</p>}
        {attemptsLeft !== null && <p className="text-sm text-gray-600">Attempts left: {attemptsLeft}</p>}
      </div>
    </div>
  );
}