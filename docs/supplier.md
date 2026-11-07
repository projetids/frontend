# Guide d'intégration Frontend — Fournisseurs (IDS API)

> Module **Gestion de Fournisseurs** (`suppliers`). Attributs JSON/DB en **anglais, snake_case**. Textes Swagger/exemples en français.

## 1. Base

- URL : `http://localhost:5000/api/v1`
- Préfixe module : `/suppliers` (route complète : `/api/v1/suppliers`)
- Auth : `Authorization: Bearer <access_token>` (toutes les routes)
- Rôles : `admin`, `superadmin` (voir §4). `cashier` → `403 FORBIDDEN`.
- Réponses : enveloppe IDS `{ data, message, status, error, meta?, signature: "IDS" }` (cf. `docs/auth/integration.md`).
- Swagger : `GET /docs` (tag `Fournisseurs`).

## 2. Modèle de données (`suppliers`)

| Attribut | Type | Requis | Contraintes / notes |
|---|---|---:|---|
| `supplier_id` | uuid | — | PK, généré |
| `supplier_number` | string | — | **généré par le backend**, unique, norme `SUP-<12 hex MAJ>` (ex. `SUP-A1B2C3D4E5F6`) |
| `suppliers_name` | string | oui | nom du fournisseur |
| `suppliers_civility` | enum | oui | `Mr` \| `Mme` \| `Mdlle` (valeurs exactes) |
| `suppliers_contact_name` | string \| null | non | nom du contact |
| `suppliers_address` | string (text) \| null | non | adresse |
| `suppliers_telephone` | string \| null | non | téléphone |
| `suppliers_email` | string \| null | non | e-mail valide si fourni |
| `point_of_sale_id` | uuid \| null | non | scoping (§4) |
| `created_at` | datetime | — | auto |
| `updated_at` | datetime | — | auto |

## 3. Endpoints

### 3.1 POST `/suppliers` — Créer

Body `CreateSupplierDto` (**ne pas envoyer `supplier_number`**, généré côté backend) :

```json
{
  "suppliers_name": "ACME Distribution",
  "suppliers_civility": "Mr",
  "suppliers_contact_name": "Jean Martin",
  "suppliers_address": "12 Rue des Fleurs, Abidjan",
  "suppliers_telephone": "+2250700000000",
  "suppliers_email": "contact@acme.example",
  "point_of_sale_id": "c0a8012e-1234-5678-9abc-def012345678"
}
```

Réponse `201` :

```json
{
  "data": {
    "supplier_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "supplier_number": "SUP-A1B2C3D4E5F6",
    "suppliers_name": "ACME Distribution",
    "suppliers_civility": "Mr",
    "suppliers_contact_name": "Jean Martin",
    "suppliers_address": "12 Rue des Fleurs, Abidjan",
    "suppliers_telephone": "+2250700000000",
    "suppliers_email": "contact@acme.example",
    "point_of_sale_id": "c0a8012e-1234-5678-9abc-def012345678",
    "created_at": "2026-11-06T23:00:00.000Z",
    "updated_at": "2026-11-06T23:00:00.000Z"
  },
  "message": "Fournisseur créé",
  "status": 201,
  "error": null,
  "signature": "IDS"
}
```

Erreurs :
- `400 BAD_REQUEST` — validation (ex. `suppliers_civility` hors enum, `suppliers_email` invalide, `point_of_sale_id` non-uuid).
- `409 CONFLICT` — échec exceptionnel de génération d’un `supplier_number` unique (réessayer).
- `401 UNAUTHORIZED` / `403 FORBIDDEN`.

> `point_of_sale_id` dans le body est **ignoré pour un admin** (forcé à son PO, §4). Un `superadmin` peut le fournir ou laisser `null`.

### 3.2 GET `/suppliers` — Lister (paginé)

Query `ListSuppliersDto` :

