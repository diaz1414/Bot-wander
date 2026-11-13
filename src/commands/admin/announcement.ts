import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createBaseEmbed } from '../../utils/embeds.js';
import { announcementSessions } from '../../modules/announcementSession.js';

export const announcementCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('announcement')
    .setDescription('Kirim pengumuman resmi Wander Roleplay melalui Bot (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Subcommand 1: Interactive Chat Session (Ketik langsung di chat dengan enter/longkap bawah)
    .addSubcommand((sub) =>
      sub
        .setName('interactive')
        .setDescription('Ketik pesan langsung di chat dengan baris baru (Shift+Enter / longkap bawah)')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel target tujuan pengumuman').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('format')
            .setDescription('Format pengiriman')
            .setRequired(true)
            .addChoices(
              { name: '✨ Embed Mewah Wander RP', value: 'embed' },
              { name: '📝 Pesan Teks Polos', value: 'plain' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('mention')
            .setDescription('Mention audiens')
            .setRequired(false)
            .addChoices(
              { name: 'Tanpa Mention', value: 'none' },
              { name: '@everyone', value: '@everyone' },
              { name: '@here', value: '@here' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('judul').setDescription('Judul embed (hanya berlaku untuk format embed)').setRequired(false)
        )
    )
    // Subcommand 2: Modal Pop-up (Jendela pop-up Discord)
    .addSubcommand((sub) =>
      sub
        .setName('modal')
        .setDescription('Buka jendela formulir pop-up untuk mengetik pengumuman lengkap')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel target tujuan pengumuman').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('mention')
            .setDescription('Mention audiens')
            .setRequired(false)
            .addChoices(
              { name: 'Tanpa Mention', value: 'none' },
              { name: '@everyone', value: '@everyone' },
              { name: '@here', value: '@here' }
            )
        )
    )
    // Subcommand 3: Quick Direct
    .addSubcommand((sub) =>
      sub
        .setName('quick')
        .setDescription('Kirim pengumuman cepat secara langsung dalam satu baris')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel target tujuan pengumuman').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('pesan').setDescription('Isi pesan pengumuman').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('judul').setDescription('Judul embed (opsional)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('mention')
            .setDescription('Mention audiens')
            .setRequired(false)
            .addChoices(
              { name: 'Tanpa Mention', value: 'none' },
              { name: '@everyone', value: '@everyone' },
              { name: '@here', value: '@here' }
            )
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'interactive') {
      const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
      const format = (interaction.options.getString('format', true) as 'embed' | 'plain');
      const mention = interaction.options.getString('mention') || 'none';
      const title = interaction.options.getString('judul') || '📢 PENGUMUMAN WANDER ROLEPLAY';

      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed('GAGAL', 'Channel target harus merupakan channel teks!')],
          ephemeral: true
        });
        return;
      }

      // Create session for this admin
      announcementSessions.createSession({
        userId: interaction.user.id,
        sourceChannelId: interaction.channelId,
        targetChannelId: targetChannel.id,
        mode: format,
        mention: mention === 'none' ? null : mention,
        title,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes timeout
      });

      const promptEmbed = createBaseEmbed()
        .setTitle('✍️ SESI PENGETIKAN PENGUMUMAN AKTIF')
        .setDescription(
          `Silakan **ketik pesan pengumuman kamu sekarang** di channel ini:\n\n` +
            `🎯 **Target Channel:** <#${targetChannel.id}>\n` +
            `🎨 **Format:** \`${format.toUpperCase()}\`\n` +
            `🔔 **Mention:** \`${mention}\`\n\n` +
            `💡 **Tips & Pengaman:**\n` +
            `• Kamu bebas menekan **Shift + Enter** untuk baris baru / longkap bawah.\n` +
            `• Mendukung format Markdown (\`**tebal**\`, \`*miring*\`, quote, bullet list, dll).\n` +
            `• Pesan kamu di channel ini akan otomatis dihapus bot agar chat tetap bersih dan rapi.\n` +
            `• Perintah ini memiliki pengaman sesi khusus ID kamu, sehingga **tidak akan bertabrakan dengan chat atau command member lain**.\n` +
            `• Sesi akan otomatis berakhir dalam 5 menit. Ketik \`cancel\` untuk membatalkan kapan saja.`
        );

      await interaction.reply({ embeds: [promptEmbed], ephemeral: true });
      return;
    }

    if (subcommand === 'modal') {
      const targetChannel = interaction.options.getChannel('channel', true);
      const mention = interaction.options.getString('mention') || 'none';

      const modal = new ModalBuilder()
        .setCustomId(`modal_announcement_${targetChannel.id}_${mention}`)
        .setTitle('Kirim Pengumuman Wander RP');

      const titleInput = new TextInputBuilder()
        .setCustomId('announcement_title')
        .setLabel('Judul Pengumuman')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Contoh: PENGUMUMAN RESET KOTA / UPDATE FITUR')
        .setRequired(true)
        .setMaxLength(100);

      const contentInput = new TextInputBuilder()
        .setCustomId('announcement_content')
        .setLabel('Isi Pesan (Bisa Enter / Longkap Bawah)')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ketik isi pengumuman kamu di sini. Tekan enter untuk baris baru...')
        .setRequired(true)
        .setMaxLength(4000);

      const bannerInput = new TextInputBuilder()
        .setCustomId('announcement_banner')
        .setLabel('URL Banner / Gambar (Opsional)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('https://i.imgur.com/example.png')
        .setRequired(false);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(bannerInput)
      );

      await interaction.showModal(modal);
      return;
    }

    if (subcommand === 'quick') {
      const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;
      const message = interaction.options.getString('pesan', true);
      const title = interaction.options.getString('judul') || '📢 PENGUMUMAN WANDER ROLEPLAY';
      const mention = interaction.options.getString('mention');

      const embed = createBaseEmbed()
        .setTitle(title)
        .setDescription(message.replace(/\\n/g, '\n'));

      const payload: any = { embeds: [embed] };
      if (mention && mention !== 'none') {
        payload.content = mention;
      }

      await targetChannel.send(payload);

      await interaction.reply({
        embeds: [createSuccessEmbed('TERKIRIM', `Pengumuman berhasil disiarkan ke <#${targetChannel.id}>.`)],
        ephemeral: true
      });
    }
  }
};
