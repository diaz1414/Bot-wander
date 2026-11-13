import {
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';
import { createSuggestion, getSuggestionById, updateSuggestionStatus } from '../../database/schema.js';
import { config } from '../../config.js';

export const suggestCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Kotak saran & aspirasi warga Wander Roleplay')
    .addSubcommand((sub) =>
      sub
        .setName('kirim')
        .setDescription('Kirimkan ide atau saran untuk kemajuan kota Wander Roleplay')
        .addStringOption((opt) =>
          opt.setName('saran').setDescription('Tuliskan detail saran kamu').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('review')
        .setDescription('Meninjau dan memutuskan saran warga (Hanya Owner & Admin)')
        .addIntegerOption((opt) =>
          opt.setName('id').setDescription('ID saran yang ingin ditinjau').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('keputusan')
            .setDescription('Keputusan staff terhadap saran')
            .setRequired(true)
            .addChoices(
              { name: '✅ DITERIMA (Akan Diimplementasikan)', value: 'accepted' },
              { name: '❌ DITOLAK (Belum Sesuai)', value: 'rejected' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('catatan').setDescription('Catatan / alasan keputusan staff').setRequired(false)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    if (!guild) return;

    if (sub === 'kirim') {
      const suggestionText = interaction.options.getString('saran', true);
      const targetChannelId = config.channels.suggestionChannelId || interaction.channelId;
      const targetChannel = (await guild.channels.fetch(targetChannelId).catch(() => null)) as TextChannel | null;

      if (!targetChannel || !targetChannel.isTextBased()) {
        await interaction.reply({
          embeds: [createErrorEmbed('GAGAL', 'Channel saran belum diatur atau tidak ditemukan.')],
          ephemeral: true
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      const embed = createBaseEmbed()
        .setTitle('💡 SARAN & ASPIRASI WARGA WANDER RP')
        .setDescription(
          `**Dari Warga:** <@${interaction.user.id}> (\`${interaction.user.tag}\`)\n\n` +
            `📝 **Saran:**\n>>> ${suggestionText}\n\n` +
            `📊 **Status:** ⏳ *Sedang Ditinjau Staff*`
        )
        .setThumbnail(interaction.user.displayAvatarURL())
        .setColor('#F1C40F');

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('suggest_upvote')
          .setLabel('Setuju (0)')
          .setEmoji('👍')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('suggest_downvote')
          .setLabel('Tidak Setuju (0)')
          .setEmoji('👎')
          .setStyle(ButtonStyle.Danger)
      );

      const msg = await targetChannel.send({ embeds: [embed], components: [actionRow] });

      const id = createSuggestion({
        guild_id: guild.id,
        message_id: msg.id,
        user_id: interaction.user.id,
        suggestion: suggestionText
      });

      embed.setFooter({ text: `ID Saran: #${id} • ${config.server.footerText}` });
      await msg.edit({ embeds: [embed] });

      await interaction.editReply({
        embeds: [
          createSuccessEmbed(
            'SARAN TERKIRIM',
            `Terima kasih! Saran kamu (ID \`#${id}\`) telah diposting di <#${targetChannel.id}> untuk didiskusikan oleh warga dan staff kota.`
          )
        ]
      });
      return;
    }

    if (sub === 'review') {
      if (!(await checkAdminAccess(interaction))) return;

      const id = interaction.options.getInteger('id', true);
      const decision = interaction.options.getString('keputusan', true) as 'accepted' | 'rejected';
      const note = interaction.options.getString('catatan') || 'Tidak ada catatan tambahan.';

      const record = getSuggestionById(id);
      if (!record) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK DITEMUKAN', `Saran dengan ID #${id} tidak ditemukan di database.`)],
          ephemeral: true
        });
        return;
      }

      updateSuggestionStatus(id, decision);

      // Fetch suggestion channel and message to update embed
      const targetChannelId = config.channels.suggestionChannelId || interaction.channelId;
      const targetChannel = (await guild.channels.fetch(targetChannelId).catch(() => null)) as TextChannel | null;

      if (targetChannel) {
        const msg = await targetChannel.messages.fetch(record.message_id).catch(() => null);
        if (msg) {
          const upvotes: string[] = JSON.parse(record.upvotes || '[]');
          const downvotes: string[] = JSON.parse(record.downvotes || '[]');

          const updatedEmbed = createBaseEmbed()
            .setTitle(
              decision === 'accepted'
                ? '✅ SARAN WARGA DITERIMA'
                : '❌ SARAN WARGA DITOLAK'
            )
            .setColor(decision === 'accepted' ? '#2ECC71' : '#E74C3C')
            .setDescription(
              `**Dari Warga:** <@${record.user_id}>\n\n` +
                `📝 **Saran:**\n>>> ${record.suggestion}\n\n` +
                `👮 **Ditinjau Oleh:** <@${interaction.user.id}>\n` +
                `📋 **Catatan Staff:** ${note}\n` +
                `📊 **Hasil Suara:** 👍 ${upvotes.length} | 👎 ${downvotes.length}`
            )
            .setFooter({ text: `ID Saran: #${id} • ${config.server.footerText}` });

          await msg.edit({ embeds: [updatedEmbed], components: [] });
        }
      }

      // Notify citizen via DM
      try {
        const citizen = await interaction.client.users.fetch(record.user_id).catch(() => null);
        if (citizen) {
          await citizen.send({
            embeds: [
              createBaseEmbed()
                .setTitle(
                  decision === 'accepted'
                    ? '🎉 SARAN KAMU DITERIMA!'
                    : '📢 INFORMASI SARAN WARGA'
                )
                .setColor(decision === 'accepted' ? '#2ECC71' : '#E74C3C')
                .setDescription(
                  `Halo <@${citizen.id}>, saran kamu di **Wander Roleplay** (ID \`#${id}\`) telah ditinjau oleh staff:\n\n` +
                    `📝 **Saran:** ${record.suggestion}\n` +
                    `⚖️ **Keputusan:** **${decision === 'accepted' ? 'DITERIMA' : 'DITOLAK'}**\n` +
                    `📋 **Catatan:** ${note}\n\n` +
                    `*Terima kasih telah berkontribusi memberikan masukan untuk kota kita!*`
                )
            ]
          });
        }
      } catch {
        // Ignore DM error
      }

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            'REVIEW SELESAI',
            `Saran ID \`#${id}\` berhasil diubah statusnya menjadi **${decision.toUpperCase()}**.`
          )
        ],
        ephemeral: true
      });
    }
  }
};
