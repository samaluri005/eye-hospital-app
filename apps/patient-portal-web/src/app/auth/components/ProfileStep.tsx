"use client";
import React, { useState } from "react";

type Props = {
  initialName?: string;
  onNext: (data: { fullName?: string; password?: string }) => void;
  onSkip: () => void;
};

export default function ProfileStep({ initialName, onNext, onSkip }: Props) {
  const [name, setName] = useState(initialName || "");
  const [password, setPassword] = useState("");
  const [optSetPassword, setOptSetPassword] = useState(false);

  return (
    <div>
      <label>Full name</label>
      <input className="border p-2 w-full" value={name} onChange={(e)=>setName(e.target.value)} />

      <div className="mt-3">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={optSetPassword} onChange={()=>setOptSetPassword(x=>!x)} />
          <span>Set a password now (optional)</span>
        </label>
      </div>

      {optSetPassword && (
        <div className="mt-2">
          <label>Password</label>
          <input type="password" className="border p-2 w-full" value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 bg-indigo-600 text-white" onClick={()=>onNext({ fullName: name, password: optSetPassword ? password : undefined })}>Next</button>
        <button className="px-3 py-2 border" onClick={onSkip}>Skip</button>
      </div>
    </div>
  );
}