import { Configuration, LogLevel } from "@azure/msal-browser";

const base = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || "";

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    redirectUri: `${base}/auth/callback`,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        // Always log to console with MSAL level prefix
        const pref = `[MSAL ${LogLevel[level]}]`;
        switch (level) {
          case LogLevel.Error: console.error(pref, message); break;
          case LogLevel.Info: console.info(pref, message); break;
          case LogLevel.Verbose: console.debug(pref, message); break;
          case LogLevel.Warning: console.warn(pref, message); break;
          default: console.log(pref, message);
        }
      },
      logLevel: LogLevel.Verbose,
      piiLoggingEnabled: false
    }
  }
};

// Add scopes here for ID token to be used at Microsoft Graph API endpoints.
export const loginRequest = {
  // include your API scope so acquireTokenSilent returns an access token for API calls
  scopes: [
    "openid",
    "profile",
    "email",
    `api://${process.env.NEXT_PUBLIC_AZURE_CLIENT_ID}/patient.read` // API scope for backend access
  ],
};