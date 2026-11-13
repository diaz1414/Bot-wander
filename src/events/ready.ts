import { ActivityType, REST, Routes } from 'discord.js';
import type { WanderBotClient } from '../client.js';
import { config } from '../config.js';
import { initDatabase } from '../database/schema.js';
import { startGiveawayScheduler } from '../modules/giveawayManager.js';

export async function onReady(client: WanderBotClient): Promise<void> {
  console.log(`====================================================`);
  console.log(`🚀 [WANDER BOT] Berhasil login sebagai: ${client.user?.tag}`);
  console.log(`🆔 [CLIENT ID]: ${client.user?.id}`);
  console.log(`🏙️ [SERVER FIVE]: ${config.server.name}`);
  console.log(`====================================================`);

  // 1. Initialize SQLite Database
  initDatabase();

  // 2. Start Background Giveaway Scheduler
  startGiveawayScheduler(client);

  // 3. Initialize Lavalink v4 Client
  try {
    if (client.lavalink) {
      console.log('[LAVALINK] Menginisialisasi Lavalink Client & Nodes...');
      await client.lavalink.init({
        id: client.user!.id,
        username: client.user!.username
      });
    }
  } catch (lavalinkErr) {
    console.error('[LAVALINK] Gagal menginisialisasi Lavalink:', lavalinkErr);
  }

  // 4. Register Slash Commands
  try {
    const commandsData = client.commands.map((cmd) => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(config.env.token);

    if (config.env.guildId) {
      console.log(`[SLASH] Mendaftarkan ${commandsData.length} slash commands ke Guild ID: ${config.env.guildId}...`);
      await rest.put(Routes.applicationGuildCommands(client.user!.id, config.env.guildId), {
        body: commandsData
      });
      console.log(`[SLASH] Slash commands Guild berhasil terdaftar (Instant Sync).`);
    } else {
      console.log(`[SLASH] Mendaftarkan ${commandsData.length} slash commands secara Global...`);
      await rest.put(Routes.applicationCommands(client.user!.id), {
        body: commandsData
      });
      console.log(`[SLASH] Slash commands Global berhasil terdaftar.`);
    }
  } catch (err) {
    console.error('[SLASH] Gagal mendaftarkan slash commands:', err);
  }

  // 4. Rotating Rich Presence Activity
  const activities = [
    { name: `Kota ${config.server.name}`, type: ActivityType.Watching },
    { name: `${config.server.cfxConnect} | FiveM`, type: ActivityType.Playing },
    { name: `/help | Bantuan & Support`, type: ActivityType.Listening },
    { name: `Menjaga Ketertiban Warga`, type: ActivityType.Custom }
  ];

  let currentIdx = 0;
  setInterval(() => {
    const act = activities[currentIdx];
    client.user?.setPresence({
      activities: [{ name: act.name, type: act.type as any }],
      status: 'online'
    });
    currentIdx = (currentIdx + 1) % activities.length;
  }, 20000);
}
