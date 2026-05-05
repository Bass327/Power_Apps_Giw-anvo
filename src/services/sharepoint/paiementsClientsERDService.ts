/**
 * Service — Reporting Clients ERD Kolda
 * Liste SharePoint : "Paiements_Clients_Kolda_ERD"
 * Site            : https://giwaanvoenergy961.sharepoint.com/sites/DTO
 *
 * Structure : 1 élément = 1 client, 12 colonnes de paiements mensuels
 * field_7 (Nov 2025) → field_18 (Oct 2026)
 *
 * KPI "mois courant" : basé sur le champ Modified (date de dernière saisie)
 */

import { getListItemsFromSite } from "@/lib/graphClient"
import type { ClientERD, MoisKey } from "@/types/clientsERD"
import { MOIS_KEYS } from "@/types/clientsERD"

export const DTO_SITE_PATH = "/sites/DTO"
export const LIST_NAME_ERD = "Paiements_Clients_Kolda_ERD"

/* ─── Type brut Graph API ─────────────────────────────────────────────────── */
interface SPItem {
  id:     string
  fields: Record<string, unknown>
}

/* ─── Helper : montant numérique ─────────────────────────────────────────── */
function toMontant(raw: unknown): number {
  if (raw === null || raw === undefined || raw === "") return 0
  if (typeof raw === "number" && !isNaN(raw)) return Math.max(0, raw)
  if (typeof raw === "string") {
    const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".")
    const n = parseFloat(cleaned)
    if (!isNaN(n)) return Math.max(0, n)
  }
  return 0
}

/* ─── Helper : date ISO YYYY-MM-DD ───────────────────────────────────────── */
function toISODate(raw: unknown): string {
  if (!raw) return ""
  const s = String(raw)
  // Graph API retourne "2026-04-17T08:31:58Z" — on garde uniquement la date
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.slice(0, 10)
  return ""
}

/* ─── Mapping SP → ClientERD ─────────────────────────────────────────────── */
function mapSPItem(item: SPItem): ClientERD {
  const f = item.fields

  // Construction de l'objet paiements avec les 12 champs mensuels réels
  const paiements = {} as Record<MoisKey, number>
  let totalPaye   = 0

  for (const key of MOIS_KEYS) {
    const montant  = toMontant(f[key])
    paiements[key] = montant
    totalPaye     += montant
  }

  return {
    id:          item.id,
    idClient:    String(f["Title"]   ?? "—"),
    nomComplet:  String(f["field_1"] ?? "—"),
    village:     String(f["field_2"] ?? "—"),
    typeService: String(f["field_6"] ?? "—"),
    paiements,
    totalPaye,
    // Modified est exposé par SP dans fields lors du $expand=fields
    modified: toISODate(f["Modified"]),
  }
}

/* ─── Fonction principale ─────────────────────────────────────────────────── */

/**
 * Récupère tous les clients ERD Kolda depuis SharePoint.
 * Retourne les données triées par nom de client.
 */
export async function getClientsERD(token: string): Promise<ClientERD[]> {
  const items = await getListItemsFromSite<SPItem>(
    token,
    DTO_SITE_PATH,
    LIST_NAME_ERD,
    "&$top=5000",
  )

  return items
    .map(mapSPItem)
    .sort((a, b) => a.nomComplet.localeCompare(b.nomComplet, "fr"))
}
