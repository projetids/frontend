# Caisses (ouverture / fermeture journalière) — Intégration API

Base `/api/v1`, enveloppe IDS (`data`, `message`, `status`, `error`, `signature: "IDS"`). Auth Bearer JWT + `RolesGuard`. Tag Swagger : `Caisses`.

## Rôle métier

Chaque **caissier** ouvre **sa** caisse en début de journée (fond de caisse), vend au comptant, puis ferme sa caisse (montant compté → écart). Une seule caisse ouverte par caissier (garanti en base). **Aucune vente au comptant n'est possible pour un caissier sans caisse du jour ouverte.** Les ventes d'un ADMIN/SUPERADMIN ne sont pas rattachées à une caisse.

Jour de caisse (`business_date`) = date locale du **serveur** à l'ouverture (YYYY-MM-DD). Une caisse restée ouverte depuis un jour précédent bloque les ventes (`409`) et l'ouverture d'une nouvelle caisse : il faut d'abord la fermer.

## Entité `caisse_sessions` (migration `1762000000000-CreateCaisseSessions`)

| Attribut | Type | Description |
|---|---|---|
| `session_id` | uuid PK | Identifiant |
| `session_code` | varchar unique | `CAI-<12 hex>` |
| `cashier_id` | uuid FK `users` RESTRICT | Caissier |
| `point_of_sale_id` | uuid FK `point_of_sales` RESTRICT | PO du caissier |
| `business_date` | date | Jour de caisse |
| `status` | enum `OUVERTE` \| `FERMEE` | **Index unique partiel** `(cashier_id) WHERE status = 'OUVERTE'` |
| `opened_at` / `fond_ouverture` / `notes_ouverture` | timestamptz / numeric(14,2) / text | Ouverture |
| `closed_at` / `closed_by` | timestamptz / uuid FK `users` SET NULL | Fermeture (caissier ou admin) |
| `montant_compte` | numeric(14,2) | Espèces comptées à la fermeture (fond compris) |
| `montant_theorique_especes` | numeric(14,2) | Fond + espèces encaissées (voir calcul) |
| `ecart` | numeric(14,2) | `montant_compte − montant_theorique_especes` |
| `nb_ventes`, `total_ttc`, `total_encaisse`, `totaux_par_mode` (jsonb) | | Totaux figés à la fermeture |
| `notes_fermeture` | text | |

`ventes_comptant.caisse_session_id` (uuid nullable, FK RESTRICT, indexé) : session de la vente.

### Calcul

- Totaux = ventes au comptant `VALIDEE` liées à la session, par `mode_paiement` : `{ nb_ventes, total_ttc, total_encaisse }`.
- Espèces entrées dans le tiroir = Σ `min(montant_encaisse, montant_ttc)` des ventes `ESPECES` (la monnaie rendue ne reste pas dans le tiroir).
- `montant_theorique_especes = fond_ouverture + espèces entrées` ; `ecart = montant_compte − théorique` (négatif = manque).
- Tant que la caisse est ouverte, les totaux sont calculés à la volée (`session-courante`, liste, détail) ; ils sont figés à la fermeture.

## Endpoints

