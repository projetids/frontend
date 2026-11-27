import { useState } from "react"
import { Outlet, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { AtomInput, AtomLabel, AtomTextarea } from "@/components/atoms"
import { MConfirmDialog } from "@/components/molecules"
import { TAppSidebar } from "@/components/templates/t-app-sidebar"
import { useAuth } from "@/context/auth-context"
import { normalizeDecimal } from "@/lib/articles"
import { appNavigation } from "@/lib/navigation"
import { roleLabel } from "@/lib/roles"
import * as caisseService from "@/services/caisse.service"
import type { ApiOpenCashSession } from "@/types/api"

// Enveloppe commune des routes protégées : barre latérale, déconnexion
// confirmée et zone de contenu des pages (Outlet). Tous les rôles y accèdent.

type CashCloseDecision = {
  close: boolean
  montant_compte?: number
  notes?: string
}

type PendingCashClose = {
  session: ApiOpenCashSession
  resolve: (decision: CashCloseDecision) => void
}

function parseAmount(value: string): number | null {
  const normalized = normalizeDecimal(value)
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export function TAuthenticatedLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [pendingCashClose, setPendingCashClose] =
    useState<PendingCashClose | null>(null)
  const [cashAmount, setCashAmount] = useState("")
  const [cashNotes, setCashNotes] = useState("")

  // Les entrées marquées `roles` ne sont visibles que pour ces rôles.
  const groups = appNavigation
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.roles || (user ? item.roles.includes(user.role) : false),
      ),
    }))
    .filter((group) => group.items.length > 0)

  async function handleLogout() {
    try {
      // Le callback est exécuté après /auth/logout mais avant le nettoyage du
      // token : la fermeture de caisse peut encore utiliser le Bearer courant.
      await logout(async (openSession) => {
        const decision = await new Promise<CashCloseDecision>((resolve) => {
          setCashAmount("")
          setCashNotes("")
          setPendingCashClose({ session: openSession, resolve })
        })
        if (!decision.close) return
        await caisseService.closeCaisseSession({
          montant_compte: decision.montant_compte ?? 0,
          ...(decision.notes ? { notes: decision.notes } : {}),
        })
      })
    } catch (err) {
      toast.error("Déconnexion impossible", {
        description: err instanceof Error ? err.message : "Erreur inattendue",
      })
    } finally {
      setPendingCashClose(null)
      navigate("/login", { replace: true })
    }
  }

  return (
    <TAppSidebar
      brand="IDS"
      groups={groups}
      user={
        user
          ? {
              name: user.user_name,
              role: roleLabel(user.role),
              href: "/profile",
            }
          : undefined
      }
      onLogout={() => setConfirmLogout(true)}
      footer="IDS - Gestion de Supermarché · Plateforme interne"
    >
      <MConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        title="Se déconnecter ?"
        description="Votre session sera fermée sur cet appareil. Voulez-vous continuer ?"
        confirmLabel="Se déconnecter"
        destructive
        onConfirm={() => void handleLogout()}
      />

      {pendingCashClose ? (
        <MConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              pendingCashClose.resolve({ close: false })
              setPendingCashClose(null)
            }
          }}
          title="Fermer la caisse ?"
          description={`La caisse ${pendingCashClose.session.session_code} du ${pendingCashClose.session.business_date} est encore ouverte. Saisissez le montant compté pour la clôturer avant de terminer la déconnexion.`}
          confirmLabel="Fermer la caisse et continuer"
          cancelLabel="Ne pas fermer"
          confirmDisabled={parseAmount(cashAmount) === null}
          onConfirm={() => {
            const montant_compte = parseAmount(cashAmount)
            if (montant_compte === null) return
            pendingCashClose.resolve({
              close: true,
              montant_compte,
              notes: cashNotes.trim() || undefined,
            })
            setPendingCashClose(null)
          }}
        >
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <AtomLabel htmlFor="logout-cash-amount">
                Montant compté (Ariary, fond inclus)
              </AtomLabel>
              <AtomInput
                id="logout-cash-amount"
                type="number"
                min={0}
                step="0.01"
                value={cashAmount}
                onChange={(event) => setCashAmount(event.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="grid gap-1.5">
              <AtomLabel htmlFor="logout-cash-notes">Notes (optionnel)</AtomLabel>
              <AtomTextarea
                id="logout-cash-notes"
                rows={2}
                value={cashNotes}
                onChange={(event) => setCashNotes(event.target.value)}
                placeholder="Ex. Fin de journée"
              />
            </div>
          </div>
        </MConfirmDialog>
      ) : null}

      <Outlet />
    </TAppSidebar>
  )
}
