import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createBaseEmbed } from '../../utils/embeds.js';
import { updateGuildSettings, getGuildSettings, getDatabase } from '../../database/schema.js';
import { config } from '../../config.js';

export const honeypotCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Sistem jebakan anti-bot raid & spammer honeypot (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Setup trap channel
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Mengatur channel honeypot trap')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Channel yang dijadikan jebakan honeypot')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('tindakan')
            .setDescription('Tindakan otomatis terhadap bot/spammer yang mengetik di honeypot')
            .setRequired(false)
            .addChoices(
              { name: '🔨 BANNED Permanen (Direkomendasikan)', value: 'ban' },
              { name: '👢 KICK dari Server', value: 'kick' },
              { name: '⏳ TIMEOUT (Mute 7 Hari)', value: 'timeout' }
            )
        )
    )
    // View status
    .addSubcommand((sub) =>
      sub.setName('status').setDescription('Melihat status & konfigurasi Honeypot saat ini')
    )
    // Disable
    .addSubcommand((sub) =>
      sub.setName('disable').setDescription('Menonaktifkan sistem Honeypot')
    )
    // View recent logs
    .addSubcommand((sub) =>
      sub.setName('logs').setDescription('Melihat daftar bot/spammer yang terperangkap di honeypot')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    if (!interaction.guild) return;

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
      const channel = interaction.options.getChannel('channel', true) as TextChannel;
      const action = interaction.options.getString('tindakan') || 'ban';

      updateGuildSettings(guildId, {
        honeypot_channel_id: channel.id,
        honeypot_action: action,
        honeypot_enabled: 1
      });

      const embed = createSuccessEmbed(
        'HONEYPOT BERHASIL DIAKTIFKAN',
        `Channel jebakan honeypot berhasil dipasang pada <#${channel.id}>!\n\n` +
          `⚙️ **Tindakan Otomatis:** \`${action.toUpperCase()}\`\n` +
          `🛡️ **Cara Kerja:**\n` +
          `• Setiap akun atau selfbot yang mengirim pesan di channel tersebut akan **langsung ditindak secara otomatis**.\n` +
          `• Riwayat pesan spam mereka akan dibersihkan secara instan.\n` +
          `• Log dan alert keamanan akan langsung dikirimkan ke channel staff.\n` +
          `• Server Owner dan Administrator dikecualikan secara otomatis dari jebakan ini.`
      );

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === 'status') {
      const settings = getGuildSettings(guildId);
      const isEnabled = settings?.honeypot_enabled === 1;
      const channelId = settings?.honeypot_channel_id || config.channels.honeypotChannelId;
      const action = settings?.honeypot_action || config.honeypot.action;

      const embed = createBaseEmbed()
        .setTitle('🍯 STATUS SISTEM HONEYPOT WANDER RP')
        .addFields(
          { name: 'Status', value: isEnabled ? '🟢 **AKTIF**' : '🔴 **NONAKTIF**', inline: true },
          { name: 'Channel Jebakan', value: channelId ? `<#${channelId}>` : '*Belum diatur*', inline: true },
          { name: 'Tindakan', value: `\`${action.toUpperCase()}\``, inline: true }
        )
        .setDescription(
          `Sistem honeypot melindungi server dari serbuan spam bot dan token grabber raid secara otomatis.`
        );

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    if (sub === 'disable') {
      updateGuildSettings(guildId, { honeypot_enabled: 0 });
      await interaction.reply({
        embeds: [createSuccessEmbed('HONEYPOT DINONAKTIFKAN', 'Sistem pengaman honeypot telah dinonaktifkan.')],
        ephemeral: true
      });
      return;
    }

    if (sub === 'logs') {
      const db = getDatabase();
      const logs = db
        .prepare('SELECT * FROM honeypot_logs WHERE guild_id = ? ORDER BY created_at DESC LIMIT 10')
        .all(guildId);

      if (logs.length === 0) {
        await interaction.reply({
          embeds: [createBaseEmbed().setTitle('🍯 LOGS HONEYPOT').setDescription('Belum ada riwayat pelanggar honeypot.')],
          ephemeral: true
        });
        return;
      }

      const embed = createBaseEmbed().setTitle('🍯 DAFTAR TANGKAPAN HONEYPOT (TERAKHIR)');

      for (const log of logs as any[]) {
        const time = `<t:${Math.floor(log.created_at / 1000)}:R>`;
        embed.addFields({
          name: `🚨 ${log.user_tag} (${log.user_id}) • ${time}`,
          value: `**Tindakan:** \`${log.action_taken.toUpperCase()}\`\n**Pesan:** ${log.message_content || '*Kosong*'}`,
          inline: false
        });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  }
};
