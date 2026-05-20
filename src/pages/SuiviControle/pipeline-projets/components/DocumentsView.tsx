/* ═══════════════════════════════════════════════════════════════════════════
   DocumentsView — Gestion des pièces jointes du pipeline
   Stockage : Drive SharePoint → Pipeline_Documents/{projetCode}/
   ═══════════════════════════════════════════════════════════════════════════ */

import { useState, useMemo, useRef } from "react"
import {
  FolderOpen,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Filter,
  FileText,
  Image,
  File,
  FileSpreadsheet,
  Presentation,
  X,
} from "lucide-react"
import {
  useProjets,
  usePipelineDocuments,
  useUploadDocument,
  useDeleteDocument,
} from "@/hooks/usePipeline"
import type { PipelineDocument } from "@/types/pipeline"

// ─── Constantes ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE_MB  = 250
const MAX_FILE_SIZE_B   = MAX_FILE_SIZE_MB * 1024 * 1024

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (!bytes) return "—"
  if (bytes < 1024)           return `${bytes} o`
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function fmtDate(iso: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit", month: "short", year: "numeric",
    })
  } catch {
    return "—"
  }
}

// ─── Icône par type MIME ──────────────────────────────────────────────────────

function FileIcon({ mimeType, size = 18 }: { mimeType: string; size?: number }) {
  const s = { flexShrink: 0 as const }

  if (mimeType.startsWith("image/"))
    return <Image size={size} style={{ ...s, color: "#f59e0b" }} />
  if (mimeType === "application/pdf")
    return <FileText size={size} style={{ ...s, color: "#ef4444" }} />
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <FileSpreadsheet size={size} style={{ ...s, color: "#22c55e" }} />
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return <Presentation size={size} style={{ ...s, color: "#f0a500" }} />
  if (mimeType.startsWith("text/") || mimeType.includes("word") || mimeType.includes("document"))
    return <FileText size={size} style={{ ...s, color: "#60a5fa" }} />
  return <File size={size} style={{ ...s, color: "var(--text-muted)" }} />
}

// ─── Couleur de la bande latérale par type MIME ───────────────────────────────

function mimeAccent(mimeType: string): string {
  if (mimeType.startsWith("image/"))    return "#f59e0b"
  if (mimeType === "application/pdf")   return "#ef4444"
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "#22c55e"
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "#f0a500"
  if (mimeType.startsWith("text/") || mimeType.includes("word")) return "#60a5fa"
  return "#6b7280"
}

// ─── Carte document ───────────────────────────────────────────────────────────

interface DocCardProps {
  doc:           PipelineDocument
  onDelete:      (doc: PipelineDocument) => void
  isDeleting:    boolean
}

function DocCard({ doc, onDelete, isDeleting }: DocCardProps) {
  const accent = mimeAccent(doc.mimeType)

  return (
    <div
      className="flex items-center gap-3 rounded-xl overflow-hidden transition-all duration-150"
      style={{
        background: "rgba(13,26,16,0.65)",
        border:     "1px solid var(--bg-border)",
        opacity:    isDeleting ? 0.5 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDeleting) e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--bg-border)"
      }}
    >
      {/* Bande colorée gauche */}
      <div
        className="w-1 self-stretch flex-shrink-0"
        style={{ background: accent }}
      />

      {/* Icône */}
      <div className="flex-shrink-0 py-3 pl-2">
        <FileIcon mimeType={doc.mimeType} size={22} />
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0 py-3 pr-2">
        <p
          className="text-sm font-semibold truncate"
          style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
          title={doc.name}
        >
          {doc.name}
        </p>
        <div
          className="flex items-center gap-3 mt-0.5 text-xs flex-wrap"
          style={{ color: "var(--text-muted)" }}
        >
          <span>{formatSize(doc.size)}</span>
          <span>·</span>
          <span>{doc.auteur}</span>
          <span>·</span>
          <span>{fmtDate(doc.created)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
        <a
          href={doc.webUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Ouvrir dans SharePoint"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: "rgba(45,158,95,0.08)",
            border:     "1px solid rgba(45,158,95,0.2)",
            color:      "#2d9e5f",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background  = "rgba(45,158,95,0.18)"
            e.currentTarget.style.borderColor = "#2d9e5f"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background  = "rgba(45,158,95,0.08)"
            e.currentTarget.style.borderColor = "rgba(45,158,95,0.2)"
          }}
        >
          <ExternalLink size={13} />
        </a>
        <button
          onClick={() => onDelete(doc)}
          disabled={isDeleting}
          title="Supprimer"
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150"
          style={{
            background: "rgba(239,68,68,0.08)",
            border:     "1px solid rgba(239,68,68,0.15)",
            color:      "#f87171",
            cursor:     isDeleting ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!isDeleting) {
              e.currentTarget.style.background  = "rgba(239,68,68,0.18)"
              e.currentTarget.style.borderColor = "#ef4444"
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background  = "rgba(239,68,68,0.08)"
            e.currentTarget.style.borderColor = "rgba(239,68,68,0.15)"
          }}
        >
          {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  )
}

// ─── Zone de drop / upload ────────────────────────────────────────────────────

