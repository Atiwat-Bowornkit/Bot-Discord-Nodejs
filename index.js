const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const play = require('play-dl');
require('dotenv').config();

// ==========================================
// 1. ส่วน Web Server สำหรับรันบน Render 24/7
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Music Bot is alive!'));
app.listen(port, () => console.log(`Web server listening on port ${port}`));

// ==========================================
// 2. ส่วนการทำงานของ Discord Bot
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates // จำเป็นมากสำหรับการเข้าห้องเสียง
  ],
});

client.once('ready', () => {
  console.log(`Bot is online! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  // คำสั่ง !play <ชื่อเพลงหรือลิงก์>
  if (message.content.startsWith('!play')) {
    const args = message.content.split(' ');
    const query = args.slice(1).join(' '); // รวมคำที่อยู่หลัง !play ทั้งหมด

    if (!query) return message.reply('กรุณาใส่ชื่อเพลงหรือลิงก์ YouTube ด้วยครับ เช่น `!play โดราเอมอน`');

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('คุณต้องเข้าไปอยู่ในห้องเสียง (Voice Channel) ก่อนครับ!');

    try {
      message.reply(`🔍 กำลังค้นหา: **${query}**...`);

      // 1. ค้นหาเพลงจาก YouTube
      const yt_info = await play.search(query, { limit: 1 });
      if (!yt_info || yt_info.length === 0) return message.channel.send('❌ หาเพลงไม่เจอครับ');

      const song = yt_info[0];
      message.channel.send(`🎵 กำลังเล่น: **${song.title}**`);

      // 2. เตรียมสตรีมเสียงจาก YouTube
      const stream = await play.stream(song.url);
      const resource = createAudioResource(stream.stream, { inputType: stream.type });

      // 3. สร้าง Player
      const player = createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Play }
      });

      // 4. สั่งให้บอทเข้าห้องเสียง
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      // 5. เล่นเพลง
      player.play(resource);
      connection.subscribe(player);

    } catch (error) {
      console.error(error);
      message.channel.send('❌ เกิดข้อผิดพลาดในการเล่นเพลง (อาจจะถูก YouTube บล็อกชั่วคราว)');
    }
  }

  // คำสั่ง !stop ให้บอทหยุดและออกจากห้อง
  if (message.content === '!stop') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('คุณไม่ได้อยู่ในห้องเสียงครับ');

    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });
    
    connection.destroy(); // ตัดการเชื่อมต่อและออกจากห้อง
    message.reply('🛑 หยุดเพลงและออกจากห้องแล้วครับ');
  }
});

client.login(process.env.TOKEN);