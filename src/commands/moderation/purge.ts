import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { sendModLog } from '../../modules/logger.js';
import { createModActionEmbed } from '../../utils/embeds.js';

export const purgeCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Menghapus sejumlah pesan di channel ini secara massal (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addIntegerOption((opt) =>
      opt
        .setName('jumlah')
        .setDescription('Jumlah pesan yang ingin dihapus (1 - 100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addUserOption((opt) =>
      opt.setName('target').setDescription('Hanya hapus pesan dari warga ini (opsional)').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    const channel = interaction.channel as TextChannel;

    if (!channel || !channel.isTextBased() || !('bulkDelete' in channel)) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL', 'Perintah ini hanya dapat dijalankan pada channel teks.')],
        ephemeral: true
      });
      return;
    }

    const amount = interaction.options.getInteger('jumlah', true);
    const targetUser = interaction.options.getUser('target');

    await interaction.deferReply({ ephemeral: true });

    try {
      const messages = await channel.messages.fetch({ limit: amount });
      let toDelete = messages;

      if (targetUser) {
        toDelete = messages.filter((m) => m.author.id === targetUser.id);
      }

      // Filter out messages older than 14 days (Discord limitation)
      const now = Date.now();
      const validMessages = toDelete.filter((m) => now - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);

      const deleted = await channel.bulkDelete(validMessages, true);

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'PESAN BERHASIL DIBERSIHKAN',
            `Berhasil menghapus **${deleted.size}** pesan di <#${channel.id}>${
              targetUser ? ` dari warga **${targetUser.tag}**` : ''
            }.`
          )
        ]
      });

      if (interaction.guild) {
        const logEmbed = createModActionEmbed('PURGE', interaction.user, interaction.user, `Pembersihan ${deleted.size} pesan di #${channel.name}`, [
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Total Dihapus', value: `${deleted.size} Pesan`, inline: true }
        ]);
        await sendModLog(interaction.guild, logEmbed);
      }
    } catch (error: any) {
      await interaction.editReply({
        embeds: [createErrorEmbed('GAGAL PURGE', `Terjadi kendala: ${error.message}`)]
      });
    }
  }
};
