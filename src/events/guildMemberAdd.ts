import { type GuildMember, type TextChannel } from 'discord.js';
import type { WanderBotClient } from '../client.js';
import { getGuildSettings } from '../database/schema.js';
import { config } from '../config.js';
import { createBaseEmbed, parsePlaceholders } from '../utils/embeds.js';

export async function onGuildMemberAdd(client: WanderBotClient, member: GuildMember): Promise<void> {
  const guild = member.guild;
  const settings = getGuildSettings(guild.id);

  const welcomeEnabled = settings ? settings.welcome_enabled === 1 : config.welcome.enabled;
  if (!welcomeEnabled) return;

  // 1. Auto-assign role if configured
  const autoRoleId = settings?.welcome_role_id || config.roles.citizenRoleId;
  if (autoRoleId && guild.roles.cache.has(autoRoleId)) {
    try {
      await member.roles.add(autoRoleId);
      console.log(`[WELCOME] Auto-role diberikan kepada ${member.user.tag}: ${autoRoleId}`);
    } catch (err) {
      console.error('[WELCOME] Gagal memberikan auto-role:', err);
    }
  }

  // 2. Send Welcome Message
  const welcomeChannelId = settings?.welcome_channel_id || config.channels.welcomeChannelId;
  if (!welcomeChannelId) return;

  const channel = (await guild.channels.fetch(welcomeChannelId).catch(() => null)) as TextChannel | null;
  if (!channel || !channel.isTextBased()) return;

  const rawMessage = settings?.welcome_message || config.welcome.description;
  const description = parsePlaceholders(rawMessage, member);

  const embed = createBaseEmbed()
    .setTitle(config.welcome.title)
    .setDescription(description)
    .setThumbnail(member.user.displayAvatarURL());

  if (config.welcome.bannerUrl) {
    embed.setImage(config.welcome.bannerUrl);
  }

  await channel.send({
    content: `👋 Selamat datang di Kota Wander, <@${member.id}>!`,
    embeds: [embed]
  });
}
