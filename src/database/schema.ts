import { getDatabase } from './db.js';
export { getDatabase } from './db.js';
import type {
  GuildSettings,
  TicketRecord,
  WarningRecord,
  GiveawayRecord,
  PollRecord,
  HoneypotLog
} from '../types/index.js';

export function initDatabase(): void {
  const db = getDatabase();

  // 1. Guild Settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      admin_role_id TEXT,
      mod_role_id TEXT,
      mod_logs_channel_id TEXT,
      welcome_channel_id TEXT,
      welcome_role_id TEXT,
      welcome_message TEXT,
      welcome_enabled INTEGER DEFAULT 1,
      goodbye_channel_id TEXT,
      goodbye_message TEXT,
      goodbye_enabled INTEGER DEFAULT 1,
      ticket_category_id TEXT,
      ticket_logs_channel_id TEXT,
      ticket_panel_channel_id TEXT,
      ticket_panel_message_id TEXT,
      honeypot_channel_id TEXT,
      honeypot_action TEXT DEFAULT 'ban',
      honeypot_enabled INTEGER DEFAULT 0,
      suggestion_channel_id TEXT,
      whitelist_log_channel_id TEXT,
      citizen_role_id TEXT,
      anti_invite_enabled INTEGER DEFAULT 1,
      updated_at INTEGER
    );
  `);

  // Safe migrations for newer columns
  try { db.exec('ALTER TABLE guild_settings ADD COLUMN suggestion_channel_id TEXT;'); } catch {}
  try { db.exec('ALTER TABLE guild_settings ADD COLUMN whitelist_log_channel_id TEXT;'); } catch {}
  try { db.exec('ALTER TABLE guild_settings ADD COLUMN citizen_role_id TEXT;'); } catch {}
  try { db.exec('ALTER TABLE guild_settings ADD COLUMN anti_invite_enabled INTEGER DEFAULT 1;'); } catch {}

  // 2. Tickets
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      ticket_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      claimed_by TEXT,
      created_at INTEGER NOT NULL,
      closed_at INTEGER,
      closed_by TEXT
    );
  `);

  // 3. Warnings
  db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 4. Giveaways
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      prize TEXT NOT NULL,
      winners_count INTEGER NOT NULL,
      ends_at INTEGER NOT NULL,
      host_id TEXT NOT NULL,
      ended INTEGER DEFAULT 0,
      participants TEXT DEFAULT '[]',
      winners TEXT DEFAULT '[]'
    );
  `);

  // 5. Polls
  db.exec(`
    CREATE TABLE IF NOT EXISTS polls (
      message_id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      votes TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL
    );
  `);

  // 6. Honeypot Logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS honeypot_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      action_taken TEXT NOT NULL,
      message_content TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // 7. Suggestions (Kotak Saran Warga)
  db.exec(`
    CREATE TABLE IF NOT EXISTS suggestions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      suggestion TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      upvotes TEXT DEFAULT '[]',
      downvotes TEXT DEFAULT '[]',
      created_at INTEGER NOT NULL
    );
  `);

  // 8. Whitelist Submissions (Pendaftaran Warga Baru)
  db.exec(`
    CREATE TABLE IF NOT EXISTS whitelist_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      ic_name TEXT NOT NULL,
      ic_age TEXT NOT NULL,
      story TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      reviewed_by TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  console.log('[DATABASE] Semua tabel SQLite berhasil diverifikasi & dimuat.');
}

// =================== SETTINGS REPO ===================
export function getGuildSettings(guildId: string): GuildSettings | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM guild_settings WHERE guild_id = ?').get(guildId);
  return (row as GuildSettings) || null;
}

export function updateGuildSettings(guildId: string, updates: Partial<GuildSettings>): void {
  const db = getDatabase();
  const current = getGuildSettings(guildId);

  if (!current) {
    db.prepare(`
      INSERT INTO guild_settings (guild_id, updated_at) VALUES (?, ?)
    `).run(guildId, Date.now());
  }

  const fields = Object.keys(updates).filter((k) => k !== 'guild_id');
  if (fields.length === 0) return;

  const setClause = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => (updates as any)[f]);

  values.push(Date.now(), guildId);

  db.prepare(`
    UPDATE guild_settings
    SET ${setClause}, updated_at = ?
    WHERE guild_id = ?
  `).run(...values);
}

