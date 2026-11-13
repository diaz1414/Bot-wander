import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type VoiceBasedChannel
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import {
  buildNowPlayingEmbed,
  buildNowPlayingComponents,
  buildQueueEmbed,
  formatMusicDuration,
  prepareAutoplayNextTrack,
  smartSearch
} from '../../modules/musicManager.js';
import type { WanderBotClient } from '../../client.js';

export async function checkVoiceChannel(
  interaction: ChatInputCommandInteraction
): Promise<VoiceBasedChannel | null> {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;

  if (!voiceChannel) {
    await interaction.reply({
      embeds: [createErrorEmbed('SUARA TIDAK DITEMUKAN', 'Kamu harus bergabung ke dalam Voice Channel terlebih dahulu!')],
      ephemeral: true
    });
    return null;
  }

  const client = interaction.client as WanderBotClient;
  const player = client.lavalink.getPlayer(interaction.guildId!);

  if (player && player.voiceChannelId && player.voiceChannelId !== voiceChannel.id) {
    await interaction.reply({
      embeds: [
        createErrorEmbed(
          'VOICE CHANNEL BERBEDA',
          `Bot sedang memutar musik di <#${player.voiceChannelId}>. Kamu harus berada di channel yang sama!`
        )
      ],
      ephemeral: true
    });
    return null;
  }

  return voiceChannel;
}

