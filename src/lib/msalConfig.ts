import { type Configuration, LogLevel } from "@azure/msal-browser"

export const msalConfig: Configuration = {
  auth: {
    clientId:    import.meta.env.VITE_CLIENT_ID as string,
    authority:   `https://login.microsoftonline.com/${import.meta.env.VITE_TENANT_ID as string}`,
    // Racine de l'origine — stable entre les déploiements, enregistrée dans Azure AD
    // Utilisé comme redirect URI pour les popups : MSAL lit le hash depuis la popup
    // sans avoir besoin que la page cible exécute du code MSAL
    redirectUri: window.location.origin + "/",
  },
  cache: {
    cacheLocation:          "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return
        if (level === LogLevel.Error) console.error("[MSAL]", message)
      },
    },
  },
}

/** Scopes demandés lors de la connexion */
export const loginRequest = {
  scopes: [
    "User.Read",
    "Sites.Read.All",
    "Sites.ReadWrite.All",
  ],
}
