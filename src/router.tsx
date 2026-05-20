import { lazy, Suspense } from "react"
import { createBrowserRouter, useRouteError, isRouteErrorResponse } from "react-router-dom"
import Layout from "@/pages/_layout"
import HomePage from "@/pages/home"
import NotFoundPage from "@/pages/not-found"
import LoginPage from "@/pages/Login"
import { ProtectedRoute } from "@/components/shared/ProtectedRoute"

/**
 * Gestion des erreurs de route :
 * - Erreur de chargement de chunk (lazy import) → rechargement automatique
 * - Vraie 404 → page NotFound classique
 */
function RouteErrorBoundary() {
  const error = useRouteError()

  // Chunk loading error : le fichier JS du module n'a pas pu être chargé
  // (peut arriver après un rebuild Vite ou un problème réseau momentané)
  if (
    error instanceof Error &&
    (error.message.includes("dynamically imported module") ||
     error.message.includes("Failed to fetch") ||
     error.message.includes("Loading chunk"))
  ) {
    window.location.reload()
    return null
  }

  // Vraie erreur 404 React Router
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }

  // Toute autre erreur inattendue
  return <NotFoundPage />
}

// Chargement différé des pages modules (bundle-dynamic-imports)
const BudgetPage             = lazy(() => import("@/pages/Budget"))
const RHPage                 = lazy(() => import("@/pages/RH"))
const RHMissionsPage         = lazy(() => import("@/pages/RH/missions"))
const RHCongesPage           = lazy(() => import("@/pages/RH/conges"))
const RHAbsencesPage         = lazy(() => import("@/pages/RH/absences"))
const RHRecrutementPage      = lazy(() => import("@/pages/RH/recrutement"))
const RHSanctionsPage        = lazy(() => import("@/pages/RH/sanctions"))
const RHEvaluationsPage      = lazy(() => import("@/pages/RH/evaluations"))
const RHCourrierPage         = lazy(() => import("@/pages/RH/courrier"))
const AchatsPage             = lazy(() => import("@/pages/Achats"))
const ComptabilitePage       = lazy(() => import("@/pages/Comptabilite"))
const TresoreriePage         = lazy(() => import("@/pages/Tresorerie"))
const SuiviControlePage        = lazy(() => import("@/pages/SuiviControle"))
const ReportingClientsERDPage  = lazy(() => import("@/pages/SuiviControle/reporting-clients-erd"))
const PipelineProjetsPage      = lazy(() => import("@/pages/SuiviControle/pipeline-projets"))
const ProjetFormPage           = lazy(() => import("@/pages/SuiviControle/pipeline-projets/components/ProjetForm"))
const ProjetDetailsPage        = lazy(() => import("@/pages/SuiviControle/pipeline-projets/components/ProjetDetails"))

// Fallback de chargement — JSX statique hissé hors de la configuration (rendering-hoist-jsx)
const pageLoader = (
  <div className="flex items-center justify-center h-48">
    <div
      className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: "#f5c842", borderTopColor: "transparent" }}
    />
  </div>
)

const withSuspense = (element: React.ReactNode) => (
  <Suspense fallback={pageLoader}>{element}</Suspense>
)

// IMPORTANT: Do not remove or modify the code below!
// Normalize basename when hosted in Power Apps
const BASENAME = new URL(".", location.href).pathname
if (location.pathname.endsWith("/index.html")) {
  history.replaceState(null, "", BASENAME + location.search + location.hash)
}

export const router = createBrowserRouter(
  [
    // Route publique — page de connexion
    {
      path: "/login",
      element: <LoginPage />,
    },
    // Routes protégées — accessibles uniquement après connexion Microsoft
    {
      path: "/",
      element: (
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      ),
      errorElement: <RouteErrorBoundary />,
      children: [
        { index: true,          element: <HomePage /> },
        { path: "budget",       element: withSuspense(<BudgetPage />) },
        { path: "rh",           element: withSuspense(<RHPage />) },
        { path: "rh/missions",  element: withSuspense(<RHMissionsPage />) },
        { path: "rh/conges",    element: withSuspense(<RHCongesPage />) },
        { path: "rh/absences",      element: withSuspense(<RHAbsencesPage />) },
        { path: "rh/recrutement",  element: withSuspense(<RHRecrutementPage />) },
        { path: "rh/sanctions",    element: withSuspense(<RHSanctionsPage />) },
        { path: "rh/evaluations",  element: withSuspense(<RHEvaluationsPage />) },
        { path: "rh/courrier",     element: withSuspense(<RHCourrierPage />) },
        { path: "achats",            element: withSuspense(<AchatsPage />) },
        { path: "comptabilite", element: withSuspense(<ComptabilitePage />) },
        { path: "tresorerie",   element: withSuspense(<TresoreriePage />) },
        { path: "suivi",                                          element: withSuspense(<SuiviControlePage />) },
        { path: "suivi/reporting-erd",                        element: withSuspense(<ReportingClientsERDPage />) },
        { path: "suivi/pipeline-projets",                     element: withSuspense(<PipelineProjetsPage />) },
        { path: "suivi/pipeline-projets/projets/nouveau",     element: withSuspense(<ProjetFormPage />) },
        { path: "suivi/pipeline-projets/projets/:id/edit",    element: withSuspense(<ProjetFormPage />) },
        { path: "suivi/pipeline-projets/projets/:id",         element: withSuspense(<ProjetDetailsPage />) },
      ],
    },
  ],
  {
    basename: BASENAME, // IMPORTANT: Set basename for proper routing when hosted in Power Apps
  }
)
