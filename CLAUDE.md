# CLAUDE.md — GIW'ANVO Internal Management App

## 🏢 Project Overview

This is the internal business management application for **GIW'ANVO Energy** (formerly Africa GreenTec Sénégal — AGT SN), a clean energy and sustainable infrastructure company based in Dakar, Senegal.

The app digitalizes and streamlines 27 administrative, financial, and HR procedures drawn from the company's official internal procedures manual.

**Company mission:** Delivering reliable solar energy and sustainable infrastructure solutions for businesses, institutions, and communities in sub-Saharan Africa.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Styling | Tailwind CSS |
| Routing | React Router DOM |
| State | TanStack Query (React Query) |
| Auth | MSAL.js (Microsoft Authentication Library) |
| API | Microsoft Graph API v1.0 |
| Data | SharePoint Lists (via Graph API) |
| Hosting | Power Apps Code Apps (localhost:5173 dev) |
| Bundler | Vite |
| Notifications | Sonner |

---

# 🎨 Design System — GIW'ANVO Gestion Interne
# (Remplace la section "Design System & Brand Identity" dans CLAUDE.md)

---

## 🎨 Design System & Brand Identity

### Aesthetic Direction

**Concept : "Solar Command Center"**
Think mission control meets African solar tech. This is a professional internal tool 
used by an energy company operating in sub-Saharan Africa. The UI should feel:
- **Powerful** — like controlling infrastructure from a command dashboard
- **Premium** — not a generic enterprise tool, a product people enjoy using
- **Warm** — African warmth through amber/gold accents cutting through deep greens
- **Unforgettable detail** — subtle noise textures, glowing accents, sharp typography

---

### Color Palette

```css
/* === BACKGROUNDS (layered depth) === */
--bg-base:      #080f0b;   /* Deepest background — almost black green */
--bg-surface:   #0d1a10;   /* Cards, panels */
--bg-elevated:  #122018;   /* Hover states, modals */
--bg-border:    #1e3528;   /* Subtle borders */

/* === GREEN SCALE === */
--green-dim:    #1a3a2a;   /* Muted green — inactive states */
--green-mid:    #256640;   /* Medium green — secondary actions */
--green-vivid:  #2d9e5f;   /* Primary actions, active states */
--green-bright: #3dbf72;   /* Hover on primary, success glow */
--green-glow:   rgba(45, 158, 95, 0.15);  /* Ambient glow effect */

/* === AMBER/GOLD ACCENTS === */
--gold-warm:    #f0a500;   /* Primary accent — logo, badges, CTAs */
--gold-bright:  #ffc235;   /* Hover on gold elements */
--gold-muted:   #7a5200;   /* Subtle gold tint */
--gold-glow:    rgba(240, 165, 0, 0.12);  /* Gold ambient glow */

/* === TEXT === */
--text-primary:   #e8f0eb;  /* Main text — warm white */
--text-secondary: #7a9e87;  /* Secondary, labels */
--text-muted:     #3d6650;  /* Placeholder, disabled */
--text-inverse:   #080f0b;  /* Text on gold buttons */

/* === STATUS COLORS === */
--status-success: #22c55e;
--status-warning: #f59e0b;
--status-error:   #ef4444;
--status-info:    #3b82f6;
--status-pending: #8b5cf6;
```

---

### Typography

```css
/* Import in index.css */
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');

/* === FONT STACK === */
--font-display: 'Syne', sans-serif;    /* Headers, module names, nav — geometric, bold */
--font-body:    'DM Sans', sans-serif; /* Body text, labels, forms — clean, readable */

/* === SCALE === */
--text-xs:   0.75rem;   /* 12px — badges, captions */
--text-sm:   0.875rem;  /* 14px — labels, secondary */
--text-base: 1rem;      /* 16px — body */
--text-lg:   1.125rem;  /* 18px — card titles */
--text-xl:   1.25rem;   /* 20px — section titles */
--text-2xl:  1.5rem;    /* 24px — page titles */
--text-3xl:  1.875rem;  /* 30px — dashboard greeting */
--text-4xl:  2.25rem;   /* 36px — hero numbers */

/* === USAGE === */
/* Page titles, module names → font-display, font-bold, tracking-tight */
/* Body text, descriptions → font-body, font-normal */
/* Numbers, stats → font-display, font-extrabold, tabular-nums */
/* Nav items → font-display, font-medium, tracking-wide */
```