export const musicCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('music')
    .setDescription('Sistem Pemutar Musik Wander Roleplay (Lavalink v4, Autoplay, 24 Jam)')
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('Putar lagu/link dari Spotify, YouTube, Apple Music, SoundCloud, Deezer, Yandex, dll')
        .addStringOption((opt) =>
          opt
            .setName('lagu')
            .setDescription('Judul lagu atau link URL (Spotify / YouTube / Apple / SoundCloud / Deezer / Audio)')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('platform')
            .setDescription('Prioritas sumber (Default: Cari Spotify dulu -> Fallback YouTube jika tidak ada)')
            .setRequired(false)
            .addChoices(
              { name: '✨ Otomatis (Spotify ➔ YouTube ➔ Lainnya)', value: 'auto' },
              { name: '🟢 Spotify', value: 'spotify' },
              { name: '🔴 YouTube', value: 'youtube' },
              { name: '🍎 Apple Music', value: 'applemusic' },
              { name: '🟠 SoundCloud', value: 'soundcloud' },
              { name: '💙 Deezer', value: 'deezer' },
              { name: '🟡 Yandex Music', value: 'yandex' },
              { name: '🎵 YouTube Music', value: 'youtubemusic' }
            )
        )
    )
    .addSubcommand((sub) => sub.setName('sources').setDescription('Lihat daftar lengkap sumber musik yang didukung'))
    .addSubcommand((sub) => sub.setName('stop').setDescription('Hentikan musik dan bersihkan antrean'))
    .addSubcommand((sub) => sub.setName('skip').setDescription('Lewati lagu yang sedang diputar'))
    .addSubcommand((sub) => sub.setName('pause').setDescription('Jeda lagu yang sedang diputar'))
    .addSubcommand((sub) => sub.setName('resume').setDescription('Lanjutkan kembali pemutaran musik'))
    .addSubcommand((sub) => sub.setName('queue').setDescription('Lihat daftar antrean lagu saat ini'))
    .addSubcommand((sub) => sub.setName('nowplaying').setDescription('Lihat lagu yang sedang diputar sekarang'))
    .addSubcommand((sub) =>
      sub
        .setName('autoplay')
        .setDescription('Nyalakan / matikan mode putar otomatis lagu rekomendasi mirip')
        .addBooleanOption((opt) =>
          opt.setName('status').setDescription('True untuk Aktif, False untuk Matikan').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('247')
        .setDescription('Nyalakan / matikan mode 24 jam bot standby di voice channel tanpa disconnect')
        .addBooleanOption((opt) =>
          opt.setName('status').setDescription('True untuk Aktif, False untuk Matikan').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('volume')
        .setDescription('Atur tingkat volume suara (1 - 150%)')
        .addIntegerOption((opt) =>
          opt.setName('tingkat').setDescription('Volume suara (1 - 150%)').setMinValue(1).setMaxValue(150).setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('loop')
        .setDescription('Atur mode pengulangan lagu')
        .addStringOption((opt) =>
          opt
            .setName('mode')
            .setDescription('Mode loop yang diinginkan')
            .setRequired(true)
            .addChoices(
              { name: '🔂 Ulang Lagu Ini (Track)', value: 'track' },
              { name: '🔁 Ulang Seluruh Antrean (Queue)', value: 'queue' },
              { name: '❌ Matikan Loop (Off)', value: 'off' }
            )
        )
    )
    .addSubcommand((sub) => sub.setName('shuffle').setDescription('Acak urutan antrean lagu')),
  async execute(interaction: ChatInputCommandInteraction) {
    const client = interaction.client as WanderBotClient;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // --- SUBCOMMAND: SOURCES (Lihat daftar lengkap sumber yang didukung) ---
    if (sub === 'sources') {
      const embed = createBaseEmbed()
        .setTitle('🎵 SUMBER MUSIK YANG DIDUKUNG • WANDER ROLEPLAY')
        .setDescription(
          `Sistem pemutar musik Wander Roleplay bertenaga **Lavalink v4 Serenetia Nodes** dengan dukungan multi-sumber penuh:\n\n` +
            `• 🔴 **YouTube** \`[✅ Aktif]\`\n` +
            `  *Video URL, Shorts, Playlist, dan pencarian judul teks (\`ytsearch:\`).*\n\n` +
            `• 🟢 **Spotify** \`[✅ Aktif]\`\n` +
            `  *Track, Album, Playlist, Artist URL, dan pencarian judul teks (\`spsearch:\`).*\n\n` +
            `• 🍎 **Apple Music** \`[✅ Aktif]\`\n` +
            `  *Song, Album, Playlist URL, dan pencarian judul teks (\`amsearch:\`).*\n\n` +
            `• 🟠 **SoundCloud** \`[✅ Aktif]\`\n` +
            `  *Track, Sets, Artist URL, dan pencarian judul teks (\`scsearch:\`).*\n\n` +
            `• 💙 **Deezer** \`[✅ Aktif]\`\n` +
            `  *Track, Album, Playlist URL, dan pencarian judul teks (\`dzsearch:\`).*\n\n` +
            `• 🟡 **Yandex Music** \`[✅ Aktif]\`\n` +
            `  *Track, Album URL, dan pencarian judul teks (\`ymsearch:\`).*\n\n` +
            `• 📻 **HTTP Streaming** \`[✅ Aktif]\`\n` +
            `  *Live Web Radio, Icecast, Shoutcast, siaran langsung, dan playlist file (\`.m3u\`, \`.pls\`)*.\n\n` +
            `• 📁 **HTTP Audio File** \`[✅ Aktif]\`\n` +
            `  *Direct URL audio murni: \`.mp3\`, \`.wav\`, \`.flac\`, \`.ogg\`, \`.m4a\`, \`.aac\`.*\n\n` +
            `• ✨ **And more!** \`[✅ Aktif]\`\n` +
            `  *Twitch live audio, Bandcamp, dan web audio kustom lainnya.*\n\n` +
            `🧠 **Sistem Prioritas Cerdas (Smart Search):**\n` +
            `Saat kamu mengetik judul lagu biasa tanpa link (mode Auto), bot otomatis mencari ke **Spotify** terlebih dahulu. Apabila lagu tidak ditemukan di Spotify (misal versi cover, DJ remix, atau musik FiveM lokal), bot secara pintar langsung melanjutkan ke **YouTube** dan platform lainnya tanpa macet!`
        )
        .setFooter({ text: 'Wander Roleplay Music System • Bebas lag & Kualitas High Definition (Lavalink v4)' });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // --- SUBCOMMAND: PLAY ---
    if (sub === 'play') {
      const voiceChannel = await checkVoiceChannel(interaction);
      if (!voiceChannel) return;

      const query = interaction.options.getString('lagu', true);
      const platform = (interaction.options.getString('platform') || 'auto') as any;
      await interaction.deferReply();

      let player = client.lavalink.getPlayer(guildId);

      if (!player) {
        player = client.lavalink.createPlayer({
          guildId,
          voiceChannelId: voiceChannel.id,
          textChannelId: interaction.channelId,
          selfDeaf: true,
          selfMute: false,
          volume: 80
        });
      }

      if (!player.connected) {
        await player.connect();
      }

      // Default autoplay & 24/7 if unset
      if (player.get('autoplay') === undefined) player.set('autoplay', true);
      if (player.get('24/7') === undefined) player.set('24/7', false);

      // Smart Multi-Tier Search (Spotify -> YouTube -> Lainnya)
      const searchRes = await smartSearch(player, query, interaction.user, platform);

      if (!searchRes || !searchRes.result || !searchRes.result.tracks.length) {
        await interaction.editReply({
          embeds: [
            createErrorEmbed(
              'TIDAK DITEMUKAN',
              `Tidak dapat menemukan lagu dengan kata kunci: **${query}** baik di Spotify maupun YouTube.\nSilakan coba gunakan kata kunci yang lebih spesifik atau link langsung.`
            )
          ]
        });
        return;
      }

      const res = searchRes.result;
      const source = searchRes.source;

      if (res.loadType === 'playlist') {
        for (const track of res.tracks) {
          (track as any).requester = interaction.user;
          await player.queue.add(track);
        }

        const embed = createSuccessEmbed(
          'PLAYLIST DITAMBAHKAN',
          `Berhasil menambahkan **${res.tracks.length}** lagu dari playlist **${res.playlist?.title || 'Playlist'}** ke antrean!\n` +
            `🌐 **Sumber:** \`${source}\``
        );

        await interaction.editReply({ embeds: [embed] });
      } else {
        const track = res.tracks[0];
        (track as any).requester = interaction.user;
        await player.queue.add(track);

        if (player.playing) {
          const embed = createSuccessEmbed(
            'MASUK KE ANTREAN',
            `🎵 [${track.info.title}](${track.info.uri})\n` +
              `👤 **Author:** \`${track.info.author}\` | 🌐 **Sumber:** \`${source}\` | ⏱️ **Durasi:** \`${formatMusicDuration(track.info.duration || 0)}\`\n` +
              `📊 **Posisi Antrean:** #${player.queue.tracks.length}`
          );
          await interaction.editReply({ embeds: [embed] });
        } else {
          const playEmbed = createBaseEmbed()
            .setTitle('▶️ MEMULAI PEMUTARAN MUSIK')
            .setColor('#2ECC71')
            .setDescription(
              `🎵 [${track.info.title}](${track.info.uri})\n` +
                `👤 **Artis / Author:** \`${track.info.author}\`\n` +
                `🌐 **Sumber:** ${source} | ⏱️ **Durasi:** \`${formatMusicDuration(track.info.duration || 0)}\`\n` +
                `🔊 **Channel Suara:** <#${voiceChannel.id}>`
            );
          if (track.info.artworkUrl) playEmbed.setThumbnail(track.info.artworkUrl);
          await interaction.editReply({ embeds: [playEmbed] });
        }
      }

      // Kalibrasi ulang rekomendasi Autoplay berdasarkan lagu baru yang ditambahkan warga
      if (player.get('autoplay') === true) {
        const lastTrack = player.queue.tracks[player.queue.tracks.length - 1] || player.queue.current;
        if (lastTrack) prepareAutoplayNextTrack(player, client, lastTrack).catch(() => null);
      }

      if (!player.playing) {
        await player.play();
      }
      return;
    }

    // Other subcommands require an active player
    const player = client.lavalink.getPlayer(guildId);
    if (!player) {
      await interaction.reply({
        embeds: [createErrorEmbed('TIDAK ADA MUSIK', 'Sedang tidak ada pemutar musik aktif di server ini.')],
        ephemeral: true
      });
      return;
    }

    // Check voice channel match
    const voiceChannel = await checkVoiceChannel(interaction);
    if (!voiceChannel) return;

    // --- SUBCOMMAND: STOP ---
    if (sub === 'stop') {
      player.queue.tracks.splice(0, player.queue.tracks.length);
      player.set('autoplay_next_track', null);
      player.set('24/7', false);
      await player.stopPlaying();
      await player.destroy();
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'MUSIK DIHENTIKAN',
            'Pemutaran musik telah dihentikan, antrean dibersihkan, dan bot langsung keluar dari voice channel.'
          )
        ]
      });
      return;
    }

    if (!player.queue.current && player.queue.tracks.length === 0) {
      await interaction.reply({
        embeds: [createErrorEmbed('TIDAK ADA MUSIK', 'Sedang tidak ada lagu yang diputar di antrean.')],
        ephemeral: true
      });
      return;
    }

    // --- SUBCOMMAND: SKIP ---
    if (sub === 'skip') {
      const currentTrack = player.queue.current;
      await player.skip();
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'LAGU DILEWATI',
            `Berhasil melewati lagu: **${currentTrack?.info.title || 'Lagu'}**.`
          )
        ]
      });
      return;
    }

    // --- SUBCOMMAND: PAUSE ---
    if (sub === 'pause') {
      if (player.paused) {
        await interaction.reply({
          embeds: [createErrorEmbed('SUDAH DIJEDA', 'Musik sudah dalam keadaan terhenti sementara (paused).')],
          ephemeral: true
        });
        return;
      }
      await player.pause();
      await interaction.reply({
        embeds: [createSuccessEmbed('MUSIK DIJEDA', '⏸️ Pemutaran musik dijeda sementara.')]
      });
      return;
    }

    // --- SUBCOMMAND: RESUME ---
    if (sub === 'resume') {
      if (!player.paused) {
        await interaction.reply({
          embeds: [createErrorEmbed('SEDANG BERJALAN', '▶️ Musik sedang berjalan secara normal.')],
          ephemeral: true
        });
        return;
      }
      await player.resume();
      await interaction.reply({
        embeds: [createSuccessEmbed('MUSIK DILANJUTKAN', '▶️ Pemutaran musik dilanjutkan kembali.')]
      });
      return;
    }

    // --- SUBCOMMAND: NOWPLAYING ---
    if (sub === 'nowplaying') {
      const current = player.queue.current;
      if (!current) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK ADA LAGU', 'Tidak ada lagu yang sedang diputar saat ini.')],
          ephemeral: true
        });
        return;
      }
      const embed = buildNowPlayingEmbed(player, current);
      const components = buildNowPlayingComponents(player);
      await interaction.reply({ embeds: [embed], components, ephemeral: true });
      return;
    }

    // --- SUBCOMMAND: QUEUE ---
    if (sub === 'queue') {
      const embed = buildQueueEmbed(player, interaction.guild?.name);
      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // --- SUBCOMMAND: AUTOPLAY ---
    if (sub === 'autoplay') {
      const param = interaction.options.getBoolean('status');
      const newState = param !== null ? param : !player.get('autoplay');
      player.set('autoplay', newState);

      if (newState) {
        const cur = player.queue.tracks[player.queue.tracks.length - 1] || player.queue.current;
        if (cur) prepareAutoplayNextTrack(player, client, cur).catch(() => null);
      } else {
        player.set('autoplay_next_track', null);
      }

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'MODE AUTOPLAY DIPERBARUI',
            `Mode Autoplay sekarang: **${
              newState
                ? '🟢 AKTIF (Rekomendasi genre sejenis otomatis disiapkan & tampil di antrean /music queue)'
                : '🔴 NONAKTIF'
            }**.`
          )
        ]
      });
      return;
    }

    // --- SUBCOMMAND: 247 ---
    if (sub === '247') {
      const param = interaction.options.getBoolean('status');
      const newState = param !== null ? param : !player.get('24/7');
      player.set('24/7', newState);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'MODE 24/7 STANDBY DIPERBARUI',
            `Mode Standby 24 Jam sekarang: **${
              newState
                ? '🟢 AKTIF (Bot akan standby 24 jam di voice channel dan tidak akan disconnect)'
                : '🔴 NONAKTIF (Bot akan keluar jika antrean kosong)'
            }**.`
          )
        ]
      });
      return;
    }

    // --- SUBCOMMAND: VOLUME ---
    if (sub === 'volume') {
      const vol = interaction.options.getInteger('tingkat', true);
      await player.setVolume(vol);
      await interaction.reply({
        embeds: [createSuccessEmbed('VOLUME DIATUR', `Volume pemutar musik diatur ke **${vol}%**.`)]
      });
      return;
    }

    // --- SUBCOMMAND: LOOP ---
    if (sub === 'loop') {
      const mode = interaction.options.getString('mode', true) as 'track' | 'queue' | 'off';
      await player.setRepeatMode(mode);
      await interaction.reply({
        embeds: [createSuccessEmbed('MODE LOOP DIATUR', `Mode pengulangan musik sekarang diatur ke: **${mode.toUpperCase()}**.`)]
      });
      return;
    }

    // --- SUBCOMMAND: SHUFFLE ---
    if (sub === 'shuffle') {
      if (player.queue.tracks.length < 2) {
        await interaction.reply({
          embeds: [createErrorEmbed('ANTREAN KURANG', 'Antrean membutuhkan minimal 2 lagu untuk dapat diacak.')],
          ephemeral: true
        });
        return;
      }
      player.queue.tracks.sort(() => Math.random() - 0.5);
      await interaction.reply({
        embeds: [createSuccessEmbed('ANTREAN DIACAK', `Berhasil mengacak urutan **${player.queue.tracks.length}** lagu di antrean.`)]
      });
    }
  }
};
