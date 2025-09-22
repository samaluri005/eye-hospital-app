"use client";
import React from "react";

type Props = {
  onDone: () => void;
  skip: () => void;
};

export default function MfaStep({ onDone, skip }: Props) {
  // placeholder - we will wire MS Authenticator/TOTP and passkeys later
  return (
    <div>
      <h3>Multi-factor (optional)</h3>
      <p className="mt-2">You can enroll an authenticator app (TOTP) or passkey later in settings. For now, skip or enroll.</p>
      <div className="mt-4 flex gap-2">
        <button className="px-3 py-2 bg-green-600 text-white" onClick={()=>alert('MFA enrollment flow placeholder - will implement later')}>Enroll Authenticator</button>
        <button className="px-3 py-2 border" onClick={skip}>Skip for now</button>
      </div>
    </div>
  );
}