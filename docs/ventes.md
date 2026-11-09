# Ventes / Caisse — Intégration API (Étape 6)

Base `/api/v1`, enveloppe IDS `{ success, statusCode, code, message, timestamp, data }`. Auth Bearer JWT + `RolesGuard` + **`PermissionGuard`/`@RequirePermission`** (SUPERADMIN bypass). Tag Swagger : `Ventes`. Rôles base : `ADMIN|SUPERADMIN`.

## Flux réel (conforme plan)
- **BC vente** (`BCV`, `VALIDEE`) : engagement, **0 impact stock**. Permission `A40`.
- **BL** (livraison) : **SORTIE stock** dépôt source → mouvements append-only `SORTIE` (ref `VENTE_BL`) via `StockService.recordMovement` (**garde stock insuffisant `409` + verrou `pg_advisory_xact_lock`**, synchro). MAJ `qty_delivered`/statut BC (`LIVREE`/partiel). Livraison partielle (`commande_ligne_id` optionnel). Permissions `A40`,`A31`.
- **Vente au comptant** (validée) : encaissement + **SORTIE stock** à validation (**BL implicite**) → mouvements `SORTIE` (ref `VENTE_COMPTANT`). Montants HT/TTC/encaissé, `mode_paiement` (`ESPECES|MOBILE_MONEY|CARTE|VIREMENT|CHEQUE|AUTRE`). Permissions `A40`,`A31`.
- **Reporting** : `CA par article/famille` = agrégat qty/HT des lignes **BL `VALIDE` + ventes comptant `VALIDEE`** (période/famille, scopé POS). Permission `A40`.

## Entités / migration `1761400000000-CreateVentes`
`commandes_vente` (+lignes, `BROUILLON|VALIDEE|LIVREE|FACTUREE|CLOTUREE|ANNULEE`), `bons_livraison` (+lignes, `VALIDE|ANNULE`), `ventes_comptant` (+lignes, `VALIDEE|ANNULEE`, `mode_paiement_enum`). FKs client/commande SET NULL, depot/POS RESTRICT, article RESTRICT, `created_by` SET NULL.

## Endpoints
| Méthode | Path | Perm. | Impact stock |
|---|---|---|---:|
| POST | `/ventes/commandes` | `A40` | non |
| GET | `/ventes/commandes` / `/:id` | `A40` | non |
| POST | `/ventes/livraisons` | `A40`,`A31` | **SORTIE** (garde 409) |
| GET | `/ventes/livraisons` / `/:id` | `A40` | non |
| POST | `/ventes/comptant` | `A40`,`A31` | **SORTIE** (garde 409) |
| GET | `/ventes/comptant` / `/:id` | `A40` | non |
| GET | `/ventes/report/ca-par-article` | `A40` | non (agrégat) |
| GET | `/ventes/report/ca-par-famille` | `A40` | non (agrégat) |

## Scoping & sécurité
- `ADMIN` limité à son `point_of_sale_id` (dépôt/client/article/commande validés dans le POS ; `404` hors scope, `403` sans PO). `SUPERADMIN` global (cible `point_of_sale_id`). `@RequirePermission` via `PermissionGuard` (SUPERADMIN bypass `userPermissionsConfig.superadminBypass`) — **activé** sur ce module sensible (vente/caisse/stock sortie). Audit `warn` (acteur, ids, montants/mode) sans corps/secrets.

## Transaction / atomicité
- `createCommande`, `createLivraison` (BL + mouvements SORTIE + MAJ BC), `createVenteComptant` (vente + mouvements SORTIE) : **`DataSource.transaction`** → rollback auto sur erreur (validation/FK/**stock insuffisant 409**). Mouvements via `StockService.recordMovement(..., manager)` (même tx, verrou article×dépôt). Effets externes (logs) hors tx DB.

## Fichiers
- `src/ventes/*` (entities BC/BL/VC + lignes, `dto/ventes.dto.ts`, `ventes.service.ts`, `ventes.controller.ts`, `ventes.module.ts` → `StockModule` + `UserPermissionsModule`). Câblé `src/app.module.ts`. Migration `1761400000000-CreateVentes`.
