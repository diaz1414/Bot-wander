import {
  type Message,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import type { WanderBotClient } from '../client.js';
import { getGuildSettings, logHoneypot } from '../database/schema.js';
import { config } from '../config.js';
import { isServerAdmin } from '../utils/permissions.js';
import { createBaseEmbed, createErrorEmbed, createModActionEmbed } from '../utils/embeds.js';
import { sendHoneypotAlert, sendModLog } from '../modules/logger.js';
import { announcementSessions } from '../modules/announcementSession.js';

export async function onMessageCreate(client: WanderBotClient, message: Message): Promise<void> {
  // Ignore DMs and bot messages (except for honeypot where we might catch rogue selfbots)
  if (!message.guild || !message.channel) return;

  const guild = message.guild;
  const author = message.author;
  const channel = message.channel as TextChannel;

  // =========================================================================
  // 1. ANNOUNCEMENT INTERACTIVE SESSION COLLECTOR
  // =========================================================================
  const session = announcementSessions.getSession(author.id);
  if (session && session.sourceChannelId === channel.id) {
    // Check if user wants to cancel
    if (message.content.trim().toLowerCase() === 'cancel') {
      announcementSessions.endSession(author.id);
      await message.delete().catch(() => null);
      const cancelMsg = await channel.send({
        content: `❌ <@${author.id}>, sesi pengetikan pengumuman berhasil dibatalkan.`
      });
      setTimeout(() => cancelMsg.delete().catch(() => null), 5000);
      return;
    }

    // Capture the multiline message with preserved enters/longkap bawah
    const content = message.content;
    session.content = content;
    announcementSessions.updateSession(author.id, { content });

    // Delete the admin's raw message to keep chat clean
    await message.delete().catch(() => null);

    // Show preview with confirmation buttons
    const previewEmbed = createBaseEmbed()
      .setTitle(`👀 PREVIEW: ${session.title || 'PENGUMUMAN WANDER ROLEPLAY'}`)
      .setDescription(content)
      .addFields(
        { name: '🎯 Channel Tujuan', value: `<#${session.targetChannelId}>`, inline: true },
        { name: '🎨 Format', value: `\`${session.mode.toUpperCase()}\``, inline: true },
        { name: '🔔 Mention', value: session.mention ? `\`${session.mention}\`` : '*Tidak ada*', inline: true }
      );

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`announcement_send_${author.id}`)
        .setLabel('Kirim Sekarang')
        .setEmoji('✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`announcement_cancel_${author.id}`)
        .setLabel('Batalkan')
        .setEmoji('❌')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@${author.id}>, silakan periksa tampilan pengumuman kamu di bawah ini:`,
      embeds: [previewEmbed],
      components: [actionRow]
    });

    return;
  }

  // =========================================================================
  // 2. HONEYPOT TRAP SYSTEM
  // =========================================================================
  const settings = getGuildSettings(guild.id);
  const honeypotChannelId = settings?.honeypot_channel_id || config.channels.honeypotChannelId;
  const honeypotEnabled = settings ? settings.honeypot_enabled === 1 : config.honeypot.enabled;

  if (honeypotEnabled && honeypotChannelId && channel.id === honeypotChannelId) {
    const member = message.member || (await guild.members.fetch(author.id).catch(() => null));

    // Exemption Check: Server Owner, Administrator, and exempt roles
    if (isServerAdmin(member, guild)) {
      return; // Safe, do not trigger trap for admins
    }

    const exemptRoles = config.honeypot.exemptRoleIds || [];
    if (member && exemptRoles.some((roleId) => member.roles.cache.has(roleId))) {
      return; // Safe, exempt role
    }

    // SPAMMER / RAID DETECTED!
    const capturedContent = message.content || '(Lampiran / Embed / Media)';
    const action = settings?.honeypot_action || config.honeypot.action || 'ban';
    const deleteDays = config.honeypot.deleteDays || 7;

    // 1. Instantly delete the trap trigger message
    await message.delete().catch(() => null);

    // 2. Record to SQLite database
    logHoneypot(guild.id, author.id, author.tag, action, capturedContent);

    // 3. Execute moderation action
    let actionResult = '';
    try {
      if (action === 'ban') {
        await guild.members.ban(author.id, {
          deleteMessageSeconds: deleteDays * 24 * 60 * 60,
          reason: `[HONEYPOT AUTOBAN] Terdeteksi memicu channel jebakan honeypot Wander Roleplay.`
        });
        actionResult = `BANNED Permanen & Hapus Pesan ${deleteDays} Hari`;
      } else if (action === 'kick') {
        if (member && member.kickable) {
          await member.kick('[HONEYPOT KICK] Terdeteksi memicu channel jebakan honeypot.');
          actionResult = 'KICK dari Server';
        }
      } else if (action === 'timeout') {
        if (member && member.moderatable) {
          await member.timeout(7 * 24 * 60 * 60 * 1000, '[HONEYPOT TIMEOUT] Memicu honeypot.');
          actionResult = 'TIMEOUT 7 Hari';
        }
      }
    } catch (actErr: any) {
      console.error('[HONEYPOT] Gagal mengeksekusi aksi otomatis:', actErr);
      actionResult = `Gagal tindakan: ${actErr.message}`;
    }

    // 4. Send Security Alert to Staff Channel
    const accountAgeDays = Math.floor((Date.now() - author.createdTimestamp) / (1000 * 60 * 60 * 24));

    const alertEmbed = createBaseEmbed()
      .setTitle('🚨 HONEYPOT TERPICU: AKUN SPAMMER DITINDAK!')
      .setColor('#E74C3C')
      .setDescription(
        `Sistem keamanan honeypot berhasil mendeteksi dan menindak aktivitas mencurigakan di <#${channel.id}>.`
      )
      .addFields(
        { name: '👤 Pelaku', value: `${author.tag} (<@${author.id}>)`, inline: true },
        { name: '🆔 User ID', value: `\`${author.id}\``, inline: true },
        { name: '📅 Umur Akun', value: `${accountAgeDays} Hari yang lalu`, inline: true },
        { name: '⚖️ Tindakan Otomatis', value: `\`${actionResult}\``, inline: true },
        { name: '📍 Channel Jebakan', value: `<#${channel.id}>`, inline: true },
        { name: '💬 Pesan Terdeteksi', value: `\`\`\`\n${capturedContent.slice(0, 500)}\n\`\`\``, inline: false }
      )
      .setThumbnail(author.displayAvatarURL());

    await sendHoneypotAlert(guild, alertEmbed);
    console.warn(`[HONEYPOT] Spammer tertangkap: ${author.tag} (${author.id}) -> Tindakan: ${action}`);
    return;
  }

  // =========================================================================
  // 3. ANTI-INVITE LINK PROTECTION
  // =========================================================================
  if (config.antiInvite?.enabled && !author.bot) {
    const inviteRegex = /(discord\.(gg|io|me|li)\/.+|discordapp\.com\/invite\/.+|discord\.com\/invite\/.+)/i;
    if (inviteRegex.test(message.content)) {
      const member = message.member || (await guild.members.fetch(author.id).catch(() => null));
      if (!isServerAdmin(member, guild)) {
        await message.delete().catch(() => null);

        if (config.antiInvite.warnUser) {
          const warnMsg = await channel.send({
            content: `⚠️ <@${author.id}>, dilarang menyebarkan link invite server Discord lain di **${config.server.name}**!`
          });
          setTimeout(() => warnMsg.delete().catch(() => null), 5000);
        }

        const logEmbed = createModActionEmbed('ANTI-INVITE', author, client.user!, 'Penyebaran link invite discord luar tanpa izin.', [
          { name: 'Channel', value: `<#${channel.id}>`, inline: true },
          { name: 'Pesan', value: `\`\`\`\n${message.content.slice(0, 500)}\n\`\`\``, inline: false }
        ]);
        await sendModLog(guild, logEmbed);
      }
    }
  }
}
