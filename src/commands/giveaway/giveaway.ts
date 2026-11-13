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
import { parseDuration, formatDuration } from '../../utils/time.js';
import { saveGiveaway, getGiveaway } from '../../database/schema.js';
import { finalizeGiveaway } from '../../modules/giveawayManager.js';

export const giveawayCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Sistem Giveaway Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Memulai giveaway baru')
        .addStringOption((opt) =>
          opt.setName('hadiah').setDescription('Hadiah yang diperebutkan (contoh: Mobil Sport / Uang IC 500k / VIP)').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('durasi').setDescription('Durasi giveaway (contoh: 30m, 2h, 1d, 3d)').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('pemenang').setDescription('Jumlah pemenang').setMinValue(1).setMaxValue(20).setRequired(true)
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tempat giveaway diumumkan').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Mengakhiri giveaway sekarang secara paksa')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('Message ID pesan giveaway').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Memilih ulang pemenang giveaway yang sudah berakhir')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('Message ID pesan giveaway').setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('hadiah', true);
      const durationStr = interaction.options.getString('durasi', true);
      const winnersCount = interaction.options.getInteger('pemenang', true);
      const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

      const durationMs = parseDuration(durationStr);
      if (!durationMs || durationMs < 10000) {
        await interaction.reply({
          embeds: [createErrorEmbed('DURASI TIDAK VALID', 'Contoh format durasi yang benar: `10m`, `1h`, `12h`, `1d`, `3d`.')],
          ephemeral: true
        });
        return;
      }

      const endsAt = Date.now() + durationMs;
      const endTimestamp = Math.floor(endsAt / 1000);

      const giveawayEmbed = createBaseEmbed()
        .setTitle(`🎉 GIVEAWAY WANDER ROLEPLAY: ${prize.toUpperCase()}`)
        .setDescription(
          `Klik tombol **🎉 Ikut Giveaway** di bawah untuk berpartisipasi!\n\n` +
            `🎁 **Hadiah:** **${prize}**\n` +
            `🏆 **Jumlah Pemenang:** **${winnersCount}** Warga\n` +
            `⏰ **Berakhir Pada:** <t:${endTimestamp}:F> (<t:${endTimestamp}:R>)\n` +
            `👮 **Host:** <@${interaction.user.id}>\n\n` +
            `*Semoga beruntung warga Wander Roleplay!*`
        )
        .setColor('#F1C40F');

      const joinButton = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_join')
          .setLabel('Ikut Giveaway (0)')
          .setEmoji('🎉')
          .setStyle(ButtonStyle.Success)
      );

      const msg = await targetChannel.send({
        embeds: [giveawayEmbed],
        components: [joinButton]
      });

      saveGiveaway({
        message_id: msg.id,
        guild_id: interaction.guildId!,
        channel_id: targetChannel.id,
        prize,
        winners_count: winnersCount,
        ends_at: endsAt,
        host_id: interaction.user.id,
        ended: 0,
        participants: '[]',
        winners: '[]'
      });

      await interaction.reply({
        embeds: [createSuccessEmbed('GIVEAWAY DIMULAI', `Giveaway **${prize}** berhasil diposting di <#${targetChannel.id}>!`)],
        ephemeral: true
      });
      return;
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id', true).trim();
      const item = getGiveaway(messageId);

      if (!item) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK DITEMUKAN', 'Giveaway dengan Message ID tersebut tidak ditemukan di database.')],
          ephemeral: true
        });
        return;
      }

      if (item.ended) {
        await interaction.reply({
          embeds: [createErrorEmbed('SUDAH BERAKHIR', 'Giveaway ini sudah berakhir sebelumnya.')],
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      const winners = await finalizeGiveaway(interaction.client, messageId);

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'GIVEAWAY DIAKHIRI',
            `Giveaway telah diakhiri. Pemenang terpilih: ${
              winners.length > 0 ? winners.map((id) => `<@${id}>`).join(', ') : 'Tidak ada'
            }`
          )
        ]
      });
      return;
    }

    if (sub === 'reroll') {
      const messageId = interaction.options.getString('message_id', true).trim();
      const item = getGiveaway(messageId);

      if (!item) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK DITEMUKAN', 'Giveaway dengan Message ID tersebut tidak ditemukan.')],
          ephemeral: true
        });
        return;
      }

      const participants: string[] = JSON.parse(item.participants || '[]');
      if (participants.length === 0) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK ADA PESERTA', 'Tidak ada peserta yang terdaftar untuk dipilih ulang.')],
          ephemeral: true
        });
        return;
      }

      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const newWinners = shuffled.slice(0, item.winners_count);

      const targetChannel = (await interaction.client.channels.fetch(item.channel_id).catch(() => null)) as TextChannel | null;
      if (targetChannel) {
        await targetChannel.send({
          content: `🔄 **REROLL GIVEAWAY (${item.prize})!**\nPemenang baru yang beruntung adalah: ${newWinners
            .map((id) => `<@${id}>`)
            .join(', ')}! Selamat!`
        });
      }

      await interaction.reply({
        embeds: [
          createSuccessEmbed('REROLL BERHASIL', `Pemenang baru berhasil dipilih: ${newWinners.map((id) => `<@${id}>`).join(', ')}`)
        ],
        ephemeral: true
      });
    }
  }
};
