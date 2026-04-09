import { graphFetch, getListItems, createListItem, updateListItem, getSiteId, attachFileToListItem } from "@/lib/graphClient"
import type {
  DemandeAchat,
  DemandeAchatSPItem,
  CreateDemandeAchatPayload,
  UpdateStatutPayload,
  StatutDemande,
  TypeDemande,
  ModePaiement,
  TypePaiement,
  JustificationOperationnelle,
  CategorieDepense,
  ModePaiementCaisse,
  TypeMission,
  MoyenTransport,
} from "@/types/DemandeAchat"
import { detecterTypeAchat } from "@/types/DemandeAchat"
import type { UserRole } from "@/types/user"

const LIST_NAME = "Demandes_Achats"

/* ════════════════════════════════════════════════
   Diagnostic — noms internes des colonnes SharePoint
   Appeler une seule fois pour vérifier le mapping.
   ════════════════════════════════════════════════ */

interface SPColumn {
  displayName: string
  name:        string
}

/**
 * Affiche dans la console le mapping nom affiché → nom interne de chaque colonne.
 * Utile pour détecter les colonnes manquantes ou mal nommées.
 */
export async function logColumnNames(token: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const result = await graphFetch<{ value: SPColumn[] }>(
      token,
      `/sites/${siteId}/lists/${encodeURIComponent(LIST_NAME)}/columns`,
    )
    console.group(`🔍 Colonnes SharePoint — ${LIST_NAME}`)
    console.table(
      result.value
        .filter((col) => !col.name.startsWith("_"))
        .map((col) => ({
          "Nom affiché (displayName)":      col.displayName,
          "Nom interne à utiliser (name)":  col.name,
        })),
    )
    console.groupEnd()
  } catch (err) {
    console.error("Impossible de récupérer les colonnes:", err)
  }
}

/* ════════════════════════════════════════════════
   Conversion SharePoint → modèle applicatif
   Noms internes réels (source : logColumnNames) :
     Description  → Description_Besoin
     Montant      → Montant_Estim_x00e9_
     LigneBuget.  → Ligne_Budg_x00e9_taire
     DateBesoin   → Date
     Commentaire  → Commentaire_RAF / Commentaire_DG
     Mission      → Mission  (était MissionCollective)
   ════════════════════════════════════════════════ */
function mapSPItem(item: DemandeAchatSPItem): DemandeAchat {
  const f = item.fields
  const montant = Number(f.Montant_Estim_x00e9_) || 0

  return {
    id:              item.id,
    titre:           f.Title                    ?? "",
    description:     f.Description_Besoin       ?? "",
    montant,
    devise:          "FCFA",
    typeAchat:       detecterTypeAchat(montant),
    statut:          (f.Statut as StatutDemande) ?? "BROUILLON",
    demandeur:       f.Demandeur                ?? "",
    dateDemande:     f.Created                  ?? "",
    dateBesoin:      f.Date                     ?? "",  // colonne "Date" dans SP
    fournisseur:     f.Fournisseur             ?? "",
    justification:   f.Justification           ?? "",
    ligneBudgetaire: f.Ligne_Budg_x00e9_taire  ?? "",
    /* ── Commentaires et dates de validation par étape ── */
    commentaireChef:       f.CommentaireChef    ?? "",
    dateValidationChef:    f.DateValidationChef ?? "",
    commentaireRAF:        f.Commentaire_RAF    ?? "",
    dateValidationRAF:     f.DateValidationRAF  ?? "",
    commentaireDirectrice: f.Commentaire_DG     ?? "",
    dateApprobation:       f.DateApprobation    ?? "",
    /* ── Champs étendus ── */
    typeDemande:    (f.TypeDemande as TypeDemande)                    ?? undefined,
    dateDebut:      f.DateDebut                                        ?? "",
    dateFin:        f.DateFin                                          ?? "",
    modePaiement:   (f.ModePaiement as ModePaiement)                  ?? undefined,
    typePaiement:   (f.TypePaiement as TypePaiement)                  ?? undefined,
    urgent:         f.Urgent === "Oui",
    justificationOp: (f.JustificationOp as JustificationOperationnelle) ?? undefined,
    categorieDep:   (f.CategorieDep as CategorieDepense)              ?? undefined,
    /* ── Pièce de caisse ── */
    motifCaisse:        f.MotifCaisse                                ?? undefined,
    encaissementPar:    f.EncaissementPar                            ?? undefined,
    modePaiementCaisse: (f.ModeEncaissement as ModePaiementCaisse)   ?? undefined,
    /* ── Départ de mission ── */
    intituleMission:       f.IntituleMission                             ?? undefined,
    typeMission:           (f.TypeMission as TypeMission)                ?? undefined,
    objectifMission:       f.ObjectifMission                             ?? undefined,
    lieuxMission:          f.LieuxMission                                ?? undefined,
    dateDepart:            f.DateDepart                                   ?? undefined,
    dateRetour:            f.DateRetour                                   ?? undefined,
    dureeMission:          f.DureeMission                                 ?? undefined,
    moyenTransport:        (f.MoyenTransport as MoyenTransport)          ?? undefined,
    besoinAvance:          f.BesoinAvance === "Oui",
    montantAvance:         Number(f.MontantAvance)                       || undefined,
    typeMissionCollective: (f.Mission as "INDIVIDUELLE" | "COLLECTIVE")  ?? undefined,
    nombreParticipants:    Number(f.NombreParticipants)                  || undefined,
  }
}