interface UploadZoneProps {
  projetCode:  string
  isUploading: boolean
  onFiles:     (files: File[]) => void
}

function UploadZone({ projetCode, isUploading, onFiles }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    onFiles(files)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    onFiles(files)
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center justify-center gap-3 transition-all duration-150"
      style={{
        border:     `2px dashed ${isDragging ? "#2d9e5f" : "rgba(30,53,40,0.6)"}`,
        background: isDragging ? "rgba(45,158,95,0.05)" : "rgba(13,26,16,0.3)",
        cursor:     isUploading ? "not-allowed" : "pointer",
      }}
      onClick={() => !isUploading && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
      {isUploading ? (
        <Loader2 size={28} className="animate-spin" style={{ color: "#f0a500" }} />
      ) : (
        <Upload size={24} style={{ color: isDragging ? "#2d9e5f" : "var(--text-muted)" }} />
      )}
      <div className="text-center">
        <p
          className="text-sm font-semibold"
          style={{
            color:      isUploading ? "var(--text-secondary)" : isDragging ? "#2d9e5f" : "var(--text-secondary)",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          {isUploading
            ? "Upload en cours…"
            : isDragging
            ? "Relâchez pour ajouter"
            : `Déposer des fichiers ou cliquer`}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {projetCode
            ? `Projet : ${projetCode} · Max ${MAX_FILE_SIZE_MB} Mo par fichier`
            : "Sélectionnez d'abord un projet"}
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Composant principal
// ═══════════════════════════════════════════════════════════════════════════════

export default function DocumentsView() {
  // ── Données ──────────────────────────────────────────────────────────────
  const { data: projets = [], isLoading: loadingProjets } = useProjets()
  const { data: docs    = [], isLoading: loadingDocs, isError, refetch } = usePipelineDocuments()
  const uploadMutation = useUploadDocument()
  const deleteMutation = useDeleteDocument()

  // ── État local ────────────────────────────────────────────────────────────
  const [filterProjet,  setFilterProjet]  = useState("")
  const [deletingId,    setDeletingId]    = useState<string | null>(null)
  const [uploadErrors,  setUploadErrors]  = useState<string[]>([])

  // ── Projet sélectionné → code du projet ───────────────────────────────────
  const selectedProjet = useMemo(
    () => projets.find((p) => p.id === filterProjet) ?? null,
    [projets, filterProjet],
  )

  // ── Documents filtrés ─────────────────────────────────────────────────────
  const filteredDocs = useMemo(() => {
    if (!filterProjet || !selectedProjet) return docs
    return docs.filter((d) => d.projetCode === selectedProjet.codeProjet)
  }, [docs, filterProjet, selectedProjet])

  // ── Documents groupés par projetCode ─────────────────────────────────────
  const groups = useMemo((): { code: string; titre: string; docs: PipelineDocument[] }[] => {
    const map = new Map<string, PipelineDocument[]>()
    for (const d of filteredDocs) {
      if (!map.has(d.projetCode)) map.set(d.projetCode, [])
      map.get(d.projetCode)!.push(d)
    }
    // Associer le titre du projet à chaque code
    const codeToTitre = new Map(projets.map((p) => [p.codeProjet, p.titre]))
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b, "fr"))
      .map(([code, docs]) => ({ code, titre: codeToTitre.get(code) ?? "", docs }))
  }, [filteredDocs, projets])

  // ── Statistiques ─────────────────────────────────────────────────────────
  const totalSize = docs.reduce((acc, d) => acc + (d.size ?? 0), 0)

  // ── Upload ────────────────────────────────────────────────────────────────
  async function handleFiles(files: File[]) {
    if (!selectedProjet) return

    const errors: string[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_B) {
        errors.push(`"${file.name}" dépasse ${MAX_FILE_SIZE_MB} Mo`)
        continue
      }
      try {
        await uploadMutation.mutateAsync({
          projetCode: selectedProjet.codeProjet,
          file,
        })
      } catch {
        errors.push(`Échec pour "${file.name}"`)
      }
    }
    if (errors.length > 0) setUploadErrors(errors)
  }

  // ── Suppression ───────────────────────────────────────────────────────────
  async function handleDelete(doc: PipelineDocument) {
    if (!confirm(`Supprimer "${doc.name}" définitivement ?`)) return
    setDeletingId(doc.id)
    try {
      await deleteMutation.mutateAsync({ itemId: doc.id, projetCode: doc.projetCode })
    } finally {
      setDeletingId(null)
    }
  }

  // ── États de chargement ───────────────────────────────────────────────────

  if (loadingDocs || loadingProjets) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin" style={{ color: "#f0a500" }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
        style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}
      >
        <AlertTriangle size={32} style={{ color: "#ef4444" }} />
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Erreur de chargement des documents
        </p>
        <button
          onClick={() => void refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm"
          style={{ background: "rgba(45,158,95,0.12)", border: "1px solid rgba(45,158,95,0.3)", color: "#2d9e5f" }}
        >
          <RefreshCw size={14} />
          Réessayer
        </button>
      </div>
    )
  }

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Barre de stats ───────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-5 flex-wrap p-4 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.6)", border: "1px solid var(--bg-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.2)" }}
          >
            <FolderOpen size={15} style={{ color: "#f0a500" }} />
          </div>
          <div>
            <div
              className="text-lg font-extrabold leading-none"
              style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
            >
              {docs.length}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              fichier{docs.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(45,158,95,0.08)", border: "1px solid rgba(45,158,95,0.2)" }}
          >
            <File size={15} style={{ color: "#2d9e5f" }} />
          </div>
          <div>
            <div
              className="text-sm font-semibold leading-none"
              style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
            >
              {formatSize(totalSize)}
            </div>
            <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>stockage total</div>
          </div>
        </div>
      </div>

      {/* ── Barre de contrôles ────────────────────────────────────────────── */}
      <div
        className="flex flex-wrap items-center gap-3 p-4 rounded-2xl"
        style={{ background: "rgba(13,26,16,0.7)", border: "1px solid #1e3528" }}
      >
        <Filter size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />

        <select
          value={filterProjet}
          onChange={(e) => setFilterProjet(e.target.value)}
          className="rounded-lg text-sm flex-shrink-0"
          style={{
            background: "var(--bg-elevated)",
            border:     "1px solid var(--bg-border)",
            color:      filterProjet ? "var(--text-primary)" : "var(--text-secondary)",
            padding:    "6px 10px",
            fontFamily: "'Syne', sans-serif",
            fontSize:   "0.8125rem",
            outline:    "none",
            cursor:     "pointer",
            maxWidth:   "280px",
          }}
        >
          <option value="">Tous les projets</option>
          {projets.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codeProjet} — {p.titre}
            </option>
          ))}
        </select>

        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
          {filteredDocs.length} fichier{filteredDocs.length !== 1 ? "s" : ""}
          {filterProjet && (
            <span style={{ color: "var(--text-muted)" }}> sur {docs.length}</span>
          )}
        </span>
      </div>

      {/* ── Erreurs d'upload ──────────────────────────────────────────────── */}
      {uploadErrors.length > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-xl"
          style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <AlertTriangle size={16} style={{ color: "#ef4444", flexShrink: 0, marginTop: "2px" }} />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#f87171" }}>
              Erreurs lors de l'upload
            </p>
            {uploadErrors.map((e, i) => (
              <p key={i} className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>{e}</p>
            ))}
          </div>
          <button onClick={() => setUploadErrors([])} style={{ color: "var(--text-muted)" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Zone d'upload (visible si un projet est sélectionné) ──────────── */}
      {filterProjet && selectedProjet && (
        <UploadZone
          projetCode={selectedProjet.codeProjet}
          isUploading={uploadMutation.isPending}
          onFiles={handleFiles}
        />
      )}

      {/* ── Contenu ───────────────────────────────────────────────────────── */}
      {docs.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
        >
          <FolderOpen size={36} style={{ color: "#2d9e5f", opacity: 0.4 }} />
          <p
            className="mt-3 text-sm font-semibold"
            style={{ color: "var(--text-primary)", fontFamily: "'Syne', sans-serif" }}
          >
            Aucun document dans le pipeline
          </p>
          <p className="text-xs mt-1 text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
            Sélectionnez un projet ci-dessus, puis déposez vos fichiers
          </p>
        </div>
      ) : groups.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl"
          style={{ background: "rgba(13,26,16,0.4)", border: "1px dashed #1e3528" }}
        >
          <FolderOpen size={28} style={{ color: "#2d9e5f", opacity: 0.4 }} />
          <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
            Aucun document pour ce projet
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ code, titre, docs: groupDocs }) => (
            <div key={code}>
              {/* En-tête du groupe projet */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-md"
                  style={{
                    background:    "rgba(240,165,0,0.1)",
                    color:         "#f0a500",
                    border:        "1px solid rgba(240,165,0,0.25)",
                    fontFamily:    "'Syne', sans-serif",
                    letterSpacing: "0.05em",
                  }}
                >
                  {code}
                </span>
                {titre && (
                  <span
                    className="text-sm font-semibold truncate"
                    style={{ color: "var(--text-secondary)", fontFamily: "'Syne', sans-serif" }}
                  >
                    {titre}
                  </span>
                )}
                <div className="flex-1 h-px" style={{ background: "var(--bg-border)" }} />
                <span className="text-xs flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                  {groupDocs.length} fichier{groupDocs.length !== 1 ? "s" : ""}
                  {" · "}
                  {formatSize(groupDocs.reduce((s, d) => s + (d.size ?? 0), 0))}
                </span>
              </div>

              {/* Liste des documents */}
              <div className="space-y-2">
                {groupDocs.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    onDelete={handleDelete}
                    isDeleting={deletingId === doc.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Aide upload si aucun projet sélectionné ───────────────────────── */}
      {!filterProjet && docs.length > 0 && (
        <p
          className="text-xs text-center"
          style={{ color: "var(--text-muted)" }}
        >
          Sélectionnez un projet dans le filtre pour uploader de nouveaux fichiers
        </p>
      )}

    </div>
  )
}
