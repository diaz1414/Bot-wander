import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../../types/index.js';
import { createBaseEmbed } from '../../utils/embeds.js';
import { formatDuration } from '../../utils/time.js';

export const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Cek status latensi, performa bot & koneksi Wander Roleplay'),
  async execute(interaction: ChatInputCommandInteraction) {
    const sent = await interaction.reply({ content: '🏓 Mengukur kecepatan bot...', fetchReply: true });
    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsPing = interaction.client.ws.ping;

    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const uptime = formatDuration(process.uptime() * 1000);

    const embed = createBaseEmbed()
      .setTitle('🏓 STATUS & PERFORMA WANDER BOT')
      .addFields(
        { name: '⚡ Latensi Bot', value: `\`${roundtrip}ms\``, inline: true },
        { name: '🌐 Discord API Ping', value: `\`${wsPing}ms\``, inline: true },
        { name: '💾 Penggunaan RAM', value: `\`${memoryUsage} MB\``, inline: true },
        { name: '⏳ Waktu Aktif (Uptime)', value: `\`${uptime}\``, inline: true },
        { name: '🚀 Runtime', value: typeof (globalThis as any).Bun !== 'undefined' ? '`Bun (High Performance)`' : '`Node.js`', inline: true },
        { name: '📦 Database', value: '`SQLite (WAL Mode)`', inline: true }
      );

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
