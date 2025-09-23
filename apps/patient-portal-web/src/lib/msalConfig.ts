import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "", // SPA client id
    authority: process.env.NEXT_PUBLIC_AZURE_AUTHORITY || `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : "",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error: console.error(message); return;
          case LogLevel.Info: console.info(message); return;
          case LogLevel.Verbose: console.debug(message); return;
          case LogLevel.Warning: console.warn(message); return;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: [
    "openid",
    "profile",
    "email",
    // <-- EXACT scope from Azure -> Expose an API (replace below if your value differs)
    "api://eyecare-patients-api-dev/patient.read"
  ],
};
