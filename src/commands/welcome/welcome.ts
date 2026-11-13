import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  type GuildMember
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createBaseEmbed, parsePlaceholders } from '../../utils/embeds.js';
import { updateGuildSettings, getGuildSettings } from '../../database/schema.js';
import { config } from '../../config.js';

export const welcomeCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Pengaturan sambutan warga baru (Welcome System) (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Mengatur channel sambutan dan pesan selamat datang')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan ucapan selamat datang').setRequired(true)
        )
        .addRoleOption((opt) =>
          opt.setName('auto_role').setDescription('Role yang otomatis diberikan saat warga bergabung').setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('pesan')
            .setDescription('Pesan custom (Gunakan {user}, {username}, {server}, {memberCount})')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('Uji coba tampilan pesan welcome dengan profil kamu')
    )
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Menonaktifkan fitur pesan welcome')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel', true) as TextChannel;
      const role = interaction.options.getRole('auto_role');
      const customMessage = interaction.options.getString('pesan');

      updateGuildSettings(guildId, {
        welcome_channel_id: channel.id,
        welcome_role_id: role ? role.id : null,
        welcome_message: customMessage || null,
        welcome_enabled: 1
      });

      const embed = createSuccessEmbed(
        'WELCOME SYSTEM BERHASIL DIATUR',
        `Sistem sambutan warga baru telah aktif:\n\n` +
          `📢 **Channel:** <#${channel.id}>\n` +
          `🏷️ **Auto Role:** ${role ? `<@&${role.id}>` : '*Tidak ada*'}\n` +
          `📝 **Pesan:** ${customMessage || '*Menggunakan default template Wander RP*'}`
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'test') {
      const settings = getGuildSettings(guildId);
      const rawText = settings?.welcome_message || config.welcome.description;
      const member = interaction.member as GuildMember;
      const parsedText = parsePlaceholders(rawText, member);

      const embed = createBaseEmbed()
        .setTitle(config.welcome.title)
        .setDescription(parsedText)
        .setThumbnail(interaction.user.displayAvatarURL());

      if (config.welcome.bannerUrl) {
        embed.setImage(config.welcome.bannerUrl);
      }

      await interaction.reply({
        content: `🧪 **Preview Pesan Sambutan:**`,
        embeds: [embed],
        ephemeral: true
      });
      return;
    }

    if (sub === 'disable') {
      updateGuildSettings(guildId, { welcome_enabled: 0 });
      await interaction.reply({
        embeds: [createSuccessEmbed('WELCOME DIMATIKAN', 'Pesan sambutan warga baru dinonaktifkan.')],
        ephemeral: true
      });
    }
  }
};
