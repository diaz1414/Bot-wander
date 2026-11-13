import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';

export const lockCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Mengunci channel agar warga tidak dapat mengirim pesan (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel yang ingin dikunci (default: channel saat ini)').setRequired(false)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan penguncian channel').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;
    const reason = interaction.options.getString('alasan') || 'Pemeliharaan channel / situasi darurat kota.';

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false,
        AddReactions: false
      });

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'CHANNEL DIKUNCI',
            `🔒 Channel <#${channel.id}> berhasil dikunci.\n\n📝 **Alasan:** ${reason}`
          )
        ]
      });

      await channel.send({
        embeds: [
          createErrorEmbed(
            'CHANNEL DIKUNCI SEMENTARA',
            `🔒 Channel ini telah dikunci oleh Administrator **Wander Roleplay**.\n📝 **Alasan:** ${reason}`
          )
        ]
      });
    } catch (error: any) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL LOCK', error.message)],
        ephemeral: true
      });
    }
  }
};
