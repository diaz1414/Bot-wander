import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';

export const slowmodeCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Mengatur jeda waktu pengiriman pesan (slowmode) (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((opt) =>
      opt
        .setName('detik')
        .setDescription('Waktu jeda dalam detik (0 untuk mematikan, maks 21600 detik = 6 jam)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    )
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel yang ingin diatur (default: channel saat ini)').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;

    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
    if (!channel || !channel.isTextBased() || !('setRateLimitPerUser' in channel)) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL', 'Channel yang dipilih tidak valid.')],
        ephemeral: true
      });
      return;
    }

    const seconds = interaction.options.getInteger('detik', true);

    try {
      await channel.setRateLimitPerUser(seconds, `Slowmode diatur oleh ${interaction.user.tag}`);

      const embed =
        seconds === 0
          ? createSuccessEmbed('SLOWMODE DIMATIKAN', `Slowmode di <#${channel.id}> telah dinonaktifkan.`)
          : createSuccessEmbed(
              'SLOWMODE DIAKTIFKAN',
              `Slowmode di <#${channel.id}> sekarang diatur ke **${seconds} detik** per pesan.`
            );

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL SLOWMODE', error.message)],
        ephemeral: true
      });
    }
  }
};
