import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  EmbedBuilder
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { createBaseEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const helpCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Panduan & katalog perintah lengkap Bot Wander Roleplay')
    .addStringOption((opt) =>
      opt
        .setName('perintah')
        .setDescription('Cari informasi detail perintah tertentu (contoh: ban, setup, announcement, ticket)')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const query = interaction.options.getString('perintah');

    // 1. Single Command Lookup
    if (query) {
      const q = query.toLowerCase().replace('/', '').trim();
      const clientCommands = (interaction.client as any).commands;
      const cmd = clientCommands.get(q);

      if (!cmd) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              'PERINTAH TIDAK DITEMUKAN',
              `Tidak ada perintah dengan nama \`/${q}\`.\nGunakan \`/help\` tanpa opsi untuk melihat seluruh daftar perintah.`
            )
          ],
          ephemeral: true
        });
        return;
      }

      const data = cmd.data;
      const subcommands = (data.options || []).filter((opt: any) => opt.toJSON().type === 1);

      const embed = createBaseEmbed()
        .setTitle(`📖 DETAIL PERINTAH: /${data.name.toUpperCase()}`)
        .setDescription(data.description || 'Tidak ada deskripsi.')
        .addFields(
          {
            name: '🔒 Hak Akses',
            value: cmd.adminOnly ? '👑 **Hanya Server Owner & Administrator**' : '👥 **Semua Warga**',
            inline: true
          },
          {
            name: '📋 Format Penggunaan',
            value: `\`/${data.name}\``,
            inline: true
          }
        );

      if (subcommands.length > 0) {
        const subList = subcommands.map((s: any) => `• \`/${data.name} ${s.name}\` — ${s.description}`).join('\n');
        embed.addFields({ name: 'Subcommands Tersedia', value: subList, inline: false });
      }

      await interaction.reply({ embeds: [embed], ephemeral: true });
      return;
    }

    // 2. Main Comprehensive Help Menu
    const embed = createBaseEmbed()
      .setTitle(`📜 PANDUAN LENGKAP SISTEM • ${config.server.name.toUpperCase()}`)
      .setDescription(
        `Selamat datang di bot resmi **${config.server.name}**!\n` +
          `Bot ini didesain khusus sebagai moderator tangguh, sistem keamanan anti-raid otomatis, serta penyedia layanan komunitas warga kota FiveM.\n\n` +
          `👑 **Kendali Penuh Administrator & Owner:**\n` +
          `Seluruh pengaturan bot (setup channel, role, fitur, dan moderasi) dapat dikendalikan penuh, diganti, atau dihapus sesuka hati oleh **Server Owner** dan role dengan izin **Administrator** melalui perintah \`/setup\`.\n\n` +
          `*Pilih salah satu kategori di dropdown menu berikut untuk melihat daftar & cara pakai perintah:*`
      )
      .addFields(
        {
          name: '⚙️ Setup & Pengaturan',
          value: '`/setup dashboard`, `/setup channel`, `/setup role`, `/setup features`, `/setup reset`, `/settings`',
          inline: false
        },
        {
          name: '🛡️ Moderasi & Keamanan',
          value: '`/ban`, `/unban`, `/kick`, `/timeout`, `/untimeout`, `/warn`, `/warnings`, `/clearwarn`, `/purge`, `/slowmode`, `/lock`, `/unlock`',
          inline: false
        },
        {
          name: '🎫 Layanan Tiket Support',
          value: '`/ticket panel`, `/ticket claim`, `/ticket transcript`, `/ticket close`',
          inline: true
        },
        {
          name: '📢 Broadcast Pengumuman',
          value: '`/announcement interactive` *(bisa enter/longkap bawah)*, `/announcement modal`, `/announcement quick`',
          inline: true
        },
        {
          name: '🍯 Honeypot Anti-Raid',
          value: '`/honeypot setup`, `/honeypot status`, `/honeypot disable`, `/honeypot logs`',
          inline: true
        },
        {
          name: '🏙️ FiveM & Komunitas',
          value: '`/fivem status`, `/fivem setup`, `/suggest kirim`, `/suggest review`, `/whitelist panel`',
          inline: true
        },
        {
          name: '👋 Welcome & Ambil Role',
          value: '`/welcome setup`, `/welcome test`, `/goodbye setup`, `/takerole notifications`, `/takerole gender`, `/takerole custom`',
          inline: true
        },
        {
          name: '🎉 Giveaway & Polling',
          value: '`/giveaway start`, `/giveaway end`, `/giveaway reroll`, `/poll create`, `/poll end`',
          inline: true
        },
        {
          name: '🎵 Sistem Musik (Lavalink v4)',
          value: '`/music play`, `/music stop`, `/music skip`, `/music autoplay`, `/music 247`, `/music queue`, `/music volume`',
          inline: true
        }
      )
      .setFooter({ text: `${config.server.footerText} • Gunakan /help perintah:[nama] untuk cek perintah tertentu` });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help_category_select')
      .setPlaceholder('Pilih kategori panduan untuk membaca detail perintah...')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('Setup & Pengaturan Bot')
          .setDescription('Dashboard kontrol, ganti/hapus channel & role, toggle fitur, reset')
          .setEmoji('⚙️')
          .setValue('help_setup'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Moderasi & Keamanan Kota')
          .setDescription('Ban, kick, timeout, warn, warnings, clearwarn, purge, slowmode, lock')
          .setEmoji('🛡️')
          .setValue('help_moderation'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sistem Tiket Bantuan')
          .setDescription('Setup panel tiket, klaim tiket, tutup tiket, ekspor transcript')
          .setEmoji('🎫')
          .setValue('help_tickets'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Pengumuman / Announcement')
          .setDescription('Broadcast pesan bot dengan format enter bebas / longkap bawah')
          .setEmoji('📢')
          .setValue('help_announcement'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sistem Honeypot Anti-Raid')
          .setDescription('Jebakan anti bot spammer & token selfbot otomatis')
          .setEmoji('🍯')
          .setValue('help_honeypot'),
        new StringSelectMenuOptionBuilder()
          .setLabel('FiveM & Komunitas Warga')
          .setDescription('Live status FiveM, kotak aspirasi warga, & formulir pendaftaran IC')
          .setEmoji('🏙️')
          .setValue('help_fivem_community'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Welcome, Goodbye & Role')
          .setDescription('Sambutan warga baru, autorole, dan panel ambil role mandiri')
          .setEmoji('👋')
          .setValue('help_welcome_roles'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Giveaway & Polling Suara')
          .setDescription('Undian berhadiah dengan timer SQLite & voting warga real-time')
          .setEmoji('🎉')
          .setValue('help_giveaway_poll'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Sistem Musik Wander Roleplay')
          .setDescription('Pemutar musik Lavalink v4, Autoplay, 24 Jam Standby, Loop & Volume')
          .setEmoji('🎵')
          .setValue('help_music'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Informasi Umum & Utilitas')
          .setDescription('Ping latensi bot, statistik kota serverinfo')
          .setEmoji('ℹ️')
          .setValue('help_general')
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

    await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
  }
};
