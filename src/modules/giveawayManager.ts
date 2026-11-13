import {
  type Client,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} from 'discord.js';
import {
  saveGiveaway,
  getGiveaway,
  getActiveGiveaways,
  updateGiveawayParticipants,
  endGiveaway
} from '../database/schema.js';
import { createBaseEmbed, createSuccessEmbed } from '../utils/embeds.js';
import { config } from '../config.js';

export function startGiveawayScheduler(client: Client): void {
  // Check active giveaways every 15 seconds
  setInterval(async () => {
    try {
      const active = getActiveGiveaways();
      const now = Date.now();

      for (const item of active) {
        if (now >= item.ends_at) {
          await finalizeGiveaway(client, item.message_id);
        }
      }
    } catch (err) {
      console.error('[GIVEAWAY] Error checking giveaways:', err);
    }
  }, 15000);
}

export async function finalizeGiveaway(client: Client, messageId: string): Promise<string[]> {
  const item = getGiveaway(messageId);
  if (!item || item.ended) return [];

  const participants: string[] = JSON.parse(item.participants || '[]');
  const winnersCount = item.winners_count;

  // Pick random winners
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  const winners = shuffled.slice(0, winnersCount);

  endGiveaway(messageId, JSON.stringify(winners));

  try {
    const channel = (await client.channels.fetch(item.channel_id).catch(() => null)) as TextChannel | null;
    if (!channel) return winners;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return winners;

    const winnerMentions = winners.length > 0 ? winners.map((id) => `<@${id}>`).join(', ') : 'Tidak ada peserta yang sah';

    const endedEmbed = createBaseEmbed()
      .setTitle(`🎉 GIVEAWAY BERAKHIR: ${item.prize.toUpperCase()}`)
      .setDescription(
        `Selamat kepada para pemenang giveaway **Wander Roleplay**!\n\n` +
          `🎁 **Hadiah:** **${item.prize}**\n` +
          `🏆 **Pemenang:** ${winnerMentions}\n` +
          `👥 **Total Peserta:** **${participants.length}** orang\n` +
          `👮 **Host:** <@${item.host_id}>\n\n` +
          `*Silakan buka tiket di server jika hadiah memerlukan klaim manual.*`
      )
      .setColor('#2ECC71');

    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('giveaway_ended')
        .setLabel(`Berakhir (${participants.length} Peserta)`)
        .setEmoji('🎉')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    await message.edit({ embeds: [endedEmbed], components: [disabledRow] });

    if (winners.length > 0) {
      await channel.send({
        content: `🎉 Selamat kepada ${winnerMentions}! Kalian memenangkan giveaway **${item.prize}** di Wander Roleplay!`
      });
    } else {
      await channel.send({
        content: `😢 Giveaway untuk **${item.prize}** telah berakhir tanpa ada peserta yang bergabung.`
      });
    }
  } catch (error) {
    console.error('[GIVEAWAY] Gagal menyelesaikan giveaway:', error);
  }

  return winners;
}

export async function toggleGiveawayParticipation(
  userId: string,
  messageId: string
): Promise<{ joined: boolean; count: number }> {
  const item = getGiveaway(messageId);
  if (!item || item.ended) {
    throw new Error('Giveaway ini sudah berakhir atau tidak ditemukan.');
  }

  const participants: string[] = JSON.parse(item.participants || '[]');
  const index = participants.indexOf(userId);

  let joined = false;
  if (index === -1) {
    participants.push(userId);
    joined = true;
  } else {
    participants.splice(index, 1);
    joined = false;
  }

  updateGiveawayParticipants(messageId, JSON.stringify(participants));

  return { joined, count: participants.length };
}
