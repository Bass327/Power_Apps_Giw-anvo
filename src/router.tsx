import { lazy, Suspense } from "react"
import { createBrowserRouter } from "react-router-dom"
import Layout from "@/pages/_layout"
import HomePage from "@/pages/home"
import NotFoundPage from "@/pages/not-found"
import LoginPage from "@/pages/Login"
import { ProtectedRoute } from "@/components/shared/ProtectedRoute"

// Chargement différé des pages modules (bundle-dynamic-imports)
const BudgetPage             = lazy(() => import("@/pages/Budget"))
const RHPage                 = lazy(() => import("@/pages/RH"))
const ExpressionBesoinPage   = lazy(() => import("@/pages/ExpressionBesoin"))
const ComptabilitePage       = lazy(() => import("@/pages/Comptabilite"))
const TresoreriePage         = lazy(() => import("@/pages/Tresorerie"))
const SuiviControlePage      = lazy(() => import("@/pages/SuiviControle"))

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
      errorElement: <NotFoundPage />,
      children: [
        { index: true,          element: <HomePage /> },
        { path: "budget",       element: withSuspense(<BudgetPage />) },
        { path: "rh",           element: withSuspense(<RHPage />) },
        { path: "expression-besoin", element: withSuspense(<ExpressionBesoinPage />) },
        { path: "comptabilite", element: withSuspense(<ComptabilitePage />) },
        { path: "tresorerie",   element: withSuspense(<TresoreriePage />) },
        { path: "suivi",        element: withSuspense(<SuiviControlePage />) },
      ],
    },
  ],
  {
    basename: BASENAME, // IMPORTANT: Set basename for proper routing when hosted in Power Apps
  }
)
