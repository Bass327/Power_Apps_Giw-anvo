# ROLES_PERMISSIONS.md — GIW'ANVO
# Matrice des accès et vues par rôle
# Basé sur le Manuel des Procédures Administratives et Financières AGT SN

---

## 📌 Règle fondamentale
Les rôles sont lus depuis la liste SharePoint `Utilisateurs_GiwAnvo`, 
colonne `Role`. Valeurs exactes (respecter casse et ponctuation) :
- "Employé"
- "Chef Dept."
- "RAF"
- "Comptable"
- "Directrice"

---

## 👤 EMPLOYÉ

### Qui est-il ?
Tout collaborateur de GIW'ANVO sans responsabilité de validation.
Il initie les demandes et suit leur traitement.

### Dashboard
- Greeting personnalisé : "Bonjour, [Prénom]"
- 6 tuiles modules visibles
- Activité récente : ses demandes uniquement
- Aucun KPI financier global

### Accès aux modules

#### ✅ Budget
- LECTURE SEULE : peut consulter le budget de son département
- NE PEUT PAS : modifier, créer, valider

#### ✅ Ressources Humaines
- PEUT : soumettre demande de congé
- PEUT : soumettre demande d'absence
- PEUT : consulter ses propres évaluations
- PEUT : consulter son propre ordre de mission
- NE PEUT PAS : voir les dossiers des autres employés
- NE PEUT PAS : valider quoi que ce soit

#### ✅ Expression de Besoin
- PEUT : créer une nouvelle demande d'achat
- PEUT : voir ses propres demandes et leur statut
- PEUT : annuler une demande en statut BROUILLON
- NE PEUT PAS : voir les demandes des autres
- NE PEUT PAS : valider ou approuver

#### ❌ Comptabilité
- ACCÈS REFUSÉ complet
- Message : "Accès réservé au service comptable"

#### ❌ Trésorerie
- ACCÈS REFUSÉ complet
- Message : "Accès réservé au service financier"

#### ✅ Suivi & Contrôle
- LECTURE SEULE : peut voir les rapports le concernant
- NE PEUT PAS : voir les rapports globaux

### Boutons visibles
- ✅ "+ Nouvelle demande" (Expression de Besoin, RH)
- ❌ Boutons de validation
- ❌ Boutons d'approbation
- ❌ KPIs financiers

---

## 👔 CHEF DEPT.

### Qui est-il ?
Responsable d'un département. Il valide en premier niveau (N1)
les demandes de ses collaborateurs avant transmission au RAF.

### Dashboard
- Greeting personnalisé : "Bonjour, [Prénom]"
- 6 tuiles modules
- Badge rouge sur tuile Expression de Besoin si demandes en attente de sa validation
- Activité récente : son département uniquement

### Accès aux modules

#### ✅ Budget
- PEUT : consulter le budget de son département
- PEUT : soumettre une demande de modification budgétaire
- NE PEUT PAS : modifier directement le budget global

#### ✅ Ressources Humaines
- PEUT : voir les demandes de congé de ses collaborateurs
- PEUT : valider ou rejeter les demandes de congé (N1)
- PEUT : initier un ordre de mission pour son équipe
- PEUT : consulter les évaluations de son équipe
- PEUT : soumettre ses propres demandes

#### ✅ Expression de Besoin
- PEUT : créer ses propres demandes d'achat
- PEUT : voir toutes les demandes de son département
- PEUT : valider (N1) les demandes SOUMIS de son équipe
- PEUT : rejeter avec commentaire obligatoire
- NE PEUT PAS : voir les demandes des autres départements
- NE PEUT PAS : validation N2 (réservée RAF)

#### ❌ Comptabilité
- ACCÈS REFUSÉ
- Message : "Accès réservé au service comptable"

#### ✅ Trésorerie
- LECTURE SEULE : peut voir les décaissements de son département
- NE PEUT PAS : créer ou valider des décaissements

#### ✅ Suivi & Contrôle
- PEUT : voir les rapports de son département
- NE PEUT PAS : voir les rapports globaux

