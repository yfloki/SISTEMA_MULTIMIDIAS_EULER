// Fontes abertas (Blender Foundation / mirrors públicos estáveis)
export const MOVIES = [
  { slug: 'big-buck-bunny',
    url: 'https://download.blender.org/peach/bigbuckbunny_movies/big_buck_bunny_1080p_h264.mov.zip' },
  { slug: 'sintel',
    url: 'https://download.blender.org/durian/movies/Sintel.2010.1080p.mkv' },
  { slug: 'tears-of-steel',
    url: 'https://download.blender.org/demo/movies/ToS/tears_of_steel_720p.mov' },
  { slug: 'elephants-dream',
    url: 'https://archive.org/download/ElephantsDream/ed_hd.mp4' },
  { slug: 'cosmos-laundromat',
    url: 'https://archive.org/download/CosmosLaundromatFirstCycle/Cosmos%20Laundromat%20-%20First%20Cycle%20%281080p%29.mp4' },
  { slug: 'spring',
    url: 'https://archive.org/download/spring-blender-open-movie/spring-1080p.mp4' },
  // Domínio público (EUA) — com dublagem pt-BR de estúdio já existente:
  // dubUrl aponta a versão dublada; scripts/dub.mjs alinha e extrai a faixa.
  { slug: 'night-of-the-living-dead',
    url: 'https://archive.org/download/Night.Of.The.Living.Dead_1080p/NightOfTheLivingDead_1080p.mp4',
    dubUrl: 'https://archive.org/download/anoitedosmortosvivos1968dublado/A%20Noite%20dos%20Mortos-Vivos%20%281968%29%20Dublado.mp4' },
];
