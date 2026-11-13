import { Collection, type TextChannel, type User, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { createBaseEmbed, createSuccessEmbed } from '../utils/embeds.js';
import { config } from '../config.js';

export interface AnnouncementSession {
  userId: string;
  sourceChannelId: string;
  targetChannelId: string;
  mode: 'embed' | 'plain';
  mention: string | null;
  title?: string;
  expiresAt: number;
  content?: string;
}

class SessionManager {
  private sessions: Collection<string, AnnouncementSession> = new Collection();

  public createSession(session: AnnouncementSession): void {
    // Clear any previous session
    this.sessions.delete(session.userId);
    this.sessions.set(session.userId, session);
  }

  public getSession(userId: string): AnnouncementSession | undefined {
    const session = this.sessions.get(userId);
    if (!session) return undefined;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(userId);
      return undefined;
    }

    return session;
  }

  public updateSession(userId: string, data: Partial<AnnouncementSession>): void {
    const session = this.getSession(userId);
    if (session) {
      Object.assign(session, data);
      this.sessions.set(userId, session);
    }
  }

  public endSession(userId: string): void {
    this.sessions.delete(userId);
  }
}

export const announcementSessions = new SessionManager();
