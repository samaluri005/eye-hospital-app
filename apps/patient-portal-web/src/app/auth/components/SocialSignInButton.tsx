"use client";
import React from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "@/lib/msalConfig";

export default function SocialSignInButton({ provider }: { provider: "google" | "microsoft" | "apple" }) {
  const { instance } = useMsal();

  async function signIn() {
    try {
      // With Entra External ID, the hosted login page will show configured identity providers.
      // We just call loginPopup/loginRedirect and the tenant will prompt social options.
      await instance.loginPopup(loginRequest);
      // After sign-in, SPA should call backend /auth/check-link to see if phone is present and linked
      // If phone missing, prompt phone verification UI (we will implement this flow when integrating).
    } catch (err) {
      console.error("login error", err);
    }
  }

  const label = provider === "google" ? "Google" : provider === "microsoft" ? "Microsoft" : "Apple";
  return <button onClick={signIn} className="px-3 py-2 border">{label}</button>;
}