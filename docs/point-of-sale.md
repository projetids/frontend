# Point de vente — Intégration API

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail/paginated`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`).

## Rôle métier

Point de vente (POS) = **lieu commercial/caisse** distinct du dépôt (lieu de stockage logistique). Un POS peut rattacher plusieurs dépôts, articles, clients, fournisseurs et utilisateurs. C'est le périmètre de scoping des comptes `ADMIN` (un ADMIN est rattaché à un seul POS via `point_of_sale_id`).

## Entité

Table : `point_of_sales`

| Attribut | Type | Contraintes | Description |
|---|---|---|---|
| `id` | uuid | PK, auto-généré | Identifiant |
| `point_of_sale_code` | varchar(50) | NOT NULL, **unique**, généré backend (`POS-<12 hex MAJ>`) ou fourni | Code POS |
| `name` | varchar(255) | NOT NULL | Nom du point de vente |
| `address` | text | nullable | Adresse |
| `description` | text | nullable | Description |
| `created_at` | timestamp | auto | Horodatage création |

## Scoping & rôles

- `ADMIN` : accès limité à **son propre** point de vente (`id = point_of_sale_id` du JWT). List/detail/update/delete/select filtrés sur son POS ; sans `point_of_sale_id` sur le compte → `403`. Ne peut **pas** créer de POS (opération réservée à SUPERADMIN).
- `SUPERADMIN` : non scopé (voit/modifie tous les POS). Création autorisée ; `point_of_sale_code` optionnel (généré si omis), unicité vérifiée.
- Mutations tracées par `AuditInterceptor` global (sans corps/secrets).

## Endpoints

| Méthode | Path | Description | Rôles |
|---|---|---|---|
| `POST` | `/api/v1/point-of-sales` | Créer un point de vente (code auto si omis) | `SUPERADMIN` |
| `GET` | `/api/v1/point-of-sales` | Lister (paginé, recherche, scopé POS ADMIN) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/point-of-sales/select` | Liste légère `{ id, point_of_sale_code, name, address, description, created_at }` (tri nom) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/point-of-sales/:id` | Détail (`:id` = uuid) | `ADMIN`, `SUPERADMIN` |
| `PATCH` | `/api/v1/point-of-sales/:id` | Mettre à jour (partiel) | `ADMIN`, `SUPERADMIN` |
| `DELETE` | `/api/v1/point-of-sales/:id` | Supprimer (FK RESTRICT si référencé) | `ADMIN`, `SUPERADMIN` |
| `POST` | `/api/v1/point-of-sales/import` | Importer depuis Excel (multipart) | `SUPERADMIN` |
| `GET` | `/api/v1/point-of-sales/export` | Exporter vers Excel (.xlsx) | `ADMIN`, `SUPERADMIN` |

## Corps / paramètres

- `POST` : `{ "point_of_sale_name": "Boutique Centre-Ville", "point_of_sale_code"?: "POS-CENTRE01", "address"?: "...", "description"?: "..." }`. `point_of_sale_name` requis. `point_of_sale_code` généré automatiquement si omis.
- `PATCH` : champs partiels ci-dessus.
- `GET /point-of-sales` query : `page` (1), `limit` (20, max 100), `search` (ILIKE sur `point_of_sale_code`, `name`, `address`, `description`), `sort_by` (`point_of_sale_code`|`name`|`address`|`created_at`, défaut `created_at`), `sort_order` (`ASC`|`DESC`, défaut `DESC`).

## Import depuis Excel (POST /point-of-sales/import)

**Canevas d'import** (ligne 1 = en-têtes, colonnes attendues) :

| Colonne | Requis | Description |
|---|---|---|
| `point_of_sale_name` | Oui | Nom du point de vente |
| `point_of_sale_code` | Non | Code unique (généré automatiquement si omis) |
| `address` | Non | Adresse |
| `description` | Non | Description |

- Fichier `.xls` / `.xlsx` (champ `file`, `multipart/form-data`).
- Création de chaque point de vente en **une seule transaction** (`DataSource.transaction`, rollback auto) avec génération automatique de code si absent et vérification d'unicité.
- L'import se poursuit malgré les erreurs ligne par ligne ; réponse récapitulative `{ imported, errors }`.
- Aucun contenu de fichier n'est journalisé ni audité (RGPD/ISO27001).

## Export vers Excel (GET /point-of-sales/export)

**Canevas d'export** (colonnes du fichier `.xlsx`) :

| Colonne | Description |
|---|---|
| `point_of_sale_id` | Identifiant uuid |
| `point_of_sale_code` | Code du point de vente |
| `name` | Nom |
| `address` | Adresse |
| `description` | Description |
| `created_at` | Date de création (ISO) |

- Scope appliqué : ADMIN exporte uniquement son propre POS ; SUPERADMIN exporte tous les POS.
- Fichier téléchargé (`Content-Disposition: attachment; filename="points-de-vente.xlsx"`).
- Le fichier généré peut être réimporté via l'endpoint d'import (la colonne `point_of_sale_code` est conservée).

## Erreurs notables

- `400` validation / format fichier non supporté / colonne manquante (import).
- `403` ADMIN sans point de vente associé.
- `404` point de vente introuvable **ou hors scope POS** (pas de fuite cross-POS).
- `409` code point de vente déjà utilisé (create/update/import ligne).

## Sécurité (ISO 27001 / RGPD)

- Accès restreint, scoping POS, validation stricte DTO. `point_of_sale_code` généré backend (non obligatoire client). Journalisation mutations sans corps/secrets.
- Suppression refusée si le POS est référencé par des utilisateurs, dépôts, articles, clients, fournisseurs (FK RESTRICT).

## Fichiers

- Entité : `src/users/point-of-sale.entity.ts`
- Service : `src/users/point-of-sale.service.ts`
- DTO : `src/point-of-sale/dto/point-of-sale.dto.ts`
- Contrôleur : `src/point-of-sale/point-of-sale.controller.ts`
- Module : `src/point-of-sale/point-of-sale.module.ts` (enregistré `src/app.module.ts`, importe `UsersModule`)
- Swagger tag : `Point de vente`

## Transaction / atomicité

- Traitements d'écriture (create/update/delete, import) exécutés dans une transaction TypeORM (`DataSource.transaction`, rollback auto sur erreur). En cas d'erreur, aucun écrit partiel n'est persiste. Les effets externes non transactionnels (cache Redis, envoi mail, logs) ne sont pas couverts par la transaction DB.
