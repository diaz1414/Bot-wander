import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type TextChannel,
  type User
} from 'discord.js';
import { LavalinkManager, type Player, type Track } from 'lavalink-client';
import type { WanderBotClient } from '../client.js';
import { config } from '../config.js';
import { createBaseEmbed } from '../utils/embeds.js';

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

export function buildNowPlayingEmbed(player: Player, track: Track): any {
  const current = player.position || 0;
  const total = track.info.duration || 0;
  const isStream = track.info.isStream;

  const bar = isStream ? '🔴 LIVE STREAM' : `${createProgressBar(current, total)} [${formatMusicDuration(current)} / ${formatMusicDuration(total)}]`;

  const isAutoplay = player.get('autoplay') === true;
  const is247 = player.get('24/7') === true;
  const loopMode = player.repeatMode || 'off';

  const embed = createBaseEmbed()
    .setTitle('🎵 SEDANG DIPUTAR • WANDER MUSIC')
    .setDescription(
      `### [${track.info.title}](${track.info.uri})\n` +
        `👤 **Penyanyi / Author:** \`${track.info.author || 'Tidak Diketahui'}\`\n` +
        `⏱️ **Durasi:** ${bar}\n\n` +
        `🔊 **Volume:** \`${player.volume}%\` | 🔁 **Loop:** \`${loopMode.toUpperCase()}\` | 📻 **Autoplay:** \`${isAutoplay ? 'ON' : 'OFF'}\` | ⏰ **24/7:** \`${is247 ? 'ON' : 'OFF'}\``
    )
    .setColor('#9B59B6');

  if (track.info.artworkUrl) {
    embed.setThumbnail(track.info.artworkUrl);
  }

  const requester = (track as any).requester as User | undefined;
  if (requester) {
    embed.setFooter({
      text: `Diminta oleh: ${requester.tag} • Wander Roleplay Music`,
      iconURL: requester.displayAvatarURL()
    });
  }

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
      secure: n.secure ?? (n.port === 443)
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
      defaultSearchPlatform: 'ytsearch',
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
      const channel = (await client.channels.fetch(player.textChannelId).catch(() => null)) as TextChannel | null;
      if (!channel || !channel.isTextBased()) return;

      const embed = buildNowPlayingEmbed(player, track);
      const components = buildNowPlayingComponents(player);

      const msg = await channel.send({ embeds: [embed], components });
      player.set('nowplaying_msg_id', msg.id);
    } catch (err) {
      console.error('[LAVALINK] Gagal mengirim pesan now playing:', err);
    }
  });

  // Queue End Event (Handles Autoplay & 24/7)
  client.lavalink.on('queueEnd', async (player, track) => {
    // Autoplay Handler
    const isAutoplay = player.get('autoplay') === true;
    if (isAutoplay && track) {
      try {
        const query = `ytsearch:${track.info.author} ${track.info.title} music`;
        const res = await player.search({ query }, client.user!);

        if (res.tracks.length > 0) {
          // Find next track not matching the exact same title
          const nextTrack = res.tracks.find((t) => t.info.title !== track.info.title) || res.tracks[0];
          await player.queue.add(nextTrack);

          if (player.textChannelId) {
            const channel = (await client.channels.fetch(player.textChannelId).catch(() => null)) as TextChannel | null;
            if (channel && channel.isTextBased()) {
              await channel.send({
                content: `📻 **Autoplay:** Memutar lagu rekomendasi berikutnya: **${nextTrack.info.title}**`
              });
            }
          }

          await player.play();
          return;
        }
      } catch (autoplayErr) {
        console.error('[LAVALINK] Error during autoplay search:', autoplayErr);
      }
    }

    // 24/7 Mode check
    const is247 = player.get('24/7') === true;
    if (is247) {
      // Do nothing, remain in voice channel forever!
      return;
    }

    // Normal mode: notify queue ended
    if (player.textChannelId) {
      const channel = (await client.channels.fetch(player.textChannelId).catch(() => null)) as TextChannel | null;
      if (channel && channel.isTextBased()) {
        await channel.send({
          content: '🏁 **Antrean lagu telah selesai.** Bot akan standby (gunakan `/music 247` jika ingin bot tetap di voice channel 24 jam).'
        });
      }
    }
  });
}