---

### Visual Effects & Atmosphere

```css
/* === NOISE TEXTURE (applied to bg-base) === */
/* Use a subtle SVG noise filter on the root background */
/* Creates depth and prevents flat "painted" look */

/* === GLOWS === */
/* Active nav item: box-shadow: 0 0 20px var(--green-glow) */
/* Gold badge: box-shadow: 0 0 12px var(--gold-glow) */
/* Primary button hover: box-shadow: 0 0 24px var(--green-glow) */

/* === GLASSMORPHISM (for cards) === */
/* background: rgba(13, 26, 16, 0.7) */
/* backdrop-filter: blur(12px) */
/* border: 1px solid rgba(30, 53, 40, 0.8) */

/* === GRADIENTS === */
/* Sidebar gradient: linear-gradient(180deg, #080f0b 0%, #0d1a10 100%) */
/* Card hover: linear-gradient(135deg, #122018 0%, #0d1a10 100%) */
/* Gold button: linear-gradient(135deg, #f0a500 0%, #ffc235 100%) */
/* Active badge: linear-gradient(135deg, #f0a500 0%, #f59e0b 100%) */

/* === BORDERS === */
/* Default: 1px solid var(--bg-border) */
/* Active/hover: 1px solid var(--green-vivid) */
/* Gold highlight: 1px solid var(--gold-warm) */
/* Left accent bar (active nav): 3px solid var(--gold-warm) */
```

---

### Component Visual Specs

#### Sidebar
```
Width: 72px (collapsed) / 260px (expanded)
Background: linear-gradient(180deg, #080f0b, #0d1a10)
Border-right: 1px solid #1e3528
Logo area: Gold icon + "GIW'ANVO" in Syne Bold
Nav items: 
  - Icon 20px + label (Syne Medium)
  - Active: gold left bar + green-glow background + white text
  - Hover: bg-elevated + text-primary transition 150ms
```

#### Cards (Module tiles on dashboard)
```
Background: rgba(13, 26, 16, 0.7)
Backdrop-filter: blur(12px)
Border: 1px solid #1e3528
Border-radius: 16px
Padding: 24px
Hover: border-color → green-vivid, subtle scale(1.01), shadow glow
Transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1)
Badge (top-right): gold gradient circle, Syne Bold, text-inverse
```

#### Header
```
Background: rgba(8, 15, 11, 0.9)
Backdrop-filter: blur(20px)
Border-bottom: 1px solid #1e3528
Height: 64px
Page title: Syne Bold, 20px, text-primary
User avatar: gold gradient circle, initials in text-inverse
Role badge: small pill, bg-elevated, green-vivid text
```

#### Buttons
```
Primary (Gold CTA):
  bg: linear-gradient(135deg, #f0a500, #ffc235)
  text: #080f0b (dark)
  font: Syne SemiBold
  border-radius: 8px
  hover: brightness(1.1) + glow shadow

Secondary (Green outline):
  bg: transparent
  border: 1px solid green-vivid
  text: green-bright
  hover: bg-elevated

Danger:
  bg: rgba(239, 68, 68, 0.1)
  border: 1px solid #ef4444
  text: #ef4444
```

