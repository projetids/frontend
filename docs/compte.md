# Comptes Seeder — local uniquement (ne pas committer)

Comptes créés par `npm run seed` (`src/database/seeds/run-seed.ts`), idempotent.

## Mots de passe commun

- Défaut : `ChangerMo123!`
- Personnalisable via la variable d'env `SEED_PASSWORD` avant le seed.

## Utilisateurs (2 par rôle)

## Utilisateurs (2 par rôle)

**SUPERADMIN**

```json
{ "user_mail": "superadmin1@ids.local", "user_password": "ChangerMo123!" }
{ "user_mail": "superadmin2@ids.local", "user_password": "ChangerMo123!" }
```

**ADMIN**

```json
{ "user_mail": "admin1@ids.local", "user_password": "ChangerMo123!" }
{ "user_mail": "admin2@ids.local", "user_password": "ChangerMo123!" }
```

**CAISIER**

```json
{ "user_mail": "caissier1@ids.local", "user_password": "ChangerMo123!" }
{ "user_mail": "caissier2@ids.local", "user_password": "ChangerMo123!" }
```

## Login de test

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"user_mail": "admin1@ids.local", "user_password": "ChangerMo123!"}'
```

Outils de récupération : `user`, `session_id`, `access_token` (15 min), `refresh_token` (7 jours).

> `admin`/`superadmin` sont aussi les deux seuls rôles autorisés sur `GET /auth/users`.