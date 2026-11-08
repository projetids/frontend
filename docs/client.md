# Clients — Intégration API

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail/paginated`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`).

## Entité

Table : `clients` (scopée par point de vente, décision étape 1).

| Attribut | Type | Contraintes | Description |
|---|---|---|---|
| `client_id` | uuid | PK, auto-généré | Identifiant |
| `point_of_sale_id` | uuid | NOT NULL, FK `point_of_sales(id)` RESTRICT, indexé | POS rattaché (scoping) |
| `client_name` | varchar | NOT NULL | Nom du client |
| `client_telephone` | varchar | nullable | Téléphone |
| `client_matricule` | varchar | nullable | Matricule |
| `client_corps` | varchar | nullable | Corps |
| `client_grade` | varchar | nullable | Grade |
| `created_at` / `updated_at` | timestamp | auto | Horodatage |

## Scoping & rôles

- `ADMIN` : limité à son `point_of_sale_id` (forcé à la création ; list/detail/update/delete/select filtrés). Sans PO → `403`. `404` si hors scope (pas de fuite cross-POS).
- `SUPERADMIN` : global ; `point_of_sale_id` **requis** à la création, réaffectable en `PATCH` (POS cible vérifié).

## Endpoints

| Méthode | Path | Rôles |
|---|---|---|
| `POST` | `/api/v1/clients` | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/clients` (paginé, `search` sur nom/téléphone/matricule/corps/grade) | `ADMIN`, `SUPERADMIN` |
| `GET` | `/api/v1/clients/select` (`client_id, client_name, client_telephone, point_of_sale_id`) | `ADMIN`, `SUPERADMIN` |
| `GET/PATCH/DELETE` | `/api/v1/clients/:id` (UUID) | `ADMIN`, `SUPERADMIN` |

## Fichiers

- `src/clients/*` (`client.entity.ts`, `dto/clients.dto.ts`, `clients.service.ts`, `clients.controller.ts`, `clients.module.ts`)
- Migration : `src/database/migrations/1760600000000-CreateClients.ts`
