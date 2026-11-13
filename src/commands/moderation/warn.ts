import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createModActionEmbed } from '../../utils/embeds.js';
import { addWarning, getWarnings } from '../../database/schema.js';
import { sendModLog } from '../../modules/logger.js';

export const warnCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Memberikan peringatan (warn) kepada warga Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang diberi peringatan').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan peringatan').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('alasan', true);

    const warnId = addWarning(interaction.guild.id, targetUser.id, interaction.user.id, reason);
    const totalWarns = getWarnings(interaction.guild.id, targetUser.id).length;

    // Send DM if possible
    try {
      await targetUser.send({
        embeds: [
          createErrorEmbed(
            'PERINGATAN RESMI DARI WANDER ROLEPLAY',
            `Kamu telah menerima peringatan (Warn #${warnId}) dari staff **Wander Roleplay**.\n\n` +
              `👮 **Moderator:** ${interaction.user.tag}\n` +
              `📝 **Alasan:** ${reason}\n` +
              `⚠️ **Total Peringatan Kamu:** ${totalWarns}\n\n` +
              `*Harap patuhi peraturan kota untuk menghindari hukuman timeout atau ban permanen.*`
          )
        ]
      });
    } catch {
      // Ignore DM error
    }

    const successEmbed = createSuccessEmbed(
      'PERINGATAN BERHASIL DIBERIKAN',
      `Warga **${targetUser.tag}** telah diberi peringatan.\n\n` +
        `🆔 **ID Warn:** \`#${warnId}\`\n` +
        `📝 **Alasan:** ${reason}\n` +
        `⚠️ **Total Warn:** **${totalWarns}** peringatan tersimpan di database.`
    );

    await interaction.reply({ embeds: [successEmbed] });

    const logEmbed = createModActionEmbed('WARN', targetUser, interaction.user, reason, [
      { name: '🆔 ID Warn', value: `#${warnId}`, inline: true },
      { name: '⚠️ Akumulasi Warn', value: `${totalWarns} Warn`, inline: true }
    ]);
    await sendModLog(interaction.guild, logEmbed);
  }
};
