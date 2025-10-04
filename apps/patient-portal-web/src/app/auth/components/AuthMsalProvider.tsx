"use client";

import React, { useMemo } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "../../../lib/msalConfig";

let msalInstance: PublicClientApplication | null = null;

export default function AuthMsalProvider({ children }: { children: React.ReactNode }) {
  const instance = useMemo(() => {
    if (!msalInstance) {
      msalInstance = new PublicClientApplication(msalConfig);
    }
    return msalInstance;
  }, []);

  return (
    <MsalProvider instance={instance}>
      {children}
    </MsalProvider>
  );
}