/* ── Récupère toutes les demandes ── */
export async function getDemandesAchats(token: string): Promise<DemandeAchat[]> {
  const items = await getListItems<DemandeAchatSPItem>(token, LIST_NAME)
  // Tri côté client par date de création décroissante (plus récent en premier)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime())
}

/* ── Récupère une demande par ID ── */
export async function getDemandeAchatById(token: string, id: string): Promise<DemandeAchat> {
  const siteId = await getSiteId(token)
  const item   = await graphFetch<DemandeAchatSPItem>(
    token,
    `/sites/${siteId}/lists/${encodeURIComponent(LIST_NAME)}/items/${id}?$expand=fields`,
  )
  return mapSPItem(item)
}

/* ── Crée une nouvelle demande ── */
export async function createDemandeAchat(
  token:    string,
  payload:  CreateDemandeAchatPayload,
  statut:   "BROUILLON" | "SOUMIS",
  fichiers?: File[],
  spToken?: string,
): Promise<DemandeAchat> {

  const fields: Record<string, unknown> = {
    Title:                   payload.titre,
    Description_Besoin:      payload.description,       // ← nom interne réel
    Montant_Estim_x00e9_:    payload.montant,            // ← nom interne réel
    Statut:                  statut,
    Demandeur:               payload.demandeur,
    Date:                    payload.dateBesoin,
    Ligne_Budg_x00e9_taire:  payload.ligneBudgetaire,
    Fournisseur:             payload.fournisseur  || undefined,
    Justification:           payload.justification || undefined,
    /* ── Champs étendus ── */
    TypeDemande:    payload.typeDemande,
    DateDebut:      payload.dateDebut,
    DateFin:        payload.dateFin     || undefined,
    ModePaiement:   payload.modePaiement,
    TypePaiement:   payload.typePaiement,
    Urgent:         payload.urgent      ? "Oui" : "Non",
    JustificationOp: payload.justificationOp,
    CategorieDep:   payload.categorieDep,
    /* ── Pièce de caisse ── */
    MotifCaisse:      payload.motifCaisse,
    EncaissementPar:  payload.encaissementPar,
    ModeEncaissement: payload.modePaiementCaisse,
    /* ── Départ de mission ── */
    IntituleMission:    payload.intituleMission,
    TypeMission:        payload.typeMission,
    ObjectifMission:    payload.objectifMission,
    LieuxMission:       payload.lieuxMission,
    DateDepart:         payload.dateDepart,
    DateRetour:         payload.dateRetour,
    DureeMission:       payload.dureeMission,
    MoyenTransport:     payload.moyenTransport,
    BesoinAvance:       payload.besoinAvance           ? "Oui" : "Non",
    MontantAvance:      payload.montantAvance,
    Mission:            payload.typeMissionCollective,  // ← nom interne réel (était MissionCollective)
    NombreParticipants: payload.nombreParticipants,
  }

  const created = await createListItem<DemandeAchatSPItem>(token, LIST_NAME, fields)

  /* Upload des pièces jointes après création de l'item */
  if (fichiers && fichiers.length > 0 && spToken) {
    await Promise.all(fichiers.map((f) => attachFileToListItem(spToken, created.id, f)))
  }

  return mapSPItem(created)
}

/**
 * Met à jour le statut d'une demande selon le rôle du validateur.
 * Seuls les champs existants dans SP sont écrits.
 * Les colonnes manquantes (CommentaireChef, DateValidation*) sont ignorées jusqu'à
 * leur création dans la liste SharePoint.
 */
export async function updateStatutDemande(
  token:   string,
  id:      string,
  update:  UpdateStatutPayload,
  role:    UserRole,
): Promise<void> {
  const fields: Record<string, unknown> = {
    Statut: update.statut,
  }

  const now = new Date().toISOString()

  if (role === "Chef Dept.") {
    fields.CommentaireChef    = update.commentaire
    fields.DateValidationChef = update.statut !== "REJETE" ? now : undefined
  } else if (role === "RAF") {
    fields.Commentaire_RAF    = update.commentaire
    fields.DateValidationRAF  = update.statut !== "REJETE" ? now : undefined
  } else if (role === "Directrice") {
    fields.Commentaire_DG     = update.commentaire
    if (update.statut === "APPROUVE") {
      fields.DateApprobation  = now
    }
  }
  // Comptable : pas de champ commentaire — Statut seul suffit

  await updateListItem(token, LIST_NAME, id, fields)
}