#### Status Badges
```
BROUILLON:  bg rgba(61,102,80,0.2)  | text #7a9e87  | border #1e3528
SOUMIS:     bg rgba(59,130,246,0.1) | text #60a5fa  | border rgba(59,130,246,0.3)
VALIDÉ_RAF: bg rgba(245,158,11,0.1) | text #f59e0b  | border rgba(245,158,11,0.3)
APPROUVÉ:   bg rgba(34,197,94,0.1)  | text #22c55e  | border rgba(34,197,94,0.3)
REJETÉ:     bg rgba(239,68,68,0.1)  | text #ef4444  | border rgba(239,68,68,0.3)
```

---

### Animations & Motion

```css
/* === PAGE TRANSITIONS === */
/* Fade + slide up on route change */
/* initial: opacity 0, translateY 12px */
/* animate: opacity 1, translateY 0 */
/* duration: 250ms, ease-out */

/* === STAGGERED ENTRY (dashboard tiles) === */
/* Each tile: animation-delay: calc(index * 60ms) */
/* Creates a cascade reveal effect on load */

/* === HOVER MICRO-INTERACTIONS === */
/* Nav items: translateX(3px) on hover */
/* Cards: scale(1.01) + border-color transition */
/* Buttons: brightness + shadow transition */
/* Badge numbers: scale pop on update */

/* === NUMBER COUNTERS === */
/* Stats on dashboard animate from 0 to value on mount */
/* Duration: 800ms, ease-out */

/* Use framer-motion or CSS animations — NO janky transitions */
/* All durations: 150ms (micro) | 200ms (standard) | 300ms (emphasis) */
```

---

### Layout Principles

```
- Generous padding: 24px inside cards, 32px on page containers
- Consistent spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px
- Sidebar always visible on desktop (>1024px)
- Tables: alternating row opacity for readability (even rows: bg-elevated)
- Forms: labels above inputs, full-width on mobile
- Empty states: illustrated with icon + message, never just blank space
- Loading: skeleton screens (not spinners) for content areas
```

---

### DO & DON'T

```
✅ DO:
- Use Syne for all headings and navigation
- Apply subtle glow effects on interactive elements
- Layer transparency for depth (glassmorphism on cards)
- Gold for primary actions, green for secondary
- Noise texture on the root background
- Smooth staggered animations on list items

❌ DON'T:
- Never use Inter, Roboto, or Arial
- Never use pure white (#fff) backgrounds
- Never use flat solid colors without depth
- Never use blue as a primary color (breaks brand)
- Never use sharp 4px border-radius on cards (use 12-16px)
- Never add animations longer than 400ms
- Never use generic purple gradients
```

## 🏗️ Application Architecture

### Module Structure (6 modules covering 27 procedures)

```
src/
├── assets/              # Logos, icons, images
├── components/          # Reusable UI components
│   ├── ui/              # Base components (Button, Input, Modal, etc.)
│   ├── layout/          # Header, Sidebar, Navigation
│   └── shared/          # Shared business components
├── hooks/               # Custom React hooks
│   ├── useAuth.ts       # MSAL authentication hook
│   └── useSharePoint.ts # SharePoint Graph API hook
├── lib/
│   ├── graphClient.ts   # Microsoft Graph API client setup
│   ├── msalConfig.ts    # MSAL configuration
│   └── utils.ts         # Utility functions
├── pages/               # One folder per module
│   ├── Home/            # Dashboard / App Hub
│   ├── Budget/          # Module Budget
│   ├── RH/              # Module Ressources Humaines
│   ├── ExpressionBesoin/ # Module Expression de Besoin
│   ├── Comptabilite/    # Module Comptabilité
│   ├── Tresorerie/      # Module Trésorerie
│   └── SuiviControle/   # Module Suivi & Contrôle
├── providers/           # React context providers
├── router/              # Route definitions
├── services/            # API service layer
│   └── sharepoint/      # One service file per SharePoint list
└── types/               # TypeScript interfaces and types
```

---

## 📋 The 27 Procedures by Module

