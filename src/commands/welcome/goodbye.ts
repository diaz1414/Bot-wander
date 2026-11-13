import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  type GuildMember
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createBaseEmbed, parsePlaceholders } from '../../utils/embeds.js';
import { updateGuildSettings, getGuildSettings } from '../../database/schema.js';
import { config } from '../../config.js';

export const goodbyeCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('goodbye')
    .setDescription('Pengaturan perpisahan warga keluar (Goodbye System) (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Mengatur channel perpisahan dan pesan keluar kota')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan ucapan perpisahan').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('pesan')
            .setDescription('Pesan custom (Gunakan {user}, {username}, {server}, {memberCount})')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('Uji coba pesan perpisahan dengan profil kamu')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Menonaktifkan fitur pesan goodbye')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel', true) as TextChannel;
      const customMessage = interaction.options.getString('pesan');

      updateGuildSettings(guildId, {
        goodbye_channel_id: channel.id,
        goodbye_message: customMessage || null,
        goodbye_enabled: 1
      });

      const embed = createSuccessEmbed(
        'GOODBYE SYSTEM BERHASIL DIATUR',
        `Sistem perpisahan warga telah aktif:\n\n` +
          `📢 **Channel:** <#${channel.id}>\n` +
          `📝 **Pesan:** ${customMessage || '*Menggunakan default template Wander RP*'}`
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'test') {
      const settings = getGuildSettings(guildId);
      const rawText = settings?.goodbye_message || config.goodbye.description;
      const member = interaction.member as GuildMember;
      const parsedText = parsePlaceholders(rawText, member);

      const embed = createBaseEmbed()
        .setTitle(config.goodbye.title)
        .setDescription(parsedText)
        .setThumbnail(interaction.user.displayAvatarURL());

      await interaction.reply({
        content: `🧪 **Preview Pesan Perpisahan:**`,
        embeds: [embed],
        ephemeral: true
      });
      return;
    }

    if (sub === 'disable') {
      updateGuildSettings(guildId, { goodbye_enabled: 0 });
      await interaction.reply({
        embeds: [createSuccessEmbed('GOODBYE DIMATIKAN', 'Pesan perpisahan warga dinonaktifkan.')],
        ephemeral: true
      });
    }
  }
};
