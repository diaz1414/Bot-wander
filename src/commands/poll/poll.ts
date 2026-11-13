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
import { savePoll, getPoll, closePoll } from '../../database/schema.js';

export const pollCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Sistem Voting & Polling Wander Roleplay (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Membuat polling suara baru')
        .addStringOption((opt) =>
          opt.setName('pertanyaan').setDescription('Pertanyaan atau topik voting').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('opsi1').setDescription('Pilihan ke-1').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('opsi2').setDescription('Pilihan ke-2').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('opsi3').setDescription('Pilihan ke-3 (opsional)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('opsi4').setDescription('Pilihan ke-4 (opsional)').setRequired(false)
        )
        .addStringOption((opt) =>
          opt.setName('opsi5').setDescription('Pilihan ke-5 (opsional)').setRequired(false)
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan voting (default: channel saat ini)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Mengakhiri voting dan menampilkan hasil akhir')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('Message ID pesan polling').setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const question = interaction.options.getString('pertanyaan', true);
      const targetChannel = (interaction.options.getChannel('channel') || interaction.channel) as TextChannel;

      const options = [
        interaction.options.getString('opsi1', true),
        interaction.options.getString('opsi2', true),
        interaction.options.getString('opsi3'),
        interaction.options.getString('opsi4'),
        interaction.options.getString('opsi5')
      ].filter(Boolean) as string[];

      const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

      let optionsListText = '';
      const buttons: ButtonBuilder[] = [];

      options.forEach((opt, idx) => {
        optionsListText += `${optionEmojis[idx]} **${opt}** — 0 suara (0%)\n`;
        buttons.push(
          new ButtonBuilder()
            .setCustomId(`poll_vote_${idx}`)
            .setLabel(`${opt.slice(0, 70)}`)
            .setEmoji(optionEmojis[idx])
            .setStyle(ButtonStyle.Primary)
        );
      });

      const embed = createBaseEmbed()
        .setTitle(`📊 VOTING WARGA: ${question.toUpperCase()}`)
        .setDescription(
          `Silakan berikan suara kamu dengan menekan tombol pilihan di bawah!\n\n` +
            `${optionsListText}\n` +
            `👥 **Total Suara:** 0 suara\n` +
            `👮 **Pembuat Polling:** <@${interaction.user.id}>`
        )
        .setColor('#3498DB');

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      const msg = await targetChannel.send({ embeds: [embed], components: [row] });

      savePoll({
        message_id: msg.id,
        guild_id: interaction.guildId!,
        channel_id: targetChannel.id,
        creator_id: interaction.user.id,
        question,
        options: JSON.stringify(options),
        votes: '{}',
        active: 1,
        created_at: Date.now()
      });

      await interaction.reply({
        embeds: [createSuccessEmbed('POLLING DIMULAI', `Voting berhasil diposting di <#${targetChannel.id}>.`)],
        ephemeral: true
      });
      return;
    }

    if (sub === 'end') {
      const messageId = interaction.options.getString('message_id', true).trim();
      const poll = getPoll(messageId);

      if (!poll) {
        await interaction.reply({
          embeds: [createErrorEmbed('TIDAK DITEMUKAN', 'Polling dengan ID pesan tersebut tidak ditemukan.')],
          ephemeral: true
        });
        return;
      }

      closePoll(messageId);

      const targetChannel = (await interaction.client.channels.fetch(poll.channel_id).catch(() => null)) as TextChannel | null;
      if (targetChannel) {
        const msg = await targetChannel.messages.fetch(messageId).catch(() => null);
        if (msg) {
          const votesObj: Record<string, number> = JSON.parse(poll.votes || '{}');
          const options: string[] = JSON.parse(poll.options || '[]');
          const totalVotes = Object.keys(votesObj).length;

          const counts = options.map((_, i) => Object.values(votesObj).filter((val) => val === i).length);

          let resultText = '';
          options.forEach((opt, idx) => {
            const count = counts[idx];
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            resultText += `• **${opt}**: **${count}** suara (${pct}%)\n`;
          });

          const endedEmbed = createBaseEmbed()
            .setTitle(`📊 HASIL AKHIR VOTING: ${poll.question}`)
            .setDescription(
              `Voting telah ditutup oleh Administrator.\n\n` +
                `${resultText}\n` +
                `👥 **Total Partisipasi:** **${totalVotes}** suara.`
            )
            .setColor('#2ECC71');

          await msg.edit({ embeds: [endedEmbed], components: [] });
        }
      }

      await interaction.reply({
        embeds: [createSuccessEmbed('POLLING DITUTUP', 'Polling telah resmi ditutup dan hasil akhir telah diperbarui.')],
        ephemeral: true
      });
    }
  }
};