| Param | Type | Défaut | Notes |
|---|---|---:|---|
| `page` | int ≥ 1 | `1` | |
| `limit` | int 1–100 | `20` | |
| `search` | string | — | ILIKE sur `supplier_number`, `suppliers_name`, `suppliers_contact_name`, `suppliers_email`, `suppliers_telephone` |
| `sort_by` | enum | `created_at` | `supplier_number` \| `suppliers_name` \| `suppliers_contact_name` \| `suppliers_email` \| `created_at` |
| `sort_order` | enum | `DESC` | `ASC` \| `DESC` |

Exemple : `GET /api/v1/suppliers?page=1&limit=20&search=ACME&sort_by=suppliers_name&sort_order=ASC`

Réponse `200` :

```json
{
  "data": [ { "supplier_id": "...", "supplier_number": "SUP-A1B2C3D4E5F6", "suppliers_name": "ACME Distribution", "...": "..." } ],
  "message": "Liste des fournisseurs",
  "status": 200,
  "meta": { "page": 1, "limit": 20, "total": 1 },
  "error": null,
  "signature": "IDS"
}
```

### 3.3 GET `/suppliers/:id` — Détail

`:id` = `supplier_id` (uuid). Réponse `200` : `data` = fournisseur, `message` = `Fournisseur récupéré`.  
`404 NOT_FOUND` si introuvable **ou hors scope PO** de l’admin.

### 3.4 PATCH `/suppliers/:id` — Mettre à jour

Body `UpdateSupplierDto` (champs métier optionnels ; `supplier_number` **non modifiable**) :

```json
{
  "suppliers_name": "ACME Distribution CI",
  "suppliers_telephone": "+2250700001111",
  "suppliers_civility": "Mme"
}
```

Réponse `200` : fournisseur mis à jour, `message` = `Fournisseur mis à jour`.  
Erreurs : `404` (introuvable/hors scope), `400` (validation).

### 3.5 DELETE `/suppliers/:id` — Supprimer

Réponse `200` :

```json
{ "data": { "supplier_id": "3fa85f64-..." }, "message": "Fournisseur supprimé", "status": 200, "error": null, "signature": "IDS" }
```

`404` si introuvable/hors scope.

## 4. Scoping & permissions

- `admin` : accès limité à son `point_of_sale_id` (JWT/profil). Création force `point_of_sale_id` = PO de l’admin ; list/detail/update/delete filtrés par ce PO.
- `superadmin` : non scopé (voit/modifie tous les PO) ; peut définir `point_of_sale_id` à la création.
- `cashier` : aucun accès (`403`).

> Si un admin reçoit des `404` inattendus, vérifier que le fournisseur appartient à son point de vente.

## 5. Règles métier / validation

- `supplier_number` : généré par le backend (norme `SUP-<12 hex MAJ>`), unique (contrainte DB `UQ_suppliers_supplier_number`). Non fourni en création, non modifiable.
- `suppliers_civility` : valeurs exactes `Mr`, `Mme`, `Mdlle`.
- `suppliers_email` : format e-mail si présent.
- Champs optionnels acceptent l’omission ; envoyer `null` pour `point_of_sale_id` (superadmin) si non rattaché.
- Recherche `search` insensible à la casse (ILIKE, `%term%`).

## 6. Migration

`src/database/migrations/1750000000000-CreateSuppliers.ts` — crée l’enum `suppliers_civility_enum`, la table `suppliers` (unique `supplier_number`, index `point_of_sale_id`). Appliquer : `npm run migration:run`.

## 7. Exemples front (fetch)

```ts
const BASE = 'http://localhost:5000/api/v1';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` };

// list
const list = await fetch(`${BASE}/suppliers?page=1&limit=20&search=ACME`, { headers }).then(r => r.json());

// create (supplier_number généré par le backend)
const created = await fetch(`${BASE}/suppliers`, {
  method: 'POST', headers,
  body: JSON.stringify({ suppliers_name: 'ACME Distribution', suppliers_civility: 'Mr' }),
}).then(r => r.json());

// update
await fetch(`${BASE}/suppliers/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ suppliers_telephone: '+2250700001111' }) });
```

Vérifier `res.status` / `res.error?.code` (`CONFLICT`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`).
