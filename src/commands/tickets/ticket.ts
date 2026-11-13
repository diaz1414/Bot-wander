import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess, checkModAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { updateGuildSettings, getTicketByChannel } from '../../database/schema.js';
import { handleTicketClose, handleTicketClaim, generateTranscript } from '../../modules/ticketManager.js';
import { config } from '../../config.js';

export const ticketCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistem Open Ticket Wander Roleplay')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Kirim panel open ticket interaktif ke channel tertentu (Hanya Owner & Admin)')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tempat panel tiket akan dikirim').setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName('kategori')
            .setDescription('Kategori channel tempat tiket baru akan dibuat')
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('close').setDescription('Menutup tiket yang sedang aktif')
    )
    .addSubcommand((sub) =>
      sub.setName('claim').setDescription('Mengklaim tiket ini untuk kamu tangani (Staff/Admin)')
    )
    .addSubcommand((sub) =>
      sub.setName('transcript').setDescription('Menyimpan dan mencetak transcript percakapan tiket')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    if (!guild) return;

    if (sub === 'panel') {
      if (!(await checkAdminAccess(interaction))) return;

      const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
      const categoryChannel = interaction.options.getChannel('kategori');

      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed('GAGAL', 'Channel target harus channel teks!')],
          ephemeral: true
        });
        return;
      }

      if (categoryChannel) {
        updateGuildSettings(guild.id, { ticket_category_id: categoryChannel.id });
      }

      const panelEmbed = createBaseEmbed()
        .setTitle('🎫 CUSTOMER SERVICE & SUPPORT WANDER ROLEPLAY')
        .setDescription(
          `Selamat datang di Pusat Bantuan **Wander Roleplay**!\n\n` +
            `Jika kamu mengalami kendala di dalam kota, membutuhkan bantuan staff, ingin melaporkan pelanggaran rules, atau keperluan donasi/tebus kendaraan, silakan pilih menu di bawah ini untuk membuat tiket bantuan resmi.\n\n` +
            `📌 **Pilihan Kategori Tiket:**\n` +
            `• 🎫 **Bantuan Umum:** Pertanyaan seputar kota, bug game, kendala teknis.\n` +
            `• 🚨 **Lapor Warga / Cheater:** Laporkan player break rules (sertakan bukti rekaman).\n` +
            `• 🚗 **Tebus Kendaraan / Garasi:** Kendaraan disita atau klaim asuransi.\n` +
            `• 💎 **Donasi & Paket VIP:** Informasi donasi dan aktivasi benefit VIP kota.\n` +
            `• ❓ **Keperluan Lainnya:** Urusan lain yang tidak tercantum di atas.\n\n` +
            `*Harap gunakan tiket dengan bijak dan jangan membuat tiket ganda (spam ticket).*`
        )
        .setImage(config.welcome.bannerUrl || null)
        .setThumbnail(guild.iconURL() || config.server.logoUrl || null);

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_category_select')
        .setPlaceholder('Pilih jenis keperluan tiket kamu di sini...')
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Bantuan Umum & Bug')
            .setDescription('Tanya jawab umum, kendala teknis, atau bug kota')
            .setEmoji('🎫')
            .setValue('bantuan_umum'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Lapor Warga / Player Report')
            .setDescription('Melaporkan warga yang melanggar peraturan roleplay')
            .setEmoji('🚨')
            .setValue('report_warga'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Tebus Kendaraan / Asuransi')
            .setDescription('Klaim asuransi atau kendaraan disita pihak kepolisian')
            .setEmoji('🚗')
            .setValue('tebus_kendaraan'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Donasi & VIP Supporter')
            .setDescription('Urusan donasi kota, custom plate, atau VIP perks')
            .setEmoji('💎')
            .setValue('donasi_vip'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Keperluan Lainnya')
            .setDescription('Bantuan khusus lainnya dengan tim Staff')
            .setEmoji('❓')
            .setValue('lainnya')
        );

      const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

      const sentMsg = await targetChannel.send({ embeds: [panelEmbed], components: [row] });

      updateGuildSettings(guild.id, {
        ticket_panel_channel_id: targetChannel.id,
        ticket_panel_message_id: sentMsg.id
      });

      await interaction.reply({
        embeds: [createSuccessEmbed('PANEL TIKET DIBUAT', `Panel open ticket berhasil dikirimkan ke <#${targetChannel.id}>.`)],
        ephemeral: true
      });
      return;
    }

    // Commands inside ticket channel
    const currentChannel = interaction.channel as TextChannel;
    const ticketRecord = getTicketByChannel(currentChannel.id);

    if (!ticketRecord || ticketRecord.status === 'closed') {
      await interaction.reply({
        embeds: [createErrorEmbed('BUKAN CHANNEL TIKET', 'Perintah ini hanya dapat dijalankan di dalam channel tiket yang masih aktif.')],
        ephemeral: true
      });
      return;
    }

    if (sub === 'claim') {
      if (!(await checkModAccess(interaction))) return;
      await handleTicketClaim(currentChannel, interaction.user);
      await interaction.reply({ content: '✅ Tiket berhasil diklaim!', ephemeral: true });
      return;
    }

    if (sub === 'transcript') {
      const transcript = await generateTranscript(currentChannel);
      await interaction.reply({
        content: `📋 Transcript berhasil dibuat! Silakan unduh salinan berikut:`,
        files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `${currentChannel.name}-transcript.txt` }],
        ephemeral: true
      });
      return;
    }

    if (sub === 'close') {
      // Prompt confirmation
      const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Ya, Tutup Tiket').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Batalkan').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        embeds: [createBaseEmbed().setTitle('🔒 KONFIRMASI PENUTUPAN TIKET').setDescription('Apakah kamu yakin ingin menutup tiket ini sekarang?')],
        components: [confirmRow]
      });
    }
  }
};
