# Familles d'articles — Intégration API

Base URL : `/api/v1` (préfixe global). Réponses au format enveloppe standard (`ok/fail/paginated`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`).

## Entité

Table : `article_families`

| Attribut | Type | Contraintes | Description |
|---|---|---|---|
| `id` | integer | PK, **auto-généré** (SERIAL / increment) | Identifiant |
| `name` | varchar | NOT NULL | Nom de la famille d'article |

> Module de référence (non scopé par point de vente) : accessible aux rôles `ADMIN` et `SUPERADMIN`.

## Endpoints

| Méthode | Path | Description | Rôles |
|---|---|---|---|
| `POST` | `/api/v1/article-families` | Créer une famille | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/article-families` | Lister (paginé, recherche `name`) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/article-families/select` | Liste légère `{ id, name }` (tri nom ASC) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/article-families/:id` | Détail (`id` entier) | `ADMIN`, `SUPERADMIN` |
| `PATCH` | `/api/v1/article-families/:id` | Mettre à jour | `ADMIN`, `SUPERADMIN` |
| `DELETE` | `/api/v1/article-families/:id` | Supprimer | `ADMIN`, `SUPERADMIN` |

## Corps / paramètres

- `POST` / `PATCH` : `{ "name": "Boissons" }` (`name` string requis à la création).
- `GET /article-families` query : `page` (1), `limit` (20, max 100), `search` (ILIKE sur `name`), `sort_by` (`id`|`name`, défaut `id`), `sort_order` (`ASC`|`DESC`, défaut `ASC`).
- `GET /article-families/select` : `data` = `[{ "id": 1, "name": "Boissons" }]`.

## Sécurité / audit (ISO 27001 / RGPD)

- Accès restreint `ADMIN`/`SUPERADMIN` (JWT). Pas de donnée personnelle sensible ; `name` = donnée métier.
- Mutations tracées par l’`AuditInterceptor` global (méthode/chemin/statut/durée/utilisateur/IP, **sans corps**).

## Fichiers

- Entité : `src/article-families/article-family.entity.ts`
- DTO : `src/article-families/dto/article-families.dto.ts`
- Service : `src/article-families/article-families.service.ts`
- Contrôleur : `src/article-families/article-families.controller.ts`
- Module : `src/article-families/article-families.module.ts` (enregistré dans `src/app.module.ts`)
- Migration : `src/database/migrations/1760000000000-CreateArticleFamilies.ts`
