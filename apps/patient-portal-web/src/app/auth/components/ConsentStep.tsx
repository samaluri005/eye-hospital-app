"use client";
import React, { useState } from "react";
import axios from "axios";

type Props = {
  onAccepted: () => void;
  onDeclined: () => void;
};

export default function ConsentStep({ onAccepted, onDeclined }: Props) {
  const [requiredChecked, setRequiredChecked] = useState(false);
  const [optionalChecked, setOptionalChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function accept() {
    if (!requiredChecked) return setErr("You must accept Terms & Privacy to continue");
    setSaving(true); setErr(null);
    try {
      // POST consent to backend for audit
      const backend = process.env.NEXT_PUBLIC_BACKEND_URL;
      await axios.post(`${backend}/consent`, {
        consentType: "tos+privacy",
        version: "v1",
        accepted: true
      });
      onAccepted();
    } catch (e:any) {
      setErr(e?.response?.data?.error || e.message);
    } finally { setSaving(false); }
  }

  return (
    <div>
      <h3 className="font-medium">Consent</h3>
      <p className="text-sm mt-2">Please accept Terms of Service and Privacy Policy. (links...) </p>

      <div className="mt-3">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={requiredChecked} onChange={()=>setRequiredChecked(x=>!x)} />
          <span>I agree to Terms & Privacy (required)</span>
        </label>
      </div>

      <div className="mt-2">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={optionalChecked} onChange={()=>setOptionalChecked(x=>!x)} />
          <span>Share anonymized data for research (optional)</span>
        </label>
      </div>

      <div className="mt-4">
        <button className="px-3 py-2 bg-indigo-600 text-white" disabled={!requiredChecked || saving} onClick={accept}>Accept & Continue</button>
        <button className="px-3 py-2 border ml-2" onClick={onDeclined}>Decline</button>
      </div>
      {err && <p className="text-red-600 mt-2">{err}</p>}
    </div>
  );
}