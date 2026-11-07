# Guide d'intégration Frontend — Permissions utilisateur POS (catalogue dynamique) (IDS API)

> Module `user-permissions`. Flags POS/caisse **par utilisateur** (EAV) + **catalogue de permissions CRUD** (DB, dynamique). Attributs JSON/DB en **anglais, snake_case**. Enveloppe IDS `{ data, message, status, error, meta?, signature: "IDS" }`.

## 1. Base

- URL : `http://localhost:5000/api/v1`
- Auth : `Authorization: Bearer <access_token>`
- Swagger : `GET /docs` (tag `Permissions utilisateur (POS)`).

## 2. Modèle

- `permission_catalog` (dynamique, CRUD) : `code` (PK varchar, ex. `A01`, `A61`), `label_fr`, `reserved` (bool), `default_enabled` (bool), `is_active` (bool), `created_at`, `updated_at`.
- `user_permission_flags` (EAV) : `user_id` (uuid, FK `users.user_id` ON DELETE CASCADE) + `code` + `enabled` (bool). PK/unique `(user_id,code)`. Suppression d’une permission catalogue → suppression de ses flags (cohérence).
- Baseline seed : **A01–A60**. NC (grille) réservés/éditables, défaut `false`, label `NC` : `A20,A26,A27,A28,A29,A30,A31,A32,A34,A35,A36,A37,A38,A39,A40,A41,A43,A44,A45,A46,A47,A48,A49,A51,A52,A53,A54,A55,A56,A57,A58,A59,A60`. Config baseline : `src/config/user-permissions.config.ts`.

## 3. Endpoints

| Méthode | Path | Rôles | Description |
|---|---|---|---|
| `GET` | `/permissions/catalog` | `SUPERADMIN, ADMIN, CASHIER` | Lister le catalogue (dynamique) |
| `POST` | `/permissions/catalog` | `SUPERADMIN` | Créer une permission (+ flags défaut pour tous les users) |
| `PATCH` | `/permissions/catalog/:code` | `SUPERADMIN` | Modifier une permission (libellé, reserved, default_enabled, is_active) |
| `DELETE` | `/permissions/catalog/:code` | `SUPERADMIN` | Supprimer une permission (+ flags utilisateurs associés) |
| `GET` | `/auth/profile/permissions` | authentifié | Flags effectifs de l’utilisateur connecté |
| `GET` | `/users/:id/permissions` | `SUPERADMIN, ADMIN` | Flags effectifs d’un utilisateur cible |
| `PUT` | `/users/:id/permissions` | `SUPERADMIN, ADMIN` | Merge partiel des flags (retourne flags effectifs complets) |

### 3.1 GET `/permissions/catalog` — `200`
```json
{ "data": [{ "code":"A01","label_fr":"Impression du ticket commande","reserved":false,"default_enabled":false,"is_active":true,"created_at":"...","updated_at":"..." }], "message":"Catalogue des permissions", "status":200, "error":null, "signature":"IDS" }
```

### 3.2 POST `/permissions/catalog` — `201` (SUPERADMIN)
```json
{ "code": "A61", "label_fr": "Autoriser remise exceptionnelle", "reserved": false, "default_enabled": false }
```
→ crée l’entrée et **matérialise** un flag `default_enabled` pour tous les utilisateurs existants (idempotent). `409 CONFLICT` si code existe, `400` si code invalide.

### 3.3 PATCH `/permissions/catalog/:code` — `200` (SUPERADMIN)
Body partiel : `{"label_fr":"...", "reserved":false, "default_enabled":false, "is_active":true}`.

### 3.4 DELETE `/permissions/catalog/:code` — `200` (SUPERADMIN)
Supprime l’entrée catalogue **et** les `user_permission_flags` du code. `404` si absent.

### 3.5 GET `/auth/profile/permissions` — `200`
```json
{ "data": { "user_id": "<uuid>", "flags": { "A01": false, "A61": true, "...": false } }, "message":"Permissions récupérées", "status":200, "error":null, "signature":"IDS" }
```
> `flags` contient **tous les codes du catalogue** (déterministe ; manquant = `default_enabled`/`false`). `ensureInitialized` matérialise à la volée.

### 3.6 GET `/users/:id/permissions` / PUT `/users/:id/permissions`
GET = flags effectifs complets de la cible. PUT merge partiel strict :
```json
{ "flags": { "A04": true, "A61": false } }
```
Codes inconnus (hors catalogue) ou valeurs non booléennes → `400`. Réponse `200` = flags effectifs complets.

## 4. Rôles & scoping

- `SUPERADMIN` : CRUD catalogue global ; lecture/écriture flags sur tout utilisateur ; bypass `PermissionGuard` (enforcement futur). `404` cible absente.
- `ADMIN` : lecture catalogue + gestion flags limitée à son `point_of_sale_id` (cible même PO, sinon `403` sans fuite cross-POS).
- `CASHIER` : lecture catalogue + ses propres flags via `/auth/profile/permissions`.

## 5. Migrations / init

- `1760100000000-CreateUserPermissionFlags` : table flags + backfill A01–A60. `1760200000000-AddUserCreatedBy` : `users.created_by`.
- `1760300000000-CreatePermissionCatalog` : table `permission_catalog`, seed baseline A01–A60 (NC), matérialisation flags pour tous les users.
- `UsersService.register` + seed : init flags sur le catalogue actif (idempotent).

## 6. Enforcement (prêt, **non appliqué**)

`@RequirePermission(...codes)` + `PermissionGuard` exportés (`UserPermissionsModule`), **non branchés** sur les controllers existants. À appliquer aux futurs modules POS (caisse/ventes/paiements/stock/impression). Front applique les flags en attendant.

## 7. Configuration modifiable

`src/config/user-permissions.config.ts` : baseline NC, noms de tables, pattern de code, message 403, bypass `SUPERADMIN`. Le catalogue runtime est **en base** (`permission_catalog`) via CRUD.

## 8. Sécurité & conformité (ISO 27001 / RGPD)

- **Contrôle d’accès** : JWT + rôles ; CRUD catalogue **SUPERADMIN only** ; gestion flags ADMIN scopée PO.
- **Validation stricte** : code format/longueur/unique, booléens, merge strict, `ParseUUIDPipe`.
- **Traçabilité (minimisation)** : `logger.warn` — création/MAJ/suppression catalogue (actor, code) ; merge flags (actor, target, **codes modifiés uniquement**). Aucun corps/secret/PII sensible, aucun dump complet. `AuditInterceptor` global inchangé.
- **RGPD** : minimisation (flags d’habilitation fonctionnels), pas de PII sensible ajoutée ; rétention logs selon politique.
- **NC** : `reserved` informatif/éditable (confirmé). Suppression catalogue supprime les flags associés (intégrité).
