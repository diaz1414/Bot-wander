import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type TextChannel,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import type { Command } from '../../types/index.js';
import { checkAdminAccess } from '../../utils/permissions.js';
import { createBaseEmbed, createSuccessEmbed, createErrorEmbed } from '../../utils/embeds.js';

export const takeroleCommand: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('takerole')
    .setDescription('Sistem ambil role mandiri / Take Role untuk warga (Hanya Owner & Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('notifications')
        .setDescription('Kirim panel role notifikasi (Pengumuman, Update, Giveaway, Event)')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan pengiriman panel').setRequired(true)
        )
        .addRoleOption((opt) => opt.setName('role_pengumuman').setDescription('Role Pengumuman Kota').setRequired(true))
        .addRoleOption((opt) => opt.setName('role_update').setDescription('Role Update FiveM').setRequired(true))
        .addRoleOption((opt) => opt.setName('role_giveaway').setDescription('Role Notif Giveaway').setRequired(true))
        .addRoleOption((opt) => opt.setName('role_event').setDescription('Role Event Kota').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('gender')
        .setDescription('Kirim panel role Gender IC (Laki-laki / Perempuan)')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan pengiriman panel').setRequired(true)
        )
        .addRoleOption((opt) => opt.setName('role_pria').setDescription('Role Pria / Laki-laki').setRequired(true))
        .addRoleOption((opt) => opt.setName('role_wanita').setDescription('Role Wanita / Perempuan').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('custom')
        .setDescription('Kirim panel role custom dengan tombol')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel tujuan panel').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('judul').setDescription('Judul panel').setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('deskripsi').setDescription('Deskripsi panel').setRequired(true)
        )
        .addRoleOption((opt) => opt.setName('role1').setDescription('Role ke-1').setRequired(true))
        .addRoleOption((opt) => opt.setName('role2').setDescription('Role ke-2').setRequired(false))
        .addRoleOption((opt) => opt.setName('role3').setDescription('Role ke-3').setRequired(false))
        .addRoleOption((opt) => opt.setName('role4').setDescription('Role ke-4').setRequired(false))
        .addRoleOption((opt) => opt.setName('role5').setDescription('Role ke-5').setRequired(false))
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!(await checkAdminAccess(interaction))) return;

    const sub = interaction.options.getSubcommand();
    const targetChannel = interaction.options.getChannel('channel', true) as TextChannel;

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.reply({
        embeds: [createErrorEmbed('GAGAL', 'Channel harus merupakan channel teks!')],
        ephemeral: true
      });
      return;
    }

    if (sub === 'notifications') {
      const rPengumuman = interaction.options.getRole('role_pengumuman', true);
      const rUpdate = interaction.options.getRole('role_update', true);
      const rGiveaway = interaction.options.getRole('role_giveaway', true);
      const rEvent = interaction.options.getRole('role_event', true);

      const embed = createBaseEmbed()
        .setTitle('🔔 NOTIFICATION ROLES - WANDER ROLEPLAY')
        .setDescription(
          `Pilih notifikasi apa saja yang ingin kamu terima di Discord Wander Roleplay.\n` +
            `Klik tombol di bawah untuk **mengambil** atau **mencabut** role secara otomatis:\n\n` +
            `📢 <@&${rPengumuman.id}> — Dapatkan info pengumuman penting kota.\n` +
            `🛠️ <@&${rUpdate.id}> — Dapatkan kabar update script & fitur baru server.\n` +
            `🎉 <@&${rGiveaway.id}> — Dapatkan notifikasi giveaway berhadiah.\n` +
            `🎪 <@&${rEvent.id}> — Dapatkan info event seru dan turnamen kota.`
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`takerole_${rPengumuman.id}`).setLabel('Pengumuman').setEmoji('📢').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`takerole_${rUpdate.id}`).setLabel('Update').setEmoji('🛠️').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`takerole_${rGiveaway.id}`).setLabel('Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`takerole_${rEvent.id}`).setLabel('Event').setEmoji('🎪').setStyle(ButtonStyle.Danger)
      );

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [createSuccessEmbed('PANEL TERKIRIM', `Panel role notifikasi berhasil dipasang di <#${targetChannel.id}>.`)],
        ephemeral: true
      });
      return;
    }

    if (sub === 'gender') {
      const rPria = interaction.options.getRole('role_pria', true);
      const rWanita = interaction.options.getRole('role_wanita', true);

      const embed = createBaseEmbed()
        .setTitle('🎭 IDENTITAS GENDER IC - WANDER ROLEPLAY')
        .setDescription(
          `Pilih identitas karakter kamu di dalam kota Wander Roleplay:\n\n` +
            `👨 <@&${rPria.id}> — Karakter Pria / Laki-laki\n` +
            `👩 <@&${rWanita.id}> — Karakter Wanita / Perempuan\n\n` +
            `*Klik tombol di bawah untuk memilih identitas roleplay kamu.*`
        );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`takerole_${rPria.id}`).setLabel('Laki-laki (Pria)').setEmoji('👨').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`takerole_${rWanita.id}`).setLabel('Perempuan (Wanita)').setEmoji('👩').setStyle(ButtonStyle.Danger)
      );

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [createSuccessEmbed('PANEL TERKIRIM', `Panel gender berhasil dipasang di <#${targetChannel.id}>.`)],
        ephemeral: true
      });
      return;
    }

    if (sub === 'custom') {
      const title = interaction.options.getString('judul', true);
      const desc = interaction.options.getString('deskripsi', true);

      const roles = [
        interaction.options.getRole('role1', true),
        interaction.options.getRole('role2'),
        interaction.options.getRole('role3'),
        interaction.options.getRole('role4'),
        interaction.options.getRole('role5')
      ].filter(Boolean);

      const embed = createBaseEmbed()
        .setTitle(title)
        .setDescription(desc.replace(/\\n/g, '\n'));

      const buttons = roles.map((role, idx) =>
        new ButtonBuilder()
          .setCustomId(`takerole_${role!.id}`)
          .setLabel(role!.name)
          .setStyle(idx % 2 === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

      await targetChannel.send({ embeds: [embed], components: [row] });
      await interaction.reply({
        embeds: [createSuccessEmbed('PANEL TERKIRIM', `Panel role custom berhasil dipasang di <#${targetChannel.id}>.`)],
        ephemeral: true
      });
    }
  }
};
