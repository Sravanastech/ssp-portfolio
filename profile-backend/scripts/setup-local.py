#!/usr/bin/env python3
from pathlib import Path
import secrets, os
p=Path(__file__).resolve().parent.parent/'.env'
if p.exists(): raise SystemExit("Existing .env preserved")
p.write_text(''.join(f'{key}={secrets.token_hex(24)}\n' for key in ('DB_BOOTSTRAP_PASSWORD','DB_MIGRATION_PASSWORD','DB_RUNTIME_PASSWORD'))+'SPRING_PROFILES_ACTIVE=dev\n')
os.chmod(p,0o600)
print('Generated local database secrets; values are not printed.')
