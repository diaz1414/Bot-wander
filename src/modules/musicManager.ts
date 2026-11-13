import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
  type User
} from 'discord.js';
import { LavalinkManager, type Player, type Track, type UnresolvedTrack } from 'lavalink-client';
import type { WanderBotClient } from '../client.js';
import { config } from '../config.js';
import { createBaseEmbed } from '../utils/embeds.js';

export type AnyTrack = Track | UnresolvedTrack;

export type SearchResultType = Awaited<ReturnType<Player['search']>>;

export interface SmartSearchResult {
  result: SearchResultType;
  source: string;
}

export function formatMusicDuration(ms?: number | null): string {
  if (!ms || ms <= 0) return '00:00';
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function createProgressBar(currentMs: number, totalMs: number, barSize: number = 15): string {
  if (!totalMs || totalMs <= 0) return '🔘' + '▬'.repeat(barSize - 1);
  const progress = Math.min(Math.max(currentMs / totalMs, 0), 1);
  const progressIndex = Math.round(progress * (barSize - 1));

  let bar = '';
  for (let i = 0; i < barSize; i++) {
    if (i === progressIndex) {
      bar += '🔘';
    } else {
      bar += '▬';
    }
  }
  return bar;
}

export function getSourceBadge(sourceName?: string, uri?: string): string {
  const src = (sourceName || '').toLowerCase();
  const link = (uri || '').toLowerCase();

  if (src === 'spotify' || link.includes('spotify.com')) return '🟢 Spotify';
  if (src === 'youtube' || link.includes('youtube.com') || link.includes('youtu.be')) return '🔴 YouTube';
  if (src === 'applemusic' || link.includes('music.apple.com') || src === 'apple_music') return '🍎 Apple Music';
  if (src === 'deezer' || link.includes('deezer.com') || link.includes('deezer.page.link')) return '💙 Deezer';
  if (src === 'soundcloud' || link.includes('soundcloud.com')) return '🟠 SoundCloud';
  if (src === 'yandex' || src === 'yandexmusic' || link.includes('music.yandex.')) return '🟡 Yandex Music';
  if (src === 'youtubemusic' || link.includes('music.youtube.com')) return '🎵 YouTube Music';
  if (/\.(mp3|wav|flac|ogg|m4a|aac)(\?.*)?$/i.test(link)) return '📁 HTTP Audio File';
  if (src === 'http' || link.includes('stream') || link.includes('radio') || link.includes('.m3u') || link.includes('.pls')) {
    return '📻 HTTP Streaming';
  }
  return '🎧 Web Audio / Stream';
}

/**
 * Smart Multi-Tier Search mendukung seluruh sumber:
 * - 🔴 YouTube (ytsearch, direct link)
 * - 🟢 Spotify (spsearch, direct track/playlist/album/artist)
 * - 🍎 Apple Music (amsearch, direct link)
 * - 🟠 SoundCloud (scsearch, direct link)
 * - 💙 Deezer (dzsearch, direct link)
 * - 🟡 Yandex Music (ymsearch, direct link)
 * - 📻 HTTP Streaming (Radio, Shoutcast, Icecast, .m3u, .pls)
 * - 📁 HTTP Audio File (.mp3, .ogg, .flac, .wav, .m4a, .aac)
 *
 * Logika Pencarian Otomatis:
 * 1. Jika query berupa link URL -> langsung putar dari sumber aslinya.
 * 2. Jika query berupa judul teks:
 *    - Langkah 1: Utamakan pencarian dari Spotify (spsearch)
 *    - Langkah 2: Jika di Spotify tidak ada atau gagal, otomatis fallback ke YouTube (ytsearch)
 *    - Langkah 3: Jika masih tidak ada, coba Apple Music (amsearch)
 *    - Langkah 4: Coba Deezer (dzsearch)
 *    - Langkah 5: Coba SoundCloud (scsearch)
 *    - Langkah 6: Coba YouTube Music (ytmsearch)
 */
export async function smartSearch(
  player: Player,
  query: string,
  user: User,
  preferredPlatform:
    | 'auto'
    | 'spotify'
    | 'youtube'
    | 'applemusic'
    | 'deezer'
    | 'soundcloud'
    | 'youtubemusic'
    | 'yandex' = 'auto'
): Promise<SmartSearchResult | null> {
  const isUrl = /^https?:\/\//i.test(query.trim());

  // 1. Direct URL (Spotify, YouTube, Apple Music, Deezer, SoundCloud, Yandex, HTTP Audio File, HTTP Streaming)
  if (isUrl) {
    try {
      const res = await player.search({ query }, user);
      const source = getSourceBadge(res?.tracks?.[0]?.info?.sourceName, query);
      return { result: res, source };
    } catch (err) {
      return null;
    }
  }

  // 2. Specific platform requested by user
  if (preferredPlatform === 'spotify') {
    const spQuery = query.startsWith('spsearch:') ? query : `spsearch:${query}`;
    const res = await player.search({ query: spQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '🟢 Spotify' };
  } else if (preferredPlatform === 'youtube') {
    const ytQuery = query.startsWith('ytsearch:') ? query : `ytsearch:${query}`;
    const res = await player.search({ query: ytQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '🔴 YouTube' };
  } else if (preferredPlatform === 'applemusic') {
    const amQuery = query.startsWith('amsearch:') ? query : `amsearch:${query}`;
    const res = await player.search({ query: amQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '🍎 Apple Music' };
  } else if (preferredPlatform === 'deezer') {
    const dzQuery = query.startsWith('dzsearch:') ? query : `dzsearch:${query}`;
    const res = await player.search({ query: dzQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '💙 Deezer' };
  } else if (preferredPlatform === 'soundcloud') {
    const scQuery = query.startsWith('scsearch:') ? query : `scsearch:${query}`;
    const res = await player.search({ query: scQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '🟠 SoundCloud' };
  } else if (preferredPlatform === 'youtubemusic') {
    const ytmQuery = query.startsWith('ytmsearch:') ? query : `ytmsearch:${query}`;
    const res = await player.search({ query: ytmQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '🎵 YouTube Music' };
  } else if (preferredPlatform === 'yandex') {
    const ymQuery = query.startsWith('ymsearch:') ? query : `ymsearch:${query}`;
    const res = await player.search({ query: ymQuery }, user);
    if (res?.tracks?.length) return { result: res, source: '🟡 Yandex Music' };
  }

  // 3. AUTO TIERED SEARCH: Spotify -> YouTube -> Apple Music -> Deezer -> SoundCloud -> YouTube Music
  // Step A: Cari di Spotify terlebih dahulu
  try {
    const spQuery = query.startsWith('spsearch:') ? query : `spsearch:${query}`;
    const res = await player.search({ query: spQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '🟢 Spotify' };
    }
  } catch (err) {
    // Spotify gagal, lanjut ke YouTube
  }

  // Step B: Fallback ke YouTube jika Spotify tidak ada (misal DJ/Remix/Cover/Lagu Lokal)
  try {
    const ytQuery = query.startsWith('ytsearch:') ? query : `ytsearch:${query}`;
    const res = await player.search({ query: ytQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '🔴 YouTube' };
    }
  } catch (err) {
    // YouTube gagal, lanjut ke Apple Music
  }

  // Step C: Fallback ke Apple Music
  try {
    const amQuery = query.startsWith('amsearch:') ? query : `amsearch:${query}`;
    const res = await player.search({ query: amQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '🍎 Apple Music' };
    }
  } catch (err) {}

  // Step D: Fallback ke Deezer
  try {
    const dzQuery = query.startsWith('dzsearch:') ? query : `dzsearch:${query}`;
    const res = await player.search({ query: dzQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '💙 Deezer' };
    }
  } catch (err) {}

  // Step E: Fallback ke SoundCloud
  try {
    const scQuery = query.startsWith('scsearch:') ? query : `scsearch:${query}`;
    const res = await player.search({ query: scQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '🟠 SoundCloud' };
    }
  } catch (err) {}

  // Step F: Fallback ke YouTube Music
  try {
    const ytmQuery = query.startsWith('ytmsearch:') ? query : `ytmsearch:${query}`;
    const res = await player.search({ query: ytmQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '🎵 YouTube Music' };
    }
  } catch (err) {}

  // Step G: Fallback ke Yandex Music
  try {
    const ymQuery = query.startsWith('ymsearch:') ? query : `ymsearch:${query}`;
    const res = await player.search({ query: ymQuery }, user);
    if (res && res.tracks && res.tracks.length > 0) {
      return { result: res, source: '🟡 Yandex Music' };
    }
  } catch (err) {}

  return null;
}

/**
 * Normalisasi judul lagu untuk perbandingan kemiripan (menghapus label video klip, remix, feat, simbol)
 */
export function cleanTrackTitle(title: string): string {
  return (title || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/official\s+(music\s+)?video|lyrics?|visualizer|audio|remastered|hd|4k|ft\.?|feat\.?|slowed|reverb/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Memeriksa apakah dua lagu adalah lagu yang sama persis atau varian dari lagu yang sama
 */
export function isSameOrSimilarTrack(
  trackA: { title: string; author?: string; uri?: string },
  trackB: { title: string; author?: string; uri?: string }
): boolean {
  if (trackA.uri && trackB.uri && trackA.uri === trackB.uri) return true;

  const cleanA = cleanTrackTitle(trackA.title);
  const cleanB = cleanTrackTitle(trackB.title);

  if (cleanA === cleanB) return true;

  // Jika kata utama yang panjang saling terkandung (misal "Ginseng Strip 2002" vs "Ginseng Strip 2002 Slowed")
  if (cleanA.length >= 5 && cleanB.length >= 5) {
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  }

  return false;
}

/**
 * Mencatat riwayat pemutaran lagu agar Autoplay tidak mengulang lagu yang sama
 */
export function recordPlayedTrack(player: Player, track: AnyTrack) {
  const history: { title: string; author: string; uri?: string }[] = player.get('played_history') || [];
  history.push({
    title: track.info.title || '',
    author: track.info.author || '',
    uri: track.info.uri
  });
  if (history.length > 50) history.shift();
  player.set('played_history', history);
}

/**
 * Cek apakah sebuah lagu sudah pernah diputar baru-baru ini
 */
export function isTrackInHistory(player: Player, candidate: AnyTrack): boolean {
  const history: { title: string; author: string; uri?: string }[] = player.get('played_history') || [];
  return history.some((h) => isSameOrSimilarTrack(h, candidate.info));
}

/**
 * Algoritma Cerdas Rekomendasi Genre / Radio (Mirip Spotify & YouTube Autoplay)
 * - Menganalisis artis & genre dari lagu acuan
 * - Menelusuri Spotify Radio & YouTube Mix algorithm
 * - Menyaring agar TIDAK memainkan lagu yang sama persis atau yang ada di history
 * - Menyiapkan lagu berikutnya sehingga bisa dilihat di antrean sebelum diputar!
 */
export async function prepareAutoplayNextTrack(
  player: Player,
  client: WanderBotClient,
  referenceTrack?: AnyTrack | null
): Promise<Track | null> {
  const isAutoplay = player.get('autoplay') === true;
  if (!isAutoplay) {
    player.set('autoplay_next_track', null);
    return null;
  }

  const ref =
    referenceTrack ||
    player.queue.tracks[player.queue.tracks.length - 1] ||
    player.queue.current;

  if (!ref) return null;

  player.set('autoplay_fetching', true);

  try {
    const rawAuthor = ref.info.author?.replace(/ - Topic$/i, '').trim() || '';
    const cleanAuthor = rawAuthor.split(/[,&x/]/)[0].trim(); // Ambil artis utama
    const cleanTitle = cleanTrackTitle(ref.info.title);

    // Kumpulan query untuk memicu algoritma Radio / Mix dari Spotify & YouTube
    const searchQueries = [
      `spsearch:${cleanAuthor} Radio`,
      `spsearch:${cleanAuthor} Mix`,
      `ytsearch:${cleanAuthor} Mix playlist`,
      `ytsearch:${cleanAuthor} radio playlist`,
      `ytsearch:${cleanAuthor} similar music`,
      `spsearch:${cleanAuthor}`,
      `ytsearch:${cleanAuthor} ${cleanTitle} genre mix`
    ];

    const validCandidates: Track[] = [];

    for (const q of searchQueries) {
      if (validCandidates.length >= 6) break;
      try {
        const res = await player.search({ query: q }, client.user!);
        if (!res || !res.tracks || res.tracks.length === 0) continue;

        for (const candidate of res.tracks) {
          // 1. Jangan putar lagu yang sama persis dengan lagu acuan
          if (isSameOrSimilarTrack(ref.info, candidate.info)) continue;

          // 2. Jangan putar lagu yang sudah pernah diputar di history recent
          if (isTrackInHistory(player, candidate)) continue;

          // 3. Jangan putar lagu yang saat ini sudah ada di antrean manual warga
          const inQueue = player.queue.tracks.some((t) => isSameOrSimilarTrack(t.info, candidate.info));
          if (inQueue) continue;

          // 4. Hindari duplikasi internal kandidat
          const inCandidates = validCandidates.some((c) => isSameOrSimilarTrack(c.info, candidate.info));
          if (inCandidates) continue;

          validCandidates.push(candidate as Track);
        }
      } catch (err) {
        // Lanjutkan ke query alternatif
      }
    }

    if (validCandidates.length > 0) {
      // Pilih secara bervariasi dari kandidat terbaik agar nuansa radio organik
      const pickIndex = Math.floor(Math.random() * Math.min(validCandidates.length, 3));
      const chosen = validCandidates[pickIndex];

      (chosen as any).isAutoplay = true;
      (chosen as any).autoplayVibe = `${cleanAuthor} Radio / Genre Sejenis`;
      player.set('autoplay_next_track', chosen);
      player.set('autoplay_fetching', false);
      return chosen;
    }

    // Fallback sekunder: cari musik umum oleh artis
    try {
      const fallbackRes = await player.search({ query: `ytsearch:${cleanAuthor} music` }, client.user!);
      if (fallbackRes?.tracks?.length) {
        const candidate = fallbackRes.tracks.find(
          (t) => !isSameOrSimilarTrack(ref.info, t.info) && !isTrackInHistory(player, t)
        ) as Track | undefined;
        if (candidate) {
          (candidate as any).isAutoplay = true;
          (candidate as any).autoplayVibe = `${cleanAuthor} Genre`;
          player.set('autoplay_next_track', candidate);
          player.set('autoplay_fetching', false);
          return candidate;
        }
      }
    } catch {}

    player.set('autoplay_next_track', null);
    player.set('autoplay_fetching', false);
    return null;
  } catch (err) {
    console.error('[LAVALINK] Error during prepareAutoplayNextTrack:', err);
    player.set('autoplay_fetching', false);
    return null;
  }
}

export function buildNowPlayingEmbed(player: Player, track: Track): any {
  const current = player.position || 0;
  const total = track.info.duration || 0;
  const isStream = track.info.isStream;

  const bar = isStream
    ? '🔴 LIVE STREAM'
    : `${createProgressBar(current, total)} [${formatMusicDuration(current)} / ${formatMusicDuration(total)}]`;

  const isAutoplay = player.get('autoplay') === true;
  const is247 = player.get('24/7') === true;
  const loopMode = player.repeatMode || 'off';
  const sourceBadge = getSourceBadge(track.info.sourceName, track.info.uri);

  const nextInQueue = player.queue.tracks[0];
  const nextAutoplay = player.get('autoplay_next_track') as Track | undefined;

  let upNextLine = '';
  if (nextInQueue) {
    upNextLine = `\n\n⏭️ **Berikutnya (Antrean Warga):** [${nextInQueue.info.title}](${nextInQueue.info.uri}) (\`${nextInQueue.info.author}\`)`;
  } else if (isAutoplay && nextAutoplay) {
    upNextLine = `\n\n📻 **Berikutnya (Autoplay Rekomendasi):** [${nextAutoplay.info.title}](${nextAutoplay.info.uri}) (\`${nextAutoplay.info.author}\`)`;
  }

  const isFromAutoplay = (track as any).isAutoplay === true;
  const vibe = (track as any).autoplayVibe;

  const title = isFromAutoplay
    ? '📻 SEDANG DIPUTAR • AUTOPLAY REKOMENDASI'
    : '🎵 SEDANG DIPUTAR • WANDER MUSIC';

  const autoplayBadgeLine = isFromAutoplay
    ? `🏷️ **Autoplay Mode:** Rekomendasi Genre Sejenis${vibe ? ` (\`${vibe}\`)` : ''}\n`
    : '';

  const embed = createBaseEmbed()
    .setTitle(title)
    .setDescription(
      `### [${track.info.title}](${track.info.uri})\n` +
        `👤 **Penyanyi / Author:** \`${track.info.author || 'Tidak Diketahui'}\`\n` +
        `🌐 **Sumber Audio:** ${sourceBadge}\n` +
        autoplayBadgeLine +
        `⏱️ **Durasi:** ${bar}${upNextLine}\n\n` +
        `🔊 **Volume:** \`${player.volume}%\` | 🔁 **Loop:** \`${loopMode.toUpperCase()}\` | 📻 **Autoplay:** \`${isAutoplay ? 'ON' : 'OFF'}\` | ⏰ **24/7:** \`${is247 ? 'ON' : 'OFF'}\``
    )
    .setColor(isFromAutoplay ? '#9B59B6' : '#3498DB');

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  const requester = (track as any).requester as User | undefined;
  if (requester) {
    embed.setFooter({
      text: `Diminta oleh: ${requester.tag} • Wander Roleplay Music`,
      iconURL: requester.displayAvatarURL()
    });
  } else if (isFromAutoplay) {
    embed.setFooter({
      text: 'Wander Roleplay Music • Rekomendasi otomatis sejenis tanpa pengulangan'
    });
  }

  return embed;
}

/**
 * Membangun tampilan daftar antrean yang lengkap dengan lagu saat ini, antrean manual, dan rekomendasi autoplay
 */
export function buildQueueEmbed(player: Player, guildName?: string): any {
  const current = player.queue.current;
  const tracks = player.queue.tracks;
  const isAutoplay = player.get('autoplay') === true;
  const is247 = player.get('24/7') === true;
  const nextAutoplay = player.get('autoplay_next_track') as Track | undefined;
  const isFetchingAutoplay = player.get('autoplay_fetching') === true;

  let queueList = '';
  if (tracks.length === 0) {
    queueList = '*Antrean manual kosong (tidak ada lagu dari permintaan warga).*';
  } else {
    queueList = tracks
      .slice(0, 10)
      .map((t, idx) => {
        const req = (t as any).requester as User | undefined;
        const reqText = req ? ` • <@${req.id}>` : '';
        return `**${idx + 1}.** [${t.info.title}](${t.info.uri}) (\`${formatMusicDuration(t.info.duration || 0)}\`)${reqText}`;
      })
      .join('\n');
    if (tracks.length > 10) {
      queueList += `\n*...dan ${tracks.length - 10} lagu lainnya di antrean.*`;
    }
  }

  let autoplaySection = '';
  if (isAutoplay) {
    if (nextAutoplay) {
      const autoBadge = getSourceBadge(nextAutoplay.info.sourceName, nextAutoplay.info.uri);
      const vibe = (nextAutoplay as any).autoplayVibe || 'Algoritma Genre / Artis Mirip';
      const whenText = tracks.length > 0 ? 'Setelah antrean warga selesai' : 'Akan langsung diputar otomatis';
      autoplaySection =
        `\n\n📻 **Rekomendasi Autoplay Berikutnya (${whenText}):**\n` +
        `>>> ⏭️ **[${nextAutoplay.info.title}](${nextAutoplay.info.uri})** (\`${formatMusicDuration(nextAutoplay.info.duration || 0)}\`)\n` +
        `👤 **Artis:** \`${nextAutoplay.info.author}\` | 🌐 **Sumber:** ${autoBadge}\n` +
        `🏷️ **Vibe / Genre:** \`${vibe}\`\n` +
        `💡 *Lagu rekomendasi dipilih otomatis sesuai genre/style dan tidak akan mengulang lagu yang sama.*`;
    } else if (isFetchingAutoplay) {
      autoplaySection = '\n\n📻 **Rekomendasi Autoplay:** 🔄 *Sedang menganalisis genre & menyiapkan lagu rekomendasi mirip...*';
    } else {
      autoplaySection = '\n\n📻 **Rekomendasi Autoplay:** 🔄 *Menyiapkan lagu rekomendasi genre...*';
    }
  } else {
    autoplaySection = '\n\n📻 **Autoplay:** *Nonaktif (Gunakan `/music autoplay status:true` untuk memutar lagu genre sejenis otomatis).*';
  }

  const embed = createBaseEmbed()
    .setTitle(`📜 DAFTAR ANTREAN MUSIK • ${(guildName || 'WANDER ROLEPLAY').toUpperCase()}`)
    .setDescription(
      `🎵 **Sedang Diputar:**\n` +
        (current
          ? `>>> [${current.info.title}](${current.info.uri})\n` +
            `👤 **Artis:** \`${current.info.author || 'Tidak Diketahui'}\` | ⏱️ **Durasi:** \`${formatMusicDuration(current.info.duration || 0)}\` | 🌐 **Sumber:** ${getSourceBadge(current.info.sourceName, current.info.uri)}`
          : '*Tidak ada lagu yang sedang diputar.*') +
        `\n\n📋 **Antrean Permintaan Warga:**\n` +
        queueList +
        autoplaySection
    )
    .addFields({
      name: '⚙️ Status Pemutar Musik',
      value: `📻 Autoplay: \`${isAutoplay ? 'ON' : 'OFF'}\` | ⏰ 24/7: \`${is247 ? 'ON' : 'OFF'}\` | 🔁 Loop: \`${player.repeatMode.toUpperCase()}\` | 🔊 Volume: \`${player.volume}%\``
    })
    .setColor('#3498DB');

  return embed;
}

export function buildNowPlayingComponents(player: Player): ActionRowBuilder<ButtonBuilder>[] {
  const isPaused = player.paused;
  const isAutoplay = player.get('autoplay') === true;
  const is247 = player.get('24/7') === true;
  const loopMode = player.repeatMode || 'off';

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_toggle_pause')
      .setLabel(isPaused ? 'Lanjutkan' : 'Pause')
      .setEmoji(isPaused ? '▶️' : '⏸️')
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('music_skip')
      .setLabel('Skip')
      .setEmoji('⏭️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_stop')
      .setLabel('Stop')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('music_toggle_loop')
      .setLabel(`Loop: ${loopMode.toUpperCase()}`)
      .setEmoji('🔁')
      .setStyle(loopMode !== 'off' ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_toggle_autoplay')
      .setLabel(`Autoplay: ${isAutoplay ? 'ON' : 'OFF'}`)
      .setEmoji('📻')
      .setStyle(isAutoplay ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('music_vol_down')
      .setLabel('Vol -10%')
      .setEmoji('🔉')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_vol_up')
      .setLabel('Vol +10%')
      .setEmoji('🔊')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_show_queue')
      .setLabel('Antrean')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('music_toggle_247')
      .setLabel(`24/7: ${is247 ? 'ON' : 'OFF'}`)
      .setEmoji('⏰')
      .setStyle(is247 ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  return [row1, row2];
}

export function initMusicManager(client: WanderBotClient): void {
  const nodes = config.lavalink?.nodes || [
    {
      id: 'Serenetia-V4-SSL',
      host: 'lavalinkv4.serenetia.com',
      port: 443,
      authorization: 'https://seretia.link/discord',
      secure: true
    },
    {
      id: 'Serenetia-V4-NonSSL',
      host: 'lavalinkv4.serenetia.com',
      port: 80,
      authorization: 'https://seretia.link/discord',
      secure: false
    }
  ];

  client.lavalink = new LavalinkManager({
    nodes: nodes.map((n) => ({
      id: n.id || n.host,
      host: n.host,
      port: n.port,
      authorization: n.authorization,
      secure: n.secure ?? n.port === 443
    })),
    sendToShard: (guildId, payload) => {
      const guild = client.guilds.cache.get(guildId);
      if (guild) guild.shard.send(payload);
    },
    client: {
      id: config.env.clientId || '',
      username: 'WanderBot'
    },
    autoSkip: true,
    playerOptions: {
      defaultSearchPlatform: 'spsearch',
      onEmptyQueue: {
        destroyAfterMs: 60000
      }
    }
  });

  // Forward raw voice gateway updates
  client.on('raw', (d) => client.lavalink.sendRawData(d));

  // Node Events
  client.lavalink.nodeManager.on('connect', (node) => {
    console.log(`[LAVALINK] 🟢 Berhasil terhubung ke Lavalink Node: ${node.id} (${node.options.host}:${node.options.port})`);
  });

  client.lavalink.nodeManager.on('disconnect', (node, reason) => {
    console.warn(`[LAVALINK] 🟡 Node ${node.id} terputus:`, reason);
  });

  client.lavalink.nodeManager.on('error', (node, error) => {
    console.error(`[LAVALINK] 🔴 Error pada Node ${node.id}:`, error.message);
  });

  // Track Start Event
  client.lavalink.on('trackStart', async (player, track) => {
    if (!player.textChannelId || !track) return;
    try {
      // 1. Catat lagu ke riwayat pemutaran agar Autoplay tidak mengulang lagu yang sama
      recordPlayedTrack(player, track);

      // 2. Jika Autoplay aktif, siapkan rekomendasi lagu berikutnya di background agar langsung siap dilihat di antrean
      if (player.get('autoplay') === true) {
        prepareAutoplayNextTrack(player, client, track).catch((err) =>
          console.error('[LAVALINK] Background prepareAutoplay error:', err)
        );
      }

      const channel = (await client.channels.fetch(player.textChannelId).catch(() => null)) as TextChannel | null;
      if (!channel || !channel.isTextBased()) return;

      // Hapus kartu kontrol sebelumnya agar chat bersih dan tidak menumpuk/dobel
      const oldMsgId = player.get('nowplaying_msg_id') as string | undefined;
      if (oldMsgId) {
        channel.messages.delete(oldMsgId).catch(() => null);
      }

      const embed = buildNowPlayingEmbed(player, track);
      const components = buildNowPlayingComponents(player);

      const msg = await channel.send({ embeds: [embed], components });
      player.set('nowplaying_msg_id', msg.id);
    } catch (err) {
      console.error('[LAVALINK] Gagal mengirim pesan now playing:', err);
    }
  });

  // Queue End Event (Handles Smart Autoplay & 24/7)
  client.lavalink.on('queueEnd', async (player, track) => {
    // Autoplay Handler
    const isAutoplay = player.get('autoplay') === true;
    if (isAutoplay && track) {
      try {
        let nextTrack = player.get('autoplay_next_track') as Track | undefined;

        // Jika belum selesai disiapkan sebelumnya, cari rekomendasi genre sekarang
        if (!nextTrack) {
          nextTrack = (await prepareAutoplayNextTrack(player, client, track)) || undefined;
        }

        if (nextTrack) {
          player.set('autoplay_next_track', null);
          (nextTrack as any).requester = undefined;
          (nextTrack as any).isAutoplay = true;
          await player.queue.add(nextTrack);

          // Putar langsung, trackStart akan menampilkan satu kartu pemutar resmi yang rapi
          await player.play();
          return;
        }
      } catch (autoplayErr) {
        console.error('[LAVALINK] Error during autoplay search in queueEnd:', autoplayErr);
      }
    }

    // 24/7 Mode check
    const is247 = player.get('24/7') === true;
    if (is247) {
      if (player.textChannelId) {
        const channel = (await client.channels.fetch(player.textChannelId).catch(() => null)) as TextChannel | null;
        if (channel && channel.isTextBased()) {
          const standby247Embed = createBaseEmbed()
            .setTitle('⏰ STANDBY 24/7 • WANDER MUSIC')
            .setColor('#1ABC9C')
            .setDescription(
              `Seluruh antrean lagu telah selesai diputar.\n` +
                `Bot tetap **standby 24/7** di voice channel dan siap memutar lagu kapan saja.\n\n` +
                `🎵 Ketik \`/music play\` untuk menambah lagu baru!`
            )
            .setFooter({ text: 'Wander Roleplay Music • Mode Standby 24 Jam Aktif' });

          await channel.send({ embeds: [standby247Embed] });
        }
      }
      return;
    }

    // Normal mode: bot standby sebelum keluar
    if (player.textChannelId) {
      const channel = (await client.channels.fetch(player.textChannelId).catch(() => null)) as TextChannel | null;
      if (channel && channel.isTextBased()) {
        const queueEndEmbed = createBaseEmbed()
          .setTitle('🏁 ANTREAN LAGU SELESAI')
          .setColor('#E67E22')
          .setDescription(
            `Seluruh antrean musik di server telah selesai diputar.\n` +
              `Bot sedang standby di voice channel.\n\n` +
              `💡 **Tip:** Gunakan perintah \`/music 247\` jika ingin bot tetap standby di voice channel 24 jam tanpa keluar.`
          )
          .setFooter({
            text: 'Wander Roleplay Music System • Audio HD Serenetia Lavalink'
          });

        await channel.send({ embeds: [queueEndEmbed] });
      }
    }
  });
}
