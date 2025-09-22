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
    if (!phone) return setErr("Please enter phone in E.164 (+1...)");
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

  return (
    <div>
      <label className="block">Phone (E.164)</label>
      <input className="border p-2 w-full" value={phone} onChange={(e)=>setPhone(e.target.value)} placeholder="+1..." />
      <div className="mt-3 flex gap-2">
        <button className="px-4 py-2 bg-indigo-600 text-white" onClick={sendOtp} disabled={loading}>
          {loading ? "Sending…" : "Send OTP"}
        </button>
      </div>
      {err && <p className="text-red-600 mt-2">{err}</p>}
    </div>
  );
}