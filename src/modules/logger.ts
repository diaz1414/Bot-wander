import { type Guild, type EmbedBuilder, type TextChannel } from 'discord.js';
import { getGuildSettings } from '../database/schema.js';
import { config } from '../config.js';

export async function sendModLog(guild: Guild, embed: EmbedBuilder): Promise<void> {
  try {
    const settings = getGuildSettings(guild.id);
    const channelId = settings?.mod_logs_channel_id || config.channels.modLogsChannelId;

    if (!channelId) return;

    const channel = (await guild.channels.fetch(channelId).catch(() => null)) as TextChannel | null;
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error('[LOGGER] Gagal mengirim log moderasi:', error);
  }
}

export async function sendHoneypotAlert(guild: Guild, embed: EmbedBuilder): Promise<void> {
  try {
    const settings = getGuildSettings(guild.id);
    const channelId =
      config.honeypot.alertChannelId ||
      settings?.mod_logs_channel_id ||
      config.channels.modLogsChannelId;

    if (!channelId) return;

    const channel = (await guild.channels.fetch(channelId).catch(() => null)) as TextChannel | null;
    if (channel && channel.isTextBased()) {
      await channel.send({
        content: '🚨 **PERINGATAN KEAMANAN SERVER: HONEYPOT TERPICU!**',
        embeds: [embed]
      });
    }
  } catch (error) {
    console.error('[LOGGER] Gagal mengirim alert honeypot:', error);
  }
}

export async function sendTicketLog(guild: Guild, embed: EmbedBuilder, files?: any[]): Promise<void> {
  try {
    const settings = getGuildSettings(guild.id);
    const channelId = settings?.ticket_logs_channel_id || config.channels.ticketLogsChannelId;

    if (!channelId) return;

    const channel = (await guild.channels.fetch(channelId).catch(() => null)) as TextChannel | null;
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed], files });
    }
  } catch (error) {
    console.error('[LOGGER] Gagal mengirim log ticket:', error);
  }
}
