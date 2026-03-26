import { useState } from "react"
import { useIsAuthenticated, useMsal } from "@azure/msal-react"
import { InteractionStatus } from "@azure/msal-browser"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"

export default function LoginPage() {
  const { login } = useAuth()
  const { inProgress } = useMsal()
  const isAuthenticated = useIsAuthenticated()
  const [clicked, setClicked] = useState(false)

  // Déjà connecté → rediriger vers le dashboard
  if (isAuthenticated) return <Navigate to="/" replace />

  // En cours de redirection Microsoft → afficher un loader
  const isRedirecting =
    clicked ||
    inProgress === InteractionStatus.Login ||
    inProgress === InteractionStatus.HandleRedirect

  const handleLogin = () => {
    setClicked(true)
    login()
  }

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
            {/* Icône solaire stylisée */}
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{
                background: "linear-gradient(135deg, #f0a500, #ffc235)",
                boxShadow:  "0 0 32px rgba(240, 165, 0, 0.3)",
              }}
            >
              <svg
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-9 h-9"
              >
                <path
                  d="M16 4C16 4 10 10 10 16C10 19.3137 12.6863 22 16 22C19.3137 22 22 19.3137 22 16C22 10 16 4 16 4Z"
                  fill="#080f0b"
                  fillOpacity="0.9"
                />
                <circle cx="16" cy="16" r="4" fill="#080f0b" />
                <line x1="16" y1="2" x2="16" y2="6" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="16" y1="26" x2="16" y2="30" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="16" x2="6" y2="16" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="26" y1="16" x2="30" y2="16" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="5.5" y1="5.5" x2="8.3" y2="8.3" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="23.7" y1="23.7" x2="26.5" y2="26.5" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="26.5" y1="5.5" x2="23.7" y2="8.3" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
                <line x1="8.3" y1="23.7" x2="5.5" y2="26.5" stroke="#080f0b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>

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
            onClick={handleLogin}
            disabled={isRedirecting}
            className="w-full flex items-center justify-center gap-3 rounded-lg py-3.5 px-5 font-display font-semibold text-sm transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isRedirecting
                ? "rgba(240, 165, 0, 0.5)"
                : "linear-gradient(135deg, #f0a500, #ffc235)",
              color:      "#080f0b",
              boxShadow:  isRedirecting ? "none" : "0 0 24px rgba(240, 165, 0, 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!isRedirecting)
                e.currentTarget.style.boxShadow = "0 0 32px rgba(240, 165, 0, 0.4)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 0 24px rgba(240, 165, 0, 0.2)"
            }}
          >
            {isRedirecting ? (
              <>
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "#080f0b", borderTopColor: "transparent" }}
                />
                Redirection vers Microsoft…
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

          {/* Note de sécurité */}
          <p
            className="text-center text-xs mt-6"
            style={{ color: "#3d6650" }}
          >
            Connexion sécurisée via Microsoft Azure AD
          </p>
        </div>

        {/* Version */}
        <p
          className="text-center text-xs mt-6"
          style={{ color: "#3d6650" }}
        >
          GIW'ANVO Gestion Interne — v1.0
        </p>
      </div>
    </div>
  )
}
