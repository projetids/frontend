import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { AtomButton } from "@/components/atoms"

// Pied de liste paginée : plage affichée, page courante et navigation.
// S'aligne sur `meta` de l'API (`page`, `limit`, `total`).

export type MPaginationProps = {
  page: number
  limit: number
  total: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

export function MPagination({
  page,
  limit,
  total,
  disabled,
  onPageChange,
}: MPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-muted-foreground text-sm">
        {total === 0 ? "Aucun résultat" : `${start}–${end} sur ${total}`}
      </p>
      <div className="flex items-center gap-2">
        <AtomButton
          size="sm"
          variant="outline"
          iconLeft={ChevronLeftIcon}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Précédent
        </AtomButton>
        <span className="text-muted-foreground text-sm">
          Page {page} / {totalPages}
        </span>
        <AtomButton
          size="sm"
          variant="outline"
          iconRight={ChevronRightIcon}
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Suivant
        </AtomButton>
      </div>
    </div>
  )
}
