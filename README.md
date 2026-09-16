# AURORA+ 🎬

Plataforma de streaming construída para a disciplina **Sistemas de Multimídia**: streaming adaptativo HLS, transcodificação FFmpeg, transmissão ao vivo via RTMP (com simulcast para YouTube), múltiplas faixas de áudio e legendas, e uma interface dark cinematográfica.

## Arquitetura

```
                 ┌──────────────────────────────────────────────┐
                 │                 navegador                    │
                 │        Next.js (web) — localhost:3000        │
                 └──────────┬────────────────────┬──────────────┘
                            │ JSON/REST          │ HLS (.m3u8/.ts)
                 ┌──────────▼─────────┐  ┌───────▼──────────────┐
                 │  API — :4000       │  │  Media — :4001       │
                 │  Express + SQLite  │  │  estático CDN-ready  │
                 │  fila FFmpeg (VOD) │  │  cache imutável +    │
                 │  ingest RTMP :1935 │  │  Range + CORS        │
                 └──────────┬─────────┘  └───────▲──────────────┘
                            │ FFmpeg (HLS ladder)│
                 OBS ───────►  content/hls ──────┘
                 (rtmp)     │
                            └──► YouTube (simulcast -c copy, opcional)
```

- **apps/web** — Next.js 15 + Tailwind v4 + hls.js. Perfis, home com hero autoplay, busca, player custom (qualidades, áudio, legendas, thumbnails na timeline, stats-for-nerds com simulador de rede), Estúdio (upload/jobs/live).
- **apps/api** — Express + better-sqlite3. Catálogo, perfis/progresso/minha lista, upload → fila de transcodificação (SSE), live RTMP → HLS low-latency + simulcast YouTube.
- **apps/media** — servidor de mídia dedicado. Para usar CDN no futuro: aponte a CDN para ele como origin e troque `NEXT_PUBLIC_MEDIA_URL` — nada mais muda.
- **content/** — vídeos fonte, HLS gerado, imagens e banco (fora do git).

## Rodando localmente

Requisitos: Node 20+ (testado no 24), ~10 GB de disco. FFmpeg já vem via `ffmpeg-static` (sem instalação manual).

```bash
npm install
npm run setup   # baixa os filmes abertos (Blender) e transcodifica — demora; precisa de internet
npm run dev     # sobe web (3000) + api (4000) + media (4001) + RTMP (1935)
```

Depois: http://localhost:3000 → crie um perfil e navegue. Se o `setup` falhar em algum download (mirror fora do ar), rode de novo — ele continua de onde parou.

Scripts úteis:

| comando | o que faz |
|---|---|
| `npm run setup` | download + transcodificação + seed (idempotente) |
| `node scripts/download.mjs` | só os downloads |
| `node scripts/process.mjs [slug]` | só transcodificação + seed |
| `node scripts/make-dub.mjs <slug>` | gera faixa "dublado pt-BR" (TTS) p/ demo de multi-áudio |
| `npm test` | todas as suítes (api, media, web) |

## Transmissão ao vivo (OBS)

1. OBS → Configurações → Transmissão → Serviço **Personalizado**
2. Servidor: `rtmp://localhost:1935/live` · Chave: `aula` (qualquer nome)
3. Iniciar transmissão → o card **🔴 AO VIVO** aparece na home em segundos.

**Simulcast para YouTube:** no Estúdio (`/admin`), cole a chave de transmissão do YouTube e ligue o simulcast — um relay FFmpeg (`-c copy`, sem re-encode) envia o mesmo stream para o YouTube em paralelo. A chave nunca é gravada no repositório (memória do processo ou env `YOUTUBE_RTMP_URL` em `.env` local).

## Roteiro de demonstração sugerido

1. **Perfis** → home com hero em autoplay e fileiras por gênero.
2. **Player** (Sintel): legendas PT/EN (💬), **áudio Original/Dublado** (🎧) trocando sem cortar o vídeo.
3. Tecla **D** → painel *stats for nerds*: bitrate, nível ABR, buffer, banda estimada, gráfico ao vivo.
4. No painel, **Simular rede → 600 kbps** → o ABR desce degrau a degrau (1080p → 360p) na frente da plateia.
5. **Estúdio**: upload de um MP4 → barra de progresso da transcodificação em tempo real (SSE) → título entra no catálogo.
6. **Live**: OBS → card AO VIVO na home (+ simulcast YouTube, se configurado).

## Deploy em VPS (Ubuntu)

```bash
# 1. dependências
sudo apt update && sudo apt install -y git nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs

# 2. projeto
git clone <URL-DO-REPO> aurora && cd aurora
npm install && npm run setup            # ou envie a pasta content/ pronta via rsync/scp
cp apps/web/.env.example apps/web/.env.local   # edite com o domínio público:
#   NEXT_PUBLIC_API_URL=https://seu-dominio.com/api-svc   (ou http://IP:4000)
#   NEXT_PUBLIC_MEDIA_URL=https://seu-dominio.com/media   (ou http://IP:4001)
npm run build -w apps/web

# 3. processos (PM2)
sudo npm i -g pm2
pm2 start "npm run dev -w apps/api"   --name aurora-api
pm2 start "npm run dev -w apps/media" --name aurora-media
pm2 start "npm run start -w apps/web" --name aurora-web
pm2 save && pm2 startup
```

Nginx como proxy reverso (80/443 → web; `/api-svc` → 4000; `/media` → 4001) e abra a porta **1935/tcp** no firewall para o ingest RTMP. Para HTTPS, `certbot --nginx`. Quando quiser CDN: aponte a CDN para o serviço de media como origin e atualize `NEXT_PUBLIC_MEDIA_URL` — é o único ponto de troca.

**Segurança:** nenhum segredo vive no repositório. Variáveis sensíveis (ex.: chave do YouTube) ficam em `.env` locais (ignorados pelo git) ou na UI do Estúdio em memória. Em VPS pública, proteja `/admin` (ex.: HTTP basic auth no nginx) antes de divulgar o endereço.

## Troubleshooting

- **Porta ocupada** (3000/4000/4001/1935): feche o processo antigo (`netstat -ano | findstr :4000` no Windows).
- **better-sqlite3 falhou no install**: `npm approve-scripts better-sqlite3` e reinstale — o prebuild N-API dispensa Visual Studio.
- **Setup parcial**: rode `npm run setup` de novo; cada filme é idempotente.
- **Live não aparece**: confirme o OBS apontando para `rtmp://localhost:1935/live` e veja `GET http://localhost:4000/api/live/status`.

---

Projeto acadêmico — conteúdo de demonstração: filmes abertos da Blender Foundation (CC-BY). 
