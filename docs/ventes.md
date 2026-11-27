# Ventes / Caisse — Intégration API (Étape 6)

Base `/api/v1`, enveloppe IDS `{ success, statusCode, code, message, timestamp, data }`. Auth Bearer JWT + `RolesGuard` + **`PermissionGuard`/`@RequirePermission`** (SUPERADMIN bypass). Tag Swagger : `Ventes`. Rôles base : `ADMIN|SUPERADMIN`.

## Flux réel (conforme plan)
- **BC vente** (`BCV`, `VALIDEE`) : engagement, **0 impact stock**. Permission `A40`.
- **BL** (livraison) : **SORTIE stock** dépôt source → mouvements append-only `SORTIE` (ref `VENTE_BL`) via `StockService.recordMovement` (**garde stock insuffisant `409` + verrou `pg_advisory_xact_lock`**, synchro). MAJ `qty_delivered`/statut BC. Livraison partielle : `commande_ligne_id` optionnel — absent, la ligne est rattachée à la ligne du BC portant le **même article** (`commande_ligne_id` inconnu → `404`, autre article → `400`) ; PU HT absent → PU HT de la ligne BC. Permissions `A40`,`A31`.
- **Statuts BC vente** (migration `1762100000000-VentesStatutLivraisonPartielle`) : `BROUILLON|VALIDEE|PARTIELLEMENT_LIVREE|LIVREE|FACTUREE|CLOTUREE|ANNULEE`. `PARTIELLEMENT_LIVREE` = au moins une ligne avec qté livrée < qté commandée ; `LIVREE` = tout livré ; `FACTUREE` = tout livré et tous les BL facturés. ⚠️ Correctif 2026-11-28 : une livraison partielle mettait la commande en `FACTUREE` ; les commandes concernées ont été converties en `PARTIELLEMENT_LIVREE`.
- **Vente au comptant** (validée) : encaissement + **SORTIE stock** à validation (**BL implicite**) → mouvements `SORTIE` (ref `VENTE_COMPTANT`). Montants HT/TTC/encaissé, `mode_paiement` (`ESPECES|MOBILE_MONEY|CARTE|VIREMENT|CHEQUE|AUTRE`). Permissions `A40`,`A31`. **Ouverte au rôle `CASHIER`** (2026-11-27) : caisse du jour ouverte obligatoire, vente rattachée à la session (voir ci-dessous et `docs/caisses/integration.md`).
- **Reporting** : `CA par article/famille` = agrégat qty/HT des lignes **BL `VALIDE` + ventes comptant `VALIDEE`** (période/famille, scopé POS). Permission `A40`.

## Entités / migration `1761400000000-CreateVentes`
`commandes_vente` (+lignes, `BROUILLON|VALIDEE|LIVREE|FACTUREE|CLOTUREE|ANNULEE`), `bons_livraison` (+lignes, `VALIDE|ANNULE`), `ventes_comptant` (+lignes, `VALIDEE|ANNULEE`, `mode_paiement_enum`). FKs client/commande SET NULL, depot/POS RESTRICT, article RESTRICT, `created_by` SET NULL.

## Endpoints
| Méthode | Path | Perm. | Impact stock |
|---|---|---|---:|
| POST | `/ventes/commandes` | `A40` | non |
| GET | `/ventes/commandes` / `/:id` | `A40` | non |
| POST | `/ventes/livraisons` | `A40`,`A31` | **SORTIE** (garde 409) |
| GET | `/ventes/livraisons` / `/:id` | `A40` | non |
| POST | `/ventes/comptant` (rôles `CASHIER|ADMIN|SUPERADMIN`) | `A40`,`A31` | **SORTIE** (garde 409) |
| GET | `/ventes/comptant` / `/:id` (rôles `CASHIER|ADMIN|SUPERADMIN`, filtre `caisse_session_id`) | `A40` | non |

Les autres routes (BC, BL, rapports) restent `ADMIN|SUPERADMIN`.

## Vente au comptant — montants TTC (2026-11-28)

Migration `1762200000000-VentesComptantTtcAnnulation`. Les montants sont **calculés par l'API** :

| Ligne | Calcul |
|---|---|
| PU TTC (`unit_price_ttc`) | saisi ; sinon `unit_price_ht` × (1 + TVA/100) (ancien champ) ; sinon **PV TTC de l'article**. PU TTC ≤ 0 → `400` |
| `tva_rate` | TVA de l'article au moment de la vente |
| `montant_ttc` | qté × PU TTC |
| `montant_ht` | `montant_ttc` / (1 + TVA/100) ; `unit_price_ht` = PU TTC / (1 + TVA/100) |
| `montant_tva` | `montant_ttc` − `montant_ht` |

