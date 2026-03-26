# PROMPTS.md — GIW'ANVO App — Séquence de prompts Claude Code

---

## 📌 Comment utiliser ce fichier

- **Dans le terminal VS Code :** Copie le contenu du prompt directement dans Claude Code
- **Comme fichier de référence :** Garde ce fichier ouvert pendant le développement
- **Ordre à respecter :** Prompt 1 → Prompt 2 → Prompt 3 → etc.
- **Attends que Claude Code finisse** chaque prompt avant de passer au suivant

---

---

# 🏗️ PROMPT 1 — Structure de navigation complète

> **Objectif :** Créer le squelette complet de l'app : layout, sidebar, header, routing

---

```
Tu travailles sur l'application interne GIW'ANVO Energy, une app React + TypeScript 
+ Tailwind CSS déployée dans Power Apps Code Apps.

Lis d'abord le fichier CLAUDE.md à la racine du projet pour comprendre le contexte complet.

## Ta mission

Construis la structure de navigation complète de l'application. 
Voici exactement ce que tu dois créer :

---

### 1. Layout principal (src/components/layout/AppLayout.tsx)

Un layout avec :
- Une sidebar gauche fixe (largeur 260px desktop, collapsible sur mobile)
- Un header en haut (hauteur 64px)
- Une zone de contenu principale à droite

---

### 2. Sidebar (src/components/layout/Sidebar.tsx)

La sidebar doit contenir :

**En-tête sidebar :**
- Logo GIW'ANVO (texte stylisé si pas d'image disponible)
- Sous-titre : "Gestion Interne"

**Navigation principale — 6 modules :**

| Icône (lucide-react) | Label | Route |
|---|---|---|
| LayoutDashboard | Tableau de bord | / |
| TrendingUp | Budget | /budget |
| Users | Ressources Humaines | /rh |
| ShoppingCart | Achats | /achats |
| BookOpen | Comptabilité | /comptabilite |
| Wallet | Trésorerie | /tresorerie |
| BarChart3 | Suivi & Contrôle | /suivi |

**En bas de sidebar :**
- Nom de l'utilisateur connecté (placeholder pour l'instant : "Bachir D.")
- Rôle (placeholder : "Administrateur")
- Bouton de déconnexion (icône LogOut)

**Style sidebar :**
- Fond : #1a3a2a
- Item actif : fond #2d5a3d, bordure gauche 3px solid #f5c842, texte blanc
- Item inactif : texte #a0b0a8, hover fond #2d5a3d
- Transitions douces sur hover (200ms)

---

### 3. Header (src/components/layout/Header.tsx)

Le header doit contenir :
- Bouton hamburger (menu toggle) à gauche sur mobile
- Titre de la page courante (dynamique selon la route active)
- À droite : 
  - Icône Bell (notifications) avec badge rouge si notifications > 0 (placeholder : 3)
  - Avatar utilisateur avec initiales

**Style header :**
- Fond : #0f2419
- Bordure bas : 1px solid #2a4a3a
- Texte blanc

---

### 4. Routing (src/router/index.tsx)

Configure React Router avec ces routes :

```tsx
/ → pages/Home/HomePage.tsx (Dashboard)
/budget → pages/Budget/BudgetPage.tsx
/rh → pages/RH/RHPage.tsx
/achats → pages/Achats/AchatsPage.tsx
/comptabilite → pages/Comptabilite/ComptabilitePage.tsx
/tresorerie → pages/Tresorerie/TresoreriePage.tsx
/suivi → pages/SuiviControle/SuiviControlePage.tsx
```

---

### 5. Pages placeholder

Pour chaque module, crée une page placeholder simple avec :
- Le titre du module en grand
- Un sous-titre : "Module en cours de développement"
- Une icône centrée
- Le nombre de procédures du module (voir tableau ci-dessous)

| Module | Procédures |
|---|---|
| Budget | 3 procédures |
| Ressources Humaines | 7 procédures |
| Achats | 2 procédures |
| Comptabilité | 5 procédures |
| Trésorerie | 6 procédures |
| Suivi & Contrôle | 4 procédures |

---

### 6. HomePage (src/pages/Home/HomePage.tsx)

Le dashboard principal avec 6 tuiles de navigation :

Chaque tuile contient :
- Icône du module (grande, 32px)
- Nom du module
- Nombre de procédures
- Badge de notifications (couleur or #f5c842) si > 0
- Flèche de navigation →
- Au clic : navigue vers la route du module

Style tuiles :
- Fond : #1a3a2a
- Bordure : 1px solid #2a4a3a
- Hover : fond #2d5a3d, border-color #3d7a4a
- Border-radius : 12px
- Transition : 200ms

Ajoute aussi en haut du dashboard :
- Message de bienvenue : "Bonjour, Bachir 👋"
- Date du jour en français (ex: "Mercredi 18 mars 2026")
- Résumé rapide : "27 procédures digitalisées · 6 modules actifs"

---

## Contraintes techniques

- Tout le texte de l'interface en FRANÇAIS
- TypeScript strict — pas de type `any`
- Tailwind CSS pour tous les styles (pas de CSS inline sauf pour les couleurs custom)
- Composants fonctionnels uniquement
- Lucide React pour toutes les icônes
- Le layout doit être responsive (mobile + desktop)
- Utilise les couleurs définies dans CLAUDE.md

## Ce que tu ne dois PAS faire

- Ne pas encore connecter à SharePoint ou MSAL (ce sera le Prompt 2)
- Ne pas créer de formulaires métier (ce sera après)
- Ne pas modifier package.json ou vite.config.ts

## Livrable attendu

À la fin, l'app doit :
1. Afficher une sidebar avec les 6 modules
2. Naviguer entre les pages via la sidebar
3. Afficher le dashboard avec les 6 tuiles
4. Être responsive sur mobile
5. Respecter l'identité visuelle GIW'ANVO (dark green + gold)

Commence par lire CLAUDE.md, puis crée les fichiers dans l'ordre logique.
Annonce chaque fichier que tu crées avant de le créer.
```

