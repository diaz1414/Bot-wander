import { type GuildMember, type TextChannel, type PartialGuildMember } from 'discord.js';
import type { WanderBotClient } from '../client.js';
import { getGuildSettings } from '../database/schema.js';
import { config } from '../config.js';
import { createBaseEmbed, parsePlaceholders } from '../utils/embeds.js';

export async function onGuildMemberRemove(
  client: WanderBotClient,
  member: GuildMember | PartialGuildMember
): Promise<void> {
  const guild = member.guild;
  const settings = getGuildSettings(guild.id);

  const goodbyeEnabled = settings ? settings.goodbye_enabled === 1 : config.goodbye.enabled;
  if (!goodbyeEnabled) return;

  const goodbyeChannelId = settings?.goodbye_channel_id || config.channels.goodbyeChannelId;
  if (!goodbyeChannelId) return;

  const channel = (await guild.channels.fetch(goodbyeChannelId).catch(() => null)) as TextChannel | null;
  if (!channel || !channel.isTextBased()) return;

  const rawMessage = settings?.goodbye_message || config.goodbye.description;
  const description = parsePlaceholders(rawMessage, member as GuildMember);

  const embed = createBaseEmbed()
    .setTitle(config.goodbye.title)
    .setDescription(description)
    .setThumbnail(member.user?.displayAvatarURL() || null);

  await channel.send({ embeds: [embed] });
}
