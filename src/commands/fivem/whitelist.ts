import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { config } from '../../config.js';

export const whitelistCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Sistem pendaftaran & verifikasi karakter IC Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Kirim panel formulir pendaftaran warga ke channel tertentu')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan panel formulir pendaftaran').setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed('GAGAL', 'Channel harus merupakan channel teks!')],
          ephemeral: true
        });
        return;
      }

      const panelEmbed = createBaseEmbed()
        .setTitle('🆔 FORMULIR PENDAFTARAN WARGA WANDER ROLEPLAY')
        .setDescription(
          `Selamat datang di gerbang masuk **Kota Wander Roleplay**!\n\n` +
            `Untuk dapat bermain dan mendapatkan identitas resmi sebagai warga kota, kamu diwajibkan mengisi formulir data karakter IC (In-Character).\n\n` +
            `📌 **Ketentuan Pendaftaran:**\n` +
            `• Gunakan nama karakter yang realistis (bukan nama artis, tokoh terkenal, atau angka/singkatan).\n` +
            `• Pahami peraturan dasar roleplay (RDM, VDM, FailRP, Metagaming, Powergaming).\n` +
            `• Siapkan latar belakang cerita karaktermu.\n\n` +
            `*Klik tombol di bawah untuk membuka formulir pendaftaran:*`
        )
        .setImage(config.welcome.bannerUrl || null)
        .setColor('#E67E22');

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('whitelist_open_modal')
          .setLabel('Isi Formulir Masuk Kota')
          .setEmoji('📝')
          .setStyle(ButtonStyle.Success)
      );

      await targetChannel.send({ embeds: [panelEmbed], components: [actionRow] });

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'PANEL WHITELIST DIPASANG',
            `Panel pendaftaran warga berhasil dikirim ke <#${targetChannel.id}>.`
          )
        ],
        ephemeral: true
      });
    }
  }
};