export function resetGuildSettings(
  guildId: string,
  category: 'all' | 'channels' | 'roles' | 'welcome' | 'goodbye' | 'honeypot' | 'tickets'
): void {
  const db = getDatabase();
  if (category === 'all') {
    db.prepare('DELETE FROM guild_settings WHERE guild_id = ?').run(guildId);
  } else if (category === 'channels') {
    db.prepare(`
      UPDATE guild_settings
      SET mod_logs_channel_id = NULL,
          ticket_logs_channel_id = NULL,
          welcome_channel_id = NULL,
          goodbye_channel_id = NULL,
          honeypot_channel_id = NULL,
          suggestion_channel_id = NULL,
          whitelist_log_channel_id = NULL,
          updated_at = ?
      WHERE guild_id = ?
    `).run(Date.now(), guildId);
  } else if (category === 'roles') {
    db.prepare(`
      UPDATE guild_settings
      SET admin_role_id = NULL,
          mod_role_id = NULL,
          welcome_role_id = NULL,
          citizen_role_id = NULL,
          updated_at = ?
      WHERE guild_id = ?
    `).run(Date.now(), guildId);
  } else if (category === 'welcome') {
    db.prepare(`
      UPDATE guild_settings
      SET welcome_channel_id = NULL,
          welcome_role_id = NULL,
          welcome_message = NULL,
          welcome_enabled = 1,
          updated_at = ?
      WHERE guild_id = ?
    `).run(Date.now(), guildId);
  } else if (category === 'goodbye') {
    db.prepare(`
      UPDATE guild_settings
      SET goodbye_channel_id = NULL,
          goodbye_message = NULL,
          goodbye_enabled = 1,
          updated_at = ?
      WHERE guild_id = ?
    `).run(Date.now(), guildId);
  } else if (category === 'honeypot') {
    db.prepare(`
      UPDATE guild_settings
      SET honeypot_channel_id = NULL,
          honeypot_enabled = 0,
          honeypot_action = 'ban',
          updated_at = ?
      WHERE guild_id = ?
    `).run(Date.now(), guildId);
  } else if (category === 'tickets') {
    db.prepare(`
      UPDATE guild_settings
      SET ticket_category_id = NULL,
          ticket_logs_channel_id = NULL,
          ticket_panel_channel_id = NULL,
          ticket_panel_message_id = NULL,
          updated_at = ?
      WHERE guild_id = ?
    `).run(Date.now(), guildId);
  }
}

// =================== TICKETS REPO ===================
export function createTicket(ticket: Omit<TicketRecord, 'status' | 'claimed_by' | 'closed_at' | 'closed_by'>): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO tickets (ticket_id, guild_id, channel_id, user_id, category, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).run(ticket.ticket_id, ticket.guild_id, ticket.channel_id, ticket.user_id, ticket.category, ticket.created_at);
}

export function getTicketByChannel(channelId: string): TicketRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);
  return (row as TicketRecord) || null;
}

export function getOpenTicketByUser(guildId: string, userId: string): TicketRecord | null {
  const db = getDatabase();
  const row = db.prepare(`
    SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status != 'closed'
  `).get(guildId, userId);
  return (row as TicketRecord) || null;
}

export function claimTicket(channelId: string, claimedBy: string): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE tickets SET status = 'claimed', claimed_by = ? WHERE channel_id = ?
  `).run(claimedBy, channelId);
}

export function closeTicket(channelId: string, closedBy: string): void {
  const db = getDatabase();
  db.prepare(`
    UPDATE tickets SET status = 'closed', closed_at = ?, closed_by = ? WHERE channel_id = ?
  `).run(Date.now(), closedBy, channelId);
}

// =================== WARNINGS REPO ===================
export function addWarning(guildId: string, userId: string, moderatorId: string, reason: string): number {
  const db = getDatabase();
  const result = db.prepare(`
    INSERT INTO warnings (guild_id, user_id, moderator_id, reason, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(guildId, userId, moderatorId, reason, Date.now());
  return Number(result.lastInsertRowid || 0);
}

