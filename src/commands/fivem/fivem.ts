import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export async function fetchFiveMStatus(): Promise<{
  online: boolean;
  players: number;
  maxPlayers: number;
  pingMs: number;
  gametype?: string;
  mapname?: string;
}> {
  const ip = config.fivem?.serverIp || '127.0.0.1';
  const port = config.fivem?.serverPort || 30120;
  const url = `http://${ip}:${port}/dynamic.json`;

  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return { online: false, players: 0, maxPlayers: 0, pingMs: 0 };
    }

    const data: any = await res.json();
    const pingMs = Date.now() - startTime;

    return {
      online: true,
      players: data.clients || 0,
      maxPlayers: data.sv_maxclients || 128,
      pingMs,
      gametype: data.gametype || 'Roleplay',
      mapname: data.mapname || 'Los Santos'
    };
  } catch {
    return { online: false, players: 0, maxPlayers: 0, pingMs: 0 };
  }
}

export const fivemCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('fivem')
    .setDescription('Informasi & status server FiveM Wander Roleplay')
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Cek status online, jumlah warga & ping server FiveM')
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Pasang live monitor server status yang otomatis diperbarui (Hanya Admin)')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tempat monitor status dipasang').setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'status') {
      await interaction.deferReply();
      const status = await fetchFiveMStatus();

      const embed = createBaseEmbed()
        .setTitle(`🏙️ STATUS SERVER: ${config.server.name.toUpperCase()}`)
        .setDescription(
          `Informasi kondisi realtime server FiveM **${config.server.name}**:\n\n` +
            `🔗 **CFX Connect:** \`${config.server.cfxConnect}\`\n` +
            `🌐 **Website:** [${config.server.website}](${config.server.website})`
        );

      if (status.online) {
        embed
          .setColor('#2ECC71')
          .addFields(
            { name: '🟢 Status Kota', value: '**ONLINE / BUKA**', inline: true },
            { name: '👥 Warga di Kota', value: `**${status.players} / ${status.maxPlayers}** Warga`, inline: true },
            { name: '⚡ Latensi (Ping)', value: `\`${status.pingMs} ms\``, inline: true }
          );
      } else {
        embed
          .setColor('#E74C3C')
          .addFields(
            { name: '🔴 Status Kota', value: '**OFFLINE / MAINTENANCE**', inline: true },
            { name: '👥 Warga di Kota', value: '`0 / 0` Warga', inline: true },
            { name: '🛠️ Catatan', value: '*Server sedang maintenance atau belum aktif.*', inline: true }
          );
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Connect FiveM')
          .setStyle(ButtonStyle.Link)
          .setURL(config.server.discordInvite || 'https://cfx.re')
          .setEmoji('🚗'),
        new ButtonBuilder()
          .setLabel('Website Resmi')
          .setStyle(ButtonStyle.Link)
          .setURL(config.server.website || 'https://wander-roleplay.com')
          .setEmoji('🌐')
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
      return;
    }

    if (sub === 'setup') {
      if (!(await checkAdminAccess(interaction))) return;

      const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed('GAGAL', 'Channel target harus channel teks!')],
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const status = await fetchFiveMStatus();
      const embed = createBaseEmbed()
        .setTitle(`🏙️ LIVE SERVER MONITOR: ${config.server.name.toUpperCase()}`)
        .setDescription(
          `Monitor realtime server FiveM **${config.server.name}**.\n*Embed ini otomatis memperbarui statistik warga setiap menit.*\n\n` +
            `🔗 **Koneksi:** \`${config.server.cfxConnect}\``
        );

      if (status.online) {
        embed
          .setColor('#2ECC71')
          .addFields(
            { name: '🟢 Status Kota', value: '**ONLINE**', inline: true },
            { name: '👥 Warga di Kota', value: `**${status.players} / ${status.maxPlayers}**`, inline: true },
            { name: '⚡ Ping', value: `\`${status.pingMs} ms\``, inline: true }
          );
      } else {
        embed
          .setColor('#E74C3C')
          .addFields(
            { name: '🔴 Status Kota', value: '**OFFLINE**', inline: true },
            { name: '👥 Warga di Kota', value: '`0` Warga', inline: true },
            { name: '🛠️ Keterangan', value: '*Kota Sedang Istirahat / Update*', inline: true }
          );
      }

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setLabel('Buka FiveM')
          .setStyle(ButtonStyle.Link)
          .setURL(config.server.discordInvite)
          .setEmoji('🎮')
      );

      const msg = await targetChannel.send({ embeds: [embed], components: [row] });

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'LIVE MONITOR DIPASANG',
            `Monitor status server berhasil dipasang di <#${targetChannel.id}>!`
          )
        ]
      });
    }
  }
};
