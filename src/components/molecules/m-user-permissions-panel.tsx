import { useId, useMemo, useState } from "react"
import { AtomBadge, AtomButton } from "@/components/atoms"
import { Checkbox } from "@/components/ui/checkbox"
import { countEnabledPermissions } from "@/lib/permissions"
import type { ApiPermission } from "@/types/api"
import { MSearchBar } from "./m-search-bar"

// Liste des flags d'un utilisateur : une case à cocher par permission du
// catalogue, avec recherche et actions globales. Le composant est purement
// contrôlé : la page conserve l'état et décide quand enregistrer.

export type MUserPermissionsPanelProps = {
  permissions: ApiPermission[]
  flags: Record<string, boolean>
  disabled?: boolean
  onToggle: (code: string, enabled: boolean) => void
  onEnableAll: () => void
  onDisableAll: () => void
}

export function MUserPermissionsPanel({
  permissions,
  flags,
  disabled,
  onToggle,
  onEnableAll,
  onDisableAll,
}: MUserPermissionsPanelProps) {
  const idPrefix = useId()
  const [search, setSearch] = useState("")

  const sorted = useMemo(
    () =>
      [...permissions].sort((a, b) =>
        a.code.localeCompare(b.code, "fr", { numeric: true })
      ),
    [permissions]
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return sorted
    return sorted.filter(
      (permission) =>
        permission.code.toLowerCase().includes(term) ||
        permission.label_fr.toLowerCase().includes(term)
    )
  }, [sorted, search])

  const enabledCount = countEnabledPermissions(sorted, flags)

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <MSearchBar
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher une permission…"
          aria-label="Rechercher une permission"
          className="sm:max-w-xs"
        />
        <AtomBadge variant="secondary">
          {enabledCount} / {sorted.length} activée
          {enabledCount === 1 ? "" : "s"}
        </AtomBadge>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <AtomButton
            size="sm"
            variant="outline"
            disabled={disabled || sorted.length === 0}
            onClick={onEnableAll}
          >
            Tout activer
          </AtomButton>
          <AtomButton
            size="sm"
            variant="outline"
            disabled={disabled || sorted.length === 0}
            onClick={onDisableAll}
          >
            Tout désactiver
          </AtomButton>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune permission ne correspond à cette recherche.
        </p>
      ) : (
        <div className="grid max-h-104 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((permission, index) => {
            const checkboxId = `${idPrefix}-${index}`
            const checked = flags[permission.code] ?? permission.default_enabled

            return (
              <div
                key={permission.code}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Checkbox
                  id={checkboxId}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={(value) =>
                    onToggle(permission.code, value === true)
                  }
                />
                <label
                  htmlFor={checkboxId}
                  className="grid min-w-0 flex-1 cursor-pointer gap-1"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {permission.code}
                    </span>
                    {permission.reserved ? (
                      <AtomBadge variant="outline">Réservée</AtomBadge>
                    ) : null}
                    {permission.default_enabled ? (
                      <AtomBadge variant="secondary">Par défaut</AtomBadge>
                    ) : null}
                    {!permission.is_active ? (
                      <AtomBadge variant="destructive">Inactive</AtomBadge>
                    ) : null}
                  </span>
                  <span className="text-sm leading-snug">
                    {permission.label_fr}
                  </span>
                </label>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