export function getWarnings(guildId: string, userId: string): WarningRecord[] {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY created_at DESC
  `).all(guildId, userId);
  return (rows as WarningRecord[]) || [];
}

export function deleteWarning(guildId: string, warningId: number): boolean {
  const db = getDatabase();
  const res = db.prepare(`
    DELETE FROM warnings WHERE guild_id = ? AND id = ?
  `).run(guildId, warningId);
  return (res.changes || 0) > 0;
}

export function clearWarnings(guildId: string, userId: string): number {
  const db = getDatabase();
  const res = db.prepare(`
    DELETE FROM warnings WHERE guild_id = ? AND user_id = ?
  `).run(guildId, userId);
  return res.changes || 0;
}

// =================== GIVEAWAYS REPO ===================
export function saveGiveaway(giveaway: GiveawayRecord): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO giveaways (message_id, guild_id, channel_id, prize, winners_count, ends_at, host_id, ended, participants, winners)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    giveaway.message_id,
    giveaway.guild_id,
    giveaway.channel_id,
    giveaway.prize,
    giveaway.winners_count,
    giveaway.ends_at,
    giveaway.host_id,
    giveaway.ended ? 1 : 0,
    giveaway.participants,
    giveaway.winners
  );
}

export function getGiveaway(messageId: string): GiveawayRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);
  return (row as GiveawayRecord) || null;
}

export function getActiveGiveaways(): GiveawayRecord[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM giveaways WHERE ended = 0').all();
  return (rows as GiveawayRecord[]) || [];
}

export function updateGiveawayParticipants(messageId: string, participantsJson: string): void {
  const db = getDatabase();
  db.prepare('UPDATE giveaways SET participants = ? WHERE message_id = ?').run(participantsJson, messageId);
}

export function endGiveaway(messageId: string, winnersJson: string): void {
  const db = getDatabase();
  db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE message_id = ?').run(winnersJson, messageId);
}

// =================== POLLS REPO ===================
export function savePoll(poll: PollRecord): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO polls (message_id, guild_id, channel_id, creator_id, question, options, votes, active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    poll.message_id,
    poll.guild_id,
    poll.channel_id,
    poll.creator_id,
    poll.question,
    poll.options,
    poll.votes,
    poll.active,
    poll.created_at
  );
}

export function getPoll(messageId: string): PollRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM polls WHERE message_id = ?').get(messageId);
  return (row as PollRecord) || null;
}

export function updatePollVotes(messageId: string, votesJson: string): void {
  const db = getDatabase();
  db.prepare('UPDATE polls SET votes = ? WHERE message_id = ?').run(votesJson, messageId);
}

export function closePoll(messageId: string): void {
  const db = getDatabase();
  db.prepare('UPDATE polls SET active = 0 WHERE message_id = ?').run(messageId);
}

// =================== HONEYPOT LOGS REPO ===================
export function logHoneypot(
  guildId: string,
  userId: string,
  userTag: string,
  actionTaken: string,
  messageContent: string
): void {
  const db = getDatabase();
  db.prepare(`
    INSERT INTO honeypot_logs (guild_id, user_id, user_tag, action_taken, message_content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(guildId, userId, userTag, actionTaken, messageContent.slice(0, 1000), Date.now());
}

// =================== SUGGESTIONS REPO ===================
export interface SuggestionRecord {
  id: number;
  guild_id: string;
  message_id: string;
  user_id: string;
  suggestion: string;
  status: 'pending' | 'accepted' | 'rejected';
  upvotes: string; // JSON array of user IDs
  downvotes: string; // JSON array of user IDs
  created_at: number;
}

export function createSuggestion(data: Omit<SuggestionRecord, 'id' | 'status' | 'upvotes' | 'downvotes' | 'created_at'>): number {
  const db = getDatabase();
  const res = db.prepare(`
    INSERT INTO suggestions (guild_id, message_id, user_id, suggestion, status, upvotes, downvotes, created_at)
    VALUES (?, ?, ?, ?, 'pending', '[]', '[]', ?)
  `).run(data.guild_id, data.message_id, data.user_id, data.suggestion, Date.now());
  return Number(res.lastInsertRowid || 0);
}

export function getSuggestionByMessage(messageId: string): SuggestionRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM suggestions WHERE message_id = ?').get(messageId);
  return (row as SuggestionRecord) || null;
}

export function getSuggestionById(id: number): SuggestionRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(id);
  return (row as SuggestionRecord) || null;
}

export function updateSuggestionVotes(messageId: string, upvotesJson: string, downvotesJson: string): void {
  const db = getDatabase();
  db.prepare('UPDATE suggestions SET upvotes = ?, downvotes = ? WHERE message_id = ?').run(upvotesJson, downvotesJson, messageId);
}

export function updateSuggestionStatus(id: number, status: 'accepted' | 'rejected'): void {
  const db = getDatabase();
  db.prepare('UPDATE suggestions SET status = ? WHERE id = ?').run(status, id);
}

// =================== WHITELIST REPO ===================
export interface WhitelistRecord {
  id: number;
  guild_id: string;
  user_id: string;
  user_tag: string;
  ic_name: string;
  ic_age: string;
  story: string;
  status: 'pending' | 'accepted' | 'rejected';
  reviewed_by?: string;
  created_at: number;
}

export function createWhitelistSubmission(data: Omit<WhitelistRecord, 'id' | 'status' | 'reviewed_by' | 'created_at'>): number {
  const db = getDatabase();
  const res = db.prepare(`
    INSERT INTO whitelist_submissions (guild_id, user_id, user_tag, ic_name, ic_age, story, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(data.guild_id, data.user_id, data.user_tag, data.ic_name, data.ic_age, data.story, Date.now());
  return Number(res.lastInsertRowid || 0);
}

export function getWhitelistSubmission(id: number): WhitelistRecord | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM whitelist_submissions WHERE id = ?').get(id);
  return (row as WhitelistRecord) || null;
}

export function updateWhitelistStatus(id: number, status: 'accepted' | 'rejected', reviewerId: string): void {
  const db = getDatabase();
  db.prepare('UPDATE whitelist_submissions SET status = ?, reviewed_by = ? WHERE id = ?').run(status, reviewerId, id);
}