### Boutons visibles
- ✅ "+ Nouvelle demande"
- ✅ "Valider" (sur demandes SOUMIS de son département)
- ✅ "Rejeter" (avec champ commentaire obligatoire)
- ❌ Validation N2
- ❌ Approbation finale

### Onglets spécifiques dans Expression de Besoin
- "Mes demandes"
- "À valider" → demandes SOUMIS de son département
- "Mon département" → toutes les demandes de son département

---

## 💼 RAF (Responsable Administratif et Financier)

### Qui est-il ?
Supervise toute la gestion administrative et financière.
Valide en N2 après le Chef Dept. et avant la Directrice.
Accès le plus large après la Directrice.

### Dashboard
- Greeting personnalisé : "Bonjour, [Prénom]"
- 6 tuiles modules
- Badges sur toutes les tuiles si demandes en attente
- Activité récente : toute l'organisation
- Mini KPIs : demandes en attente de sa validation

### Accès aux modules

#### ✅ Budget — ACCÈS COMPLET
- PEUT : préparer et soumettre le PAB (Plan d'Action Budgétaire)
- PEUT : modifier les lignes budgétaires
- PEUT : consulter l'exécution budgétaire en temps réel
- PEUT : générer les rapports de suivi trimestriel
- PEUT : soumettre pour approbation à la Directrice

#### ✅ Ressources Humaines — ACCÈS COMPLET
- PEUT : voir tous les dossiers du personnel
- PEUT : valider les demandes de congé (N2)
- PEUT : créer et valider les ordres de mission
- PEUT : superviser les évaluations de performance
- PEUT : gérer les sanctions disciplinaires
- PEUT : gérer le courrier officiel

#### ✅ Expression de Besoin — ACCÈS COMPLET
- PEUT : créer ses propres demandes
- PEUT : voir TOUTES les demandes de TOUS les départements
- PEUT : valider en N2 les demandes VALIDE_CHEF
- PEUT : rejeter avec commentaire
- PEUT : vérifier la disponibilité budgétaire avant validation
- PEUT : consulter l'historique complet

#### ✅ Comptabilité — ACCÈS COMPLET
- PEUT : superviser les journaux comptables
- PEUT : valider les pièces justificatives
- PEUT : consulter la balance générale
- PEUT : superviser l'arrêté des comptes
- PEUT : générer le tableau de bord mensuel

#### ✅ Trésorerie — ACCÈS COMPLET
- PEUT : gérer les demandes de décaissement
- PEUT : superviser la caisse
- PEUT : valider les rapprochements bancaires
- PEUT : autoriser les dépenses par chèque/virement
- PEUT : superviser l'inventaire de caisse

#### ✅ Suivi & Contrôle — ACCÈS COMPLET
- PEUT : accéder à tous les rapports
- PEUT : générer les rapports financiers
- PEUT : superviser le contrôle interne
- PEUT : suivre l'exécution budgétaire globale

### Boutons visibles
- ✅ "+ Nouvelle demande"
- ✅ "Valider N2" (sur demandes VALIDE_CHEF)
- ✅ "Rejeter" (avec commentaire obligatoire)
- ✅ "Bon à payer" (dans Trésorerie)
- ❌ Approbation finale (réservée Directrice)

### Onglets spécifiques dans Expression de Besoin
- "Mes demandes"
- "À valider" → demandes VALIDE_CHEF de tous départements
- "Toutes les demandes" → vue globale complète

---

## 🧾 COMPTABLE

### Qui est-il ?
Traite les opérations comptables et financières après approbation.
Il n'est pas dans le circuit de validation — il exécute.

### Dashboard
- Greeting personnalisé : "Bonjour, [Prénom]"
- 4 tuiles uniquement (pas Budget, pas RH)
- Tuiles visibles : Expression de Besoin (lecture), Comptabilité, Trésorerie, Suivi
- Activité récente : opérations comptables uniquement

### Accès aux modules

#### ❌ Budget
- LECTURE SEULE uniquement
- Peut consulter les lignes budgétaires pour imputation
- NE PEUT PAS : modifier

#### ❌ Ressources Humaines
- ACCÈS REFUSÉ
- Message : "Accès réservé aux RH et à la direction"

#### ✅ Expression de Besoin — LECTURE + TRAITEMENT
- NE PEUT PAS : créer de demandes
- PEUT : voir les demandes APPROUVE
- PEUT : marquer une demande comme "En paiement"
- PEUT : marquer une demande comme "Soldée"
- PEUT : apposer le "Bon à payer"
- PEUT : enregistrer les pièces comptables

#### ✅ Comptabilité — ACCÈS COMPLET
- PEUT : saisir les écritures dans les journaux
- PEUT : gérer le journal d'achats
- PEUT : gérer le journal de trésorerie
- PEUT : gérer le journal de paie
- PEUT : gérer le journal de caisse
- PEUT : produire la balance générale
- PEUT : préparer l'arrêté des comptes
- PEUT : gérer les pièces justificatives

#### ✅ Trésorerie — ACCÈS COMPLET
- PEUT : gérer la caisse (entrées/sorties)
- PEUT : traiter les paiements par chèque/virement
- PEUT : effectuer les rapprochements bancaires
- PEUT : tenir le journal de caisse
- PEUT : faire l'inventaire de caisse
- NE PEUT PAS : autoriser les décaissements (rôle RAF/Directrice)

#### ✅ Suivi & Contrôle — LECTURE
- PEUT : consulter les rapports financiers
- PEUT : produire les états de synthèse
- NE PEUT PAS : modifier les paramètres de contrôle

### Boutons visibles
- ❌ "+ Nouvelle demande"
- ❌ Boutons de validation
- ✅ "Bon à payer" (dans Expression de Besoin, sur demandes APPROUVE)
- ✅ "Marquer en paiement"
- ✅ "Soldé"
- ✅ Boutons de saisie comptable

### Onglets spécifiques dans Expression de Besoin
- "En attente de paiement" → demandes APPROUVE
- "En paiement" → demandes EN_PAIEMENT
- "Soldées" → demandes SOLDE

---

## 👑 DIRECTRICE

### Qui est-elle ?
Directrice Générale. Approbation finale sur tout.
Elle supervise sans saisir. Sa vue est entièrement différente.

### Dashboard — VUE DIRECTION (différente des autres)
- Titre : "Vue Direction — GIW'ANVO Energy"
- Sous-titre : "Supervision & Approbations"
- PAS le greeting standard

#### KPIs en haut (4 cards)
- 🔴 "En attente d'approbation" → nb demandes VALIDE_RAF
- 💰 "Montant engagé ce mois" → somme demandes APPROUVE du mois
- ✅ "Approuvées ce mois" → nb demandes APPROUVE du mois
- ❌ "Rejetées ce mois" → nb demandes REJETE du mois

#### File d'approbation urgente (sous les KPIs)
- Liste des demandes VALIDE_RAF triées par ancienneté
- Badge 🔴 si demande > 3 jours sans traitement
- Boutons "Approuver" et "Rejeter" directement dans la liste
- Sans avoir à ouvrir le détail

#### Modules (libellé différent)
- "Superviser →" au lieu de "Accéder au module →"
- Badge rouge sur chaque module si approbations en attente

### Accès aux modules

#### ✅ Budget — SUPERVISION COMPLÈTE
- PEUT : approuver ou rejeter le PAB soumis par le RAF
- PEUT : consulter l'exécution budgétaire globale
- PEUT : voir les écarts prévisions/réalisations
- NE PEUT PAS : modifier directement les chiffres

#### ✅ Ressources Humaines — SUPERVISION COMPLÈTE
- PEUT : approuver les sanctions disciplinaires
- PEUT : approuver les ordres de mission
- PEUT : signer les décisions de congé
- PEUT : consulter tous les dossiers du personnel
- PEUT : voir les évaluations de performance

#### ✅ Expression de Besoin — APPROBATION FINALE
- NE PEUT PAS : créer de demandes
- PEUT : voir TOUTES les demandes de TOUS les départements
- PEUT : approuver en final les demandes VALIDE_RAF
- PEUT : rejeter avec commentaire obligatoire
- PEUT : filtrer par urgence, montant, département, date
- Colonne supplémentaire visible : "Recommandation RAF"

#### ✅ Comptabilité — SUPERVISION
- PEUT : consulter tous les états financiers
- PEUT : approuver les arrêtés de comptes
- PEUT : examiner les rapports financiers
- NE PEUT PAS : saisir des écritures

#### ✅ Trésorerie — SUPERVISION + APPROBATION
- PEUT : approuver les demandes de décaissement > 100 000 FCFA
- PEUT : consulter la situation de trésorerie
- PEUT : superviser les rapprochements bancaires
- NE PEUT PAS : effectuer les opérations elle-même

#### ✅ Suivi & Contrôle — ACCÈS COMPLET
- PEUT : accéder à tous les rapports
- PEUT : voir le tableau de contrôle global
- PEUT : superviser les obligations de reporting
- PEUT : évaluer le contrôle interne

### Boutons visibles
- ❌ "+ Nouvelle demande" (jamais)
- ✅ "Approuver" (vert, sur demandes VALIDE_RAF)
- ✅ "Rejeter" (rouge, avec commentaire obligatoire)
- ✅ "Déléguer" (transférer à RAF pour révision)
- ✅ Tous les boutons de supervision et reporting

### Onglets spécifiques dans Expression de Besoin
- "À approuver" → demandes VALIDE_RAF (priorité, badge rouge)
- "Toutes les demandes" → vue globale 360°
- "Rejetées" → historique des rejets avec motifs

---

## 🔄 Circuit de validation complet

```
EMPLOYE / CHEF DEPT. / RAF
  soumet une demande
        ↓
   [SOUMIS]
        ↓
  CHEF DEPT. valide (N1)
        ↓
   [VALIDE_CHEF]
        ↓
  RAF valide (N2) + vérifie budget
        ↓
   [VALIDE_RAF]
        ↓
  DIRECTRICE approuve (finale)
        ↓
   [APPROUVE]
        ↓
  COMPTABLE traite le paiement
        ↓
   [EN_PAIEMENT] → [SOLDE]

  À tout moment :
  N'importe quel validateur peut REJETER
        ↓
   [REJETE] avec commentaire obligatoire
```

---

## 📊 Tableau récapitulatif des accès

| Module | Employé | Chef Dept. | RAF | Comptable | Directrice |
|---|---|---|---|---|---|
| Budget | 👁️ Lecture | 👁️ Dept. | ✏️ Complet | 👁️ Lecture | 👁️ Supervision |
| RH | ✏️ Ses demandes | ✏️ Son équipe | ✏️ Complet | ❌ Refusé | 👁️ Supervision |
| Expression de Besoin | ✏️ Ses demandes | ✅ Valide N1 | ✅ Valide N2 | 💳 Paiement | ✅ Approuve finale |
| Comptabilité | ❌ Refusé | ❌ Refusé | 👁️ Supervision | ✏️ Complet | 👁️ Supervision |
| Trésorerie | ❌ Refusé | 👁️ Lecture | ✏️ Complet | ✏️ Complet | ✅ Approuve |
| Suivi & Contrôle | 👁️ Personnel | 👁️ Dept. | ✏️ Complet | 👁️ Lecture | ✏️ Complet |

Légende :
✏️ = Lecture + Écriture
👁️ = Lecture seule
✅ = Validation / Approbation
💳 = Traitement paiement
❌ = Accès refusé

---

## ⚠️ Notes importantes pour Claude Code

1. Toujours utiliser hasPermission() de src/lib/permissions.ts
2. Ne jamais hardcoder un rôle dans un composant
3. Utiliser RoleGuard pour masquer les éléments non autorisés
4. En cas de rôle non reconnu → traiter comme "Employé"
5. Les rôles sont sensibles à la casse :
   "Employé" ≠ "employe" ≠ "EMPLOYE"
6. La Directrice ne crée JAMAIS de demande
7. Le Comptable ne valide JAMAIS — il exécute seulement
8. Chef Dept. ne voit QUE son département
