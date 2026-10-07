FROM node:24-alpine AS dependencies

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci


# Imagem do initContainer: aplica só as migrations pendentes
# (controle pela tabela _prisma_migrations) antes da aplicação subir.
FROM dependencies AS migrator

USER 1000:1000

CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]


FROM node:24-alpine AS builder

WORKDIR /usr/src/app

COPY . .

COPY --from=dependencies /usr/src/app/node_modules ./node_modules

# src/generated/prisma está no .gitignore e não entra no contexto do Docker.
RUN npx prisma generate

RUN npm run build


FROM node:24-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# --chown: o Next grava em .next/cache em runtime e o processo roda sem root.
COPY --from=builder --chown=node:node /usr/src/app/public ./public
COPY --from=builder --chown=node:node /usr/src/app/.next/standalone ./
COPY --from=builder --chown=node:node /usr/src/app/.next/static ./.next/static
COPY --from=builder --chown=node:node /usr/src/app/src/generated ./src/generated

# UID numerico para o kubelet conseguir validar runAsNonRoot.
USER 1000:1000

EXPOSE 8080

CMD ["node", "server.js"]
