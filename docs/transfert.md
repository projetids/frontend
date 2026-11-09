# Transferts (Bon de transfert) — Intégration API (Étape 4, option A)

Base `/api/v1`, enveloppe IDS. Auth Bearer JWT + `RolesGuard`. Tag Swagger : `Transferts`. Rôles : `ADMIN|SUPERADMIN`.

## Rôle
Déplacement d’articles d’un **dépôt source** vers un **dépôt cible**. Génère **2 mouvements atomiques** liés (même `ref_type=TRANSFERT`, même `ref_id`) : `TRANSFERT_SORTIE` (source, qty −, garde stock/verrou) puis `TRANSFERT_ENTREE` (cible, qty +), via le moteur `StockService`.

## Règle option A (inter-POS)
- **Inter-POS** (dépôts de POS différents) : **`SUPERADMIN` uniquement** crée le transfert ; un `ADMIN` reçoit `403`.
- **Intra-POS** : `ADMIN` autorisé si **source ET cible** appartiennent à son `point_of_sale_id` (sinon `404` hors scope).
- **Visibilité (liste/détail)** : `ADMIN` voit les transferts dont **POS source OU POS cible** = son PO ; `SUPERADMIN` voit tout. (Permet à un PO destinataire de voir un transfert inter-POS entrant validé par un SUPERADMIN.)

## Entités
- `transferts` : `transfert_id` (uuid PK), `transfert_code` unique `TRF-<hex>`, `depot_source_id`/`depot_cible_id` FK `depots` RESTRICT (distincts), `pos_source_id`/`pos_cible_id` FK `point_of_sales` RESTRICT, `is_inter_pos` bool, `status` `transfert_status_enum` (`VALIDE|ANNULE`, défaut `VALIDE`), `commentaire`, `created_by/at`.
- `transfert_lignes` : `ligne_id`, `transfert_id` FK CASCADE, `article_id` FK RESTRICT, `qty` (>0). 

## Endpoints
| Méthode | Path | Description |
|---|---|---|
| `POST` | `/transferts` | Crée/valide le transfert (contrôles dépôts actifs, règle option A, articles uniques) → 2 mouvements/lignes (SORTIE puis ENTRÉE). 201. |
| `GET` | `/transferts` | Liste paginée (visibilité source OU cible pour ADMIN). |
| `GET` | `/transferts/:id` | Détail + lignes (visibilité idem). |

Corps `POST` : `{ depot_source_id, depot_cible_id (≠ source), commentaire?, lines:[{ article_id, qty(>0) }] }`.

## Transaction / atomicité & sécurité
- **Une seule transaction** `DataSource.transaction` : transfert + lignes + (SORTIE source + ENTRÉE cible) par ligne. **Rollback auto** sur erreur (validation, `403/404` inter-POS, stock insuffisant `409` sur la sortie, FK) → aucune écriture partielle, cohérence des 2 mouvements garantie.
- Garde stock insuffisant + verrou `pg_advisory_xact_lock` `(article_id,depot_id)` appliqués par `StockService.recordMovement` sur la sortie (et sérialisation entrée). Contrôle de rôle **côté service** (ne pas se fier au front). Audit `warn` (acteur, inter-POS, dépôts/POS source-cible, nb lignes) — sans corps/secrets.

## Fichiers
- `src/transferts/*` ; migrations `1761000000000-CreateTransferts.ts`. `AppModule` → `TransfertsModule`.