### 📊 Module Budget (3 procedures)
| # | Procedure | SharePoint List |
|---|---|---|
| 1 | Préparation du budget (PAB) | `Suivi_Budgétaire` |
| 2 | Exécution budgétaire | `Suivi_Budgétaire` |
| 3 | Suivi trimestriel budgétaire | `Suivi_Budgétaire` |

### 👥 Module RH — Ressources Humaines (7 procedures)
| # | Procedure | SharePoint List |
|---|---|---|
| 4 | Recrutement | `Utilisateurs_Giwanvo` |
| 5 | Gestion des absences | `Demandes_Congés` |
| 6 | Gestion des missions / Ordres de mission | `Ordres_Mission` |
| 7 | Gestion des congés | `Demandes_Congés` |
| 8 | Sanctions disciplinaires | `Utilisateurs_Giwanvo` |
| 9 | Évaluation des performances | `Évaluations_Performance` |
| 10 | Gestion du courrier | *(à créer si besoin)* |

### 🛒 Module Expression de Besoin (2 procedures)
| # | Procedure | SharePoint List |
|---|---|---|
| 11 | Achats ordinaires (250K–500K FCFA) | `Demandes_Achats` |
| 12 | Achats restreints (>500K FCFA) | `Demandes_Achats` |

### 📒 Module Comptabilité (5 procedures)
| # | Procedure | SharePoint List |
|---|---|---|
| 13 | Journaux comptables | `Journal_Caisse` |
| 14 | Tableau de bord mensuel | `Suivi_Budgétaire` |
| 15 | Arrêté des comptes annuels | `Suivi_Budgétaire` |
| 16 | Gestion des pièces justificatives | `Journal_Caisse` |
| 17 | Amortissements des immobilisations | *(lecture seule / reporting)* |

### 💰 Module Trésorerie (6 procedures)
| # | Procedure | SharePoint List |
|---|---|---|
| 18 | Alimentation des comptes bancaires | `Demandes_Décaissement` |
| 19 | Dépenses par chèque / virement | `Demandes_Décaissement` |
| 20 | Rapprochement bancaire | `Journal_Caisse` |
| 21 | Approvisionnement de la caisse | `Journal_Caisse` |
| 22 | Paiements en espèces (caisse) | `Journal_Caisse` |
| 23 | Inventaire de caisse | `Journal_Caisse` |

### 🔍 Module Suivi & Contrôle (4 procedures)
| # | Procedure | SharePoint List |
|---|---|---|
| 24 | Contrôle financier interne | `Suivi_Budgétaire` |
| 25 | Rapports techniques et financiers | `Suivi_Budgétaire` |
| 26 | Suivi budgétaire trimestriel | `Suivi_Budgétaire` |
| 27 | Suivi-évaluation des projets | `Suivi_Budgétaire` |

---

## 🔗 SharePoint Configuration

### Tenant
```
Tenant URL: https://giwaanvoenergy961.sharepoint.com
Site Name: Giw'anvo-PowerApps
Site URL: https://giwaanvoenergy961.sharepoint.com/sites/GiwanvoPowerApps
```

### SharePoint Lists — Noms internes réels (via GET /sites/{siteId}/lists)

> ⚠️ SharePoint supprime les accents dans les noms internes (`name`). Toujours utiliser
> la colonne "Nom interne" dans le code, jamais le displayName.

| displayName SharePoint | **Nom interne à utiliser dans le code** |
|---|---|
| `Utilisateurs_Giw'anvo` | `Utilisateurs_Giwanvo` |
| `Demandes_Achats` | `Demandes_Achats` |
| `Demandes_Décaissement` | `Demandes_Dcaissement` |
| `Demandes_Congés` | `Demandes_Congs` |
| `Ordres_Mission` | `Ordres_Mission` |
| `Suivi_Budgétaire` | `Suivi_Budgtaire` |
| `Journal_Caisse` | `Journal_Caisse` |
| `Évaluations_Performance` | `valuations_Performance` |

