# Articles — Intégration API

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail/paginated`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`).

## Entité

Table : `articles` (scopée par point de vente, décision étape 1). Stock normalisé IDS : quantités portées en colonnes dénormalisées (`article_theoretical_stock`, `article_reserved_qty`, `article_available_qty`, `article_location`) ; la **source de vérité** sera le moteur `mouvements_stock` (étape 3) qui les alimentera.

| Attribut | Type | Contraintes | Description |
|---|---|---|---|
| `article_id` | uuid | PK, auto-généré | Identifiant |
| `point_of_sale_id` | uuid | NOT NULL, FK `point_of_sales` RESTRICT, indexé | POS (scoping) |
| `is_publish` | boolean | défaut `true` | Publié ; `false` = mise en veille |
| `article_code` | varchar | NOT NULL, **généré serveur**, unique par POS (`article_code`,`point_of_sale_id`) | Code auto : 3 premiers caractères de `article_name` (espaces supprimés, trim, majuscules) + suffixe numérique 5 chiffres auto-incrémenté par préfixe/POS. Ex. `article_name="18 PETIT BEURRE"` → `18P00001`, puis `18P00002`. Non modifiable en `PATCH` ; ne pas envoyer à la création. |
| `article_name` | varchar | NOT NULL | Désignation |
| `article_unit` | enum `article_unit_enum` | `piece` \| `bouteille` | Unité |
| `article_families_id` | int | NOT NULL, FK `article_families(article_families_id)` RESTRICT, indexé | Famille |
| `article_barcode` | varchar | nullable | Code-barres |
| `article_tva_rate` | numeric(5,2) | défaut 0 | Taux TVA % |
| `article_purchase_price_ht` / `article_purchase_price_ttc` | numeric(12,2) | défaut 0 | Prix achat HT/TTC |
| `article_margin` | numeric(12,2) | défaut 0 | Marge |
| `article_sale_price_ht` / `article_sale_price_ttc` | numeric(12,2) | défaut 0 | Prix vente HT/TTC |
| `article_theoretical_stock` | numeric(12,3) | défaut 0 | Stock théorique (dénormalisé) |
| `article_reserved_qty` | numeric(12,3) | défaut 0 | Qté réservée |
| `article_available_qty` | numeric(12,3) | défaut 0 | Qté disponible |
| `article_location` | varchar | nullable | Emplacement |
| `created_by` | uuid | nullable, FK `users(user_id)` SET NULL | Créateur |
| `created_at` / `updated_at` | timestamp | auto | Horodatage |

## Scoping & rôles

- `ADMIN` : limité à son `point_of_sale_id` (forcé à la création ; accès filtré). Sans PO → `403`. `404` hors scope.
- `SUPERADMIN` : global ; `point_of_sale_id` **requis** à la création, réaffectable en `PATCH`. `created_by` = utilisateur courant.

## Endpoints

| Méthode | Path | Rôles |
|---|---|---|
| `POST` | `/api/v1/articles` | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/articles` (paginé, `search` code/nom/barcode/référence, filtres `article_families_id`, `is_publish`) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/articles/select` (publiés : `article_id, article_code, article_name, point_of_sale_id, is_publish, article_unit`) | `ADMIN`, `SUPERADMIN` |
| `GET/PATCH/DELETE` | `/api/v1/articles/:id` (UUID) | `ADMIN`, `SUPERADMIN` |

## Règles / erreurs

- `article_code` **généré serveur** à la création (préfixe 3 caractères du `article_name` sans espaces, MAJ, + suffixe `00001`… auto-incrémenté par préfixe/POS). Ne pas fournir `article_code` (ignoré/immuté en `PATCH`). En cas de collision concurrente très improbable, la création retente (puis `409`).
- `409` si un code unique ne peut être généré (rare). `404` si famille/POS cible introuvable. Montants en chaînes décimales (`"12.50"`).

## Fichiers

- `src/articles/*` (`article.entity.ts`, `dto/articles.dto.ts`, `articles.service.ts`, `articles.controller.ts`, `articles.module.ts`)
- Migration : `src/database/migrations/1760700000000-CreateArticles.ts`
## Transaction / atomicité
- Traitements d’écriture (create/update/delete, et flows multi-étapes DB) exécutés dans une transaction TypeORM (DataSource.transaction/QueryRunner ou manager transactionnel). En cas d’erreur/exception, rollback automatique et aucune écriture partielle n’est persistée. Les effets externes non transactionnels (cache Redis, envoi mail, logs) ne sont pas couverts par la transaction DB.
