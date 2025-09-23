// resumeAuthAndLink.ts (call once on client startup, e.g. inside a small client component in layout)
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../lib/msalConfig";
import { useEffect } from "react";

export function useMsalRedirectResume() {
  const { instance } = useMsal();
  
  useEffect(() => {
    // handle redirect promise and resume link if stored
    instance.handleRedirectPromise().then(async (tokenResponse) => {
      const storedPatientId = sessionStorage.getItem("ehms_patient_id");
      const storedLinkToken = sessionStorage.getItem("ehms_link_token");
      if (storedPatientId && storedLinkToken) {
        try {
          // acquire token (silent after redirect)
          const accounts = instance.getAllAccounts();
          const account = accounts && accounts[0];
          const resp = await instance.acquireTokenSilent({ scopes: loginRequest.scopes, account });
          const accessToken = resp.accessToken;

          // call link endpoint
          await fetch("/api/auth/link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ patientId: storedPatientId, linkToken: storedLinkToken }),
          });
        } catch (e) {
          console.error("resume link failed", e);
        } finally {
          sessionStorage.removeItem("ehms_patient_id");
          sessionStorage.removeItem("ehms_link_token");
        }
      }
    }).catch(err => {
      console.warn("handleRedirectPromise error", err);
    });
  }, [instance]);
}