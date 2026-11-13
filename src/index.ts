import { WanderBotClient } from './client.js';
import { config } from './config.js';
import type { Command } from './types/index.js';

// Events
import { onReady } from './events/ready.js';
import { onInteractionCreate } from './events/interactionCreate.js';
import { onMessageCreate } from './events/messageCreate.js';
import { onGuildMemberAdd } from './events/guildMemberAdd.js';
import { onGuildMemberRemove } from './events/guildMemberRemove.js';

// Commands - Moderation
import { banCommand } from './commands/moderation/ban.js';
import { unbanCommand } from './commands/moderation/unban.js';
import { kickCommand } from './commands/moderation/kick.js';
import { timeoutCommand } from './commands/moderation/timeout.js';
import { untimeoutCommand } from './commands/moderation/untimeout.js';
import { warnCommand } from './commands/moderation/warn.js';
import { warningsCommand } from './commands/moderation/warnings.js';
import { clearwarnCommand } from './commands/moderation/clearwarn.js';
import { purgeCommand } from './commands/moderation/purge.js';
import { slowmodeCommand } from './commands/moderation/slowmode.js';
import { lockCommand } from './commands/moderation/lock.js';
import { unlockCommand } from './commands/moderation/unlock.js';

// Commands - Admin & Features
import { setupCommand } from './commands/admin/setup.js';
import { announcementCommand } from './commands/admin/announcement.js';
import { honeypotCommand } from './commands/admin/honeypot.js';
import { settingsCommand } from './commands/admin/settings.js';
import { ticketCommand } from './commands/tickets/ticket.js';
import { takeroleCommand } from './commands/roles/takerole.js';
import { welcomeCommand } from './commands/welcome/welcome.js';
import { goodbyeCommand } from './commands/welcome/goodbye.js';
import { giveawayCommand } from './commands/giveaway/giveaway.js';
import { pollCommand } from './commands/poll/poll.js';

// Commands - General & FiveM Roleplay
import { pingCommand } from './commands/general/ping.js';
import { helpCommand } from './commands/general/help.js';
import { serverinfoCommand } from './commands/general/serverinfo.js';
import { fivemCommand } from './commands/fivem/fivem.js';
import { suggestCommand } from './commands/fivem/suggest.js';
import { whitelistCommand } from './commands/fivem/whitelist.js';
import { musicCommand } from './commands/music/music.js';
import { initMusicManager } from './modules/musicManager.js';

const client = new WanderBotClient();

// Inisialisasi Lavalink Manager
initMusicManager(client);

// List of all commands
const commands: Command[] = [
  // Moderation (Owner & Admin only)
  banCommand,
  unbanCommand,
  kickCommand,
  timeoutCommand,
  untimeoutCommand,
  warnCommand,
  warningsCommand,
  clearwarnCommand,
  purgeCommand,
  slowmodeCommand,
  lockCommand,
  unlockCommand,

  // Admin & Systems
  setupCommand,
  announcementCommand,
  honeypotCommand,
  settingsCommand,
  ticketCommand,
  takeroleCommand,
  welcomeCommand,
  goodbyeCommand,
  giveawayCommand,
  pollCommand,

  // General & Utility
  pingCommand,
  helpCommand,
  serverinfoCommand,

  // FiveM & Community Features
  fivemCommand,
  suggestCommand,
  whitelistCommand,

  // Music System
  musicCommand
];

// Register commands to client collection
for (const cmd of commands) {
  client.commands.set(cmd.data.name, cmd);
}

// Register Events
client.once('ready', () => onReady(client));
client.on('interactionCreate', (interaction) => onInteractionCreate(client, interaction));
client.on('messageCreate', (message) => onMessageCreate(client, message));
client.on('guildMemberAdd', (member) => onGuildMemberAdd(client, member));
client.on('guildMemberRemove', (member) => onGuildMemberRemove(client, member));

// Anti-Crash Protection (Critical for Pterodactyl continuous uptime)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[ANTI-CRASH] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err, origin) => {
  console.error('[ANTI-CRASH] Uncaught Exception:', err, origin);
});

process.on('uncaughtExceptionMonitor', (err, origin) => {
  console.error('[ANTI-CRASH] Uncaught Exception Monitor:', err, origin);
});

// Login Bot
if (!config.env.token) {
  console.error('===========================================================');
  console.error('❌ [ERROR FATAL] DISCORD_TOKEN belum diisi di file .env!');
  console.error('Salin .env.example menjadi .env lalu masukkan token bot kamu.');
  console.error('===========================================================');
  process.exit(1);
}

console.log('🔄 Memulai bot Wander Roleplay...');
client.login(config.env.token).catch((err) => {
  console.error('❌ Gagal melakukan login ke Discord Gateway:', err);
});
