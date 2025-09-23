"use client";

import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../../lib/msalConfig";

/**
 * Props:
 *  - patientId: Guid returned from /signup/verify
 *  - linkToken: short-lived token returned from /signup/verify (plaintext)
 *  - onLinked?: optional callback when linking succeeds
 */
export default function LinkAccountClient({
  patientId,
  linkToken,
  onLinked,
}: {
  patientId: string;
  linkToken: string;
  onLinked?: (data?: any) => void;
}) {
  const { instance, accounts } = useMsal();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleLink() {
    setError(null);
    setLoading(true);

    try {
      // 1) Try popup sign-in + token
      try {
        await instance.loginPopup(loginRequest);
      } catch (err: any) {
        console.error("loginPopup failed:", err);
        alert("MSAL popup error: " + (err?.errorMessage ?? JSON.stringify(err)));
        // fallback to redirect
        sessionStorage.setItem("ehms_patient_id", patientId);
        sessionStorage.setItem("ehms_link_token", linkToken);
        await instance.loginRedirect(loginRequest);
        return;
      }
      
      // get token
      const account = instance.getAllAccounts()[0];
      const tokenResp = await instance.acquireTokenSilent({ scopes: loginRequest.scopes, account });
      const accessToken = tokenResp.accessToken;

      const r = await fetch("/api/auth/link", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ patientId, linkToken }),
      });

      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Link API error ${r.status}: ${txt}`);
      }

      setSuccess(true);
      if (onLinked) onLinked();
      setLoading(false);
      return;
    } catch (err: any) {
      setError(String(err.message || err));
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Link Your Microsoft Account
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect your Microsoft account for seamless sign-in access to your
          patient portal.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <p className="text-green-700 text-sm font-medium">
            ✅ Account linked successfully! You can now sign in with Microsoft.
          </p>
        </div>
      )}

      <button
        onClick={handleLink}
        disabled={loading || success}
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          success
            ? "bg-green-100 text-green-700 cursor-not-allowed"
            : loading
            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {loading
          ? "Linking Account..."
          : success
          ? "Account Linked ✅"
          : "Link Microsoft Account"}
      </button>

      {!success && (
        <p className="text-xs text-gray-500 text-center">
          This will open a Microsoft sign-in popup. Please allow popups for this
          site.
        </p>
      )}
    </div>
  );
}