### Graph API Base URL
```
https://graph.microsoft.com/v1.0/sites/{siteId}/lists/{listName}/items
```

---

## ⚙️ Power Apps Environment

```
Environment URL: https://org34627dd6.crm.dynamics.com/
Environment ID:  3b628f36-7462-e041-bca5-038835035804
Tenant ID:       32fc933b-aafe-42eb-90c3-e01014d9f9ec
Client ID:       b9aeece8-860f-43d2-bc77-06972e7ff8d1
```

> ⚠️ **TODO:** Compléter ces valeurs après avoir récupéré l'URL dans Power Apps Admin Center et enregistré l'app dans Azure AD.

---

## 🔐 Authentication (MSAL.js)

All users authenticate with their **Microsoft 365 account** (same account used for Teams and SharePoint). No separate login is required.

```typescript
// src/lib/msalConfig.ts
export const msalConfig = {
  auth: {
    clientId: "[CLIENT_ID — À COMPLÉTER après Azure AD App Registration]",
    authority: "https://login.microsoftonline.com/[TENANT_ID]",
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
}

export const loginRequest = {
  scopes: [
    "User.Read",
    "Sites.Read.All",
    "Sites.ReadWrite.All",
  ],
}
```

---

## 👥 User Roles & Permissions

Based on the procedures manual, the app has 4 roles:

| Role | French Label | Access Level |
|---|---|---|
| `DIRECTRICE` | Directrice Générale | Full access — final approvals |
| `RAF` | Responsable Administratif et Financier | Full access — financial validation |
| `RH` | Responsable RH | HR module full access |
| `EMPLOYE` | Collaborateur | Submit requests, view own records |
| `COMPTABLE` | Comptable | Accounting & Treasury modules |

Role is determined by the user's profile in the `Utilisateurs_Giwanvo` SharePoint list.

---

## 🌍 Localization

- **Primary language:** French (fr-FR)
- **Currency:** FCFA (XOF) — format: `1 500 000 FCFA`
- **Date format:** DD/MM/YYYY
- **Timezone:** Africa/Dakar (UTC+0, no DST)

---

## 📏 Coding Conventions

### General
- All UI text, labels, and messages **must be in French**
- Use **TypeScript** — no `any` types
- One component per file
- Functional components only (no class components)
- Use custom hooks for all data fetching

### Naming
```typescript
// Components: PascalCase
FormDemandeAchat.tsx
ModuleBudget.tsx

// Hooks: camelCase with "use" prefix
useDemandesAchats.ts
useCurrentUser.ts

// Services: camelCase
demandesAchatsService.ts
journalCaisseService.ts

// Types: PascalCase with descriptive suffix
DemandeAchatItem.ts
UtilisateurGiwAnvo.ts
```

### Component Structure
```typescript
// Always follow this pattern:
import { ... } from "..."

interface Props {
  // typed props
}

export const ComponentName = ({ prop1, prop2 }: Props) => {
  // hooks first
  // handlers
  // render
  return (...)
}
```

### SharePoint Service Pattern
```typescript
// Always use this pattern for Graph API calls:
export const getDemandesAchats = async (token: string) => {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${SITE_ID}/lists/Demandes_Achats/items?$expand=fields`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  )
  if (!response.ok) throw new Error("Erreur lors de la récupération des demandes d'achats")
  return response.json()
}
```

---

## 🚀 Development Workflow

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

### Git Conventions
```
feat: ajout du formulaire de demande d'achat
fix: correction du calcul de budget
style: mise à jour des couleurs du module RH
refactor: extraction du hook useCurrentUser
docs: mise à jour du CLAUDE.md
```

---

## 📌 Current Development Status

### ✅ Done
- [x] SharePoint site created (`Giw'anvo-PowerApps`)
- [x] 8 SharePoint lists created with all required columns
- [x] Power Apps Code Apps feature enabled in Admin Center
- [x] Project scaffolded with `degit microsoft/PowerAppsCodeApps/templates/starter`
- [x] Dependencies installed (`npm install`)
- [x] Dev server running (`npm run dev`) on `localhost:5173`
- [x] VS Code + Claude Code v2.1.77 configured

