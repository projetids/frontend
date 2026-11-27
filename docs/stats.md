# Stats / Tableau de bord — Intégration API (IDS API)

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`). Tag Swagger : `Stats / Tableau de bord`. Contrôleur : `StatsController`, préfixe `/stats`.

## Scoping & rôles

| Rôle | Accès |
|---|---|
| `SUPERADMIN` | global (tous les points de vente) ; peut filtrer par `point_of_sale_id` optionnel |
| `ADMIN` | limité à son propre `point_of_sale_id` (du JWT) — `403` si aucun PO associé |
| `CASHIER` | **aucun accès** au tableau de bord : tous les endpoints `/stats/*` → `403`. Effectif depuis le correctif `@Roles` du 2026-11-27 (avant, les `@Roles` de méthode n'étaient pas appliqués et le caissier recevait `200`). Le caissier suit ses ventes via `GET /caisses/session-courante`. |

Le paramètre `point_of_sale_id` est ignoré (ou forcé à `null` = tous) pour un `SUPERADMIN` qui ne le précise pas ; pour un `ADMIN`, il est toujours forcé à son propre PO.

## Endpoints

| Méthode | Path | Description | Rôles |
|---|---|---|---|
| `GET` | `/stats/dashboard` | KPIs du tableau de bord : ventes (CA HT/TTC, nb), stock (nb articles, valeur stock achat, stock bas), utilisateurs (total + répartition par rôle) | `SUPERADMIN`, `ADMIN` |
| `GET` | `/stats/ventes` | Statistiques des ventes par période : CA, nombre de ventes, répartition par mode de paiement, ventes récentes | `SUPERADMIN`, `ADMIN` |
| `GET` | `/stats/stock` | État du stock : nb articles, valeur stock (achat & vente HT), nb articles stock bas | `SUPERADMIN`, `ADMIN` |
| `GET` | `/stats/utilisateurs` | Répartition des utilisateurs par rôle (total + détail) | `SUPERADMIN`, `ADMIN` |

## Query params (tous les endpoints)

| Param | Type | Requis | Description |
|---|---|---|---|
| `date_from` | string (ISO 8601) | non | Date de début de période (filtre `created_at >=`) |
| `date_to` | string (ISO 8601) | non | Date de fin de période (filtre `created_at <=`) |
| `point_of_sale_id` | uuid | non | PO à filtrer (SUPERADMIN : optionnel, tous si omis ; ADMIN : forcé à son PO) |

> Si `date_to < date_from` → `400 BAD_REQUEST`. Si date invalide → `400 BAD_REQUEST`.

## Exemples

### `GET /stats/dashboard`

```http
GET /api/v1/stats/dashboard?date_from=2026-01-01T00:00:00Z&date_to=2026-01-31T23:59:59Z
Authorization: Bearer <access_token>
```

Réponse `200` :

```json
{
  "data": {
    "ventes": { "total_ht": 1250000, "total_ttc": 1500000, "nb_ventes": 45 },
    "stock": { "nb_articles": 120, "valeur_stock_achat": 620000, "stock_bas": 8 },
    "utilisateurs": { "total": 6, "par_role": [ { "role": "superadmin", "count": 1 }, { "role": "admin", "count": 2 }, { "role": "cashier", "count": 3 } ] },
    "period": { "date_from": "2026-01-01T00:00:00.000Z", "date_to": "2026-01-31T23:59:59.000Z" }
  },
  "message": "KPIs du tableau de bord",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

### `GET /stats/ventes`

```http
GET /api/v1/stats/ventes?date_from=2026-01-01T00:00:00Z&date_to=2026-01-31T23:59:59Z&point_of_sale_id=<uuid>
Authorization: Bearer <access_token>
```

Réponse `200` :

```json
{
  "data": {
    "total_ht": 1250000,
    "total_ttc": 1500000,
    "nb_ventes": 45,
    "par_moyen_paiement": [
      { "mode_paiement": "ESPECES", "total_ht": 750000, "count": 30 },
      { "mode_paiement": "MOBILE_MONEY", "total_ht": 350000, "count": 10 },
      { "mode_paiement": "CARTE", "total_ht": 150000, "count": 5 }
    ],
    "ventes_recentes": [
      { "vente_id": "<uuid>", "vente_code": "VC-20260131-001", "montant_ttc": 45000, "created_at": "2026-01-31T14:30:00.000Z" }
    ],
    "period": { "date_from": "2026-01-01T00:00:00.000Z", "date_to": "2026-01-31T23:59:59.000Z" }
  },
  "message": "Statistiques des ventes",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

### `GET /stats/stock`

```http
GET /api/v1/stats/stock?point_of_sale_id=<uuid>
Authorization: Bearer <access_token>
```

Réponse `200` :

```json
{
  "data": { "nb_articles": 120, "valeur_stock_achat": 620000, "valeur_stock_vente": 900000, "stock_bas": 8, "point_of_sale_id": "<uuid>" },
  "message": "État du stock",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

### `GET /stats/utilisateurs`

```http
GET /api/v1/stats/utilisateurs?point_of_sale_id=<uuid>
Authorization: Bearer <access_token>
```

Réponse `200` :

```json
{
  "data": { "total": 6, "par_role": [ { "role": "superadmin", "count": 1 }, { "role": "admin", "count": 2 }, { "role": "cashier", "count": 3 } ], "point_of_sale_id": "<uuid>" },
  "message": "Répartition des utilisateurs",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

## Erreurs notables

- `401` : non authentifié (token manquant/invalide/expiré).
- `403` : rôle requis (`SUPERADMIN` ou `ADMIN`) ou ADMIN sans `point_of_sale_id` associé.
- `400` : `date_from`/`date_to` invalide, ou `date_to < date_from`.

## Fichiers

- `src/stats/stats.controller.ts` — contrôleur, endpoints, décorateurs Swagger.
- `src/stats/stats.service.ts` — service d’agrégation (SQL via QueryBuilder, scoping POS).
- `src/stats/dto/stats-query.dto.ts` — DTO de requête (`date_from`, `date_to`, `point_of_sale_id`).
- `src/stats/stats.module.ts` — module, câblé dans `src/app.module.ts`.

## Transaction / atomicité

Lectures seulement (QueryBuilder agrégat), aucune écriture. Pas de transaction requise.

## Swagger (contrat complet à jour)

```
http://localhost:5000/docs
```
