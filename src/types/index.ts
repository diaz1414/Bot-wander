import type {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  SlashCommandOptionsOnlyBuilder
} from 'discord.js';

export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | SlashCommandOptionsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  adminOnly?: boolean;
  ownerOnly?: boolean;
  execute: (interaction: ChatInputCommandInteraction) => Promise<any> | any;
}

export interface Event {
  name: string;
  once?: boolean;
  execute: (...args: any[]) => Promise<any> | any;
}

export interface GuildSettings {
  guild_id: string;
  admin_role_id?: string | null;
  mod_role_id?: string | null;
  mod_logs_channel_id?: string | null;
  welcome_channel_id?: string | null;
  welcome_role_id?: string | null;
  welcome_message?: string | null;
  welcome_enabled?: number;
  goodbye_channel_id?: string | null;
  goodbye_message?: string | null;
  goodbye_enabled?: number;
  ticket_category_id?: string | null;
  ticket_logs_channel_id?: string | null;
  ticket_panel_channel_id?: string | null;
  ticket_panel_message_id?: string | null;
  honeypot_channel_id?: string | null;
  honeypot_action?: string;
  honeypot_enabled?: number;
  suggestion_channel_id?: string | null;
  whitelist_log_channel_id?: string | null;
  citizen_role_id?: string | null;
  anti_invite_enabled?: number;
  updated_at?: number;
}

export interface TicketRecord {
  ticket_id: string;
  guild_id: string;
  channel_id: string;
  user_id: string;
  category: string;
  status: 'open' | 'claimed' | 'closed';
  claimed_by?: string | null;
  created_at: number;
  closed_at?: number | null;
  closed_by?: string | null;
}

export interface WarningRecord {
  id: number;
  guild_id: string;
  user_id: string;
  moderator_id: string;
  reason: string;
  created_at: number;
}

export interface GiveawayRecord {
  message_id: string;
  guild_id: string;
  channel_id: string;
  prize: string;
  winners_count: number;
  ends_at: number;
  host_id: string;
  ended: number;
  participants: string; // JSON array of user IDs
  winners: string; // JSON array of user IDs
}

export interface PollRecord {
  message_id: string;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  question: string;
  options: string; // JSON array of strings
  votes: string; // JSON object { userId: optionIndex }
  active: number;
  created_at: number;
}

export interface HoneypotLog {
  id?: number;
  guild_id: string;
  user_id: string;
  user_tag: string;
  action_taken: string;
  message_content?: string;
  created_at: number;
}