Vente : `montant_total_ht`, `montant_tva`, `montant_ttc` = sommes des lignes ; `montant_encaisse` (défaut = TTC) **doit être ≥ TTC** (`400` sinon) ; `monnaie_rendue` = encaissé − TTC. Le champ `montant_ttc` du corps est **ignoré** (conservé pour compatibilité).

`caisse_session_id` (optionnel, accepté depuis 2026-11-28 ; avant : `400 property caisse_session_id should not exist`) : la vente d'un caissier est **toujours** rattachée à sa caisse ouverte du jour. S'il est envoyé et ne correspond pas à cette caisse → `409`. ADMIN/SUPERADMIN : ignoré.

```json
POST /api/v1/ventes/comptant
{ "depot_id": "…", "mode_paiement": "ESPECES", "montant_encaisse": 5000,
  "lines": [ { "article_id": "…", "qty": 1 } ] }
```
→ ligne `{ unit_price_ttc: "3900.00", tva_rate: "20.00", montant_ht: "3250.00", montant_tva: "650.00", montant_ttc: "3900.00" }`, vente `{ montant_ttc: "3900.00", montant_encaisse: "5000.00", monnaie_rendue: "1100.00" }`.

Rétro-remplissage des ventes existantes : TVA actuelle de l'article, PU TTC = PU HT × (1 + TVA), `montant_tva` = TTC − HT de la vente, `monnaie_rendue` = encaissé − TTC.

## Annulation d'une vente au comptant — `POST /ventes/comptant/:id/annulation`

Rôles `ADMIN` (son PO) / `SUPERADMIN`, permissions `A40` + `A31`. Body `{ "motif": "…" }` (3 à 1000 caractères).

- **Transaction** : retour en stock par ligne (mouvement `ENTREE`, ref `VENTE_COMPTANT`, motif « Annulation vente comptant … ») + statut `ANNULEE`, `annulee_at`, `annulee_par`, `motif_annulation`.
- `409` : vente déjà annulée ; vente **facturée** ; vente rattachée à une **caisse fermée** (les totaux de caisse sont figés à la fermeture — annuler avant de fermer la caisse).
- Une vente annulée sort des totaux de caisse et des rapports (seules les ventes `VALIDEE` sont comptées).
- Le caissier ne peut pas annuler (`403`).

## Factures de vente — `/ventes/factures` (2026-11-28)

Migration `1762300000000-CreateFacturesVente`. Tag Swagger `Ventes — Factures`. Rôles `CASHIER|ADMIN|SUPERADMIN` + permission `A40`.

