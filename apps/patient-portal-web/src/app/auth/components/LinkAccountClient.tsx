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

  // Helper: acquire token (silent -> popup -> redirect fallback)
  async function acquireApiToken(): Promise<string> {
    const scopes = loginRequest.scopes || ["openid", "profile"];
    // ensure API scope is present (loginRequest configured earlier)
    try {
      // try silent first (user may already be signed-in)
      const account = accounts && accounts.length > 0 ? accounts[0] : undefined;
      const silentReq = { scopes, account };
      const silentResult = await instance.acquireTokenSilent(silentReq);
      return silentResult.accessToken;
    } catch (silentErr) {
      // silent failed: try interactive popup
      try {
        const popupResult = await instance.acquireTokenPopup({ scopes });
        return popupResult.accessToken;
      } catch (popupErr) {
        // popup may be blocked — fall back to redirect
        // Use loginRedirect to interactive sign-in; after redirect, you'll need to resume flow (app will re-render and can call acquireTokenSilent)
        // We throw a special string to signal redirect required
        throw new Error("interactive_required");
      }
    }
  }

  // If user is not signed-in, call loginPopup first (or loginRedirect fallback)
  async function ensureSignedIn(): Promise<void> {
    const signedIn = accounts && accounts.length > 0;
    if (signedIn) return;
    try {
      await instance.loginPopup(loginRequest);
      return;
    } catch (err) {
      // popup failed (e.g., blocked) → fallback to redirect
      await instance.loginRedirect(loginRequest);
      // note: loginRedirect navigates away — after redirect back, component will remount and you should call the link step again
      return;
    }
  }

  async function linkAccount() {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: ensure user is signed in
      await ensureSignedIn();

      // Step 2: get token (for API call to /api/auth/link)
      const accessToken = await acquireApiToken();

      // Step 3: call Next.js API route (which proxies to backend)
      const response = await fetch("/api/auth/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          linkToken: linkToken,
          patientId: patientId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setSuccess(true);

      // optional callback
      if (onLinked) onLinked(data);
    } catch (err: any) {
      console.error("Link account error:", err);
      if (err.message === "interactive_required") {
        // Trigger redirect fallback when popups are blocked
        try {
          await instance.loginRedirect(loginRequest);
          return; // navigation will happen
        } catch (redirectErr) {
          setError(
            "Sign-in required. Please allow popups or refresh to sign in with Microsoft."
          );
        }
      } else {
        setError(err.message || "Failed to link account");
      }
    } finally {
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
        onClick={linkAccount}
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