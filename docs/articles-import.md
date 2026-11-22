# Import général — Intégration API (IDS API)

Base URL : `/api/v1` (préfixe global). Réponses enveloppe IDS (`ok/fail`, `signature: "IDS"`). Auth : Bearer JWT (`JwtAuthGuard` + `RolesGuard`). Tag Swagger : `Import général`. Contrôleur : `ImportController`, préfixe `/import`.

## Endpoint

| Méthode | Path | Description | Rôles |
|---|---|---|---|
| `POST` | `/import/:entity` | Import de données depuis un fichier Excel (`.xls` / `.xlsx`) | `ADMIN`, `SUPERADMIN` |

## Path param

| Param | Valeurs autorisées | Description |
|---|---|---|
| `entity` | `articles`, `suppliers`, `article-families`, `clients`, `depots` | Type d'entité à importer |

## Query param

| Param | Type | Requis | Description |
|---|---|---|---|
| `point_of_sale_id` | uuid | non | Point de vente (requis pour SUPERADMIN sur `articles`, `suppliers`, `clients`, `depots` ; ignoré pour ADMIN et `article-families`) |

## Corps (multipart/form-data)

| Champ | Type | Description |
|---|---|---|
| `file` | file (`.xls` / `.xlsx`) | Fichier Excel à importer (ligne 1 = en-têtes) |

## Scoping point de vente

- **`ADMIN`** : forcé à son propre `point_of_sale_id` (du JWT). Le champ `point_of_sale_id` du fichier/query est ignoré.
- **`SUPERADMIN`** : doit fournir `point_of_sale_id` (query) pour `articles`, `suppliers`, `clients`, `depots`. Ignoré pour `article-families` (référentiel global).

## Colonnes attendues par entité (norme du canevas)

> **Règle d'en-têtes — attention, elle diffère selon l'entité :**
> - **`articles`** : en-têtes **tolérants** — alias FR ou EN, insensibles aux accents/espaces/casse (« Nom » = `article_name`, « Unité » = `article_unit`). Colonnes requises absentes → **`400`** dont le message liste les en-têtes trouvés.
> - **`suppliers`** et **`article-families`** : en-têtes **stricts** — seuls les noms anglais snake_case exacts (minuscules, espaces/underscores significatifs) sont reconnus. « Nom fournisseur » **n'est pas** accepté. Colonne requise absente → **`200`** avec erreur **par ligne** (`Champ requis manquant : <colonne>`), pas de `400`.
>
> Une colonne absente du canevas équivaut à `null` (optionnel) ou à une erreur ligne (requis).

### `articles`

Délégation vers `POST /articles/import` (même corps, mêmes règles). En-têtes **tolérants FR/EN**.

| Colonne | Requis | Valeur / règle |
|---|---|---|
| `article_name` | **oui** | texte — alias FR : `Nom`, `Nom article`, `Désignation`, `Libellé`, `Intitulé`, `Produit` |
| `article_unit` | **oui** | `piece` \| `bouteille` — alias FR : `Unité`, `Unité de mesure`, `Conditionnement` ; accents/casse tolérés (`Pièce` ✔) |
| `article_families_id` | **oui** | entier ≥ 1, doit exister dans `article-families` — alias FR : `Famille`, `ID famille`, `Code famille`, `Catégorie` |
| `article_barcode` | non | texte — alias `Code barres` |
| `article_tva_rate` | non | décimal (ex. `18.00`) — alias `TVA`, `Taux TVA` |
| `article_purchase_price_ht` | non | décimal — alias `Prix achat HT` |
| `article_purchase_price_ttc` | non | décimal — alias `Prix achat TTC` |
| `article_margin` | non | décimal — alias `Marge` |
| `article_sale_price_ht` | non | décimal — alias `Prix vente HT` |
| `article_sale_price_ttc` | non | décimal — alias `Prix vente TTC` |
| `article_theoretical_stock` | non | décimal — alias `Stock`, `Stock théorique`, `Stock initial` |
| `article_reserved_qty` | non | décimal — alias `Stock réservé` |
| `article_available_qty` | non | décimal — alias `Stock disponible` |
| `article_location` | non | texte — alias `Emplacement`, `Rayon` |
| `is_publish` | non | `true` \| `1` \| `oui` \| `yes` \| `vrai` (défaut `true`) — alias `Publié`, `Actif` |
| ~~`article_code`~~ | — | **généré serveur** (préfixe 3 lettres du nom + `00001`… par PO) — **ne pas envoyer** |

Colonne requise absente → `400` avec message : `Colonnes requises manquantes : …. En-têtes trouvés dans le fichier : …`.

### `suppliers`

En-têtes **stricts** (snake_case exact). Chaque ligne est créée dans la transaction globale.

| Colonne | Requis | Valeur / règle |
|---|---|---|
| `suppliers_name` | **oui** | texte |
| `suppliers_civility` | **oui** | **exactement** `Mr` \| `Mme` \| `Mdlle` — **casse sensible** (`MR` ✗ → erreur enum) |
| `suppliers_contact_name` | non | texte |
| `suppliers_address` | non | texte |
| `suppliers_telephone` | non | texte (ex. `+2250700000000`) |
| `suppliers_email` | non | format e-mail valide |
| ~~`supplier_number`~~ | — | **généré serveur** (unique) — **ne pas envoyer** |

