import { getListItems, createListItem, updateListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type {
  DemandeDecaissement,
  StatutDecaissement,
  TypeDecaissement,
} from "@/types/tresorerie"

const LIST_NAME = "Demandes_Dcaissement"  // nom interne SP (accent supprimé)

/* ── Mapping statuts ── */
function statutVersSP(statut: StatutDecaissement): string {
  const MAP: Record<StatutDecaissement, string> = {
    BROUILLON:  "Brouillon",
    SOUMIS:     "Soumis",
    VALIDE_RAF: "Validé RAF",
    APPROUVE:   "Approuvé DG",
    EXECUTE:    "Exécuté",
    REJETE:     "Rejeté",
  }
  return MAP[statut] ?? statut
}

function spVersStatut(sp: string | undefined): StatutDecaissement {
  const MAP: Record<string, StatutDecaissement> = {
    "Brouillon":  "BROUILLON",
    "Soumis":     "SOUMIS",
    "Validé RAF": "VALIDE_RAF",
    "Approuvé DG":"APPROUVE",
    "Exécuté":    "EXECUTE",
    "Rejeté":     "REJETE",
  }
  return MAP[sp ?? ""] ?? (sp as StatutDecaissement) ?? "BROUILLON"
}

/* ── Interface brute SharePoint ── */
interface DecaissementSPFields {
  Title?:              string   // titre / objet
  Montant?:            number
  TypeDecaissement?:   string
  Beneficiaire?:       string
  Motif?:              string
  Demandeur?:          string
  Statut?:             string
  DateEcheance?:       string
  Commentaire_RAF?:    string
  DateValidationRAF?:  string
  Commentaire_DG?:     string
  DateApprobation?:    string
  DateExecution?:      string
  Reference?:          string
  Created?:            string
}

interface DecaissementSPItem {
  id:     string
  fields: DecaissementSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapSPItem(item: DecaissementSPItem): DemandeDecaissement {
  const f = item.fields
  return {
    id:                 item.id,
    titre:              f.Title             ?? "",
    montant:            Number(f.Montant)   || 0,
    devise:             "FCFA",
    typeDecaissement:   (f.TypeDecaissement as TypeDecaissement) ?? "VIREMENT",
    beneficiaire:       f.Beneficiaire      ?? "",
    motif:              f.Motif             ?? "",
    demandeur:          f.Demandeur         ?? "",
    statut:             spVersStatut(f.Statut),
    dateDemande:        f.Created           ?? "",
    dateEcheance:       f.DateEcheance      ?? undefined,
    commentaireRAF:     f.Commentaire_RAF   ?? undefined,
    dateValidationRAF:  f.DateValidationRAF ?? undefined,
    commentaireDir:     f.Commentaire_DG    ?? undefined,
    dateApprobation:    f.DateApprobation   ?? undefined,
    dateExecution:      f.DateExecution     ?? undefined,
    reference:          f.Reference         ?? undefined,
  }
}

/* ── Récupère toutes les demandes de décaissement ── */
export async function getDecaissements(token: string): Promise<DemandeDecaissement[]> {
  const items = await getListItems<DecaissementSPItem>(token, LIST_NAME)
  return items
    .map(mapSPItem)
    .sort((a, b) => new Date(b.dateDemande).getTime() - new Date(a.dateDemande).getTime())
}

/* ── Crée une nouvelle demande de décaissement ── */
export async function createDecaissement(
  token:     string,
  data:      Omit<DemandeDecaissement, "id" | "dateDemande" | "devise">,
  soumettre: boolean,
): Promise<DemandeDecaissement> {
  const statut: StatutDecaissement = soumettre ? "SOUMIS" : "BROUILLON"

  const rawFields: Record<string, unknown> = {
    Title:            data.titre            || undefined,
    Montant:          data.montant          ?? undefined,
    TypeDecaissement: data.typeDecaissement || undefined,
    Beneficiaire:     data.beneficiaire     || undefined,
    Motif:            data.motif            || undefined,
    Demandeur:        data.demandeur        || undefined,
    Statut:           statutVersSP(statut),
    DateEcheance:     data.dateEcheance     || undefined,
    Reference:        data.reference        || undefined,
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<DecaissementSPItem>(token, LIST_NAME, fields)
  return mapSPItem(created)
}

/* ── Met à jour le statut (validation RAF / approbation DG / exécution) ── */
export async function updateStatutDecaissement(
  token:       string,
  id:          string,
  statut:      StatutDecaissement,
  commentaire?: string,
  reference?:  string,
): Promise<void> {
  const now = new Date().toISOString()

  const rawFields: Record<string, unknown> = {
    Statut: statutVersSP(statut),
  }

  if (statut === "VALIDE_RAF") {
    rawFields.Commentaire_RAF   = commentaire   || undefined
    rawFields.DateValidationRAF = now
  } else if (statut === "APPROUVE") {
    rawFields.Commentaire_DG  = commentaire || undefined
    rawFields.DateApprobation = now
  } else if (statut === "EXECUTE") {
    rawFields.DateExecution = now
    rawFields.Reference     = reference || undefined
  } else if (statut === "REJETE") {
    // Commentaire stocké selon le rôle appelant (géré côté appelant si besoin)
    rawFields.Commentaire_RAF = commentaire || undefined
  }

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  await updateListItem(token, LIST_NAME, id, fields)
}

/* ── Diagnostic colonnes ── */
interface SPColumn { displayName: string; name: string }

export async function logDecaissementsColumns(token: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const result = await graphFetch<{ value: SPColumn[] }>(
      token,
      `/sites/${siteId}/lists/${encodeURIComponent(LIST_NAME)}/columns`,
    )
    console.group(`🔍 Colonnes SharePoint — ${LIST_NAME}`)
    console.table(
      result.value
        .filter((c) => !c.name.startsWith("_"))
        .map((c) => ({ "Nom affiché": c.displayName, "Nom interne": c.name })),
    )
    console.groupEnd()
  } catch (err) {
    console.error("Impossible de récupérer les colonnes:", err)
  }
}
