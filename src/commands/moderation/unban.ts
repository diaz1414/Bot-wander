import { SlashCommandBuilder, PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createModActionEmbed } from '../../utils/embeds.js';
import { sendModLog } from '../../modules/logger.js';

export const unbanCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Mencabut hukuman banned warga berdasarkan User ID (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((opt) =>
      opt.setName('user_id').setDescription('Discord User ID warga yang ingin di-unban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan pencabutan ban').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const userId = interaction.options.getString('user_id', true).trim();
    const reason = interaction.options.getString('alasan') || 'Pengampunan / Unban Wander Roleplay.';

    try {
      const banInfo = await interaction.guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK DITEMUKAN', `User ID \`${userId}\` tidak berada dalam daftar banned server ini.`)],
          ephemeral: true
        });
        return;
      }

      await interaction.guild.bans.remove(userId, `${reason} | Oleh: ${interaction.user.tag}`);

      const successEmbed = createSuccessEmbed(
        'WARGA BERHASIL DI-UNBAN',
        `Warga **${banInfo.user.tag}** (\`${userId}\`) telah di-unban dari Wander Roleplay.\n\n📝 **Alasan:** ${reason}`
      );

      await interaction.reply({ embeds: [successEmbed] });

      const logEmbed = createModActionEmbed('UNBAN', banInfo.user, interaction.user, reason);
      await sendModLog(interaction.guild, logEmbed);
    } catch (error: any) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL UNBAN', `Terjadi kesalahan saat memproses unban: ${error.message}`)],
        ephemeral: true
      });
    }
  }
};
