import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();

export interface BotConfigFile {
  server: {
    name: string;
    cfxConnect: string;
    discordInvite: string;
    website: string;
    footerText: string;
    logoUrl: string;
  };
  colors: {
    primary: string;
    success: string;
    error: string;
    warning: string;
    info: string;
  };
  roles: {
    adminRoleId: string;
    moderatorRoleId: string;
    citizenRoleId: string;
  };
  channels: {
    modLogsChannelId: string;
    ticketLogsChannelId: string;
    welcomeChannelId: string;
    goodbyeChannelId: string;
    honeypotChannelId: string;
    suggestionChannelId?: string;
    whitelistLogChannelId?: string;
  };
  fivem?: {
    serverIp: string;
    serverPort: number;
    statusChannelId?: string;
    statusMessageId?: string;
  };
  antiInvite?: {
    enabled: boolean;
    deleteMessage: boolean;
    warnUser: boolean;
  };
  whitelist?: {
    enabled: boolean;
    reviewChannelId: string;
    citizenRoleId: string;
  };
  honeypot: {
    enabled: boolean;
    action: 'ban' | 'kick' | 'timeout';
    deleteDays: number;
    alertChannelId: string;
    exemptRoleIds: string[];
  };
  ticket: {
    categoryId: string;
    openMessage: string;
    ticketPrefix: string;
  };
  welcome: {
    enabled: boolean;
    title: string;
    description: string;
    thumbnail: boolean;
    bannerUrl?: string;
  };
  goodbye: {
    enabled: boolean;
    title: string;
    description: string;
    thumbnail: boolean;
  };
}

const configPath = path.resolve(process.cwd(), 'config.json');

let loadedConfig: BotConfigFile;

try {
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf-8');
    loadedConfig = JSON.parse(raw);
  } else {
    throw new Error('config.json not found');
  }
} catch (err) {
  console.warn('[CONFIG] Gagal membaca config.json, menggunakan default config.');
  loadedConfig = {
    server: {
      name: 'Wander Roleplay',
      cfxConnect: 'cfx.re/join/xxxxxx',
      discordInvite: 'https://discord.gg/wanderroleplay',
      website: 'https://wander-roleplay.com',
      footerText: 'Wander Roleplay • Kota Impian Kita',
      logoUrl: 'https://cdn.discordapp.com/embed/avatars/0.png'
    },
    colors: {
      primary: '#E67E22',
      success: '#2ECC71',
      error: '#E74C3C',
      warning: '#F1C40F',
      info: '#3498DB'
    },
    roles: {
      adminRoleId: '',
      moderatorRoleId: '',
      citizenRoleId: ''
    },
    channels: {
      modLogsChannelId: '',
      ticketLogsChannelId: '',
      welcomeChannelId: '',
      goodbyeChannelId: '',
      honeypotChannelId: ''
    },
    honeypot: {
      enabled: true,
      action: 'ban',
      deleteDays: 7,
      alertChannelId: '',
      exemptRoleIds: []
    },
    ticket: {
      categoryId: '',
      openMessage: 'Selamat datang di Customer Support Wander Roleplay!',
      ticketPrefix: 'ticket-'
    },
    welcome: {
      enabled: true,
      title: 'SELAMAT DATANG DI WANDER ROLEPLAY',
      description: 'Halo {user}, selamat datang di komunitas Wander Roleplay!',
      thumbnail: true
    },
    goodbye: {
      enabled: true,
      title: 'WARGA KELUAR DARI KOTA',
      description: 'Selamat jalan {username}, terima kasih telah berkunjung.',
      thumbnail: true
    }
  };
}

export const config = {
  ...loadedConfig,
  env: {
    token: process.env.DISCORD_TOKEN || '',
    clientId: process.env.CLIENT_ID || '',
    guildId: process.env.GUILD_ID || '',
    databasePath: process.env.DATABASE_PATH || './data/wander.sqlite'
  }
};

export function reloadConfig(): BotConfigFile {
  try {
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      Object.assign(config, parsed);
      return parsed;
    }
  } catch (error) {
    console.error('[CONFIG] Error reloading config.json:', error);
  }
  return loadedConfig;
}
