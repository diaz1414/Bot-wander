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

export const kickCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Mengeluarkan warga dari server Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang ingin di-kick').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan kick').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('alasan') || 'Pelanggaran peraturan Wander Roleplay.';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL KICK', 'Warga tidak ditemukan di server ini.')],
        ephemeral: true
      });
      return;
    }

    if (!targetMember.kickable) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL KICK', 'Bot tidak dapat mengeluarkan warga ini (posisi role bot lebih rendah).')],
        ephemeral: true
      });
      return;
    }

    const currentMember = interaction.member as GuildMember;
    if (
      interaction.user.id !== interaction.guild.ownerId &&
      targetMember.roles.highest.position >= currentMember.roles.highest.position
    ) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL KICK', 'Kamu tidak dapat mengeluarkan warga yang role-nya setara atau lebih tinggi!')],
        ephemeral: true
      });
      return;
    }

    // Try sending DM
    try {
      await targetUser.send({
        embeds: [
          createErrorEmbed(
            'KAMU DI-KICK DARI WANDER ROLEPLAY',
            `Kamu telah dikeluarkan dari server **Wander Roleplay**.\n\n` +
              `👮 **Moderator:** ${interaction.user.tag}\n` +
              `📝 **Alasan:** ${reason}`
          )
        ]
      });
    } catch {
      // Ignore DM error
    }

    await targetMember.kick(`${reason} | Oleh: ${interaction.user.tag}`);

    const successEmbed = createSuccessEmbed(
      'WARGA DIKELUARKAN',
      `Warga **${targetUser.tag}** (\`${targetUser.id}\`) telah berhasil di-kick dari Wander Roleplay.\n\n📝 **Alasan:** ${reason}`
    );

    await interaction.reply({ embeds: [successEmbed] });

    const logEmbed = createModActionEmbed('KICK', targetUser, interaction.user, reason);
    await sendModLog(interaction.guild, logEmbed);
  }
};
