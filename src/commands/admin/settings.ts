import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createBaseEmbed } from '../../utils/embeds.js';
import { updateGuildSettings, getGuildSettings } from '../../database/schema.js';
import { config, reloadConfig } from '../../config.js';

export const settingsCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Konfigurasi pengaturan bot Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('roles')
        .setDescription('Mengatur role admin dan moderator')
        .addRoleOption((opt) => opt.setName('admin_role').setDescription('Role Administrator Wander RP').setRequired(false))
        .addRoleOption((opt) => opt.setName('mod_role').setDescription('Role Moderator / Staff Wander RP').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('channels')
        .setDescription('Mengatur channel log moderasi dan log ticket')
        .addChannelOption((opt) => opt.setName('mod_logs').setDescription('Channel log moderasi').setRequired(false))
        .addChannelOption((opt) => opt.setName('ticket_logs').setDescription('Channel log arsip tiket').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub.setName('view').setDescription('Melihat semua konfigurasi bot saat ini')
    )
    .addSubcommand((sub) =>
      sub.setName('reload').setDescription('Reload file config.json dari disk')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'roles') {
      const adminRole = interaction.options.getRole('admin_role');
      const modRole = interaction.options.getRole('mod_role');

      const updates: any = {};
      if (adminRole) updates.admin_role_id = adminRole.id;
      if (modRole) updates.mod_role_id = modRole.id;

      updateGuildSettings(guildId, updates);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'ROLE DIPERBARUI',
            `Pengaturan role telah berhasil disimpan ke database SQLite:\n\n` +
              `👑 **Admin Role:** ${adminRole ? `<@&${adminRole.id}>` : '*Tidak berubah*'}\n` +
              `👮 **Mod Role:** ${modRole ? `<@&${modRole.id}>` : '*Tidak berubah*'}`
          )
        ],
        ephemeral: true
      });
      return;
    }

    if (sub === 'channels') {
      const modLogs = interaction.options.getChannel('mod_logs');
      const ticketLogs = interaction.options.getChannel('ticket_logs');

      const updates: any = {};
      if (modLogs) updates.mod_logs_channel_id = modLogs.id;
      if (ticketLogs) updates.ticket_logs_channel_id = ticketLogs.id;

      updateGuildSettings(guildId, updates);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'CHANNEL DIPERBARUI',
            `Pengaturan channel berhasil disimpan ke database SQLite:\n\n` +
              `🛡️ **Mod Logs:** ${modLogs ? `<#${modLogs.id}>` : '*Tidak berubah*'}\n` +
              `📁 **Ticket Logs:** ${ticketLogs ? `<#${ticketLogs.id}>` : '*Tidak berubah*'}`
          )
        ],
        ephemeral: true
      });
      return;
    }

    if (sub === 'view') {
      const settings = getGuildSettings(guildId);

      const embed = createBaseEmbed()
        .setTitle('⚙️ KONFIGURASI WANDER ROLEPLAY BOT')
        .setDescription('Daftar pengaturan aktif dari Database SQLite dan config.json:')
        .addFields(
          {
            name: '👑 Role Administrator',
            value: settings?.admin_role_id
              ? `<@&${settings.admin_role_id}>`
              : config.roles.adminRoleId
              ? `<@&${config.roles.adminRoleId}>`
              : '*Belum disetel (Owner & Discord Admin otomatis aktif)*',
            inline: true
          },
          {
            name: '👮 Role Moderator',
            value: settings?.mod_role_id
              ? `<@&${settings.mod_role_id}>`
              : config.roles.moderatorRoleId
              ? `<@&${config.roles.moderatorRoleId}>`
              : '*Belum disetel*',
            inline: true
          },
          {
            name: '🛡️ Channel Mod Logs',
            value: settings?.mod_logs_channel_id
              ? `<#${settings.mod_logs_channel_id}>`
              : config.channels.modLogsChannelId
              ? `<#${config.channels.modLogsChannelId}>`
              : '*Belum disetel*',
            inline: true
          },
          {
            name: '📁 Channel Ticket Logs',
            value: settings?.ticket_logs_channel_id
              ? `<#${settings.ticket_logs_channel_id}>`
              : config.channels.ticketLogsChannelId
              ? `<#${config.channels.ticketLogsChannelId}>`
              : '*Belum disetel*',
            inline: true
          },
          {
            name: '👋 Channel Welcome',
            value: settings?.welcome_channel_id
              ? `<#${settings.welcome_channel_id}>`
              : config.channels.welcomeChannelId
              ? `<#${config.channels.welcomeChannelId}>`
              : '*Belum disetel*',
            inline: true
          },
          {
            name: '🍯 Channel Honeypot',
            value: settings?.honeypot_channel_id
              ? `<#${settings.honeypot_channel_id}>`
              : config.channels.honeypotChannelId
              ? `<#${config.channels.honeypotChannelId}>`
              : '*Belum disetel*',
            inline: true
          }
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'reload') {
      reloadConfig();
      await interaction.reply({
        embeds: [createSuccessEmbed('CONFIG DI-RELOAD', 'File `config.json` berhasil dimuat ulang secara instan tanpa restart!')],
        ephemeral: true
      });
    }
  }
};
