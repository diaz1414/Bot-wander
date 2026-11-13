import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { deleteWarning, clearWarnings } from '../../database/schema.js';

export const clearwarnCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('clearwarn')
    .setDescription('Menghapus riwayat peringatan (warn) warga (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang warn-nya ingin dihapus').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('warn_id')
        .setDescription('ID spesifik warn yang ingin dihapus (kosongkan untuk hapus semua)')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const warnId = interaction.options.getInteger('warn_id');

    if (warnId) {
      const deleted = deleteWarning(interaction.guild.id, warnId);
      if (!deleted) {
        await interaction.reply({
          embeds: [createErrorEmbed('GAGAL', `Warn dengan ID \`#${warnId}\` tidak ditemukan untuk server ini.`)],
          ephemeral: true
        });
        return;
      }

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'WARN DIHAPUS',
            `Peringatan dengan ID \`#${warnId}\` untuk warga **${targetUser.tag}** telah berhasil dihapus dari database.`
          )
        ]
      });
    } else {
      const count = clearWarnings(interaction.guild.id, targetUser.id);
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'SEMUA WARN DIHAPUS',
            `Berhasil membersihkan **${count}** catatan peringatan untuk warga **${targetUser.tag}**.`
          )
        ]
      });
    }
  }
};
