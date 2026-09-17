# AMPARA

Painel operacional (Next.js 15) para monitoramento de medidas protetivas com tornozeleira eletrônica.

- Homologação (intranet): `https://ampara-h.ssp.go.gov.br`
- Produção (DNS definitivo ainda não publicado): `https://ampara.ssp.go.gov.br`

## Stack

- Next.js 15 (App Router)
- Tailwind CSS + shadcn/ui
- Prisma + PostgreSQL
- SSO SSP-GO (`token_only`, `client_id=ampara`)
- RBAC: `ADMIN` | `POLICE`

## Pareamento QR

1. Medida em `AWAITING_PAIRING` → **Gerar QR de pareamento** no detalhe
2. Token opaco retornado **uma vez**; só o hash fica no banco (TTL ~5 min)
3. App (`mulhersegura://pair?token=...`) ou `/pair?token=...` chama `POST /api/v1/pairing/redeem`
4. Device criado, tokens pendentes/anteriores revogados, medida → `ACTIVE`

## Localização do monitorado

- Medida em simulação: posição mock no painel
- Medida real (`isSimulation=false`): mapa do Guardião (`src/config/guardiao.ts`)

## Autenticação SSO

1. `/login` → `{SSOWS}auth?response_type=token_only&client_id=ampara&redirect_uri=/auth/callback`
2. SSO devolve `access_token`
3. `POST /api/auth/sso/session` valida em `{SSOWS}validate` e grava cookie `ms_session`
4. Homologação usa `https://ssows-h.ssp.go.gov.br/` (hostname `ampara-h.ssp.go.gov.br`)

Cadastrar no SSO o client `ampara` com redirect `https://ampara-h.ssp.go.gov.br/auth/callback`.

## Setup local

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Login sem IdP: `/dev-login` (somente `next dev`).

## Variáveis (.env)

Só o banco e o segredo da sessão. Domínio, SSO e URLs do Guardião estão no código.

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL |
| `AUTH_SECRET` | Assinatura HMAC do cookie `ms_session` (mín. 32 caracteres) |

Homologação (K8s):

```text
DATABASE_URL=postgresql://usr_ampara:SENHA@postgres-homo.ssp.go.gov.br:5432/ampara?schema=public&sslmode=require
AUTH_SECRET=<openssl rand -base64 32>
```

Aplicar schema no banco vazio: `npm run db:deploy`.

## Deploy (K8s)

```bash
docker build -t ampara .
```

A imagem escuta na porta 3000 (`output: "standalone"`). Rodar `npm run db:deploy` contra o banco de homo antes ou no job de migrate.

## Rotas

- `/login` — redirect SSO
- `/auth/callback` — retorno do SSO
- `/dev-login` — mock local
- `/` — dashboard
- `/pair` — redeem web
- `/api/auth/sso/session` — cria sessão
- `/api/v1/pairing/redeem` — redeem público
