import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createModActionEmbed } from '../../utils/embeds.js';
import { sendModLog } from '../../modules/logger.js';

export const untimeoutCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Membatalkan hukuman timeout/mute warga (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang ingin di-untimeout').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan pencabutan timeout').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('alasan') || 'Pencabutan timeout oleh admin.';

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL UNTIMEOUT', 'Warga tidak ditemukan di server ini.')],
        ephemeral: true
      });
      return;
    }

    if (!targetMember.communicationDisabledUntilTimestamp) {
      await interaction.reply({
        embeds: [createErrorEmbed('TIDAK DI-TIMEOUT', 'Warga ini sedang tidak dalam status timeout.')],
        ephemeral: true
      });
      return;
    }

    await targetMember.timeout(null, `${reason} | Oleh: ${interaction.user.tag}`);

    const successEmbed = createSuccessEmbed(
      'TIMEOUT DICABUT',
      `Warga **${targetUser.tag}** (\`${targetUser.id}\`) sudah dapat berbicara kembali.\n\n📝 **Alasan:** ${reason}`
    );

    await interaction.reply({ embeds: [successEmbed] });

    const logEmbed = createModActionEmbed('UNTIMEOUT', targetUser, interaction.user, reason);
    await sendModLog(interaction.guild, logEmbed);
  }
};
