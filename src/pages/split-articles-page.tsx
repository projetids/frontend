import { useState } from "react"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/context/auth-context"
import { roleLabel } from "@/lib/roles"
import { splitArticlesFile, type SplitResult } from "@/lib/split-articles"

export function SplitArticlesPage() {
  const { user } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<SplitResult | null>(null)

  async function handleGenerate() {
    if (!file) {
      toast.error("Sélectionnez un fichier Articles.xls")
      return
    }
    setProcessing(true)
    setResult(null)
    try {
      const res = await splitArticlesFile(file)
      setResult(res)
      toast.success("Fichiers générés", {
        description: `${res.familiesCount} famille(s), ${res.articlesCount} article(s).`,
      })
    } catch (err) {
      toast.error("Génération impossible", {
        description: err instanceof Error ? err.message : "Erreur inattendue",
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <AtomBadge variant="outline">Outils</AtomBadge>
          {user ? (
            <AtomBadge variant="secondary">
              {user.user_name} · {roleLabel(user.role)}
            </AtomBadge>
          ) : null}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Séparation Articles.xls
        </h1>
        <p className="text-muted-foreground">
          Génère deux fichiers Excel prêts à importer : les familles d'articles et
          les articles (avec l'identifiant de famille renseigné).
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Fichier source</CardTitle>
          <CardDescription>
            Sélectionnez le fichier `Articles.xls`. Les deux fichiers seront
            téléchargés automatiquement.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <input
            type="file"
            accept=".xls,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={processing}
            className="text-sm"
          />
          <AtomButton
            onClick={() => void handleGenerate()}
            disabled={processing || !file}
            iconLeft={UploadIcon}
          >
            {processing ? "Génération…" : "Générer les fichiers"}
          </AtomButton>

          {result ? (
            <div className="grid gap-2 rounded-md border p-4 text-sm">
              <p>
                <strong>{result.familiesCount}</strong> famille(s) générée(s).
              </p>
              <p>
                <strong>{result.articlesCount}</strong> article(s) généré(s).
              </p>
              <p>
                <strong>{result.excludedCount}</strong> ligne(s) exclue(s) (sans
                famille).
              </p>
              <p className="text-xs text-muted-foreground">
                Familles : {result.familyNames.join(", ")}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}