`point_of_sale_id` : requis en query pour `SUPERADMIN` ; forcé au PO de l'`ADMIN`.

### `article-families`

En-têtes **stricts**. Référentiel **global** : aucun `point_of_sale_id` (ignoré même si fourni).

| Colonne | Requis | Valeur / règle |
|---|---|---|
| `article_families_name` | **oui** | texte (ex. `Boissons`) |

### `clients`
| Colonne | Requis | Description |
|---|---|---|
| `client_name` | oui | Nom du client |
| `client_telephone` | non | Téléphone |
| `client_matricule` | non | Matricule |
| `client_corps` | non | Corps |
| `client_grade` | non | Grade |

### `depots`
| Colonne | Requis | Description |
|---|---|---|
| `depot_name` | oui | Nom du dépôt |
| `depot_address` | non | Adresse |
| `depot_description` | non | Description |
| `is_active` | non | `true`/`false` (défaut `true`) |

## Canevas prêts à l'emploi (ligne 1 = en-têtes)

Copiez la ligne d'en-têtes en **ligne 1** de votre feuille, données à partir de la ligne 2.

### `article-families` — `POST /import/article-families`

```
article_families_name
Boissons
Snacks
Produits d'entretien
```

### `suppliers` — `POST /import/suppliers?point_of_sale_id=<uuid>`

```
suppliers_name	suppliers_civility	suppliers_contact_name	suppliers_address	suppliers_telephone	suppliers_email
ACME Distribution	Mr	Jean Martin	12 Rue des Fleurs, Abidjan	+2250700000001	contact@acme.example
SARL Tropico	Mme	Sophie Dubois	Cocody II D 120	+2250700000002	sophie@tropico.example
Ets Kader	Mdlle	Aminata Kader	Treichville Rue 12	+2250700000003	kader@etskader.example
```

> `suppliers_civility` est **casse sensible** : exactement `Mr`, `Mme` ou `Mdlle`.

### `articles` — `POST /import/articles` (ou `/POST /import/articles`)

En-têtes **français acceptés** (l'équivalent anglais snake_case fonctionne aussi) :

```
Nom	Unité	Famille	Code barres	TVA	Prix achat HT	Prix vente HT	Stock	Emplacement
18 PETIT BEURRE	Pièce	1	1234567890123	18.00	100.00	120.00	50	A1-R2
EAU MINERALE 1L	Bouteille	2		18.00	500.00	750.00	120	B1-R1
```

- `Famille` = `article_families_id` (entier, doit exister préalablement).
- `Unité` = `piece` ou `bouteille` (accents/casse tolérés).
- `article_code` n'apparaît pas : **généré serveur**.

## Exemples

### Import de fournisseurs (SUPERADMIN)

```bash
curl -X 'POST' \
  'http://localhost:5000/api/v1/import/suppliers?point_of_sale_id=<uuid-pos>' \
  -H 'Authorization: Bearer <access_token>' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@fournisseurs.xlsx;type=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
```

Fichier `fournisseurs.xlsx` (ligne 1 = en-têtes) :

\| suppliers_name | suppliers_civility | suppliers_contact_name | suppliers_email |
\|---|---|---|---|
\| ACME Distribution | Mr | Jean Martin | contact@acme.example |
\| SARL Tropico | Mme | Sophie Dubois | sophie@tropico.example |

Réponse `200` :

```json
{
  "data": { "imported": 2, "errors": [], "entity": "suppliers" },
  "message": "Import terminé",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

### Avec erreurs ligne par ligne

```json
{
  "data": { "imported": 1, "errors": [ { "row": 3, "field": "suppliers_name", "message": "Champ requis manquant : suppliers_name" } ], "entity": "suppliers" },
  "message": "Import terminé avec 1 erreur(s)",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

L'import se poursuit malgré les erreurs : les lignes valides sont créées, les lignes en erreur sont listées.

## Erreurs notables

- `400` : fichier manquant, format non supporté, fichier illisible, colonnes requises manquantes, `point_of_sale_id` requis (SUPERADMIN), entité non supportée.
- `401` : non authentifié.
- `403` : rôle requis (`ADMIN` ou `SUPERADMIN`) ou ADMIN sans `point_of_sale_id` associé.

## Transaction / atomicité

- `articles` : délégue à `ArticlesService.importArticles` (une transaction globale, rollback auto en cas d'erreur).
- Autres entités : chaque ligne est créée dans une transaction globale (`DataSource.transaction`). Si une ligne échoue, elle est consignée en erreur sans bloquer les suivantes. Le commit persiste toutes les lignes validées jusqu'à l'erreur.

## RGPD / confidentialité

Aucun contenu de fichier n'est journalisé ni audité (noms de fichiers, contenus cellulaires exclus des logs).

## Fichiers

- `src/import/import.controller.ts` — contrôleur, endpoint `POST /import/:entity`, décorateurs Swagger.
- `src/import/import.service.ts` — service d'import générique (lecture Excel `.xls`/`.xlsx`, dispatch par entité, scoping POS).
- `src/import/import.dto.ts` — DTOs de réponse (`ImportResponse`, `ImportError`) et de requête (`ImportEntityDto`).
- `src/import/import.module.ts` — module, câblé dans `src/app.module.ts`.

## Swagger (contrat complet à jour)

```
http://localhost:5000/docs
```