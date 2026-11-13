import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';

export const unlockCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Membuka kembali channel yang terkunci (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('Channel yang ingin dibuka (default: channel saat ini)').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const channel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null,
        AddReactions: null
      });

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'CHANNEL DIBUKA KEMBALI',
            `🔓 Channel <#${channel.id}> telah dibuka kembali. Warga sudah dapat mengirim pesan secara normal.`
          )
        ]
      });

      await channel.send({
        embeds: [
          createSuccessEmbed(
            'CHANNEL AKTIF KEMBALI',
            `🔓 Channel ini telah dibuka kembali oleh Administrator **Wander Roleplay**. Selamat berdiskusi!`
          )
        ]
      });
    } catch (error: any) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL UNLOCK', error.message)],
        ephemeral: true
      });
    }
  }
};
