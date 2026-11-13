import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { createBaseEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const serverinfoCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Melihat informasi statistik komunitas Wander Roleplay'),
  async execute(interaction: ChatInputCommandInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    await guild.members.fetch();

    const totalMembers = guild.memberCount;
    const botCount = guild.members.cache.filter((m) => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    const textChannels = guild.channels.cache.filter((c) => c.isTextBased()).size;
    const voiceChannels = guild.channels.cache.filter((c) => c.isVoiceBased()).size;
    const roleCount = guild.roles.cache.size;

    const embed = createBaseEmbed()
      .setTitle(`🏙️ INFORMASI KOTA: ${config.server.name.toUpperCase()}`)
      .setDescription(
        `Selamat datang di **${config.server.name}**! Server FiveM Roleplay dengan pengalaman bermain yang realistis, ekonomi seimbang, dan komunitas warga yang ramah.\n\n` +
          `🔗 **Koneksi FiveM:** \`${config.server.cfxConnect}\`\n` +
          `🌐 **Website:** [${config.server.website}](${config.server.website})\n` +
          `💬 **Invite Discord:** [Bergabung Sekarang](${config.server.discordInvite})`
      )
      .setThumbnail(guild.iconURL() || config.server.logoUrl || null)
      .addFields(
        { name: '👑 Pemilik Server (Owner)', value: `<@${guild.ownerId}>`, inline: true },
        { name: '📅 Tanggal Dibuat', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '🛡️ Tingkat Keamanan', value: `\`${guild.verificationLevel}\``, inline: true },
        { name: '👥 Total Warga (Manusia)', value: `**${humanCount}** Warga`, inline: true },
        { name: '🤖 Bot Layanan', value: `**${botCount}** Bot`, inline: true },
        { name: '📊 Total Anggota', value: `**${totalMembers}** Member`, inline: true },
        { name: '💬 Channel Teks', value: `\`${textChannels}\` Channel`, inline: true },
        { name: '🔊 Channel Voice', value: `\`${voiceChannels}\` Channel`, inline: true },
        { name: '🏷️ Total Role', value: `\`${roleCount}\` Role`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