| Méthode | Path | Rôles | Effet |
|---|---|---|---|
| `POST` | `/caisses/ouverture` | `CASHIER` | Body `{ fond_ouverture, notes? }`. `409` si une caisse est déjà ouverte (même d'un jour précédent). `201`. |
| `GET` | `/caisses/session-courante` | `CASHIER` | Caisse ouverte + totaux en cours + `is_previous_day`, ou `data: null`. |
| `POST` | `/caisses/fermeture` | `CASHIER` | Body `{ montant_compte, notes? }`. Ferme **sa** caisse (`404` si aucune). `200`. |
| `GET` | `/caisses/rapport-journalier?date=&point_of_sale_id=` | `ADMIN` (son PO), `SUPERADMIN` (`point_of_sale_id` requis) | Rapport du jour (`date` défaut aujourd'hui). |
| `GET` | `/caisses?date=&status=&cashier_id=&point_of_sale_id=&page=&limit=` | `CASHIER` (ses caisses), `ADMIN` (son PO), `SUPERADMIN` | Liste paginée. |
| `GET` | `/caisses/:id` | idem | Détail + `ventes[]` (`vente_code`, `mode_paiement`, `montant_ttc`, `montant_encaisse`, `status`, `created_at`). `404` hors scope. |
| `POST` | `/caisses/:id/fermeture` | `ADMIN` (son PO), `SUPERADMIN` | Fermeture forcée (caissier parti sans fermer) ; `closed_by` = admin ; `400` si déjà fermée. |

### Exemple — fermeture

```json
POST /api/v1/caisses/fermeture
{ "montant_compte": 53800, "notes": "Fin de journée" }
```

```json
{
  "data": {
    "session_id": "7a13…", "session_code": "CAI-E0F293E20176", "status": "FERMEE",
    "business_date": "2026-11-27", "fond_ouverture": "50000.00",
    "nb_ventes": 2, "total_ttc": "7800.00", "total_encaisse": "8900.00",
    "totaux_par_mode": {
      "ESPECES": { "nb_ventes": 1, "total_ttc": "3900.00", "total_encaisse": "5000.00" },
      "MOBILE_MONEY": { "nb_ventes": 1, "total_ttc": "3900.00", "total_encaisse": "3900.00" }
    },
    "montant_theorique_especes": "53900.00", "montant_compte": "53800.00", "ecart": "-100.00",
    "closed_at": "2026-11-27T20:40:12.000Z", "closed_by": "9382…", "is_previous_day": false
  },
  "message": "Caisse fermée", "status": 200, "error": null, "signature": "IDS"
}
```

### Rapport journalier

`data = { point_of_sale_id, business_date, sessions_ouvertes, totaux: { nb_ventes, total_ttc, total_encaisse, ecart_total, totaux_par_mode }, sessions: [{ session_id, session_code, cashier_id, cashier_name, status, opened_at, closed_at, fond_ouverture, nb_ventes, total_ttc, total_encaisse, montant_theorique_especes, montant_compte, ecart, totaux_par_mode }] }`.

## Intégration front (caissier)

1. Au chargement de l'écran de vente : `GET /caisses/session-courante`. `null` → proposer l'ouverture ; `is_previous_day: true` → imposer la fermeture.
2. Vente : `POST /ventes/comptant` (voir `docs/ventes/integration.md`) ; `409` « Caisse fermée » si la caisse n'est pas ouverte.
3. **Déconnexion** : `POST /auth/logout` renvoie `data.open_cash_session` (`{ session_id, session_code, business_date, opened_at }` ou `null`). Si non nul, afficher « Fermer la caisse ? » puis `POST /caisses/fermeture`. La déconnexion n'est **pas** bloquée ; pour fermer après la déconnexion, se reconnecter (ou un admin utilise `POST /caisses/:id/fermeture`).
4. Le caissier doit avoir les permissions `A40` et `A31` (`PUT /users/:id/permissions`, par l'admin) pour vendre.

## Transaction / concurrence

- Ouverture, fermeture et fermeture forcée en `DataSource.transaction`. Seconde ouverture concurrente → index unique partiel → `409`.
- Vente au comptant d'un caissier : la session est verrouillée (`SELECT … FOR UPDATE`) dans la transaction de la vente ; la fermeture prend le même verrou → une vente ne peut pas être rattachée à une caisse en cours de fermeture.
- Logs `warn` d'audit (ouverture/fermeture, sans montant compté détaillé hors écart).

## Fichiers

- `src/caisses/caisse-session.entity.ts`, `src/caisses/dto/caisses.dto.ts`, `src/caisses/caisses.service.ts`, `src/caisses/caisses.controller.ts`, `src/caisses/caisses.module.ts` (câblé `src/app.module.ts`, exporte `CaissesService` pour `VentesModule`)
- Migration `src/database/migrations/1762000000000-CreateCaisseSessions.ts`
- Liens : `src/ventes/ventes.service.ts` (`requireSessionForSale`), `src/auth/auth.service.ts` (`open_cash_session` au logout)
