import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRightIcon } from "lucide-react"
import { toast } from "sonner"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { MField, MSearchBar } from "@/components/molecules"
import { OFeatureGrid, ONavbar } from "@/components/organisms"
import { TAppShell } from "@/components/templates"
import { useAuth } from "@/context/auth-context"

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
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | undefined>()

  async function handleLogout() {
    try {
      await logout()
      navigate("/login", { replace: true })
    } catch {
      toast.error("Déconnexion impossible")
    }
  }

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
          action={{ label: "Déconnexion", onClick: () => void handleLogout() }}
        />
      }
      footer="Squelette frontend — React, Vite, Tailwind CSS, shadcn/ui, lucide-react, sonner."
    >
      <div className="flex flex-col gap-10">
        <section className="flex max-w-2xl flex-col gap-4">
          <div className="flex items-center gap-2">
            <AtomBadge variant="outline">Design system prêt</AtomBadge>
            {user ? (
              <AtomBadge variant="secondary">
                {user.user_name} · {user.role}
              </AtomBadge>
            ) : null}
          </div>
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
