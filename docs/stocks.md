# Stock — Intégration API (Étape 3 : moteur stock)

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail/paginated`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`). Tag Swagger : `Stock`.

## Principe (norme IDS)
- **Source de vérité** : table `mouvements_stock` **append-only** (journal). On n’édite/supprime jamais un mouvement.
- **État de stock** (théorique) = agrégat `SUM(qty signée)` par `article_id × depot_id` (calculé depuis `mouvements_stock`).
- Les colonnes dénormalisées sur `articles` (`article_theoretical_stock`, `article_available_qty`) sont **synchronisées** après chaque mouvement (commodité) ; `article_reserved_qty` est réservée aux flux vente futurs.
- **Garde stock insuffisant** (défaut) : un mouvement à effet sortant (`SORTIE`, `AJUSTEMENT_NEG`, `TRANSFERT_SORTIE`) est refusé (`409`) si le stock disponible (article×dépôt) deviendrait négatif. Contrôle effectué **dans la transaction**.

## Entité `mouvements_stock`

| Attribut | Type | Description |
|---|---|---|
| `mouvement_id` | uuid PK | Identifiant |
| `article_id` | uuid FK `articles` RESTRICT | Article |
| `depot_id` | uuid FK `depots` RESTRICT | Dépôt |
| `point_of_sale_id` | uuid FK `point_of_sales` RESTRICT | POS du dépôt (scoping/traçabilité) |
| `type` | enum `mouvement_stock_type_enum` | `ENTREE`, `SORTIE`, `AJUSTEMENT_POS`, `AJUSTEMENT_NEG`, `INVENTAIRE`, `TRANSFERT_SORTIE`, `TRANSFERT_ENTREE` |
| `qty` | numeric(12,3), ≠ 0 | Quantité **signée** persistée (+ entrée, − sortie) |
| `ref_type` | enum `mouvement_ref_type_enum` | `BON_ENTREE`, `BON_SORTIE`, `INVENTAIRE`, `TRANSFERT`, `ACHAT_BR`, `VENTE_BL`, `VENTE_COMPTANT`, `MANUEL` |
| `ref_id` | uuid nullable | Référence document source |
| `motif` | text nullable | Motif/commentaire |
| `movement_date` | timestamp | Date du mouvement |
| `created_by` | uuid nullable FK `users` SET NULL | Acteur |
| `created_at` | timestamp | Horodatage création |

## Scoping & rôles
- `ADMIN` : limité à son `point_of_sale_id` (dépôts/mouvements/état). Sans PO → `403`. Accès à un dépôt hors PO → `404` (pas de fuite).
- `SUPERADMIN` : global ; peut filtrer `point_of_sale_id` sur l’état de stock.

## Endpoints (`/api/v1/stock`, rôles `ADMIN|SUPERADMIN`)

| Méthode | Path | Description |
|---|---|---|
| `POST` | `/stock/bons-entree` | Créer un **Bon d’entrée** (lignes article×qty) → mouvements `ENTREE` (+). |
| `POST` | `/stock/bons-sortie` | Créer un **Bon de sortie** → mouvements `SORTIE` (−), **garde stock insuffisant** (`409`). |
| `GET` | `/stock/mouvements` | Journal paginé (filtres `article_id,depot_id,type,ref_type,date_from,date_to`, tri). |
| `GET` | `/stock/etat` | État de stock théorique agrégé par `article_id × depot_id` (filtres `article_id,depot_id,point_of_sale_id` SUPERADMIN). |

### Corps `POST /stock/bons-entree|bons-sortie`
```json
{
  "depot_id": "<uuid>",
  "motif": "Réception fournisseur",
  "ref_id": "<uuid optionnel>",
  "lines": [{ "article_id": "<uuid>", "qty": 10, "motif": "optionnel" }]
}
```
`qty` > 0 ; le signe est déduit du type. Réponse 201 : `{ depot_id, count, movements[] }`.

## Transaction / atomicité
- `recordMovement(s)`, bons d’entrée/sortie : **transaction TypeORM** (`DataSource.transaction`). En cas d’erreur/exception (validation, stock insuffisant, FK), **rollback automatique** — aucune écriture partielle (mouvements + synchro agrégats article). Journal append-only.
- **Concurrence (article×dépôt)** : avant le calcul de garde, `pg_advisory_xact_lock(hashtextextended(article_id:depot_id))` sérialise les mouvements concurrents sur la même paire article×dépôt (verrou transactionnel, libéré au commit/rollback) — empêche la survente par courses parallèles. Les paires différentes restent parallèles.
- Effets externes non transactionnels (logs warn d’audit mouvement) hors garantie de rollback DB.

## Erreurs notables
- `404` dépôt/article introuvable (ou dépôt hors scope). `400` dépôt inactif. `409` stock insuffisant (sortie). `403` ADMIN sans `point_of_sale_id`.

## Fichiers
- `src/stock/*` (`mouvement-stock.entity.ts`, `dto/stock.dto.ts`, `stock.service.ts`, `stock.controller.ts`, `stock.module.ts`)
- Migration : `src/database/migrations/1760800000000-CreateMouvementsStock.ts`
- Intégration module : `src/app.module.ts` (`StockModule`).
