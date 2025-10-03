import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || "7dbdd15b-b36e-44d9-bdb8-2d97af3fc29bc",
    authority: process.env.NEXT_PUBLIC_AZURE_AUTHORITY || `https://eyehospitalextd.ciamlogin.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'b9337298-b6a4-4a97-9438-ad3a897b7d62'}`,
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/auth` : "",
    knownAuthorities: ["eyehospitalextd.ciamlogin.com"],
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
    "offline_access"
  ],
};
