import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createInfoEmbed } from '../../utils/embeds.js';
import { getWarnings } from '../../database/schema.js';

export const warningsCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Melihat daftar riwayat peringatan (warn) warga (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName('user').setDescription('Warga yang ingin dicek').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const list = getWarnings(interaction.guild.id, targetUser.id);

    if (list.length === 0) {
      await interaction.reply({
        embeds: [
          createInfoEmbed(
            'RIWAYAT BERSIH',
            `Warga **${targetUser.tag}** (\`${targetUser.id}\`) tidak memiliki catatan peringatan / warn.`
          )
        ],
        ephemeral: true
      });
      return;
    }

    const embed = createBaseEmbed()
      .setTitle(`📋 RIWAYAT PERINGATAN: ${targetUser.tag}`)
      .setDescription(`Ditemukan **${list.length}** riwayat pelanggaran untuk <@${targetUser.id}>:`)
      .setThumbnail(targetUser.displayAvatarURL());

    for (const w of list.slice(0, 15)) {
      const date = `<t:${Math.floor(w.created_at / 1000)}:R>`;
      embed.addFields({
        name: `ID Warn #${w.id} • ${date}`,
        value: `👮 **Mod:** <@${w.moderator_id}>\n📝 **Alasan:** ${w.reason}`,
        inline: false
      });
    }

    if (list.length > 15) {
      embed.setFooter({ text: `Menampilkan 15 dari ${list.length} pelanggaran total.` });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