---

---

# 🔐 PROMPT 2 — Authentification MSAL (après Prompt 1)

> **Objectif :** Connecter l'app à Microsoft 365 avec MSAL.js
> ⚠️ Prérequis : avoir complété l'Azure AD App Registration et récupéré Client ID + Tenant ID

---

```
Le Prompt 1 est terminé. La navigation fonctionne.

Maintenant configure l'authentification Microsoft 365 avec MSAL.js.

## Prérequis à remplir dans CLAUDE.md avant ce prompt :
- CLIENT_ID (depuis Azure AD App Registration)
- TENANT_ID (depuis Azure AD)
- Environment URL Power Apps

## Ta mission

### 1. src/lib/msalConfig.ts
Configure MSAL avec :
- clientId, authority, redirectUri
- Scopes : User.Read, Sites.Read.All, Sites.ReadWrite.All

### 2. src/hooks/useAuth.ts
Hook personnalisé qui expose :
- user (nom, email, rôle)
- isAuthenticated (boolean)
- login() 
- logout()
- getToken() → Promise<string>

### 3. src/lib/graphClient.ts
Fonction helper pour les appels Graph API :
- Récupère le token automatiquement
- Gère les erreurs 401 (re-authentification)
- Base URL : https://graph.microsoft.com/v1.0

### 4. Page de login (src/pages/Login/LoginPage.tsx)
Page affichée si non connecté :
- Logo GIW'ANVO centré
- Titre : "Bienvenue sur GIW'ANVO Gestion"
- Bouton : "Se connecter avec Microsoft 365"
- Style dark green cohérent avec le reste de l'app

### 5. Protection des routes
Entoure toutes les routes avec un AuthGuard qui :
- Redirige vers /login si non connecté
- Affiche un loader pendant la vérification

### 6. Intégration dans la Sidebar et Header
Remplace les placeholders par les vraies données :
- Nom et prénom depuis User.Read (Graph API)
- Initiales dans l'avatar
- Rôle depuis la liste SharePoint Utilisateurs_GiwAnvo

Contraintes :
- Tout le texte en français
- Gère le cas où l'utilisateur n'est pas dans la liste SharePoint (afficher "Accès refusé")
- Ne pas bloquer le dev si MSAL non configuré (mode démo avec mock user)
```

---

---

# 🛒 PROMPT 3 — Module Achats (après Prompt 2)

> **Objectif :** Premier module métier complet — les 2 procédures d'achats
> Recommandé comme premier module car le plus simple et le plus concret

---

