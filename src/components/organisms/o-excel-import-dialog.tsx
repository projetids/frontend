import { useRef, useState, type DragEvent, type ReactNode } from "react"
import { FileSpreadsheetIcon, UploadIcon, XIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomButton } from "@/components/atoms"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiError } from "@/lib/api-client"

// Modal générique d'import Excel (.xls / .xlsx) : sélection du fichier,
// validation de l'extension côté client, appel de `onImport` puis affichage du
// récapitulatif (`imported` + erreurs ligne par ligne renvoyées par l'API).

export type ExcelImportError = { row: number; field?: string; message: string }

export type ExcelImportResponse = {
  envelope: { message: string }
  imported: number
  skipped?: number
  families_created?: { article_families_id: number; article_families_name: string }[]
  errors: ExcelImportError[]
}

export type OExcelImportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  /** Libellé pluriel du récapitulatif, ex. « article(s) ». */
  entityLabel: string
  onImport: (file: File) => Promise<ExcelImportResponse>
  /** Appelé après un import réussi (rechargement de la liste). */
  onImported?: () => void
  /** Champs additionnels affichés avant le fichier (ex. point de vente). */
  extraFields?: ReactNode
  /** Conditions supplémentaires pour autoriser l'envoi. */
  canSubmit?: boolean
}

const ALLOWED_EXTENSIONS = [".xls", ".xlsx"]

function hasAllowedExtension(file: File) {
  const name = file.name.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext))
}

export function OExcelImportDialog({
  open,
  onOpenChange,
  title,
  description,
  entityLabel,
  onImport,
  onImported,
  extraFields,
  canSubmit = true,
}: OExcelImportDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [result, setResult] = useState<{
    imported: number
    skipped?: number
    families_created?: { article_families_id: number; article_families_name: string }[]
    errors: ExcelImportError[]
  } | null>(null)

  function reset() {
    setFile(null)
    setFileError(null)
    setResult(null)
  }

  function close() {
    if (importing) return
    reset()
    onOpenChange(false)
  }

  function handleFileChange(selected: File | null) {
    setResult(null)
    if (selected && !hasAllowedExtension(selected)) {
      setFile(null)
      setFileError("Format non supporté : sélectionnez un fichier .xls ou .xlsx.")
      return
    }
    setFileError(null)
    setFile(selected)
  }

  async function handleImport() {
    if (!file) {
      setFileError("Sélectionnez un fichier .xls ou .xlsx.")
      return
    }
    setImporting(true)
    try {
      const { envelope, imported, skipped, families_created, errors } =
        await onImport(file)
      setResult({ imported, skipped, families_created, errors })
      toast.success(envelope.message, {
        description: `${imported} ${entityLabel} importé(s), ${skipped ?? 0} ignoré(s), ${errors.length} erreur(s).`,
      })
      onImported?.()
    } catch (err) {
      toast.error("Import impossible", {
        description:
          err instanceof ApiError
            ? err.details || err.message
            : "Erreur inattendue",
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
        else onOpenChange(true)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UploadIcon className="size-5" />
          </div>
          <div className="grid gap-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="grid gap-4">
          {extraFields}
          <div className="grid gap-1.5">
            <label htmlFor="excelImportFile" className="text-sm font-medium">
              Fichier
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => !importing && inputRef.current?.click()}
              onKeyDown={(e) => {
                if (!importing && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(e: DragEvent<HTMLDivElement>) => {
                if (importing) return
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e: DragEvent<HTMLDivElement>) => {
                if (importing) return
                e.preventDefault()
                setDragOver(false)
                handleFileChange(e.dataTransfer.files?.[0] ?? null)
              }}
              className={[
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40",
                importing ? "pointer-events-none opacity-60" : "",
                fileError ? "border-destructive/60" : "",
              ].join(" ")}
            >
              <input
                ref={inputRef}
                id="excelImportFile"
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                disabled={importing}
                className="sr-only"
                aria-invalid={fileError ? true : undefined}
              />
              {file ? (
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileSpreadsheetIcon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} Ko
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFileChange(null)
                      if (inputRef.current) inputRef.current.value = ""
                    }}
                    disabled={importing}
                    className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label="Retirer le fichier"
                  >
                    <XIcon className="size-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <UploadIcon className="size-5" />
                  </div>
                  <div className="grid gap-0.5">
                    <p className="text-sm font-medium">
                      Glissez-déposez ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Formats acceptés : .xls, .xlsx
                    </p>
                  </div>
                </>
              )}
            </div>
            {fileError ? (
              <p className="text-sm text-destructive">{fileError}</p>
            ) : null}
          </div>
          {result ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium">
                {result.imported} {entityLabel} importé(s)
                {result.skipped ? `, ${result.skipped} ignoré(s)` : ""}
                {`, ${result.errors.length} erreur(s).`}
              </p>
              {result.families_created && result.families_created.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Familles créées :{" "}
                  {result.families_created
                    .map((f) => f.article_families_name)
                    .join(", ")}
                  .
                </p>
              ) : null}
              {result.errors.length > 0 ? (
                <div className="max-h-48 overflow-auto rounded-md border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-2 py-1 text-left">Ligne</th>
                        <th className="px-2 py-1 text-left">Champ</th>
                        <th className="px-2 py-1 text-left">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-2 py-1">{e.row}</td>
                          <td className="px-2 py-1">{e.field || "—"}</td>
                          <td className="px-2 py-1">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <AtomButton variant="outline" onClick={close} disabled={importing}>
            Fermer
          </AtomButton>
          <AtomButton
            onClick={() => void handleImport()}
            disabled={importing || !file || !canSubmit}
          >
            {importing ? "Import…" : "Importer"}
          </AtomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
