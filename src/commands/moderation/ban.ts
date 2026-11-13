import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createModActionEmbed } from '../../utils/embeds.js';
import { sendModLog } from '../../modules/logger.js';

export const banCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Banned warga dari server Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang ingin dibanned').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan pemblokiran / banned').setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('hapus_pesan_hari')
        .setDescription('Hapus riwayat pesan (0 - 7 hari)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('alasan') || 'Pelanggaran peraturan Wander Roleplay.';
    const deleteDays = interaction.options.getInteger('hapus_pesan_hari') || 0;

    // Check if target is guild owner
    if (targetUser.id === interaction.guild.ownerId) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL BANNED', 'Kamu tidak dapat membanned Server Owner!')],
        ephemeral: true
      });
      return;
    }

    // Check target hierarchy if member exists
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const currentMember = interaction.member as GuildMember;

    if (targetMember) {
      if (!targetMember.bannable) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'GAGAL BANNED',
              'Bot tidak memiliki izin untuk membanned warga ini (posisi role bot lebih rendah).'
            )
          ],
          ephemeral: true
        });
        return;
      }

      if (
        interaction.user.id !== interaction.guild.ownerId &&
        targetMember.roles.highest.position >= currentMember.roles.highest.position
      ) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'GAGAL BANNED',
              'Kamu tidak dapat membanned warga yang memiliki role setara atau lebih tinggi darimu!'
            )
          ],
          ephemeral: true
        });
        return;
      }

      // Try sending DM to user before banning
      try {
        await targetUser.send({
          embeds: [
            createErrorEmbed(
              'KAMU DIBANNED DARI WANDER ROLEPLAY',
              `Kamu telah dibanned dari server **Wander Roleplay**.\n\n` +
                `👮 **Moderator:** ${interaction.user.tag}\n` +
                `📝 **Alasan:** ${reason}`
            )
          ]
        });
      } catch {
        // Ignore DM failure
      }
    }

    await interaction.guild.members.ban(targetUser.id, {
      deleteMessageSeconds: deleteDays * 24 * 60 * 60,
      reason: `${reason} | Oleh: ${interaction.user.tag}`
    });

    const successEmbed = createSuccessEmbed(
      'WARGA BERHASIL DIBANNED',
      `Warga **${targetUser.tag}** (\`${targetUser.id}\`) telah resmi dibanned dari Wander Roleplay.\n\n` +
        `📝 **Alasan:** ${reason}\n` +
        `🗑️ **Hapus Pesan:** ${deleteDays} hari terakhir`
    );

    await interaction.reply({ embeds: [successEmbed] });

    // Send mod-log
    const logEmbed = createModActionEmbed('BAN', targetUser, interaction.user, reason, [
      { name: '🗑️ Hapus Pesan', value: `${deleteDays} Hari`, inline: true }
    ]);
    await sendModLog(interaction.guild, logEmbed);
  }
};
