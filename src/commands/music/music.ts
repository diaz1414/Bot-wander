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
  formatMusicDuration
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
        .setDescription('Putar lagu dari YouTube, Spotify, SoundCloud, atau judul lagu')
        .addStringOption((opt) =>
          opt.setName('lagu').setDescription('Judul lagu atau link musik').setRequired(true)
        )
    )
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

    // --- SUBCOMMAND: PLAY ---
    if (sub === 'play') {
      const voiceChannel = await checkVoiceChannel(interaction);
      if (!voiceChannel) return;

      const query = interaction.options.getString('lagu', true);
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

      const res = await player.search({ query }, interaction.user);

      if (!res || !res.tracks.length) {
        await interaction.editReply({
          embeds: [createErrorEmbed('TIDAK DITEMUKAN', `Tidak dapat menemukan lagu dengan kata kunci: **${query}**`)]
        });
        return;
      }

      if (res.loadType === 'playlist') {
        for (const track of res.tracks) {
          (track as any).requester = interaction.user;
          await player.queue.add(track);
        }

        const embed = createSuccessEmbed(
          'PLAYLIST DITAMBAHKAN',
          `Berhasil menambahkan **${res.tracks.length}** lagu dari playlist **${res.playlist?.title || 'Playlist'}** ke antrean!`
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
              `👤 **Author:** \`${track.info.author}\` | ⏱️ **Durasi:** \`${formatMusicDuration(track.info.duration || 0)}\`\n` +
              `📊 **Posisi Antrean:** #${player.queue.tracks.length}`
          );
          await interaction.editReply({ embeds: [embed] });
        } else {
          await interaction.editReply({
            content: `🔍 Memutar: **${track.info.title}** di <#${voiceChannel.id}>...`
          });
        }
      }

      if (!player.playing) {
        await player.play();
      }
      return;
    }

    // Other subcommands require an active player
    const player = client.lavalink.getPlayer(guildId);
    if (!player || (!player.queue.current && player.queue.tracks.length === 0)) {
      await interaction.reply({
        embeds: [createErrorEmbed('TIDAK ADA MUSIK', 'Sedang tidak ada musik yang diputar di server ini.')],
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
      await player.stopPlaying();
      if (!player.get('24/7')) {
        await player.destroy();
      }
      await interaction.reply({
        embeds: [createSuccessEmbed('MUSIK DIHENTIKAN', 'Pemutaran musik telah dihentikan dan antrean dibersihkan.')]
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
        await interaction.reply({ content: '⏸️ Musik sudah dalam keadaan terhenti sementara (paused).', ephemeral: true });
        return;
      }
      await player.pause();
      await interaction.reply({ content: '⏸️ Musik dijeda sementara.' });
      return;
    }

    // --- SUBCOMMAND: RESUME ---
    if (sub === 'resume') {
      if (!player.paused) {
        await interaction.reply({ content: '▶️ Musik sedang berjalan secara normal.', ephemeral: true });
        return;
      }
      await player.resume();
      await interaction.reply({ content: '▶️ Musik dilanjutkan kembali.' });
      return;
    }

    // --- SUBCOMMAND: NOWPLAYING ---
    if (sub === 'nowplaying') {
      const current = player.queue.current;
      if (!current) {
        await interaction.reply({ content: 'Tidak ada lagu yang sedang diputar.', ephemeral: true });
        return;
      }
      const embed = buildNowPlayingEmbed(player, current);
      const components = buildNowPlayingComponents(player);
      await interaction.reply({ embeds: [embed], components, ephemeral: true });
      return;
    }

    // --- SUBCOMMAND: QUEUE ---
    if (sub === 'queue') {
      const current = player.queue.current;
      const tracks = player.queue.tracks;

      const embed = createBaseEmbed()
        .setTitle(`📜 ANTREAN MUSIK • ${interaction.guild?.name.toUpperCase()}`)
        .setDescription(
          `🎵 **Sedang Diputar:**\n` +
            (current ? `>>> [${current.info.title}](${current.info.uri}) (\`${formatMusicDuration(current.info.duration)}\`)` : '*Tidak ada*') +
            `\n\n📋 **Daftar Antrean Berikutnya:**\n` +
            (tracks.length === 0
              ? '*Antrean kosong. Gunakan `/music play` untuk menambah lagu.*'
              : tracks
                  .slice(0, 10)
                  .map((t, idx) => `**${idx + 1}.** [${t.info.title}](${t.info.uri}) (\`${formatMusicDuration(t.info.duration || 0)}\`)`)
                  .join('\n')) +
            (tracks.length > 10 ? `\n*...dan ${tracks.length - 10} lagu lainnya.*` : '')
        )
        .addFields({
          name: '⚙️ Mode Player',
          value: `📻 Autoplay: \`${player.get('autoplay') ? 'ON' : 'OFF'}\` | ⏰ 24/7: \`${player.get('24/7') ? 'ON' : 'OFF'}\` | 🔁 Loop: \`${player.repeatMode.toUpperCase()}\``
        });

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // --- SUBCOMMAND: AUTOPLAY ---
    if (sub === 'autoplay') {
      const param = interaction.options.getBoolean('status');
      const newState = param !== null ? param : !player.get('autoplay');
      player.set('autoplay', newState);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'MODE AUTOPLAY DIPERBARUI',
            `Mode Autoplay sekarang: **${newState ? '🟢 AKTIF (Lagu rekomendasi otomatis dimainkan saat antrean habis)' : '🔴 NONAKTIF'}**.`
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
        await interaction.reply({ content: 'Antrean membutuhkan minimal 2 lagu untuk diacak.', ephemeral: true });
        return;
      }
      player.queue.tracks.sort(() => Math.random() - 0.5);
      await interaction.reply({
        embeds: [createSuccessEmbed('ANTREAN DIACAK', `Berhasil mengacak urutan **${player.queue.tracks.length}** lagu di antrean.`)]
      });
    }
  }
};