| Méthode | Path | Effet |
|---|---|---|
| `POST` | `/ventes/factures` | Crée une facture. Body : **exactement un** de `vente_id` (source `COMPTANT`) ou `livraison_ids[]` (source `LIVRAISON`) ; `invoice_date?` (défaut aujourd'hui), `notes?`. `201`. |
| `GET` | `/ventes/factures` | Liste paginée : `client_id`, `source`, `date_from`/`date_to` (date de facture), `search` (numéro), `point_of_sale_id` (SUPERADMIN). |
| `GET` | `/ventes/factures/:id` | Détail + `lignes` + `client` + `point_of_sale`. |
| `GET` | `/ventes/factures/:id/pdf` | PDF A4 (`application/pdf`, `attachment; filename="FAV-….pdf"`). |

**Règles**

- **Numéro** `FAV-<année>-<00001>` : séquentiel **par point de vente et par année** (année de `invoice_date`), sans trou, attribué sous verrou transactionnel (`pg_advisory_xact_lock`). Unicité `(point_of_sale_id, facture_code)`.
- **Depuis une vente au comptant** : vente `VALIDEE` du PO (caissier : uniquement ses propres ventes), non déjà facturée (`409`) ; une seule facture par vente. Lignes = lignes de la vente (PU HT/TTC, TVA, montants), `mode_paiement` repris. Une vente facturée ne peut plus être annulée (`409`).
- **Depuis des BL** (ADMIN/SUPERADMIN ; caissier → `403`) : BL `VALIDE`, non facturés (`409` en listant les codes), même PO, **même client renseigné** (`400` sinon). Lignes = lignes des BL (PU HT du BL, **TVA actuelle de l'article**, TTC calculé). Les BL reçoivent `facture_id` ; une BC `LIVREE` dont tous les BL sont facturés passe en `FACTUREE`.
- Les lignes **figent** code article, désignation, prix et TVA : modifier l'article ensuite ne change pas la facture.
- Totaux facture : `montant_ht`, `montant_tva`, `montant_ttc` = sommes des lignes.
- Statut `VALIDEE` (l'annulation de facture / avoir n'est pas encore disponible).

**Tables** : `factures_vente` (`facture_code`, `facture_year`, `facture_number`, `point_of_sale_id`, `client_id`, `source` `COMPTANT|LIVRAISON`, `vente_id` unique, `status` `VALIDEE|ANNULEE`, `invoice_date`, `mode_paiement`, montants, `notes`, `created_by`) ; `facture_vente_lignes` (`article_id`, `livraison_id`, `article_code`, `designation`, `qty`, `unit_price_ht`, `unit_price_ttc`, `tva_rate`, `montant_ht/tva/ttc`) ; `bons_livraison.facture_id`.

**PDF** (`src/ventes/facture-vente.pdf.ts`, `pdfkit` 0.19.1) : en-tête boutique (nom, adresse, code), « FACTURE », numéro, date, client (« Client comptant » si absent), tableau Code / Désignation / Qté / PU HT / TVA % / Total HT / Total TTC (saut de page automatique), totaux HT / TVA / TTC, mode de paiement pour une vente au comptant, notes. Montants au format `1 234 567,50`.

## Rapports d'analyse (2026-11-28)

Rôles `ADMIN` (PO forcé) / `SUPERADMIN` (`point_of_sale_id` optionnel = tous), permission `A40`. Caissier → `403`. Seules les ventes au comptant `VALIDEE` et les BL `VALIDE` sont comptées (ventes annulées exclues). Regroupement dans le fuseau de la base (`Africa/Nairobi`, UTC+3, identique à Madagascar).

### `GET /ventes/report/periodes`

| Paramètre | Valeurs | Défaut |
|---|---|---|
| `granularite` | `jour` \| `semaine` (ISO, **lundi → dimanche**) \| `mois` | `semaine` |
| `date_from` / `date_to` | `YYYY-MM-DD`, bornes incluses | 12 dernières semaines / 12 derniers mois / début du mois ; fin = aujourd'hui |
| `source` | `tous` \| `comptant` \| `livraison` | `tous` |
| `cashier_id` | uuid de l'utilisateur vendeur (`created_by`) | — |
| `article_families_id` | entier | — |

Limite : 400 jours, 160 semaines ou 60 mois par appel (`400` au-delà). Les **périodes sans vente sont incluses** (valeurs à 0) pour les graphiques.

```json
{
  "granularite": "semaine", "date_from": "2026-10-05", "date_to": "2026-11-28", "source": "tous",
  "totaux": { "nb_ventes": 5, "total_ht": "17000.00", "total_tva": "1300.00", "total_ttc": "18300.00", "panier_moyen_ttc": "3660.00" },
  "periodes": [
    { "periode": "2026-11-23", "periode_fin": "2026-11-29", "label": "2026-S48",
      "nb_ventes": 5, "total_ht": "17000.00", "total_tva": "1300.00", "total_ttc": "18300.00", "panier_moyen_ttc": "3660.00",
      "par_mode": { "ESPECES": { "nb_ventes": 2, "total_ttc": "10370.00" }, "MOBILE_MONEY": { "nb_ventes": 1, "total_ttc": "3250.00" } } }
  ]
}
```

- `nb_ventes` = nombre de documents (ventes au comptant + BL) ; montants calculés à partir des **lignes** (BL : TTC = HT × (1 + TVA actuelle de l'article)). `label` : `YYYY-MM-DD`, `IYYY-"S"IW` (semaine ISO) ou `YYYY-MM`.
- `par_mode` : ventes au comptant uniquement (les BL n'ont pas de mode de paiement).
- ⚠️ Ventes au comptant antérieures au 2026-11-28 : leur TTC d'en-tête avait été saisi librement ; les lignes ont été reconstituées (PU HT × (1 + TVA de l'article)). Pour ces anciennes ventes, ce rapport (lignes) peut différer de `par-caissier` / `/stats` (en-têtes).

### `GET /ventes/report/par-caissier`

Paramètres : `date_from` / `date_to` (défaut : mois en cours → aujourd'hui), `granularite?` (`jour|semaine|mois` : ajoute `periodes[]` par caissier), `cashier_id?`, `point_of_sale_id?` (SUPERADMIN). Ventes **au comptant**, groupées par utilisateur vendeur, tri CA décroissant :

```json
{
  "date_from": "2026-11-01", "date_to": "2026-11-30", "granularite": "semaine",
  "caissiers": [{
    "user_id": "9382…", "user_name": "Cashier 1", "role": "cashier",
    "nb_ventes": 3, "total_ht": "…", "total_tva": "…", "total_ttc": "14920.00", "total_encaisse_net": "…", "panier_moyen_ttc": "4973.33",
    "par_mode": { "ESPECES": { "nb_ventes": 2, "total_ttc": "11020.00" }, "MOBILE_MONEY": { "nb_ventes": 1, "total_ttc": "3900.00" } },
    "annulations": { "nb": 1, "total_ttc": "3900.00" },
    "caisses": { "nb_sessions": 3, "sessions_ouvertes": 1, "ecart_total": "3700.00", "manques_total": "-100.00" },
    "periodes": [{ "periode": "2026-11-23", "nb_ventes": 3, "total_ttc": "14920.00" }]
  }]
}
```

- `total_encaisse_net` = Σ (encaissé − monnaie rendue). `caisses` : sessions dont le **jour de caisse** est dans la plage ; `ecart_total` = Σ écarts des caisses fermées, `manques_total` = Σ écarts négatifs.
- `/stats/ventes` et `/stats/dashboard` excluent désormais les ventes annulées.

## Vente au comptant par un caissier

- Le caissier doit avoir une **caisse du jour ouverte** (`POST /caisses/ouverture`). Sinon → `409 Caisse fermée : ouvrir la caisse…` ; caisse ouverte depuis un jour précédent → `409` (la fermer puis rouvrir).
- La vente porte `caisse_session_id` (migration `1762000000000-CreateCaisseSessions`) ; la session est verrouillée pendant la transaction de vente (pas de vente sur une caisse en cours de fermeture).
- Lecture (`GET /ventes/comptant`, `/:id`) : le caissier ne voit que **ses** ventes (`created_by`).
- Permissions `A40` + `A31` à accorder au caissier par l'admin (`PUT /users/:id/permissions` `{ "flags": { "A40": true, "A31": true } }`), sinon `403 Permission requise`.
- Pour vendre, le caissier lit aussi `GET /articles/select` (inclut désormais `article_barcode`, `article_tva_rate`, `article_sale_price_ht`, `article_sale_price_ttc`, `article_available_qty`), `GET /depots/select`, `GET /clients/select` (ouverts au caissier).
- Ventes ADMIN/SUPERADMIN : aucune caisse requise, `caisse_session_id = null`.
| GET | `/ventes/report/ca-par-article` | `A40` | non (agrégat) |
| GET | `/ventes/report/ca-par-famille` | `A40` | non (agrégat) |

## Scoping & sécurité
- `ADMIN` limité à son `point_of_sale_id` (dépôt/client/article/commande validés dans le POS ; `404` hors scope, `403` sans PO). `SUPERADMIN` global (cible `point_of_sale_id`). `@RequirePermission` via `PermissionGuard` (SUPERADMIN bypass `userPermissionsConfig.superadminBypass`) — **activé** sur ce module sensible (vente/caisse/stock sortie). Audit `warn` (acteur, ids, montants/mode) sans corps/secrets.

## Transaction / atomicité
- `createCommande`, `createLivraison` (BL + mouvements SORTIE + MAJ BC), `createVenteComptant` (vente + mouvements SORTIE) : **`DataSource.transaction`** → rollback auto sur erreur (validation/FK/**stock insuffisant 409**). Mouvements via `StockService.recordMovement(..., manager)` (même tx, verrou article×dépôt). Effets externes (logs) hors tx DB.

## Fichiers
- `src/ventes/*` (entities BC/BL/VC + lignes, `dto/ventes.dto.ts`, `ventes.service.ts`, `ventes.controller.ts`, `ventes.module.ts` → `StockModule` + `UserPermissionsModule` + `CaissesModule`), factures `facture-vente.entity.ts`, `factures-vente.service.ts`, `factures-vente.controller.ts`, `facture-vente.pdf.ts`. Câblé `src/app.module.ts`. Migrations `1761400000000-CreateVentes`, `1762000000000-CreateCaisseSessions` (`caisse_session_id`), `1762100000000-VentesStatutLivraisonPartielle`, `1762200000000-VentesComptantTtcAnnulation`, `1762300000000-CreateFacturesVente`.
