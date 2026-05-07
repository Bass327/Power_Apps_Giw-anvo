import { getListItems, graphMutate } from "@/lib/graphClient"

const APP_URL = "https://power-apps-giw-anvo.vercel.app"

// ─── Cache utilisateurs (TTL 5 min) ─────────────────────────────────────────
interface CachedUser {
  email:       string
  role:        string
  departement: string
}

interface SPUserFields {
  Email:              string
  R_x00f4_le:        string
  D_x00e9_partement: string
  Actif:             string
}

let _usersCache:    CachedUser[] | null = null
let _usersCacheAt   = 0
const CACHE_TTL     = 5 * 60 * 1000

async function loadUsers(token: string): Promise<CachedUser[]> {
  if (_usersCache && Date.now() - _usersCacheAt < CACHE_TTL) return _usersCache

  const items = await getListItems<{ id: string; fields: SPUserFields }>(
    token,
    "Utilisateurs_Giwanvo",
  )
  _usersCache = items
    .filter(item => item.fields.Actif === "Oui" && item.fields.Email)
    .map(item => ({
      email:       item.fields.Email.trim().toLowerCase(),
      role:        item.fields.R_x00f4_le ?? "",
      departement: item.fields.D_x00e9_partement ?? "",
    }))
  _usersCacheAt = Date.now()
  return _usersCache
}

function byRole(users: CachedUser[], role: string): string[] {
  return users.filter(u => u.role === role).map(u => u.email)
}

function chefByDept(users: CachedUser[], dept: string): string[] {
  return users
    .filter(u => u.role === "Chef Dept." && u.departement === dept)
    .map(u => u.email)
}

function deptOf(users: CachedUser[], email: string): string {
  return users.find(u => u.email === email.toLowerCase())?.departement ?? ""
}

// ─── Envoi d'une notification Teams à un utilisateur ────────────────────────
async function sendOne(
  token:        string,
  email:        string,
  activityType: string,
  title:        string,
): Promise<void> {
  await graphMutate<void>(
    token,
    `/users/${encodeURIComponent(email)}/teamwork/sendActivityNotification`,
    "POST",
    {
      topic: {
        source: "text",
        value:  title,
        webUrl: APP_URL,
      },
      activityType,
      previewText: { content: title },
    },
  )
}

// ─── Envoi en parallèle à plusieurs destinataires (dédupliqués) ─────────────
async function sendMany(
  token:        string,
  emails:       string[],
  activityType: string,
  title:        string,
): Promise<void> {
  const targets = [...new Set(emails.filter(Boolean))]
  // allSettled : une erreur par destinataire n'annule pas les autres
  await Promise.allSettled(
    targets.map(email => sendOne(token, email, activityType, title)),
  )
}

// ─── Contexte de notification passé par les hooks ────────────────────────────
export interface NotificationContext {
  module:         "DEMANDE_ACHAT" | "DECAISSEMENT"
  newStatut:      string
  submitterEmail: string
  montant?:       number
  titre:          string
}

/**
 * Envoie les notifications Teams correspondant à un changement de statut.
 * Fire-and-forget : ne bloque jamais la mutation principale, les erreurs
 * sont uniquement loguées dans la console.
 */
export function sendNotificationsAsync(token: string, ctx: NotificationContext): void {
  void (async () => {
    try {
      const users = await loadUsers(token)
      const { module, newStatut, submitterEmail, montant, titre } = ctx
      const submitterDept = deptOf(users, submitterEmail)

      if (module === "DEMANDE_ACHAT") {
        switch (newStatut) {
          case "SOUMIS": {
            // Chef du département du demandeur + Directrice
            const recipients = [
              ...chefByDept(users, submitterDept),
              ...byRole(users, "Directrice"),
            ]
            await sendMany(token, recipients, "newValidationRequest",
              `Nouvelle demande à valider : ${titre}`)
            break
          }
          case "VALIDE_CHEF": {
            // Directrice doit approuver
            await sendMany(token, byRole(users, "Directrice"), "newValidationRequest",
              `Demande validée par le chef — en attente d'approbation : ${titre}`)
            break
          }
          case "APPROUVE": {
            // Comptable doit traiter + demandeur est notifié
            const recipients = [...byRole(users, "Comptable"), submitterEmail]
            await sendMany(token, recipients, "requestApproved",
              `Demande approuvée : ${titre}`)
            break
          }
          case "EN_PAIEMENT": {
            await sendMany(token, [submitterEmail], "requestProcessed",
              `Votre demande est en cours de paiement : ${titre}`)
            break
          }
          case "REJETE": {
            await sendMany(token, [submitterEmail], "requestRejected",
              `Votre demande a été rejetée : ${titre}`)
            break
          }
        }
      } else if (module === "DECAISSEMENT") {
        switch (newStatut) {
          case "SOUMIS": {
            // RAF doit valider
            await sendMany(token, byRole(users, "RAF"), "newValidationRequest",
              `Nouvelle demande de décaissement à valider : ${titre}`)
            break
          }
          case "VALIDE_RAF": {
            // Si montant > 100 000 FCFA → Directrice doit approuver
            // Sinon → Comptable peut exécuter + demandeur est notifié
            if ((montant ?? 0) > 100_000) {
              await sendMany(token, byRole(users, "Directrice"), "newValidationRequest",
                `Décaissement validé RAF — approbation DG requise : ${titre}`)
            } else {
              const recipients = [...byRole(users, "Comptable"), submitterEmail]
              await sendMany(token, recipients, "requestApproved",
                `Décaissement validé — prêt à exécuter : ${titre}`)
            }
            break
          }
          case "APPROUVE": {
            // Comptable peut exécuter + demandeur est notifié
            const recipients = [...byRole(users, "Comptable"), submitterEmail]
            await sendMany(token, recipients, "requestApproved",
              `Décaissement approuvé par la Directrice : ${titre}`)
            break
          }
          case "EXECUTE": {
            await sendMany(token, [submitterEmail], "requestProcessed",
              `Votre décaissement a été exécuté : ${titre}`)
            break
          }
          case "REJETE": {
            await sendMany(token, [submitterEmail], "requestRejected",
              `Votre demande de décaissement a été rejetée : ${titre}`)
            break
          }
        }
      }
    } catch (err) {
      console.error("[Notifications] Erreur lors de l'envoi :", err)
    }
  })()
}
