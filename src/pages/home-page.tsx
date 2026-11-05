import { useState } from "react"
import { ArrowRightIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { MField, MSearchBar } from "@/components/molecules"
import { OFeatureGrid, ONavbar } from "@/components/organisms"
import { TAppShell } from "@/components/templates"
import { API_URL } from "@/lib/env"

type Health = { status: string; database: string; redis: string }

async function handleHealth() {
  try {
    const response = await fetch(`${API_URL}/health`)
    const health = (await response.json()) as Health
    const description = `Postgres ${health.database} · Redis ${health.redis} · ${API_URL}`
    if (response.ok) toast.success(`API ${health.status}`, { description })
    else toast.error(`API ${health.status}`, { description })
  } catch {
    toast.error("API injoignable", { description: API_URL })
  }
}

const features = [
  {
    icon: "zap",
    title: "Tailwind CSS 4",
    description: "Thème shadcn en variables CSS, moteur natif dans Vite.",
    badge: "Frontend",
  },
  {
    icon: "database",
    title: "PostgreSQL",
    description: "Nest 12 + TypeORM, migrations pilotées par CLI.",
    badge: "Backend",
  },
  {
    icon: "shield",
    title: "Redis",
    description: "Cache et files d'attente via un CacheService global.",
    badge: "Backend",
  },
] as const

export function HomePage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | undefined>()

  function handleSubmit() {
    if (!email.includes("@")) {
      setError("Adresse e-mail invalide.")
      toast.error("Formulaire incomplet", { description: "Saisissez un e-mail valide." })
      return
    }

    setError(undefined)
    toast.success("Inscription enregistrée", { description: email })
  }

  return (
    <TAppShell
      header={
        <ONavbar
          brand="IDS"
          links={[
            { label: "Documentation", href: "#docs" },
            { label: "Composants", href: "#components" },
          ]}
          action={{ label: "Statut API", onClick: handleHealth }}
        />
      }
      footer="Squelette frontend — React, Vite, Tailwind CSS, shadcn/ui, lucide-react, sonner."
    >
      <div className="flex flex-col gap-10">
        <section className="flex max-w-2xl flex-col gap-4">
          <AtomBadge variant="outline">Design system prêt</AtomBadge>
          <h1 className="text-3xl font-semibold tracking-tight">
            Base frontend et backend séparées
          </h1>
          <p className="text-muted-foreground">
            Chaque écran compose des atoms, molecules et organisms ; la couche{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-sm">ui/</code> reste la
            librairie brute livrée par shadcn.
          </p>
          <MSearchBar placeholder="Rechercher un composant…" />
        </section>

        <section id="components" className="flex max-w-sm flex-col gap-4">
          <MField
            label="E-mail"
            type="email"
            placeholder="vous@exemple.mg"
            value={email}
            description="Utilisé pour valider le molecule MField et les toasts sonner."
            error={error}
            onChange={(event) => setEmail(event.target.value)}
          />
          <AtomButton iconRight={ArrowRightIcon} onClick={handleSubmit}>
            S&apos;inscrire
          </AtomButton>
        </section>

        <section id="docs">
          <OFeatureGrid features={[...features]} columns={3} />
        </section>
      </div>
    </TAppShell>
  )
}
