import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { updateGuildSettings, getGuildSettings, resetGuildSettings } from '../../database/schema.js';
import { config, reloadConfig } from '../../config.js';

export function createSetupDashboardEmbed(guildId: string): any {
  const settings = getGuildSettings(guildId);

  const adminRole = settings?.admin_role_id
    ? `<@&${settings.admin_role_id}>`
    : config.roles.adminRoleId
    ? `<@&${config.roles.adminRoleId}>`
    : '*Belum disetel (Owner & Discord Admin)*';

  const modRole = settings?.mod_role_id
    ? `<@&${settings.mod_role_id}>`
    : config.roles.moderatorRoleId
    ? `<@&${config.roles.moderatorRoleId}>`
    : '*Belum disetel*';

  const citizenRole = settings?.citizen_role_id
    ? `<@&${settings.citizen_role_id}>`
    : config.roles.citizenRoleId
    ? `<@&${config.roles.citizenRoleId}>`
    : '*Belum disetel*';

  const modLogs = settings?.mod_logs_channel_id
    ? `<#${settings.mod_logs_channel_id}>`
    : config.channels.modLogsChannelId
    ? `<#${config.channels.modLogsChannelId}>`
    : '*Belum disetel*';

  const ticketLogs = settings?.ticket_logs_channel_id
    ? `<#${settings.ticket_logs_channel_id}>`
    : config.channels.ticketLogsChannelId
    ? `<#${config.channels.ticketLogsChannelId}>`
    : '*Belum disetel*';

  const welcomeCh = settings?.welcome_channel_id
    ? `<#${settings.welcome_channel_id}>`
    : config.channels.welcomeChannelId
    ? `<#${config.channels.welcomeChannelId}>`
    : '*Belum disetel*';

  const goodbyeCh = settings?.goodbye_channel_id
    ? `<#${settings.goodbye_channel_id}>`
    : config.channels.goodbyeChannelId
    ? `<#${config.channels.goodbyeChannelId}>`
    : '*Belum disetel*';

  const honeypotCh = settings?.honeypot_channel_id
    ? `<#${settings.honeypot_channel_id}>`
    : config.channels.honeypotChannelId
    ? `<#${config.channels.honeypotChannelId}>`
    : '*Belum disetel*';

  const suggestCh = settings?.suggestion_channel_id
    ? `<#${settings.suggestion_channel_id}>`
    : config.channels.suggestionChannelId
    ? `<#${config.channels.suggestionChannelId}>`
    : '*Belum disetel*';

  const wlLogCh = settings?.whitelist_log_channel_id
    ? `<#${settings.whitelist_log_channel_id}>`
    : config.channels.whitelistLogChannelId
    ? `<#${config.channels.whitelistLogChannelId}>`
    : '*Belum disetel*';

  const isHoneypotOn = settings ? settings.honeypot_enabled === 1 : config.honeypot.enabled;
  const isAntiInviteOn = settings ? (settings.anti_invite_enabled ?? 1) === 1 : (config.antiInvite?.enabled ?? true);
  const isWelcomeOn = settings ? (settings.welcome_enabled ?? 1) === 1 : config.welcome.enabled;
  const isGoodbyeOn = settings ? (settings.goodbye_enabled ?? 1) === 1 : config.goodbye.enabled;

  return createBaseEmbed()
    .setTitle(`⚙️ DASHBOARD KONTROL PENGATURAN • ${config.server.name.toUpperCase()}`)
    .setDescription(
      `Selamat datang di panel kontrol terpusat bot **${config.server.name}**!\n` +
        `Sebagai Server Owner atau Administrator, kamu bebas **mengatur**, **mengganti**, maupun **menghapus** konfigurasi channel, role, dan fitur sesuka hatimu langsung dari Discord.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    )
    .addFields(
      {
        name: '👑 Konfigurasi Role Server',
        value: `• **Admin Role:** ${adminRole}\n• **Moderator Role:** ${modRole}\n• **Citizen / Warga Role:** ${citizenRole}`,
        inline: false
      },
      {
        name: '📢 Konfigurasi Channel Teks',
        value:
          `• **Mod-Logs:** ${modLogs}\n` +
          `• **Ticket-Logs:** ${ticketLogs}\n` +
          `• **Welcome:** ${welcomeCh}\n` +
          `• **Goodbye:** ${goodbyeCh}\n` +
          `• **Honeypot Trap:** ${honeypotCh}\n` +
          `• **Kotak Saran:** ${suggestCh}\n` +
          `• **Whitelist Review:** ${wlLogCh}`,
        inline: false
      },
      {
        name: '🛡️ Status Keamanan & Fitur',
        value:
          `• **Honeypot Anti-Raid:** ${isHoneypotOn ? '🟢 `AKTIF`' : '🔴 `NONAKTIF`'}\n` +
          `• **Anti-Invite Filter:** ${isAntiInviteOn ? '🟢 `AKTIF`' : '🔴 `NONAKTIF`'}\n` +
          `• **Pesan Welcome:** ${isWelcomeOn ? '🟢 `AKTIF`' : '🔴 `NONAKTIF`'}\n` +
          `• **Pesan Goodbye:** ${isGoodbyeOn ? '🟢 `AKTIF`' : '🔴 `NONAKTIF`'}`,
        inline: false
      }
    )
    .setFooter({ text: `${config.server.footerText} • Gunakan tombol di bawah untuk konfigurasi instan` });
}

export function createSetupDashboardRows(): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_toggle_honeypot')
      .setLabel('Toggle Honeypot')
      .setEmoji('🍯')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_toggle_antiinvite')
      .setLabel('Toggle Anti-Invite')
      .setEmoji('🚫')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('setup_toggle_welcome')
      .setLabel('Toggle Welcome')
      .setEmoji('👋')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('setup_refresh_dashboard')
      .setLabel('Refresh Dashboard')
      .setEmoji('🔄')
      .setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId('setup_quick_reset_prompt')
      .setLabel('Hapus / Reset Pengaturan')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('setup_reload_config')
      .setLabel('Reload config.json')
      .setEmoji('📁')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

export const setupCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Panel Kontrol & Setup Lengkap Bot Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // 1. Dashboard Interaktif
    .addSubcommand((sub) =>
      sub.setName('dashboard').setDescription('Buka panel kontrol interaktif pengaturan bot')
    )
    // 2. Setup / Ganti / Hapus Channel
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Atur, ganti, atau hapus channel fungsi bot')
        .addStringOption((opt) =>
          opt
            .setName('jenis')
            .setDescription('Jenis channel yang ingin diatur')
            .setRequired(true)
            .addChoices(
              { name: '🛡️ Mod-Logs (Log Moderasi)', value: 'mod_logs' },
              { name: '📁 Ticket-Logs (Arsip Tiket)', value: 'ticket_logs' },
              { name: '👋 Welcome (Sambutan Warga)', value: 'welcome' },
              { name: '🚪 Goodbye (Perpisahan Warga)', value: 'goodbye' },
              { name: '🍯 Honeypot (Jebakan Spammer)', value: 'honeypot' },
              { name: '💡 Kotak Saran (Aspirasi Warga)', value: 'suggestion' },
              { name: '📝 Whitelist Review (Pendaftaran Warga)', value: 'whitelist_log' }
            )
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel target (kosongkan jika memilih opsi hapus)').setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('hapus_channel')
            .setDescription('Pilih True jika ingin MENGHAPUS / MENGOSONGKAN channel ini')
            .setRequired(false)
        )
    )
    // 3. Setup / Ganti / Hapus Role
    .addSubcommand((sub) =>
      sub
        .setName('role')
        .setDescription('Atur, ganti, atau hapus wewenang role bot')
        .addStringOption((opt) =>
          opt
            .setName('jenis')
            .setDescription('Jenis role yang ingin diatur')
            .setRequired(true)
            .addChoices(
              { name: '👑 Administrator Role', value: 'admin' },
              { name: '👮 Moderator Role', value: 'mod' },
              { name: '🏙️ Citizen / Warga Baru Role', value: 'citizen' }
            )
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('Role target (kosongkan jika memilih opsi hapus)').setRequired(false)
        )
        .addBooleanOption((opt) =>
          opt
            .setName('hapus_role')
            .setDescription('Pilih True jika ingin MENGHAPUS role ini dari pengaturan')
            .setRequired(false)
        )
    )
    // 4. Toggle Fitur Aktif / Nonaktif
    .addSubcommand((sub) =>
      sub
        .setName('features')
        .setDescription('Mengaktifkan atau menonaktifkan fitur sistem bot')
        .addStringOption((opt) =>
          opt
            .setName('fitur')
            .setDescription('Pilih fitur yang ingin diubah statusnya')
            .setRequired(true)
            .addChoices(
              { name: '🍯 Honeypot Anti-Raid', value: 'honeypot' },
              { name: '🚫 Anti-Invite Filter', value: 'anti_invite' },
              { name: '👋 Pesan Welcome', value: 'welcome' },
              { name: '🚪 Pesan Goodbye', value: 'goodbye' }
            )
        )
        .addBooleanOption((opt) =>
          opt.setName('status').setDescription('True untuk Aktifkan, False untuk Matikan').setRequired(true)
        )
    )
    // 5. Hapus / Reset Pengaturan
    .addSubcommand((sub) =>
      sub
        .setName('reset')
        .setDescription('Hapus atau reset pengaturan ke awal / default')
        .addStringOption((opt) =>
          opt
            .setName('target')
            .setDescription('Bagian pengaturan mana yang ingin direset')
            .setRequired(true)
            .addChoices(
              { name: '⚠️ RESET SEMUA PENGATURAN (Semua Data Pengaturan Terhapus)', value: 'all' },
              { name: '📢 Hapus Semua Pengaturan Channel', value: 'channels' },
              { name: '👥 Hapus Semua Pengaturan Role', value: 'roles' },
              { name: '👋 Hapus Pengaturan Welcome', value: 'welcome' },
              { name: '🚪 Hapus Pengaturan Goodbye', value: 'goodbye' },
              { name: '🍯 Hapus Pengaturan Honeypot', value: 'honeypot' },
              { name: '🎫 Hapus Pengaturan Sistem Tiket', value: 'tickets' }
            )
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    const guild = interaction.guild;
    if (!guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = guild.id;

    // --- SUBCOMMAND 1: DASHBOARD ---
    if (sub === 'dashboard') {
      const embed = createSetupDashboardEmbed(guildId);
      const rows = createSetupDashboardRows();
      await interaction.reply({ embeds: [embed], components: rows });
      return;
    }

    // --- SUBCOMMAND 2: CHANNEL SETUP & REMOVE ---
    if (sub === 'channel') {
      const type = interaction.options.getString('jenis', true);
      const targetChannel = interaction.options.getChannel('channel') as TextChannel | null;
      const shouldDelete = interaction.options.getBoolean('hapus_channel') || false;

      const columnMap: Record<string, string> = {
        mod_logs: 'mod_logs_channel_id',
        ticket_logs: 'ticket_logs_channel_id',
        welcome: 'welcome_channel_id',
        goodbye: 'goodbye_channel_id',
        honeypot: 'honeypot_channel_id',
        suggestion: 'suggestion_channel_id',
        whitelist_log: 'whitelist_log_channel_id'
      };

      const labelMap: Record<string, string> = {
        mod_logs: 'Mod-Logs',
        ticket_logs: 'Ticket-Logs',
        welcome: 'Welcome Channel',
        goodbye: 'Goodbye Channel',
        honeypot: 'Honeypot Trap',
        suggestion: 'Kotak Saran',
        whitelist_log: 'Whitelist Review'
      };

      const col = columnMap[type];
      const label = labelMap[type];

      if (shouldDelete) {
        updateGuildSettings(guildId, { [col]: null });
        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              'CHANNEL DIHAPUS',
              `Pengaturan channel untuk **${label}** telah berhasil **dihapus / dikosongkan** dari database.`
            )
          ],
          ephemeral: true
        });
        return;
      }

      if (!targetChannel) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'CHANNEL DIBUTUHKAN',
              'Silakan pilih channel target atau centang opsi `hapus_channel: true` jika berniat menghapus.'
            )
          ],
          ephemeral: true
        });
        return;
      }

      updateGuildSettings(guildId, { [col]: targetChannel.id });
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'CHANNEL DIPERBARUI',
            `Channel **${label}** berhasil diarahkan ke <#${targetChannel.id}>.`
          )
        ],
        ephemeral: true
      });
      return;
    }

    // --- SUBCOMMAND 3: ROLE SETUP & REMOVE ---
    if (sub === 'role') {
      const type = interaction.options.getString('jenis', true);
      const targetRole = interaction.options.getRole('role');
      const shouldDelete = interaction.options.getBoolean('hapus_role') || false;

      const colMap: Record<string, string> = {
        admin: 'admin_role_id',
        mod: 'mod_role_id',
        citizen: 'citizen_role_id'
      };

      const labelMap: Record<string, string> = {
        admin: 'Administrator Role',
        mod: 'Moderator Role',
        citizen: 'Citizen / Warga Role'
      };

      const col = colMap[type];
      const label = labelMap[type];

      if (shouldDelete) {
        updateGuildSettings(guildId, { [col]: null });
        await interaction.reply({
          embeds: [
            createSuccessEmbed(
              'ROLE DIHAPUS',
              `Pengaturan role untuk **${label}** telah berhasil **dihapus** dari konfigurasi.`
            )
          ],
          ephemeral: true
        });
        return;
      }

      if (!targetRole) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'ROLE DIBUTUHKAN',
              'Silakan pilih role target atau centang opsi `hapus_role: true` jika berniat menghapus.'
            )
          ],
          ephemeral: true
        });
        return;
      }

      updateGuildSettings(guildId, { [col]: targetRole.id });
      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'ROLE DIPERBARUI',
            `Pengaturan **${label}** berhasil diatur ke <@&${targetRole.id}>.`
          )
        ],
        ephemeral: true
      });
      return;
    }

    // --- SUBCOMMAND 4: TOGGLE FEATURES ---
    if (sub === 'features') {
      const feature = interaction.options.getString('fitur', true);
      const enabled = interaction.options.getBoolean('status', true);

      const updateObj: any = {};
      let featureName = '';

      if (feature === 'honeypot') {
        updateObj.honeypot_enabled = enabled ? 1 : 0;
        featureName = 'Honeypot Anti-Raid';
      } else if (feature === 'anti_invite') {
        updateObj.anti_invite_enabled = enabled ? 1 : 0;
        featureName = 'Anti-Invite Filter';
      } else if (feature === 'welcome') {
        updateObj.welcome_enabled = enabled ? 1 : 0;
        featureName = 'Pesan Sambutan Warga';
      } else if (feature === 'goodbye') {
        updateObj.goodbye_enabled = enabled ? 1 : 0;
        featureName = 'Pesan Perpisahan Warga';
      }

      updateGuildSettings(guildId, updateObj);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'STATUS FITUR DIPERBARUI',
            `Fitur **${featureName}** sekarang berhasil diubah statusnya menjadi **${
              enabled ? '🟢 AKTIF' : '🔴 NONAKTIF'
            }**.`
          )
        ],
        ephemeral: true
      });
      return;
    }

    // --- SUBCOMMAND 5: RESET / HAPUS PENGATURAN ---
    if (sub === 'reset') {
      const target = interaction.options.getString('target', true) as any;

      resetGuildSettings(guildId, target);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'PENGATURAN DIRESET',
            `Pengaturan kategori **${target.toUpperCase()}** berhasil dihapus dan dikembalikan ke kondisi default.`
          )
        ],
        ephemeral: true
      });
    }
  }
};
