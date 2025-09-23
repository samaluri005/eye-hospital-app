// apps/patient-portal-web/src/hooks/useMsalRedirectResume.ts
"use client";
import { useEffect } from "react";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/msalConfig";

export default function useMsalRedirectResume() {
  const { instance } = useMsal();

  useEffect(() => {
    if (!instance) return;

    (async () => {
      try {
        if (typeof instance.initialize === "function") {
          await instance.initialize();
        }

        // handle redirect response (resolves to interaction result or null)
        await instance.handleRedirectPromise();

        const storedPatientId = sessionStorage.getItem("ehms_patient_id");
        const storedLinkToken = sessionStorage.getItem("ehms_link_token");
        if (!storedPatientId || !storedLinkToken) {
          return; // nothing to do
        }

        const accounts = instance.getAllAccounts();
        const account = accounts && accounts[0];
        if (!account) throw new Error("No account after redirect");

        const tokenResp = await instance.acquireTokenSilent({
          scopes: loginRequest.scopes,
          account,
        });

        // call API to link
        const resp = await fetch("/api/auth/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenResp.accessToken}`,
          },
          body: JSON.stringify({ patientId: storedPatientId, linkToken: storedLinkToken }),
        });

        if (!resp.ok) {
          const txt = await resp.text();
          console.error("Link API failed:", resp.status, txt);
        } else {
          console.info("resume: linked successfully");
        }
      } catch (err) {
        console.warn("useMsalRedirectResume error:", err);
      } finally {
        sessionStorage.removeItem("ehms_patient_id");
        sessionStorage.removeItem("ehms_link_token");
      }
    })();
  }, [instance]);
}