```
Navigation et auth sont en place. 

Construis maintenant le Module Achats complet avec ses 2 procédures.

## Contexte métier (depuis le Manuel des Procédures AGT SN)

### Procédure 1 — Achats ordinaires (montant 250 000 – 500 000 FCFA)
Circuit de validation : Demandeur → RAF → Directrice Générale → Responsable Logistique

### Procédure 2 — Achats restreints (montant > 500 000 FCFA)  
Circuit de validation : Demandeur → RAF → Directrice Générale (validation finale) → Comptable

## Liste SharePoint cible : Demandes_Achats

## Ta mission

### 1. src/services/sharepoint/demandesAchatsService.ts
Fonctions CRUD :
- getDemandesAchats() → liste toutes les demandes
- getDemandeAchatById(id) → une demande
- createDemandeAchat(data) → créer
- updateStatutDemande(id, statut) → valider/rejeter

### 2. src/types/DemandeAchat.ts
Interface TypeScript complète avec tous les champs :
- id, titre, description, montant, devise (FCFA)
- typeAchat: 'ORDINAIRE' | 'RESTREINT'
- statut: 'BROUILLON' | 'SOUMIS' | 'VALIDE_RAF' | 'VALIDE_DG' | 'APPROUVE' | 'REJETE'
- demandeur, dateDemande, dateBesoin
- fournisseur, justification, lignesBudgetaires

### 3. src/hooks/useDemandesAchats.ts
Hook avec TanStack Query :
- useDemandesAchats() → liste avec cache
- useCreateDemandeAchat() → mutation
- useUpdateStatutDemande() → mutation

### 4. src/pages/Achats/AchatsPage.tsx
Page principale avec :
- Onglets : "Mes demandes" | "À valider" | "Toutes les demandes"
- Tableau des demandes avec colonnes : N°, Objet, Montant, Type, Statut, Date, Actions
- Bouton "+ Nouvelle demande"
- Filtres par statut et par type
- Badges de statut colorés :
  - BROUILLON : gris
  - SOUMIS : bleu
  - VALIDE_RAF : orange
  - VALIDE_DG : or #f5c842
  - APPROUVE : vert
  - REJETE : rouge

### 5. src/pages/Achats/components/FormulaireDemandeAchat.tsx
Formulaire de création avec :
- Champs : Objet, Description, Montant (FCFA), Date de besoin, Fournisseur suggéré, Justification, Ligne budgétaire
- Détection automatique du type (ORDINAIRE si < 500 000, RESTREINT si >=)
- Affichage du circuit de validation selon le type détecté
- Validation des champs (tous requis sauf fournisseur)
- Boutons : "Enregistrer brouillon" | "Soumettre pour validation"

### 6. src/pages/Achats/components/DetailDemandeAchat.tsx
Vue détail d'une demande avec :
- Toutes les informations de la demande
- Timeline du circuit de validation (qui a validé, quand, commentaire)
- Boutons d'action selon le rôle de l'utilisateur connecté :
  - RAF : "Valider" | "Rejeter" + champ commentaire
  - Directrice : "Approuver" | "Rejeter" + champ commentaire
  - Demandeur : lecture seule si déjà soumis

## Contraintes
- Montants toujours formatés en FCFA : "1 500 000 FCFA"
- Dates en français : "18 mars 2026"
- Tout texte en français
- Gestion des erreurs API avec messages en français
- Loading states sur tous les boutons d'action
```

---

---

# 📅 Prompts suivants (à venir)

| # | Prompt | Module | Priorité |
|---|---|---|---|
| 4 | Module RH — Congés + Missions | RH | Haute |
| 5 | Module Budget — Suivi budgétaire | Budget | Haute |
| 6 | Module Trésorerie — Caisse + Décaissements | Trésorerie | Moyenne |
| 7 | Module Comptabilité — Journaux | Comptabilité | Moyenne |
| 8 | Module Suivi & Contrôle | Suivi | Moyenne |
| 9 | Notifications globales | Transversal | Basse |
| 10 | Déploiement Power Apps | DevOps | Finale |

---

## 💡 Conseils pour utiliser Claude Code efficacement

1. **Toujours commencer par** : "Lis d'abord CLAUDE.md" dans chaque prompt
2. **Si Claude Code s'arrête** au milieu : tape "continue" pour qu'il reprenne
3. **Si un fichier est mal généré** : dis "refais le fichier X en respectant la contrainte Y"
4. **Pour déboguer** : copie l'erreur exacte du terminal et dis "voici l'erreur, corrige-la"
5. **Après chaque prompt** : teste dans le navigateur avant de passer au suivant
