import { PublicClientApplication } from "@azure/msal-browser"
import { MsalProvider } from "@azure/msal-react"
import { msalConfig } from "@/lib/msalConfig"
import { isPowerAppsEnv } from "@/lib/powerAppsBridge"

// Instance créée une seule fois — uniquement utilisée hors Power Apps
const msalInstance = new PublicClientApplication(msalConfig)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // En Power Apps, MSAL n'est pas nécessaire et ses appels réseau
  // sont bloqués par la CSP du player — on court-circuite entièrement.
  if (isPowerAppsEnv()) {
    return <>{children}</>
  }
  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  )
}
