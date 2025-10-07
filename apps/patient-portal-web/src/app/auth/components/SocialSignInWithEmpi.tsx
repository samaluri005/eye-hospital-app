"use client";
import React, { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../../../lib/msalConfig";
import axios from "axios";

type Props = {
  onAccountsFound: (data: any) => void;
  onError: (error: string) => void;
};

export default function SocialSignInWithEmpi({ onAccountsFound, onError }: Props) {
  const { instance, accounts } = useMsal();

  useEffect(() => {
    const handleSocialAuth = async () => {
      if (accounts && accounts.length > 0) {
        const account = accounts[0];
        
        try {
          // Get token
          const tokenResponse = await instance.acquireTokenSilent({
            scopes: loginRequest.scopes,
            account,
          });

          // Extract user info from token
          const email = account.username || account.idTokenClaims?.email;
          const name = account.name || account.idTokenClaims?.name;
          const entraObjectId = account.localAccountId || account.homeAccountId;

          if (!email) {
            onError("Email not found in social login account");
            return;
          }

          // Call social signin API with EMPI matching
          const response = await axios.post("/api/auth/social-signin", {
            email,
            name,
            entraObjectId,
            provider: "microsoft", // or detect from account
          });

          if (response.data) {
            onAccountsFound(response.data);
          }
        } catch (error: any) {
          console.error("Social auth error:", error);
          onError(error?.response?.data?.error || error.message || "Social authentication failed");
        }
      }
    };

    handleSocialAuth();
  }, [accounts, instance, onAccountsFound, onError]);

  return null; // This is a logic-only component
}
