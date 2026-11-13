import {
  type GuildMember,
  type Guild,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type ButtonInteraction
} from 'discord.js';
import { config } from '../config.js';
import { getGuildSettings } from '../database/schema.js';
import { createErrorEmbed } from './embeds.js';

export function isServerOwner(memberId: string, guild: Guild | null): boolean {
  if (!guild) return false;
  return guild.ownerId === memberId;
}

export function isServerAdmin(member: GuildMember | null, guild: Guild | null): boolean {
  if (!member || !guild) return false;

  // 1. Is Guild Owner
  if (guild.ownerId === member.id) return true;

  // 2. Has native Administrator permission in Discord
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;

  // 3. Has configured Admin Role from Database or Config
  const settings = getGuildSettings(guild.id);
  const adminRoleId = settings?.admin_role_id || config.roles.adminRoleId;

  if (adminRoleId && member.roles.cache.has(adminRoleId)) {
    return true;
  }

  return false;
}

export function isServerModerator(member: GuildMember | null, guild: Guild | null): boolean {
  if (!member || !guild) return false;

  // Admins always have moderator access
  if (isServerAdmin(member, guild)) return true;

  // Has native ModerateMembers or ManageMessages
  if (
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.ManageMessages)
  ) {
    return true;
  }

  // Has configured Moderator Role
  const settings = getGuildSettings(guild.id);
  const modRoleId = settings?.mod_role_id || config.roles.moderatorRoleId;

  if (modRoleId && member.roles.cache.has(modRoleId)) {
    return true;
  }

  return false;
}

export async function checkAdminAccess(
  interaction: ChatInputCommandInteraction | ButtonInteraction
): Promise<boolean> {
  const member = interaction.member as GuildMember | null;
  const guild = interaction.guild;

  if (!isServerAdmin(member, guild)) {
    const errorEmbed = createErrorEmbed(
      'AKSES DITOLAK',
      'Perintah ini hanya dapat dikendalikan penuh oleh **Server Owner** & **Administrator** Wander Roleplay.\n\nKamu tidak memiliki wewenang untuk menjalankan tindakan ini.'
    );

    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
    return false;
  }

  return true;
}

export async function checkModAccess(
  interaction: ChatInputCommandInteraction | ButtonInteraction
): Promise<boolean> {
  const member = interaction.member as GuildMember | null;
  const guild = interaction.guild;

  if (!isServerModerator(member, guild)) {
    const errorEmbed = createErrorEmbed(
      'AKSES TERBATAS',
      'Perintah ini memerlukan wewenang **Staff / Moderator / Administrator** Wander Roleplay.'
    );

    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
    return false;
  }

  return true;
}
