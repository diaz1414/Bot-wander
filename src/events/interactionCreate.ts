import {
  type Interaction,
  type GuildMember,
  type TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import type { WanderBotClient } from '../client.js';
import { checkAdminAccess, checkModAccess, isServerAdmin } from '../utils/permissions.js';
import { createSuccessEmbed, createErrorEmbed, createBaseEmbed } from '../utils/embeds.js';
import {
  handleTicketOpen,
  handleTicketClaim,
  handleTicketClose,
  generateTranscript
} from '../modules/ticketManager.js';
import { toggleGiveawayParticipation } from '../modules/giveawayManager.js';
import {
  getPoll,
  updatePollVotes,
  getGiveaway,
  getSuggestionByMessage,
  updateSuggestionVotes,
  createWhitelistSubmission,
  getWhitelistSubmission,
  updateWhitelistStatus,
  getGuildSettings,
  updateGuildSettings,
  resetGuildSettings
} from '../database/schema.js';
import { announcementSessions } from '../modules/announcementSession.js';
import { config, reloadConfig } from '../config.js';
import { createSetupDashboardEmbed, createSetupDashboardRows } from '../commands/admin/setup.js';

export async function onInteractionCreate(client: WanderBotClient, interaction: Interaction): Promise<void> {
  try {
    // 1. Handle Slash Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      if (command.adminOnly) {
        const hasAccess = await checkAdminAccess(interaction);
        if (!hasAccess) return;
      }

      await command.execute(interaction);
      return;
    }

    // 2. Handle Button Interactions
    if (interaction.isButton()) {
      const customId = interaction.customId;

      // --- GIVEAWAY JOIN BUTTON ---
      if (customId === 'giveaway_join') {
        try {
          const res = await toggleGiveawayParticipation(interaction.user.id, interaction.message.id);
          const updateRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
              .setCustomId('giveaway_join')
              .setLabel(`Ikut Giveaway (${res.count})`)
              .setEmoji('🎉')
              .setStyle(ButtonStyle.Success)
          );

          await interaction.message.edit({ components: [updateRow] });

          if (res.joined) {
            await interaction.reply({
              content: `🎉 Kamu berhasil **bergabung** dalam undian giveaway ini! Semoga beruntung! (Total: ${res.count} peserta)`,
              ephemeral: true
            });
          } else {
            await interaction.reply({
              content: `👋 Kamu telah **keluar** dari giveaway ini. (Total tersisa: ${res.count} peserta)`,
              ephemeral: true
            });
          }
        } catch (err: any) {
          await interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
        }
        return;
      }

      // --- TICKET BUTTONS ---
      if (customId === 'ticket_claim') {
        if (!(await checkModAccess(interaction))) return;
        await handleTicketClaim(interaction.channel as TextChannel, interaction.user);
        await interaction.reply({ content: '✅ Kamu telah berhasil mengklaim tiket ini.', ephemeral: true });
        return;
      }

      if (customId === 'ticket_transcript') {
        const transcript = await generateTranscript(interaction.channel as TextChannel);
        await interaction.reply({
          content: '📋 Salinan percakapan tiket:',
          files: [{ attachment: Buffer.from(transcript, 'utf-8'), name: `${(interaction.channel as TextChannel).name}-transcript.txt` }],
          ephemeral: true
        });
        return;
      }

      if (customId === 'ticket_close_prompt') {
        const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Ya, Tutup Tiket').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Batal').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          embeds: [createBaseEmbed().setTitle('🔒 KONFIRMASI PENUTUPAN TIKET').setDescription('Apakah kamu yakin ingin menutup dan mengarsipkan tiket ini?')],
          components: [confirmRow]
        });
        return;
      }

      if (customId === 'ticket_close_confirm') {
        await interaction.reply({ content: '⏳ Menyiapkan arsip dan menutup tiket...' });
        await handleTicketClose(interaction.channel as TextChannel, interaction.user, interaction.guild!);
        return;
      }

      if (customId === 'ticket_close_cancel') {
        await interaction.message.delete().catch(() => null);
        await interaction.reply({ content: 'Penutupan tiket dibatalkan.', ephemeral: true });
        return;
      }

      // --- TAKE ROLE BUTTONS ---
      if (customId.startsWith('takerole_')) {
        const roleId = customId.replace('takerole_', '');
        const member = interaction.member as GuildMember;
        const role = interaction.guild?.roles.cache.get(roleId);

        if (!role) {
          await interaction.reply({ content: '❌ Role tidak ditemukan di server ini.', ephemeral: true });
          return;
        }

        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          await interaction.reply({
            content: `🔴 Role **${role.name}** telah **dicabut** dari profilmu.`,
            ephemeral: true
          });
        } else {
          await member.roles.add(roleId);
          await interaction.reply({
            content: `🟢 Role **${role.name}** telah **diberikan** ke profilmu.`,
            ephemeral: true
          });
        }
        return;
      }

      // --- POLL VOTE BUTTONS ---
      if (customId.startsWith('poll_vote_')) {
        const optionIndex = parseInt(customId.replace('poll_vote_', ''), 10);
        const poll = getPoll(interaction.message.id);

        if (!poll || !poll.active) {
          await interaction.reply({ content: '❌ Polling ini sudah tidak aktif atau berakhir.', ephemeral: true });
          return;
        }

        const votesObj: Record<string, number> = JSON.parse(poll.votes || '{}');
        votesObj[interaction.user.id] = optionIndex;

        updatePollVotes(interaction.message.id, JSON.stringify(votesObj));

        // Recompute stats and update embed
        const options: string[] = JSON.parse(poll.options || '[]');
        const totalVotes = Object.keys(votesObj).length;
        const optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

        let updatedText = '';
        options.forEach((opt, idx) => {
          const count = Object.values(votesObj).filter((v) => v === idx).length;
          const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
          const barLength = Math.round(pct / 10);
          const bar = '█'.repeat(barLength) + '░'.repeat(10 - barLength);
          updatedText += `${optionEmojis[idx]} **${opt}**\n\`${bar}\` **${count}** suara (${pct}%)\n\n`;
        });

        const newEmbed = createBaseEmbed()
          .setTitle(`📊 VOTING WARGA: ${poll.question.toUpperCase()}`)
          .setDescription(
            `Silakan berikan suara kamu dengan menekan tombol pilihan di bawah!\n\n` +
              `${updatedText}` +
              `👥 **Total Suara:** **${totalVotes}** suara\n` +
              `👮 **Pembuat:** <@${poll.creator_id}>`
          )
          .setColor('#3498DB');

        await interaction.message.edit({ embeds: [newEmbed] });
        await interaction.reply({
          content: `✅ Suaramu untuk pilihan **${options[optionIndex]}** berhasil dicatat!`,
          ephemeral: true
        });
        return;
      }

      // --- ANNOUNCEMENT SESSION PREVIEW CONFIRMATION ---
      if (customId.startsWith('announcement_send_')) {
        const adminId = customId.replace('announcement_send_', '');
        if (interaction.user.id !== adminId) {
          await interaction.reply({ content: '❌ Sesi ini bukan milikmu.', ephemeral: true });
          return;
        }

        const session = announcementSessions.getSession(adminId);
        if (!session || !session.content) {
          await interaction.reply({ content: '❌ Sesi pengumuman telah kedaluwarsa atau tidak valid.', ephemeral: true });
          return;
        }

        const targetChannel = (await interaction.guild?.channels.fetch(session.targetChannelId).catch(() => null)) as TextChannel | null;
        if (!targetChannel) {
          await interaction.reply({ content: '❌ Channel tujuan tidak ditemukan.', ephemeral: true });
          return;
        }

        if (session.mode === 'embed') {
          const broadcastEmbed = createBaseEmbed()
            .setTitle(session.title || '📢 PENGUMUMAN WANDER ROLEPLAY')
            .setDescription(session.content);

          const payload: any = { embeds: [broadcastEmbed] };
          if (session.mention) payload.content = session.mention;
          await targetChannel.send(payload);
        } else {
          let text = session.content;
          if (session.mention) text = `${session.mention}\n\n${text}`;
          await targetChannel.send({ content: text });
        }

        announcementSessions.endSession(adminId);
        await interaction.update({
          content: `✅ Pengumuman resmi berhasil disiarkan ke <#${targetChannel.id}>!`,
          embeds: [],
          components: []
        });
        return;
      }

      if (customId.startsWith('announcement_cancel_')) {
        const adminId = customId.replace('announcement_cancel_', '');
        announcementSessions.endSession(adminId);
        await interaction.update({
          content: '❌ Pengiriman pengumuman dibatalkan.',
          embeds: [],
          components: []
        });
        return;
      }

      // --- SETUP DASHBOARD INTERACTIVE BUTTONS ---
      if (customId === 'setup_toggle_honeypot') {
        if (!(await checkAdminAccess(interaction))) return;
        const guildId = interaction.guild!.id;
        const settings = getGuildSettings(guildId);
        const current = settings ? settings.honeypot_enabled === 1 : config.honeypot.enabled;
        updateGuildSettings(guildId, { honeypot_enabled: current ? 0 : 1 });
        const newEmbed = createSetupDashboardEmbed(guildId);
        const rows = createSetupDashboardRows();
        await interaction.update({ embeds: [newEmbed], components: rows });
        return;
      }

      if (customId === 'setup_toggle_antiinvite') {
        if (!(await checkAdminAccess(interaction))) return;
        const guildId = interaction.guild!.id;
        const settings = getGuildSettings(guildId);
        const current = settings ? (settings.anti_invite_enabled ?? 1) === 1 : (config.antiInvite?.enabled ?? true);
        updateGuildSettings(guildId, { anti_invite_enabled: current ? 0 : 1 });
        const newEmbed = createSetupDashboardEmbed(guildId);
        const rows = createSetupDashboardRows();
        await interaction.update({ embeds: [newEmbed], components: rows });
        return;
      }

      if (customId === 'setup_toggle_welcome') {
        if (!(await checkAdminAccess(interaction))) return;
        const guildId = interaction.guild!.id;
        const settings = getGuildSettings(guildId);
        const current = settings ? (settings.welcome_enabled ?? 1) === 1 : config.welcome.enabled;
        updateGuildSettings(guildId, { welcome_enabled: current ? 0 : 1 });
        const newEmbed = createSetupDashboardEmbed(guildId);
        const rows = createSetupDashboardRows();
        await interaction.update({ embeds: [newEmbed], components: rows });
        return;
      }

      if (customId === 'setup_refresh_dashboard') {
        if (!(await checkAdminAccess(interaction))) return;
        const guildId = interaction.guild!.id;
        const newEmbed = createSetupDashboardEmbed(guildId);
        const rows = createSetupDashboardRows();
        await interaction.update({ embeds: [newEmbed], components: rows });
        return;
      }

      if (customId === 'setup_reload_config') {
        if (!(await checkAdminAccess(interaction))) return;
        reloadConfig();
        const guildId = interaction.guild!.id;
        const newEmbed = createSetupDashboardEmbed(guildId);
        const rows = createSetupDashboardRows();
        await interaction.update({ embeds: [newEmbed], components: rows });
        return;
      }

      if (customId === 'setup_quick_reset_prompt') {
        if (!(await checkAdminAccess(interaction))) return;
        const resetRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('setup_do_reset_channels').setLabel('Hapus Semua Channels').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('setup_do_reset_roles').setLabel('Hapus Semua Roles').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('setup_refresh_dashboard').setLabel('Batal / Kembali').setStyle(ButtonStyle.Secondary)
        );
        await interaction.reply({
          content: '⚠️ **PILIH PENGATURAN YANG INGIN DIHAPUS / DIKOSONGKAN:**',
          components: [resetRow],
          ephemeral: true
        });
        return;
      }

      if (customId === 'setup_do_reset_channels' || customId === 'setup_do_reset_roles') {
        if (!(await checkAdminAccess(interaction))) return;
        const target = customId === 'setup_do_reset_channels' ? 'channels' : 'roles';
        resetGuildSettings(interaction.guild!.id, target);
        await interaction.update({
          content: `✅ Pengaturan **${target.toUpperCase()}** berhasil dihapus dan dikosongkan!`,
          components: []
        });
        return;
      }

      // --- SUGGESTION UPVOTE / DOWNVOTE BUTTONS ---
      if (customId === 'suggest_upvote' || customId === 'suggest_downvote') {
        const record = getSuggestionByMessage(interaction.message.id);
        if (!record || record.status !== 'pending') {
          await interaction.reply({ content: '❌ Saran ini sudah tidak aktif atau sudah ditinjau.', ephemeral: true });
          return;
        }

        let upvotes: string[] = JSON.parse(record.upvotes || '[]');
        let downvotes: string[] = JSON.parse(record.downvotes || '[]');
        const uid = interaction.user.id;

        if (customId === 'suggest_upvote') {
          downvotes = downvotes.filter((id) => id !== uid);
          if (upvotes.includes(uid)) {
            upvotes = upvotes.filter((id) => id !== uid);
          } else {
            upvotes.push(uid);
          }
        } else {
          upvotes = upvotes.filter((id) => id !== uid);
          if (downvotes.includes(uid)) {
            downvotes = downvotes.filter((id) => id !== uid);
          } else {
            downvotes.push(uid);
          }
        }

        updateSuggestionVotes(interaction.message.id, JSON.stringify(upvotes), JSON.stringify(downvotes));

        const updatedRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId('suggest_upvote')
            .setLabel(`Setuju (${upvotes.length})`)
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('suggest_downvote')
            .setLabel(`Tidak Setuju (${downvotes.length})`)
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger)
        );

        await interaction.message.edit({ components: [updatedRow] });
        await interaction.reply({ content: '✅ Suaramu untuk aspirasi warga ini berhasil dicatat!', ephemeral: true });
        return;
      }

      // --- WHITELIST MODAL OPEN BUTTON ---
      if (customId === 'whitelist_open_modal') {
        const modal = new ModalBuilder()
          .setCustomId('modal_whitelist_submit')
          .setTitle('Formulir Masuk Kota Wander RP');

        const icName = new TextInputBuilder()
          .setCustomId('wl_ic_name')
          .setLabel('Nama Lengkap Karakter IC')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Contoh: Bryan Connor')
          .setRequired(true)
          .setMaxLength(60);

        const icAge = new TextInputBuilder()
          .setCustomId('wl_ic_age')
          .setLabel('Usia & Tanggal Lahir Karakter IC')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Contoh: 25 Tahun / 15 Juli 1999')
          .setRequired(true);

        const story = new TextInputBuilder()
          .setCustomId('wl_story')
          .setLabel('Latar Belakang Karakter & Minat Pekerjaan')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Jelaskan asal usul karaktermu dan pekerjaan yang ingin ditekuni...')
          .setRequired(true)
          .setMaxLength(1500);

        const rules = new TextInputBuilder()
          .setCustomId('wl_rules')
          .setLabel('Penjelasan Singkat RDM / VDM / FailRP')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Jelaskan dengan bahasamu sendiri apa arti RDM, VDM, dan FailRP...')
          .setRequired(true)
          .setMaxLength(1000);

        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(icName),
          new ActionRowBuilder<TextInputBuilder>().addComponents(icAge),
          new ActionRowBuilder<TextInputBuilder>().addComponents(story),
          new ActionRowBuilder<TextInputBuilder>().addComponents(rules)
        );

        await interaction.showModal(modal);
        return;
      }

      // --- WHITELIST ACCEPT / REJECT BUTTONS (Staff Only) ---
      if (customId.startsWith('whitelist_accept_')) {
        if (!(await checkAdminAccess(interaction))) return;
        const id = parseInt(customId.replace('whitelist_accept_', ''), 10);
        const sub = getWhitelistSubmission(id);
        if (!sub) {
          await interaction.reply({ content: '❌ Data pendaftaran tidak ditemukan.', ephemeral: true });
          return;
        }

        updateWhitelistStatus(id, 'accepted', interaction.user.id);

        // Give citizen role
        const citizenRoleId = config.whitelist?.citizenRoleId || config.roles.citizenRoleId;
        if (citizenRoleId && interaction.guild) {
          const targetMember = await interaction.guild.members.fetch(sub.user_id).catch(() => null);
          if (targetMember) {
            await targetMember.roles.add(citizenRoleId).catch(() => null);
          }
        }

        // Notify in DM
        try {
          const applicant = await interaction.client.users.fetch(sub.user_id).catch(() => null);
          if (applicant) {
            await applicant.send({
              embeds: [
                createSuccessEmbed(
                  'PENDAFTARAN WARGA DISETUJUI!',
                  `Selamat <@${applicant.id}>! Formulir pendaftaran karakter IC kamu (**${sub.ic_name}**) telah resmi **DISETUJUI** oleh Staff **Wander Roleplay**.\n\n` +
                    `Role warga kota telah diberikan ke akunmu. Selamat menikmati roleplay di Kota Wander!\n` +
                    `🔗 **Connect:** \`${config.server.cfxConnect}\``
                )
              ]
            });
          }
        } catch {
          // Ignore DM error
        }

        const approvedEmbed = createBaseEmbed()
          .setTitle('✅ FORMULIR WARGA: DISETUJUI')
          .setColor('#2ECC71')
          .setDescription(
            `Warga: <@${sub.user_id}> (\`${sub.user_tag}\`)\n` +
              `Nama IC: **${sub.ic_name}** (${sub.ic_age})\n\n` +
              `👮 **Diterima Oleh:** <@${interaction.user.id}>\n` +
              `⏰ **Waktu:** <t:${Math.floor(Date.now() / 1000)}:R>`
          );

        await interaction.update({ embeds: [approvedEmbed], components: [] });
        return;
      }

      if (customId.startsWith('whitelist_reject_')) {
        if (!(await checkAdminAccess(interaction))) return;
        const id = parseInt(customId.replace('whitelist_reject_', ''), 10);
        const sub = getWhitelistSubmission(id);
        if (!sub) {
          await interaction.reply({ content: '❌ Data pendaftaran tidak ditemukan.', ephemeral: true });
          return;
        }

        updateWhitelistStatus(id, 'rejected', interaction.user.id);

        // Notify in DM
        try {
          const applicant = await interaction.client.users.fetch(sub.user_id).catch(() => null);
          if (applicant) {
            await applicant.send({
              embeds: [
                createErrorEmbed(
                  'PENDAFTARAN WARGA DITOLAK',
                  `Halo <@${applicant.id}>, mohon maaf pendaftaran karakter IC kamu (**${sub.ic_name}**) di **Wander Roleplay** belum disetujui.\n\n` +
                    `Pastikan untuk membaca peraturan kota dan mengisi formulir dengan lebih detail. Kamu dapat mengajukan pendaftaran ulang.`
                )
              ]
            });
          }
        } catch {
          // Ignore DM error
        }

        const rejectedEmbed = createBaseEmbed()
          .setTitle('❌ FORMULIR WARGA: DITOLAK')
          .setColor('#E74C3C')
          .setDescription(
            `Warga: <@${sub.user_id}> (\`${sub.user_tag}\`)\n` +
              `Nama IC: **${sub.ic_name}** (${sub.ic_age})\n\n` +
              `👮 **Ditolak Oleh:** <@${interaction.user.id}>\n` +
              `⏰ **Waktu:** <t:${Math.floor(Date.now() / 1000)}:R>`
          );

        await interaction.update({ embeds: [rejectedEmbed], components: [] });
        return;
      }
    }

    // 3. Handle Select Menus
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_category_select') {
        const categoryKey = interaction.values[0];
        const categoryLabels: Record<string, string> = {
          bantuan_umum: 'Bantuan Umum & Bug',
          report_warga: 'Lapor Warga / Player Report',
          tebus_kendaraan: 'Tebus Kendaraan / Asuransi',
          donasi_vip: 'Donasi & VIP Supporter',
          lainnya: 'Keperluan Lainnya'
        };

        const label = categoryLabels[categoryKey] || 'Umum';

        await interaction.deferReply({ ephemeral: true });
        const res = await handleTicketOpen(interaction.guild!, interaction.user, label);

        if (res.success && res.channel) {
          await interaction.editReply({
            content: `🎫 Tiket bantuan kamu berhasil dibuat di <#${res.channel.id}>! Silakan kunjungi channel tersebut.`
          });
        } else {
          await interaction.editReply({
            content: `❌ ${res.message || 'Gagal membuat tiket.'}`
          });
        }
        return;
      }

      if (interaction.customId === 'help_category_select') {
        const selected = interaction.values[0];
        const embed = createBaseEmbed();

        if (selected === 'help_setup') {
          embed
            .setTitle('⚙️ PANDUAN SETUP & PENGATURAN BOT (OWNER & ADMIN)')
            .setDescription(
              `Perintah kontrol terpusat untuk mengatur, mengganti, dan menghapus konfigurasi bot sesuka hati:\n\n` +
                `• \`/setup dashboard\`\n` +
                `  *Membuka panel kontrol visual lengkap dengan tombol toggle aktif/nonaktif fitur secara instan.*\n\n` +
                `• \`/setup channel [jenis] [channel] [hapus_channel?]\`\n` +
                `  *Atur atau ganti channel tujuan fungsi bot. Centang \`hapus_channel: true\` jika ingin mengosongkan/menghapus channel tersebut.*\n` +
                `  *Pilihan jenis: Mod-Logs, Ticket-Logs, Welcome, Goodbye, Honeypot, Kotak Saran, Whitelist.*\n\n` +
                `• \`/setup role [jenis] [role] [hapus_role?]\`\n` +
                `  *Atur, ganti, atau hapus role Admin, Moderator, dan Citizen/Warga Baru.*\n\n` +
                `• \`/setup features [fitur] [status]\`\n` +
                `  *Nyalakan atau matikan fitur (Honeypot, Anti-Invite, Welcome, Goodbye).*\n\n` +
                `• \`/setup reset [target]\`\n` +
                `  *Mereset pengaturan tertentu atau reset total ke kondisi bawaan server.*\n\n` +
                `• \`/settings view\` & \`/settings reload\`\n` +
                `  *Melihat ringkasan konfigurasi aktif atau memuat ulang file config.json tanpa restart bot.*`
            );
        } else if (selected === 'help_moderation') {
          embed.setTitle('🛡️ PANDUAN PERINTAH MODERASI')
            .setDescription(
              `Perintah moderasi dilindungi hak akses ketat (Hanya Server Owner & Admin):\n\n` +
                `• \`/ban [user] [alasan] [hapus_pesan_hari]\` — Banned warga permanen.\n` +
                `• \`/unban [user_id] [alasan]\` — Cabut hukuman banned via User ID.\n` +
                `• \`/kick [user] [alasan]\` — Keluarkan warga dari server.\n` +
                `• \`/timeout [user] [durasi (10m, 1h, 1d)] [alasan]\` — Mute/bungkam sementara.\n` +
                `• \`/untimeout [user]\` — Cabut mute/timeout warga.\n` +
                `• \`/warn [user] [alasan]\` — Berikan peringatan resmi ke warga.\n` +
                `• \`/warnings [user]\` — Cek riwayat pelanggaran warga di database.\n` +
                `• \`/clearwarn [user] [warn_id?]\` — Hapus pelanggaran tertentu/semua.\n` +
                `• \`/purge [jumlah 1-100] [target?]\` — Hapus pesan massal di channel.\n` +
                `• \`/slowmode [detik]\` — Atur jeda slowmode channel.\n` +
                `• \`/lock\` & \`/unlock\` — Kunci/buka akses chat channel.`
            );
        } else if (selected === 'help_tickets') {
          embed.setTitle('🎫 PANDUAN SISTEM TIKET BANTUAN')
            .setDescription(
              `Sistem tiket interaktif customer support Wander Roleplay:\n\n` +
                `• \`/ticket panel [channel] [kategori?]\` — Kirim embed panel open ticket dengan menu dropdown pilihan kategori.\n` +
                `• \`/ticket claim\` — Staff mengklaim penanganan tiket.\n` +
                `• \`/ticket transcript\` — Unduh arsip percakapan tiket (.txt).\n` +
                `• \`/ticket close\` — Menutup dan menghapus tiket dengan arsip log otomatis.`
            );
        } else if (selected === 'help_announcement') {
          embed.setTitle('📢 PANDUAN PENGUMUMAN / BROADCAST')
            .setDescription(
              `Mengirimkan pengumuman resmi bot dengan bebas enter/longkap bawah:\n\n` +
                `• \`/announcement interactive [channel] [format: embed/plain] [mention?]\`\n` +
                `  *Memulai sesi interaktif. Kamu tinggal ketik pesan pengumuman kamu di chat (bebas enter/longkap bawah), lalu bot akan menampilkan preview dan tombol konfirmasi.*\n\n` +
                `• \`/announcement modal [channel] [mention?]\`\n` +
                `  *Membuka jendela pop-up Discord multiline untuk mengetik judul, isi pesan, dan banner.*\n\n` +
                `• \`/announcement quick [channel] [pesan] [judul?]\`\n` +
                `  *Kirim pesan pengumuman cepat dalam satu baris perintah.*`
            );
        } else if (selected === 'help_honeypot') {
          embed.setTitle('🍯 PANDUAN SISTEM JEBAKAN HONEYPOT')
            .setDescription(
              `Sistem jebakan pelindung dari raid bot dan spammer token:\n\n` +
                `• \`/honeypot setup [channel] [tindakan: ban/kick/timeout]\`\n` +
                `  *Menunjuk sebuah channel sebagai perangkap. Siapapun akun asing yang mengetik di channel ini akan langsung ditindak secara otomatis & riwayat spam dihapus.*\n\n` +
                `• \`/honeypot status\` — Melihat status keaktifan jebakan.\n` +
                `• \`/honeypot disable\` — Menonaktifkan sistem honeypot.\n` +
                `• \`/honeypot logs\` — Melihat daftar akun yang tertangkap.`
            );
        } else if (selected === 'help_fivem_community') {
          embed.setTitle('🏙️ PANDUAN FIVEM & KOMUNITAS WARGA')
            .setDescription(
              `Fitur khusus komunitas & server FiveM Wander Roleplay:\n\n` +
                `• \`/fivem status\` — Pantau server FiveM live (jumlah warga di kota, ping, connect link).\n` +
                `• \`/fivem setup [channel]\` — Pasang panel live monitor server auto-refresh tiap menit.\n` +
                `• \`/suggest kirim [saran]\` — Warga kirim aspirasi ke kotak saran dengan tombol vote setuju/tidak.\n` +
                `• \`/suggest review [id] [keputusan] [catatan?]\` — Staff meninjau saran warga dan kirim DM hasil keputusan.\n` +
                `• \`/whitelist panel [channel]\` — Pasang formulir pendaftaran warga masuk kota dengan form IC.`
            );
        } else if (selected === 'help_welcome_roles') {
          embed.setTitle('👋 WELCOME, GOODBYE & TAKE ROLE')
            .setDescription(
              `• \`/welcome setup [channel] [auto_role?] [pesan?]\` — Atur ucapan selamat datang & auto-role warga baru.\n` +
                `• \`/welcome test\` — Preview tampilan sambutan.\n` +
                `• \`/goodbye setup [channel] [pesan?]\` — Atur pesan warga keluar kota.\n` +
                `• \`/takerole notifications [channel] ...\` — Buat panel ambil role notifikasi.\n` +
                `• \`/takerole gender [channel] ...\` — Buat panel role identitas gender IC.\n` +
                `• \`/takerole custom [channel] [judul] [deskripsi] ...\` — Buat panel role custom dengan tombol.`
            );
        } else if (selected === 'help_giveaway_poll') {
          embed.setTitle('🎉 GIVEAWAY & POLLING SUARA')
            .setDescription(
              `• \`/giveaway start [hadiah] [durasi] [pemenang] [channel?]\` — Memulai undian giveaway berhadiah dengan tombol join.\n` +
                `• \`/giveaway end [message_id]\` — Mengakhiri giveaway seketika.\n` +
                `• \`/giveaway reroll [message_id]\` — Memilih ulang pemenang baru.\n` +
                `• \`/poll create [pertanyaan] [opsi1] [opsi2] ...\` — Membuat voting interaktif dengan live grafik batang.\n` +
                `• \`/poll end [message_id]\` — Menutup polling dan menampilkan hasil akhir.`
            );
        } else if (selected === 'help_general') {
          embed.setTitle('ℹ️ INFORMASI UMUM & UTILITAS')
            .setDescription(
              `• \`/ping\` — Mengecek kecepatan respons bot, discord websocket latency, memory RAM, dan database SQLite.\n` +
                `• \`/serverinfo\` — Menampilkan statistik lengkap server Discord dan FiveM Wander Roleplay.\n` +
                `• \`/help\` — Membuka panduan interaktif seluruh sistem bot.`
            );
        }

        await interaction.update({ embeds: [embed] });
        return;
      }
    }

    // 4. Handle Modals
    if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith('modal_announcement_')) {
        const parts = interaction.customId.replace('modal_announcement_', '').split('_');
        const targetChannelId = parts[0];
        const mention = parts[1] === 'none' ? null : parts[1];

        const title = interaction.fields.getTextInputValue('announcement_title');
        const content = interaction.fields.getTextInputValue('announcement_content');
        const banner = interaction.fields.getTextInputValue('announcement_banner');

        const targetChannel = (await interaction.guild?.channels.fetch(targetChannelId).catch(() => null)) as TextChannel | null;
        if (!targetChannel) {
          await interaction.reply({ content: '❌ Channel tujuan tidak ditemukan.', ephemeral: true });
          return;
        }

        const embed = createBaseEmbed()
          .setTitle(title)
          .setDescription(content);

        if (banner && (banner.startsWith('http://') || banner.startsWith('https://'))) {
          embed.setImage(banner);
        }

        const payload: any = { embeds: [embed] };
        if (mention) payload.content = mention;

        await targetChannel.send(payload);

        await interaction.reply({
          content: `✅ Pengumuman resmi berhasil disiarkan ke <#${targetChannel.id}>!`,
          ephemeral: true
        });
        return;
      }

      if (interaction.customId === 'modal_whitelist_submit') {
        const icName = interaction.fields.getTextInputValue('wl_ic_name');
        const icAge = interaction.fields.getTextInputValue('wl_ic_age');
        const story = interaction.fields.getTextInputValue('wl_story');
        const rules = interaction.fields.getTextInputValue('wl_rules');

        const subId = createWhitelistSubmission({
          guild_id: interaction.guildId!,
          user_id: interaction.user.id,
          user_tag: interaction.user.tag,
          ic_name: icName,
          ic_age: icAge,
          story: `${story}\n\n[Pemahaman Rules]: ${rules}`
        });

        // Send to staff review channel
        const reviewChannelId =
          config.whitelist?.reviewChannelId ||
          config.channels.whitelistLogChannelId ||
          config.channels.modLogsChannelId;

        if (reviewChannelId && interaction.guild) {
          const reviewChannel = (await interaction.guild.channels.fetch(reviewChannelId).catch(() => null)) as TextChannel | null;
          if (reviewChannel && reviewChannel.isTextBased()) {
            const reviewEmbed = createBaseEmbed()
              .setTitle(`📝 PENDAFTARAN WARGA BARU #${subId}`)
              .setColor('#F1C40F')
              .setDescription(
                `Pendaftaran masuk kota dari <@${interaction.user.id}> (\`${interaction.user.tag}\`):\n\n` +
                  `👤 **Nama Karakter IC:** **${icName}**\n` +
                  `🎂 **Usia & TTL:** ${icAge}\n\n` +
                  `📖 **Cerita Karakter & Minat:**\n>>> ${story}\n\n` +
                  `📜 **Jawaban Rules RP:**\n>>> ${rules}`
              )
              .setThumbnail(interaction.user.displayAvatarURL())
              .setFooter({ text: `ID Pendaftaran: #${subId} • ${config.server.footerText}` });

            const staffRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
              new ButtonBuilder()
                .setCustomId(`whitelist_accept_${subId}`)
                .setLabel('Terima Warga')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`whitelist_reject_${subId}`)
                .setLabel('Tolak Warga')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
            );

            await reviewChannel.send({ embeds: [reviewEmbed], components: [staffRow] });
          }
        }

        await interaction.reply({
          content: `✅ Formulir pendaftaran karakter IC **${icName}** berhasil dikirimkan ke tim Staff Wander Roleplay! Harap menunggu proses peninjauan.`,
          ephemeral: true
        });
        return;
      }
    }
  } catch (error: any) {
    console.error('[INTERACTION] Error handling interaction:', error);
    if (interaction.isRepliable()) {
      const errEmbed = createErrorEmbed('TERJADI KESALAHAN', `Gagal memproses interaksi: ${error.message}`);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => null);
      }
    }
  }
}
