import {
  type Guild,
  type User,
  type TextChannel,
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  EmbedBuilder
} from 'discord.js';
import {
  createTicket,
  getTicketByChannel,
  getOpenTicketByUser,
  claimTicket,
  closeTicket,
  getGuildSettings
} from '../database/schema.js';
import { config } from '../config.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../utils/embeds.js';
import { sendTicketLog } from './logger.js';

export async function handleTicketOpen(
  guild: Guild,
  user: User,
  category: string
): Promise<{ success: boolean; channel?: TextChannel; message?: string }> {
  // Check if user already has an active ticket
  const existing = getOpenTicketByUser(guild.id, user.id);
  if (existing) {
    const existingChannel = guild.channels.cache.get(existing.channel_id) as TextChannel | undefined;
    if (existingChannel) {
      return {
        success: false,
        message: `Kamu sudah memiliki tiket yang sedang aktif di <#${existing.channel_id}>!`
      };
    }
  }

  const settings = getGuildSettings(guild.id);
  const parentCategoryId = settings?.ticket_category_id || config.ticket.categoryId;
  const adminRoleId = settings?.admin_role_id || config.roles.adminRoleId;
  const modRoleId = settings?.mod_role_id || config.roles.moderatorRoleId;

  const sanitizedUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
  const channelName = `${config.ticket.ticketPrefix || 'ticket-'}${sanitizedUsername}`;

  // Build permission overwrites
  const permissionOverwrites: any[] = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks
      ]
    },
    {
      id: guild.members.me?.id || user.client.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];

  if (adminRoleId && guild.roles.cache.has(adminRoleId)) {
    permissionOverwrites.push({
      id: adminRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages
      ]
    });
  }

  if (modRoleId && guild.roles.cache.has(modRoleId)) {
    permissionOverwrites.push({
      id: modRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ReadMessageHistory
      ]
    });
  }

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parentCategoryId && guild.channels.cache.has(parentCategoryId) ? parentCategoryId : undefined,
      permissionOverwrites,
      topic: `Tiket Bantuan Wander Roleplay | Dibuat oleh ${user.tag} (${user.id}) | Kategori: ${category}`
    });

    const ticketId = `TICKET-${Date.now().toString(36).toUpperCase()}`;

    createTicket({
      ticket_id: ticketId,
      guild_id: guild.id,
      channel_id: ticketChannel.id,
      user_id: user.id,
      category,
      created_at: Date.now()
    });

    // Send welcome embed inside ticket channel
    const welcomeEmbed = createBaseEmbed()
      .setTitle(`🎫 WANDER ROLEPLAY SUPPORT - ${category.toUpperCase()}`)
      .setDescription(
        `Halo <@${user.id}>, selamat datang di tiket bantuan **Wander Roleplay**!\n\n` +
          `${config.ticket.openMessage}\n\n` +
          `📌 **Informasi Tiket:**\n` +
          `• **ID Tiket:** \`${ticketId}\`\n` +
          `• **Pembuat:** <@${user.id}> (${user.tag})\n` +
          `• **Kategori:** \`${category}\`\n` +
          `• **Waktu Dibuat:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
          `*Tim Staff / Admin kami akan segera merespons tiketmu. Harap bersabar dan jangan melakukan spam tag.*`
      )
      .setThumbnail(guild.iconURL() || config.server.logoUrl || null);

    const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_claim')
        .setLabel('Klaim Tiket')
        .setEmoji('🙋‍♂️')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('ticket_transcript')
        .setLabel('Simpan Transcript')
        .setEmoji('📋')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('ticket_close_prompt')
        .setLabel('Tutup Tiket')
        .setEmoji('🔒')
        .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({
      content: `<@${user.id}> | <@&${adminRoleId || ''}>`,
      embeds: [welcomeEmbed],
      components: [actionRow]
    });

    return { success: true, channel: ticketChannel };
  } catch (error: any) {
    console.error('[TICKET] Gagal membuat ticket channel:', error);
    return { success: false, message: `Gagal membuat channel tiket: ${error.message}` };
  }
}

export async function handleTicketClaim(channel: TextChannel, staffUser: User): Promise<void> {
  claimTicket(channel.id, staffUser.id);

  const embed = createSuccessEmbed(
    'TIKET DIKLAIM',
    `Tiket ini sekarang ditangani langsung oleh <@${staffUser.id}> (\`${staffUser.tag}\`).\nMohon sampaikan detail kendala kamu.`
  );

  await channel.send({ embeds: [embed] });
}

export async function generateTranscript(channel: TextChannel): Promise<string> {
  const messages = await channel.messages.fetch({ limit: 100 });
  const sorted = Array.from(messages.values()).reverse();

  let transcript = `========================================================\n`;
  transcript += `       WANDER ROLEPLAY TICKET TRANSCRIPT\n`;
  transcript += `Channel: #${channel.name} (${channel.id})\n`;
  transcript += `Tanggal: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB\n`;
  transcript += `Total Pesan: ${sorted.length}\n`;
  transcript += `========================================================\n\n`;

  for (const msg of sorted) {
    const time = new Date(msg.createdTimestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const author = `${msg.author.tag} (${msg.author.id})`;
    transcript += `[${time}] ${author}:\n`;
    if (msg.content) transcript += `  ${msg.content}\n`;
    if (msg.attachments.size > 0) {
      transcript += `  [Lampiran: ${msg.attachments.map((a) => a.url).join(', ')}]\n`;
    }
    transcript += `\n`;
  }

  return transcript;
}

export async function handleTicketClose(
  channel: TextChannel,
  closedBy: User,
  guild: Guild
): Promise<void> {
  const ticketRecord = getTicketByChannel(channel.id);
  closeTicket(channel.id, closedBy.id);

  // Generate transcript
  const transcriptText = await generateTranscript(channel);
  const attachment = new AttachmentBuilder(Buffer.from(transcriptText, 'utf-8'), {
    name: `${channel.name}-transcript.txt`
  });

  const logEmbed = createBaseEmbed()
    .setTitle('📁 TIKET DITUTUP & DIARSIPKAN')
    .addFields(
      { name: 'Channel', value: `#${channel.name}`, inline: true },
      { name: 'Ditutup Oleh', value: `${closedBy.tag} (<@${closedBy.id}>)`, inline: true },
      {
        name: 'Pemilik Tiket',
        value: ticketRecord ? `<@${ticketRecord.user_id}> (\`${ticketRecord.user_id}\`)` : 'Tidak Diketahui',
        inline: true
      },
      { name: 'Kategori', value: ticketRecord?.category || 'Umum', inline: true },
      {
        name: 'Dibuat Pada',
        value: ticketRecord ? `<t:${Math.floor(ticketRecord.created_at / 1000)}:R>` : '-',
        inline: true
      }
    );

  await sendTicketLog(guild, logEmbed, [attachment]);

  // Notify inside channel and delete after 5s
  const closingEmbed = createErrorEmbed(
    'TIKET DITUTUP',
    `Tiket ini telah ditutup oleh <@${closedBy.id}>.\nTranscript telah disimpan ke log staff.\n\n*Channel ini akan dihapus secara otomatis dalam **5 detik**...*`
  );

  await channel.send({ embeds: [closingEmbed] });

  setTimeout(async () => {
    try {
      await channel.delete('Tiket ditutup oleh staff Wander Roleplay');
    } catch (err) {
      console.error('[TICKET] Gagal menghapus channel tiket:', err);
    }
  }, 5000);
}
