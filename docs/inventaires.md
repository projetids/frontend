# Inventaires — Intégration API (Étape 4)

Base `/api/v1`, enveloppe IDS. Auth Bearer JWT + `RolesGuard`. Tag Swagger : `Inventaires`. Rôles : `ADMIN|SUPERADMIN`.

## Rôle
Session de comptage physique sur un **dépôt** (article×dépôt) → validation génère des **régularisations** de stock (écarts théorique vs compté) via le moteur `mouvements_stock` (append-only).

## Entités
- `inventaires` : `inventaire_id` (uuid PK), `inventaire_code` unique `INV-<hex>` (généré), `depot_id` FK `depots` RESTRICT, `point_of_sale_id` FK `point_of_sales` RESTRICT, `status` enum `inventaire_status_enum` (`BROUILLON|VALIDE|ANNULE`, défaut `VALIDE` à création), `commentaire`, `validated_at/by`, `created_by/at/updated_at`.
- `inventaire_lignes` : `ligne_id` PK, `inventaire_id` FK CASCADE, `article_id` FK `articles` RESTRICT, `qty_theorique` (snapshot au moment de la validation, somme `mouvements_stock` article×dépôt), `qty_comptee`, `ecart` (= comptée − théorique). Unique `(inventaire_id, article_id)`.

## Endpoints
| Méthode | Path | Description |
|---|---|---|
| `POST` | `/inventaires` | Crée **et valide** l’inventaire : calcule `qty_theorique`/`ecart`, persiste lignes, génère un mouvement `AJUSTEMENT_POS` (écart>0) ou `AJUSTEMENT_NEG` (écart<0) par ligne non nulle (ref `INVENTAIRE` + `ref_id`) via `StockService.recordMovement` (garde/verrou/synchro agrégats). 201. |
| `GET` | `/inventaires` | Liste paginée (filtres `depot_id`, `status`). |
| `GET` | `/inventaires/:id` | Détail + lignes. |

Corps `POST` : `{ depot_id, commentaire?, lines:[{ article_id, qty_comptee(>=0) }] }` (≥1 ligne, article unique).

## Scoping & rôles
- `ADMIN` : limité à son `point_of_sale_id` (dépôt doit appartenir à son PO ; liste/détail filtrés). `404` hors scope (pas de fuite), `403` sans PO.
- `SUPERADMIN` : global.

## Transaction / atomicité
- Création/validation **entièrement transactionnelle** (`DataSource.transaction`) : inventaire + lignes + régularisations (mouvements append-only) dans la même tx → **rollback auto** sur erreur (FK, stock, validation) = aucune écriture partielle. Verrou `pg_advisory_xact_lock` par `(article_id,depot_id)` avant lecture `qty_theorique` pour figer l’écart face aux mouvements concurrents ; le moteur stock re-verrouille/contrôle à l’insertion.
- Effets externes non-DB (logs warn) hors transaction.

## Fichiers
- `src/inventaires/*` (entities, dto, service, controller, module) ; migrations `1760900000000-CreateInventaires.ts`. `AppModule` → `InventairesModule`.
