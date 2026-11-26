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
| `article_unit` | enum `article_unit_enum` | `piece` \| `bouteille` \| `gramme` \| `kg` \| `boite` \| `sachet` \| `botte` \| `bocal` | Unité (migration `1761600000000-ExtendArticleUnitEnum` pour les 6 dernières) |
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
| `POST` | `/api/v1/articles/import` (Excel `.xlsx`, famille par **nom**) | `ADMIN`, `SUPERADMIN` |

## Règles / erreurs

- `article_code` **généré serveur** à la création (préfixe 3 caractères du `article_name` sans espaces, MAJ, + suffixe `00001`… auto-incrémenté par préfixe/POS). Ne pas fournir `article_code` (ignoré/immuté en `PATCH`). En cas de collision concurrente très improbable, la création retente (puis `409`).
- `409` si un code unique ne peut être généré (rare). `404` si famille/POS cible introuvable. Montants en chaînes décimales (`"12.50"`).

## Fichiers

- `src/database/migrations/1761600000000-ExtendArticleUnitEnum.ts` (unités `gramme`, `kg`, `boite`, `sachet`, `botte`, `bocal`)
- `src/articles/*` (`article.entity.ts`, `dto/articles.dto.ts`, `dto/import-articles.dto.ts`, `articles.service.ts`, `articles.controller.ts`, `articles.module.ts`)
- Migration : `src/database/migrations/1760700000000-CreateArticles.ts`
- Exemple d'import : `docs/articles/exemple-import-articles.xlsx`

## Import Excel — `POST /api/v1/articles/import`

Rôles `ADMIN`, `SUPERADMIN`. `multipart/form-data` :

| Champ | Requis | Description |
|---|---|---|
| `file` | oui | Classeur `.xlsx` (5 Mo max). Seule la **1re feuille** est lue, ligne 1 = en-têtes. |
| `point_of_sale_id` | SUPERADMIN | UUID du point de vente cible. Ignoré pour `ADMIN` (forcé à son PO ; `403` sans PO). |

**Fichier d'exemple :** [`exemple-import-articles.xlsx`](./exemple-import-articles.xlsx) (feuille `Articles` + feuille `Aide`, ignorée à l'import).

### Colonnes

En-têtes FR (libellés ci-dessous) **ou** snake_case (`article_name`, `article_families_name`…) ; casse, accents et ponctuation indifférents. Colonnes inconnues ignorées.

| En-tête | Champ | Requis | Règle |
|---|---|---|---|
| `Nom de l'article` | `article_name` | oui | 255 car. max. Nom déjà présent dans le PO (trim + espaces réduits + minuscules) → ligne ignorée (`skipped`), doublons internes au fichier aussi. |
| `Nom de famille d'article` | → `article_families_id` | oui | **Nom** de la famille, pas son id. Voir « Résolution de la famille ». Alias acceptés : `Famille`, `article_families_name`. |
| `Unité` | `article_unit` | non | `piece`\|`bouteille`\|`gramme`\|`kg`\|`boite`\|`sachet`\|`botte`\|`bocal` (accents/casse ignorés : `Pièce`, `Boîte`). Vide → `piece`. |
| `Code-barres` | `article_barcode` | non | Texte. |
| `Taux TVA` | `article_tva_rate` | non | Nombre (`20` ou `20,5`), < 1000. Vide → 0. |
| `Prix achat HT` / `Prix achat TTC` / `Marge` / `Prix vente HT` / `Prix vente TTC` | `article_purchase_price_ht` … `article_sale_price_ttc` | non | Nombre (virgule ou point), arrondi à 2 décimales. Vide → 0. |
| `Emplacement` | `article_location` | non | Texte. |
| `Publié` | `is_publish` | non | `oui`/`non` (`true`/`false`, `1`/`0`). Vide → `oui`. |

Non attendus : `article_code` (généré serveur), `article_families_id` (remplacé par le nom ; une colonne `article_families_id` sans colonne nom → `400` explicite), quantités de stock (alimentées par les bons d'entrée / mouvements de stock).

### Résolution de la famille

1. Les familles existantes sont chargées une fois et indexées par nom normalisé (trim + espaces réduits + minuscules, même règle que `POST /article-families/import`).
2. Pour chaque ligne : nom **trouvé** → son `article_families_id` est utilisé.
3. Nom **absent** → la famille est **créée** (`article_families_name` = valeur saisie) et son nouvel `article_families_id` est utilisé ; les lignes suivantes portant le même nom réutilisent cet id (pas de doublon).
4. Les familles créées sont listées dans `families_created`.

### Transaction

Une transaction pour tout le fichier + un `SAVEPOINT` par ligne : une ligne qui échoue à l'insertion est annulée seule (y compris la famille qu'elle aurait créée) et consignée dans `errors` ; les autres lignes sont conservées. Les erreurs de validation (nom vide, unité inconnue, nombre invalide…) sont détectées avant toute écriture.

### Réponse

```json
{
  "data": {
    "imported": 4,
    "skipped": 1,
    "families_created": [
      { "article_families_id": 10, "article_families_name": "EPICERIE" },
      { "article_families_id": 11, "article_families_name": "HYGIENE" }
    ],
    "errors": [{ "row": 6, "message": "Unité inconnue : \"litre\" (attendu : piece, bouteille, ...)" }],
    "entity": "articles"
  },
  "message": "Import des articles terminé avec 1 erreur(s)",
  "status": 200,
  "error": null,
  "signature": "IDS"
}
```

`row` = numéro de ligne Excel (1 = en-têtes).

### Erreurs globales (`400`)

Fichier absent (champ `file`), extension autre que `.xlsx`, classeur illisible ou vide, colonne `Nom de l'article` ou `Nom de famille d'article` absente (le message liste les en-têtes trouvés). `400 point_of_sale_id requis` / `404` PO introuvable côté SUPERADMIN.

### Sécurité / RGPD

Aucun contenu de fichier journalisé ; l'`AuditInterceptor` trace uniquement méthode/chemin/statut/utilisateur.

## Transaction / atomicité
- Traitements d’écriture (create/update/delete, et flows multi-étapes DB) exécutés dans une transaction TypeORM (DataSource.transaction/QueryRunner ou manager transactionnel). En cas d’erreur/exception, rollback automatique et aucune écriture partielle n’est persistée. Les effets externes non transactionnels (cache Redis, envoi mail, logs) ne sont pas couverts par la transaction DB.
