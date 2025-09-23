import { Configuration, LogLevel } from "@azure/msal-browser";

const base = typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_BASE_URL || "";

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "",
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
    // IMPORTANT: must exactly match the redirect URI registered in Azure (including path and trailing slash)
    redirectUri: `${base}/auth/callback`,
  },
  cache: {
    cacheLocation: "localStorage", // This configures where your cache will be stored
    storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      }
    }
  }
};

// Add scopes here for ID token to be used at Microsoft Graph API endpoints.
export const loginRequest = {
  scopes: ["openid", "profile", "email"], // Basic scopes for authentication
  // Add API scope for your auth service if needed:
  // scopes: [`api://${process.env.NEXT_PUBLIC_AUTH_SERVICE_CLIENT_ID}/patient.read`]
};