# AURORA+ — imagem única: web (3000) + api (4000, interno) + media (4001, interno)
# O Next faz proxy de /api e /media para os serviços internos, então só a 3000
# precisa ser exposta na web (além da 1935/tcp para ingest RTMP).
FROM node:22-bookworm-slim

# procps: o `concurrently -k` usa `ps`; unzip: extração dos filmes no setup
RUN apt-get update && apt-get install -y --no-install-recommends procps unzip \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# manifests primeiro para aproveitar cache de camada
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/media/package.json apps/media/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY . .

# URLs same-origin no build do front: /api e /media passam pelo proxy do Next
ENV DOCKER_RUNTIME=1
ENV NEXT_PUBLIC_API_URL=""
ENV NEXT_PUBLIC_MEDIA_URL="/media"
RUN npm run build -w apps/web

ENV NODE_ENV=production
ENV CONTENT_DIR=/app/content

EXPOSE 3000 1935

CMD ["npx", "concurrently", "-k", "-n", "api,media,web", \
     "npm run start -w apps/api", \
     "npm run start -w apps/media", \
     "npm run start -w apps/web"]
