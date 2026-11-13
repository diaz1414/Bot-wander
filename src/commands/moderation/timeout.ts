import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildMember
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createModActionEmbed } from '../../utils/embeds.js';
import { parseDuration, formatDuration } from '../../utils/time.js';
import { sendModLog } from '../../modules/logger.js';

export const timeoutCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Membungkam warga sementara (Timeout / Mute) (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang ingin di-timeout').setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('durasi')
        .setDescription('Durasi timeout (contoh: 10m, 1h, 1d, 7d max 28d)')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('alasan').setDescription('Alasan timeout').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const durationStr = interaction.options.getString('durasi', true);
    const reason = interaction.options.getString('alasan') || 'Pelanggaran peraturan ketertiban Wander Roleplay.';

    const durationMs = parseDuration(durationStr);
    if (!durationMs || durationMs < 10000 || durationMs > 28 * 24 * 60 * 60 * 1000) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            'DURASI TIDAK VALID',
            'Format durasi salah atau melebihi batas (minimal 10 detik, maksimal 28 hari).\nContoh: `10m`, `1h`, `12h`, `1d`, `7d`.'
          )
        ],
        ephemeral: true
      });
      return;
    }

    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL TIMEOUT', 'Warga tidak ditemukan di server ini.')],
        ephemeral: true
      });
      return;
    }

    if (!targetMember.moderatable) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL TIMEOUT', 'Bot tidak memiliki izin untuk mentimeout warga ini.')],
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
        embeds: [createErrorEmbed('GAGAL TIMEOUT', 'Role warga setara atau lebih tinggi dari milikmu!')],
        ephemeral: true
      });
      return;
    }

    await targetMember.timeout(durationMs, `${reason} | Oleh: ${interaction.user.tag}`);

    const formattedTime = formatDuration(durationMs);

    const successEmbed = createSuccessEmbed(
      'WARGA DI-TIMEOUT',
      `Warga **${targetUser.tag}** (\`${targetUser.id}\`) telah dibungkam sementara.\n\n` +
        `⏳ **Durasi:** ${formattedTime}\n` +
        `📝 **Alasan:** ${reason}`
    );

    await interaction.reply({ embeds: [successEmbed] });

    const logEmbed = createModActionEmbed('TIMEOUT', targetUser, interaction.user, reason, [
      { name: '⏳ Durasi', value: formattedTime, inline: true }
    ]);
    await sendModLog(interaction.guild, logEmbed);
  }
};
