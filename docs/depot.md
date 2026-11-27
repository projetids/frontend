# Dépôts — Intégration API

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail/paginated`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`).

## Rôle métier

Dépôt = **lieu de stockage logistique** (entrepôt/réserve), distinct du point de vente (POS, lieu commercial/caisse). Un dépôt est rattaché à **un seul POS** (`point_of_sale_id` NOT NULL) ; **N dépôts par POS**. Le stock (futur module) sera suivi **par article × dépôt**. Le bon de transfert inter-POS (prévu) est autorisé **SUPERADMIN uniquement** (option A) ; `ADMIN` limité à l’intra-POS — cf. plan `.kilo/plans/1794047957771-ids-depot-stock-flux-dev.md`.

## Entité

Table : `depots`

| Attribut | Type | Contraintes | Description |
|---|---|---|---|
| `depot_id` | uuid | PK, auto-généré | Identifiant |
| `depot_code` | varchar | NOT NULL, **unique**, généré backend (`DEP-<12 hex MAJ>`) | Code dépôt |
| `depot_name` | varchar(255) | NOT NULL | Nom |
| `depot_address` | text | nullable | Adresse |
| `depot_description` | text | nullable | Description |
| `is_active` | boolean | NOT NULL, défaut `true` | Actif |
| `point_of_sale_id` | uuid | NOT NULL, FK `point_of_sales(id)` ON DELETE RESTRICT, indexé | POS rattaché (scoping) |
| `created_at` / `updated_at` | timestamp | auto | Horodatage |

## Scoping & rôles

- `ADMIN` : accès limité à son `point_of_sale_id` (JWT). Création force le dépôt sur son PO (`point_of_sale_id` du body ignoré) ; list/detail/update/delete/select filtrés par son PO. Sans `point_of_sale_id` sur le compte → `403`.
- `SUPERADMIN` : non scopé (voit/modifie tous les PO). **Création** : `point_of_sale_id` **requis** dans le body (UUID d’un POS existant) ; sinon `400`. Peut réaffecter `point_of_sale_id` en `PATCH`.
- Mutations tracées par `AuditInterceptor` global (sans corps/secrets).

## Endpoints

| Méthode | Path | Description | Rôles |
|---|---|---|---|
| `POST` | `/api/v1/depots` | Créer un dépôt (`depot_code` généré, non fourni) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/depots` | Lister (paginé, recherche, filtre actif, scopé PO), avec `point_of_sale_name` dans chaque dépôt | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/depots/select` | Liste légère active `{ depot_id, depot_name, depot_code, point_of_sale_id, is_active }` (tri nom). Compte non superadmin sans PO → `403`. | `CASHIER` (écran de caisse), `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/depots/:id` | Détail (`:id` = `depot_id` UUID) | `ADMIN`, `SUPERADMIN` |
| `PATCH` | `/api/v1/depots/:id` | Mettre à jour | `ADMIN`, `SUPERADMIN` |
| `DELETE` | `/api/v1/depots/:id` | Supprimer | `ADMIN`, `SUPERADMIN` |

## Corps / paramètres

- `POST` : `{ "depot_name": "Réserve principale", "depot_address"?: "...", "depot_description"?: "...", "is_active"?: true, "point_of_sale_id"?: "<uuid>" }`. `point_of_sale_id` requis si SUPERADMIN, ignoré si ADMIN.
- `PATCH` : champs partiels ci-dessus ; `point_of_sale_id` modifiable par SUPERADMIN uniquement.
- `GET /depots` query : `page` (1), `limit` (20, max 100), `search` (ILIKE sur `depot_code`, `depot_name`, `depot_address`), `is_active` (bool), `sort_by` (`depot_code`|`depot_name`|`is_active`|`created_at`, défaut `created_at`), `sort_order` (`ASC`|`DESC`, défaut `DESC`).
- Chaque élément de `GET /depots` contient `point_of_sale_name`, le nom du POS associé à `point_of_sale_id`.

## Erreurs notables

- `400` validation / `point_of_sale_id` manquant (SUPERADMIN create).
- `403` ADMIN sans PO ou tentative de changer `point_of_sale_id`.
- `404` dépôt introuvable **ou hors scope PO** (pas de fuite cross-POS) ; POS cible introuvable.
- `409` échec exceptionnel génération `depot_code` unique (réessayer).

## Sécurité (ISO 27001 / RGPD)

- Accès restreint, scoping PO, pas de donnée personnelle sensible (données logistiques). Validation stricte DTO. `depot_code` généré backend (non modifiable). Journalisation mutations sans corps/secrets.

## Fichiers

- Entité : `src/depots/depot.entity.ts`
- DTO : `src/depots/dto/depots.dto.ts`
- Service : `src/depots/depots.service.ts`
- Contrôleur : `src/depots/depots.controller.ts`
- Module : `src/depots/depots.module.ts` (enregistré `src/app.module.ts`)
- Migration : `src/database/migrations/1760500000000-CreateDepots.ts`
## Transaction / atomicité
- Traitements d’écriture (create/update/delete, et flows multi-étapes DB) exécutés dans une transaction TypeORM (DataSource.transaction/QueryRunner ou manager transactionnel). En cas d’erreur/exception, rollback automatique et aucune écriture partielle n’est persistée. Les effets externes non transactionnels (cache Redis, envoi mail, logs) ne sont pas couverts par la transaction DB.
