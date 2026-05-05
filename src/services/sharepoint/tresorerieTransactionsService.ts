import { getListItems, createListItem, getSiteId, graphFetch } from "@/lib/graphClient"
import type {
  Transaction,
  TransactionFormData,
  TypeFlux,
  CategorieGlobale,
  StatutTransaction,
} from "@/types/tresorerieTransactions"
import {
  getTauxChange,
  toEUR,
  getMoisAnnee,
  getStatutAuto,
  genererReference,
} from "@/types/tresorerieTransactions"

const LIST_NAME = "Tresorerie_Transactions"

/* ── Interface brute SharePoint ── */
interface TransactionSPFields {
  Title?:                  string   // Référence transaction
  DateTransaction?:        string
  Mois?:                   number
  Annee?:                  number
  TypeFlux?:               string
  CategorieGlobale?:       string
  ProjetLookupId?:         number   // ID lookup vers Tresorerie_Projects
  Projet?:                 string   // valeur affichée du lookup (pas toujours présente)
  TypeDepenseLookupId?:    number   // ID lookup vers Tresorerie_TypesDepenses
  TypeDepense?:            string   // valeur affichée du lookup
  Partenaire?:             string
  MontantLocal?:           number
  DeviseCode?:             string
  TauxChange?:             number
  MontantConvertiEUR?:     number
  StatutTransaction?:      string
  Commentaire?:            string
  PieceJustificativeURL?:  string
  SaisiPar?:               string
  DateSaisie?:             string
}

interface TransactionSPItem {
  id:     string
  fields: TransactionSPFields
}

/* ── Conversion SP → modèle applicatif ── */
function mapTransaction(item: TransactionSPItem): Transaction {
  const f = item.fields
  return {
    id:                    item.id,
    referenceTransaction:  f.Title                ?? "",
    dateTransaction:       f.DateTransaction      ?? "",
    mois:                  f.Mois                 ?? 0,
    annee:                 f.Annee                ?? 0,
    typeFlux:              (f.TypeFlux             as TypeFlux)           ?? "Cash Out",
    categorieGlobale:      (f.CategorieGlobale     as CategorieGlobale)   ?? "General",
    projetId:              f.ProjetLookupId     != null ? String(f.ProjetLookupId)     : undefined,
    projetNom:             f.Projet              ?? undefined,
    typeDepenseId:         f.TypeDepenseLookupId != null ? String(f.TypeDepenseLookupId): undefined,
    typeDepenseNom:        f.TypeDepense         ?? undefined,
    partenaire:            f.Partenaire          ?? "",
    montantLocal:          Number(f.MontantLocal)       || 0,
    deviseCode:            f.DeviseCode          ?? "XOF",
    tauxChange:            Number(f.TauxChange)         || 1,
    montantConvertiEUR:    Number(f.MontantConvertiEUR) || 0,
    statutTransaction:     (f.StatutTransaction   as StatutTransaction)   ?? "Réel",
    commentaire:           f.Commentaire         ?? undefined,
    pieceJustificativeURL: f.PieceJustificativeURL ?? undefined,
    saisiPar:              f.SaisiPar            ?? "",
    dateSaisie:            f.DateSaisie          ?? "",
  }
}

/* Champs explicitement sélectionnés — évite les 400 causés par la sérialisation des colonnes système */
/* Note : TypeDepenseLookupId absent — colonne TypeDepense inexistante dans Tresorerie_Transactions */
const FIELDS_SELECT =
  "($select=Title,DateTransaction,Mois,Annee,TypeFlux,CategorieGlobale," +
  "ProjetLookupId," +
  "Partenaire,MontantLocal,DeviseCode,TauxChange,MontantConvertiEUR," +
  "StatutTransaction,Commentaire,PieceJustificativeURL,SaisiPar,DateSaisie)"

/* ── Lecture ── */
export async function getTransactions(token: string): Promise<Transaction[]> {
  const items = await getListItems<TransactionSPItem>(token, LIST_NAME, FIELDS_SELECT)
  return items
    .map(mapTransaction)
    .sort((a, b) => b.dateTransaction.localeCompare(a.dateTransaction))
}

/* ── Création ── */
export async function createTransaction(
  token:     string,
  data:      TransactionFormData,
  saisiPar:  string,
): Promise<Transaction> {
  const { mois, annee } = getMoisAnnee(data.dateTransaction)
  const taux            = getTauxChange(data.deviseCode)
  const montantEUR      = toEUR(data.montantLocal, data.deviseCode)
  const statut          = data.statutTransaction ?? getStatutAuto(data.dateTransaction)
  const reference       = genererReference(mois, annee)

  const rawFields: Record<string, unknown> = {
    Title:                reference,
    DateTransaction:      data.dateTransaction.length === 10
                            ? `${data.dateTransaction}T00:00:00Z`
                            : data.dateTransaction,
    Mois:                 mois,
    Annee:                annee,
    TypeFlux:             data.typeFlux,
    CategorieGlobale:     data.categorieGlobale,
    Partenaire:           data.partenaire          || undefined,
    MontantLocal:         data.montantLocal,
    DeviseCode:           data.deviseCode,
    TauxChange:           taux,
    MontantConvertiEUR:   montantEUR,
    StatutTransaction:    statut,
    Commentaire:          data.commentaire          || undefined,
    PieceJustificativeURL:data.pieceJustificativeURL || undefined,
    SaisiPar:             saisiPar,
    DateSaisie:           new Date().toISOString(),
  }

  // Colonne Lookup Projet : Graph API attend un entier (TypeDepense absent de la liste SP)
  if (data.projetId) rawFields.ProjetLookupId = parseInt(data.projetId, 10)

  const fields = Object.fromEntries(
    Object.entries(rawFields).filter(([, v]) => v !== undefined),
  )

  const created = await createListItem<TransactionSPItem>(token, LIST_NAME, fields)
  return mapTransaction(created)
}

/* ── Diagnostic colonnes ── */
export async function logTransactionsColumns(token: string): Promise<void> {
  try {
    const siteId = await getSiteId(token)
    const result = await graphFetch<{ value: { displayName: string; name: string }[] }>(
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
