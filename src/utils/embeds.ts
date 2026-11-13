import { EmbedBuilder, type ColorResolvable, type GuildMember, type User } from 'discord.js';
import { config } from '../config.js';

export function createBaseEmbed(colorHex?: string): EmbedBuilder {
  const color = (colorHex || config.colors.primary) as ColorResolvable;
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({
      text: config.server.footerText,
      iconURL: config.server.logoUrl || undefined
    })
    .setTimestamp();
}

export function createSuccessEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(config.colors.success)
    .setTitle(`✅ ${title}`)
    .setDescription(description);
}

export function createErrorEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(config.colors.error)
    .setTitle(`❌ ${title}`)
    .setDescription(description);
}

export function createWarningEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(config.colors.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(description);
}

export function createInfoEmbed(title: string, description: string): EmbedBuilder {
  return createBaseEmbed(config.colors.info)
    .setTitle(`ℹ️ ${title}`)
    .setDescription(description);
}

export function createModActionEmbed(
  action: string,
  target: User,
  moderator: User,
  reason: string,
  extraFields?: { name: string; value: string; inline?: boolean }[]
): EmbedBuilder {
  const embed = createBaseEmbed(config.colors.error)
    .setTitle(`🛡️ WANDER MOD-LOG: ${action.toUpperCase()}`)
    .addFields(
      { name: '👤 Target Warga', value: `${target.tag} (\`${target.id}\`)`, inline: true },
      { name: '👮 Moderator', value: `${moderator.tag} (\`${moderator.id}\`)`, inline: true },
      { name: '📝 Alasan', value: reason || 'Tidak ada alasan yang dicantumkan.', inline: false }
    );

  if (target.displayAvatarURL()) {
    embed.setThumbnail(target.displayAvatarURL());
  }

  if (extraFields && extraFields.length > 0) {
    embed.addFields(extraFields);
  }

  return embed;
}

export function parsePlaceholders(text: string, member: GuildMember): string {
  return text
    .replace(/{user}/g, `<@${member.id}>`)
    .replace(/{username}/g, member.user.username)
    .replace(/{tag}/g, member.user.tag)
    .replace(/{id}/g, member.id)
    .replace(/{server}/g, member.guild.name)
    .replace(/{memberCount}/g, member.guild.memberCount.toString());
}
