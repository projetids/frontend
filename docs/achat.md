# Achats — Intégration API (Étape 5)

Base `/api/v1`, enveloppe IDS `{ success, statusCode, code, message, timestamp, data }`. Auth Bearer JWT + `RolesGuard`. Tag Swagger : `Achats`. Rôles : `ADMIN|SUPERADMIN`. `ADMIN` scopé à son `point_of_sale_id` (`applyPointOfSaleScope`, `404` hors scope, `403` sans PO) ; `SUPERADMIN` global (peut cibler `point_of_sale_id`).

## Flux réel (conforme plan)
- **BC achat** (`BCA`, `VALIDEE`) : engagement fournisseur, **0 impact stock**.
- **BR achat** (réception) : **ENTRÉE stock** au dépôt choisi → génère mouvements append-only `ENTREE` (ref `ACHAT_BR`, `ref_id` réception) via `StockService.recordMovement` (garde/verrou/synchro). Met à jour `qty_received`/statut BC (`PARTIELLE`/`CLOTUREE`). Réception partielle supportée (`commande_ligne_id` optionnel).
- **Facture d’achat** (`FAA`, `VALIDEE`) : **financier, 0 impact stock**. Rapprochement optionnel `commande_id`/`reception_id` + `supplier_invoice_ref`.

## Entités / migrations
- `1761100000000-CreateCommandesAchat` : `commandes_achat` (`BROUILLON|VALIDEE|PARTIELLE|CLOTUREE|ANNULEE`, FK supplier/POS RESTRICT, `created_by` SET NULL) + `commande_achat_lignes` (qty_ordered/received, prix HT).
- `1761200000000-CreateBonsReception` : `bons_reception` (`VALIDE|ANNULE`, FK commande SET NULL, supplier/depot/POS RESTRICT) + `bon_reception_lignes` (→ `commande_ligne_id` SET NULL).
- `1761300000000-CreateFacturesAchat` : `factures_achat` (`BROUILLON|VALIDEE|ANNULEE`, refs commande/réception SET NULL) + `facture_achat_lignes`. **Aucune écriture stock**.

## Endpoints
| Méthode | Path | Impact stock | Description |
|---|---|---:|---|
| POST | `/achats/commandes` | non | Crée BC `BCA` + lignes (tx). |
| GET | `/achats/commandes` | non | Liste paginée (scopée POS). |
| GET | `/achats/commandes/:id` | non | Détail + lignes (qty_ordered/received). |
| POST | `/achats/receptions` | **oui (ENTRÉE)** | BR `BR-…` + lignes + ENTREE stock dépôt (ref `ACHAT_BR`, tx) ; MAJ BC. |
| GET | `/achats/receptions` / `/:id` | non | Liste/détail réceptions (scopé). |
| POST | `/achats/factures` | non | Facture `FAA-…` + lignes (rapprochement, tx). |
| GET | `/achats/factures` / `/:id` | non | Liste/détail factures (scopé). |
| GET | `/achats/report/par-article` | non | Agrégat qty/HT sur factures `VALIDEE` par article (filtres dates/famille). |
| GET | `/achats/report/par-famille` | non | Agrégat qty/HT par `article_families_id`. |

## Transaction / atomicité
- `createCommande`, `createReception` (BR + mouvements + MAJ BC), `createFacture` : **`DataSource.transaction`** → rollback auto sur erreur (FK/validation/stock). Mouvements BR via `StockService.recordMovement(..., manager)` (même tx, verrou `pg_advisory_xact_lock`, synchro agrégats article). Effets externes (logs `warn` audit, sans corps/secrets) hors transaction DB.

## Fichiers
- `src/achats/*` (entities BC/BR/FA + lignes, `dto/achats.dto.ts`, `achats.service.ts`, `achats.controller.ts`, `achats.module.ts` → `StockModule`). Câblé `src/app.module.ts`. Migrations `1761100000000/1761200000000/1761300000000`.
