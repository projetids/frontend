import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Modal de validation générique : s'affiche avant toute action importante
// (déconnexion, envoi d'un lien de réinitialisation, changement de mot de passe…).
// L'intérieur (title, description, labels) est entièrement en français.

export type MConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  /** Libellé du bouton de confirmation (défaut : « Confirmer »). */
  confirmLabel?: string
  /** Libellé du bouton d'annulation (défaut : « Annuler »). */
  cancelLabel?: string
  /** Met le bouton de confirmation en rouge (action destructive). */
  destructive?: boolean
  /** Champs supplémentaires affichés entre la description et les actions. */
  children?: ReactNode
  /** Désactive la confirmation (ex. montant de fermeture invalide). */
  confirmDisabled?: boolean
  /** Action à exécuter après la confirmation (ferme la modal automatiquement). */
  onConfirm: () => void
}

export function MConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  children,
  confirmDisabled = false,
  onConfirm,
}: MConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline">{cancelLabel}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant={destructive ? "destructive" : "default"}
              disabled={confirmDisabled}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
