import { useState, useEffect, useRef, useCallback } from "react"
import logoGiwanvo from "@/assets/logo-giwanvo.png"
import { useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { detectTeams } from "@/lib/teamsAuth"

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const { inProgress } = useMsal()
  const [isLoading, setIsLoading]   = useState(false)
  const [popupError, setPopupError] = useState<string | null>(null)
  // Garde pour éviter de déclencher l'auto-login deux fois en cas de re-render
  const autoLoginDone               = useRef(false)

  const isInProgress =
    isLoading ||
    inProgress === InteractionStatus.Login ||
    inProgress === InteractionStatus.AcquireToken ||
    inProgress === InteractionStatus.HandleRedirect

  const handleLogin = useCallback(async () => {
    if (isInProgress) return
    setIsLoading(true)
    setPopupError(null)
    try {
      await login()
      // MSAL met à jour accounts → isAuthenticated devient true → Navigate s'affiche
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error)
      if (
        msg.includes("user_cancelled") ||
        msg.includes("CancelledByUser") ||
        msg.includes("Redirection en cours") ||
        msg.includes("redirect_in_iframe")
      ) {
        // Annulation utilisateur ou redirection en cours — pas d'erreur à afficher
        return
      }
      if (msg.includes("popup_blocked_iframe")) {
        setPopupError("Les popups sont bloquées dans cet environnement. Ouvrez l'application directement dans Teams.")
        return
      }
      if (msg.includes("Teams auth timeout")) {
        setPopupError(msg)
        return
      }
      setPopupError("Erreur de connexion : " + msg)
      console.error("[Auth] Erreur login :", error)
    } finally {
      setIsLoading(false)
    }
  }, [login, isInProgress])

  // Dans Teams, déclenche le SSO silencieusement dès le montage.
  // Azure AD complète le flux PKCE sans intervention utilisateur si la session M365 est active.
  useEffect(() => {
    if (autoLoginDone.current) return
    autoLoginDone.current = true
    void detectTeams().then(inTeams => {
      if (inTeams) void handleLogin()
    })
  }, [handleLogin])

  // Déjà connecté → rediriger vers le dashboard
  if (isAuthenticated) return <Navigate to="/" replace />

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ backgroundColor: "#080f0b" }}
    >
      {/* Lueur d'ambiance verte en fond */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(45,158,95,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-md">
        {/* Carte de connexion */}
        <div
          className="rounded-2xl p-10"
          style={{
            background:      "rgba(13, 26, 16, 0.85)",
            backdropFilter:  "blur(16px)",
            border:          "1px solid #1e3528",
            boxShadow:       "0 24px 80px rgba(0,0,0,0.5)",
          }}
        >
          {/* Logo + nom */}
          <div className="flex flex-col items-center mb-10">
            <img
              src={logoGiwanvo}
              alt="GIW'ANVO Energy"
              className="mb-5"
              style={{ height: "80px", width: "auto", objectFit: "contain" }}
            />
            <h1
              className="font-display font-extrabold text-3xl tracking-tight leading-none"
              style={{ color: "#e8f0eb" }}
            >
              GIW'ANVO
            </h1>
            <p
              className="text-sm mt-1 tracking-widest uppercase font-display"
              style={{ color: "#f0a500" }}
            >
              Energy
            </p>
            <p
              className="text-sm mt-4 text-center"
              style={{ color: "#7a9e87" }}
            >
              Plateforme de gestion interne
            </p>
          </div>

          {/* Séparateur */}
          <div
            className="h-px mb-8"
            style={{ backgroundColor: "#1e3528" }}
          />

          {/* Message d'accueil */}
          <p
            className="text-center text-sm mb-8"
            style={{ color: "#7a9e87" }}
          >
            Connectez-vous avec votre compte Microsoft&nbsp;365 d'entreprise pour accéder à l'application.
          </p>

          {/* Bouton de connexion Microsoft */}
          <button
            onClick={() => { void handleLogin() }}
            disabled={isInProgress}
            className="w-full flex items-center justify-center gap-3 rounded-lg py-3.5 px-5 font-display font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isInProgress
                ? "rgba(240, 165, 0, 0.5)"
                : "linear-gradient(135deg, #f0a500, #ffc235)",
              color:      "#080f0b",
              boxShadow:  isInProgress ? "none" : "0 0 24px rgba(240, 165, 0, 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!isInProgress)
                e.currentTarget.style.boxShadow = "0 0 32px rgba(240, 165, 0, 0.4)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 24px rgba(240, 165, 0, 0.2)"
            }}
          >
            {isInProgress ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#080f0b", borderTopColor: "transparent" }}
                />
                Connexion en cours…
              </>
            ) : (
              <>
                {/* Logo Microsoft */}
                <svg viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                  <rect x="1"  y="1"  width="9" height="9" fill="#080f0b" fillOpacity="0.7" />
                  <rect x="11" y="1"  width="9" height="9" fill="#080f0b" fillOpacity="0.7" />
                  <rect x="1"  y="11" width="9" height="9" fill="#080f0b" fillOpacity="0.7" />
                  <rect x="11" y="11" width="9" height="9" fill="#080f0b" fillOpacity="0.7" />
                </svg>
                Se connecter avec Microsoft
              </>
            )}
          </button>

          {/* Message d'erreur popup */}
          {popupError && (
            <p
              className="text-center text-xs mt-4 px-2"
              style={{ color: "#ef4444" }}
            >
              {popupError}
            </p>
          )}

          {/* Note de sécurité */}
          <p
            className="text-center text-xs mt-6"
            style={{ color: "#3d6650" }}
          >
            Connexion sécurisée via Microsoft Azure AD
          </p>
        </div>

      </div>
    </div>
  )
}
