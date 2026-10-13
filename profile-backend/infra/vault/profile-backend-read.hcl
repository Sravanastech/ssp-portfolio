# Learning example only. Allows reading one synthetic KV v2 path.
path "secret/data/profile-backend/*" {
  capabilities = ["read"]
}

path "secret/metadata/profile-backend/*" {
  capabilities = ["list"]
}
