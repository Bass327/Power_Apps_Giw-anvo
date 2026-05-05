/**
 * Script de packaging de l'app Teams.
 * Crée teams/giwanvo-teams-app.zip prêt à uploader dans Teams Admin Center.
 * Usage : node package-teams-app.js
 */
const fs   = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const TEAMS_DIR = path.join(__dirname, "teams")
const OUT_FILE  = path.join(TEAMS_DIR, "giwanvo-teams-app.zip")

// Vérifier que les icônes sont présentes
const required = ["manifest.json", "color.png", "outline.png"]
const missing  = required.filter(f => !fs.existsSync(path.join(TEAMS_DIR, f)))

if (missing.length > 0) {
  console.error("❌ Fichiers manquants dans teams/ :", missing.join(", "))
  console.error("   → Ouvre generate-teams-icons.html dans ton navigateur et télécharge les icônes.")
  process.exit(1)
}

// Supprimer le ZIP précédent si existant
if (fs.existsSync(OUT_FILE)) fs.unlinkSync(OUT_FILE)

// Créer le ZIP avec PowerShell (disponible sur Windows)
const files = required.map(f => path.join(TEAMS_DIR, f))
const fileList = files.map(f => `"${f}"`).join(", ")

const ps = `
Compress-Archive -Path ${fileList} -DestinationPath "${OUT_FILE}" -Force
`
try {
  execSync(`powershell -Command "${ps.trim()}"`, { stdio: "inherit" })
  console.log("✅ Package créé :", OUT_FILE)
  console.log("")
  console.log("Prochaine étape :")
  console.log("  → Ouvre https://admin.teams.microsoft.com")
  console.log("  → Teams apps > Manage apps > Upload")
  console.log("  → Sélectionne teams/giwanvo-teams-app.zip")
} catch (e) {
  console.error("❌ Erreur lors de la création du ZIP :", e.message)
  console.error("   → Crée le ZIP manuellement : sélectionne les 3 fichiers dans teams/ et compresse-les.")
}
