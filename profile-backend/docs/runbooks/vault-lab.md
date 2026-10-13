# Vault learning lab (local only)

This uses Vault's in-memory development server. It loses all data on restart and must never store real credentials or run in production. The fixed root token is synthetic and bound to `127.0.0.1`; never reuse it.

1. Start the local database first, then `docker compose --profile vault-lab up -d vault`.
2. Set `VAULT_ADDR=http://127.0.0.1:18200` and `VAULT_TOKEN=local-only-vault-root-token` in the current terminal only.
3. Enable KV v2 if needed: `vault secrets enable -path=secret kv-v2`.
4. Store a fake value: `vault kv put secret/profile-backend/demo value=synthetic-only`.
5. Create a limited policy: `vault policy write profile-backend-read infra/vault/profile-backend-read.hcl`; issue a token scoped to the policy in Vault UI/CLI and verify it cannot read any other path.
6. Exercise TTL, renewal and revocation for a short-lived token. Never paste real credentials into shell history.
7. For the database engine exercise, read HashiCorp's current database secrets documentation and configure it only against a disposable database with a dedicated, narrowly scoped role. The default local service uses separated fixed development credentials; don't make it a root role or connect Vault to production.
8. Stop the lab with `docker compose --profile vault-lab stop vault`. Restarting destroys its in-memory state.

Production secret delivery remains external to Vault in this sample. Select a managed secrets service or operate a hardened, TLS-enabled Vault cluster with unseal, storage, backups, access policies, monitoring, and incident procedures before production.

References: [Vault development server warning](https://developer.hashicorp.com/vault/docs/concepts/dev-server), [database secrets engine](https://developer.hashicorp.com/vault/docs/secrets/databases).