### 🔄 In Progress
- [ ] Retrieve Power Apps Environment URL
- [ ] Azure AD App Registration
- [ ] MSAL authentication setup
- [ ] Main navigation / App Hub layout

### 📅 Up Next
- [ ] Module Budget — Phase 1
- [ ] Module RH — Phase 1
- [ ] Module Expression de Besoin — Phase 1
- [ ] Connect to SharePoint via Graph API
- [ ] Deploy to Power Apps

---

## 🗂️ Mapping des colonnes SharePoint — Demandes_Achats

> Noms internes réels obtenus via `GET /sites/{siteId}/lists/Demandes_Achats/columns`.
> **Règle absolue** : toujours utiliser le nom interne dans les appels Graph API, jamais le displayName.

| displayName SharePoint | Nom interne (à utiliser dans le code) | Champ modèle applicatif |
|---|---|---|
| Titre | `Title` | `titre` |
| Demandeur | `Demandeur` | `demandeur` |
| Description_Besoin | `Description_Besoin` | `description` |
| Montant_Estimé | `Montant_Estim_x00e9_` | `montant` |
| Ligne_Budgétaire | `Ligne_Budg_x00e9_taire` | `ligneBudgetaire` |
| Département | `D_x00e9_partement` | *(non mappé)* |
| Catégorie_Achat | `Cat_x00e9_gorie_Achat` | *(non mappé)* |
| Statut | `Statut` | `statut` |
| Date | `Date` | `dateBesoin` |
| Commentaire_RAF | `Commentaire_RAF` | `commentaireRAF` |
| Commentaire_DG | `Commentaire_DG` | `commentaireDirectrice` |
| TypeDemande | `TypeDemande` | `typeDemande` |
| Mission | `Mission` | `typeMissionCollective` |
| *(autres champs étendus)* | même nom | même nom |

## 🗂️ Mapping des colonnes SharePoint — Utilisateurs_Giwanvo

> Noms internes confirmés via la console (diagnostic useCurrentUser).

| displayName SharePoint | Nom interne (à utiliser dans le code) | Usage |
|---|---|---|
| Titre | `Title` | Nom court affiché |
| Nom Complet | `NomComplet` | Nom complet de l'utilisateur |
| Email | `Email` | Email Microsoft 365 |
| Rôle | `R_x00f4_le` | Rôle GIW'ANVO (ex: "Employé", "RAF"...) |
| Département | `D_x00e9_partement` | Code département (ex: "DSID", "DG", "DTO") |
| Poste | `Poste` | Intitulé du poste |
| Actif | `Actif` | "Oui" \| "Non" |

### ✅ Toutes les colonnes sont présentes dans SP

Les 6 colonnes ajoutées manuellement (mars 2026) pour compléter le circuit :
`CommentaireChef`, `DateValidationChef`, `DateValidationRAF`, `DateApprobation`, `Fournisseur`, `Justification`

---

## ⚠️ Important Notes for Claude Code

1. **All UI must be in French** — never use English labels in the interface
2. **Dark theme** — background `#1a3a2a`, never use white backgrounds
3. **FCFA currency** — always format amounts as `1 500 000 FCFA` (space as thousands separator)
4. **Approval workflows** — every form has a multi-step validation chain (Employé → Chef Dept. → RAF → Directrice → Comptable)
5. **SharePoint as single source of truth** — never store data locally, always read/write via Graph API
6. **Role-based access** — always check user role before rendering sensitive actions
7. **Mobile-first** — the app will be used on Teams mobile by field employees
8. **Noms internes SharePoint** — toujours utiliser le nom interne (`name`) pour Graph API, jamais le `displayName`. Voir tableau de mapping ci-dessus.
