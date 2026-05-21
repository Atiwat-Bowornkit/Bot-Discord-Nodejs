const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, NoSubscriberBehavior } = require('@discordjs/voice');
const play = require('play-dl');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Music Bot with Spotify is alive!'));
app.listen(port, () => console.log(`Web server listening on port ${port}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});

client.once('ready', async () => {
  console.log(`Bot is online! Logged in as ${client.user.tag}`);

  // เชื่อมต่อ Spotify API ถ้ามีการใส่ Key ไว้
  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    await play.setToken({
      spotify: {
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
        market: "TH",
        unlinked_search: ["soundcloud"] // บังคับให้หาไฟล์เสียงจาก SoundCloud เท่านั้น
      }
    });
    console.log("✅ Spotify API Connected!");
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (message.content.startsWith('!play')) {
    const args = message.content.split(' ');
    const query = args.slice(1).join(' ');

    if (!query) return message.reply('กรุณาพิมพ์ชื่อเพลง หรือใส่ลิงก์ Spotify ครับ');

    // ดักจับลิงก์ YouTube เพื่อแจ้งผู้ใช้ว่าเซิร์ฟเวอร์ติดลิมิต
    if (query.includes('youtube.com') || query.includes('youtu.be')) {
      return message.reply('⚠️ ตอนนี้ระบบไม่รองรับลิงก์ YouTube (ติด Rate Limit) กรุณาพิมพ์เป็น **ชื่อเพลง** หรือใช้ **ลิงก์ Spotify** แทนครับ');
    }

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return message.reply('คุณต้องเข้าไปอยู่ในห้องเสียงก่อนครับ!');

    try {
      message.reply(`🔍 กำลังค้นหา: **${query}**...`);
      let stream;
      let songTitle = query;

      // ตรวจสอบว่าเป็นลิงก์ Spotify หรือไม่
      const sp_check = await play.sp_validate(query);

      if (sp_check === 'track') {
        // กรณีเป็นลิงก์ Spotify
        if (play.is_expired()) await play.refreshToken(); // รีเฟรช Token ถ้าหมดอายุ
        
        const sp_data = await play.spotify(query);
        songTitle = `${sp_data.name} - ${sp_data.artists[0].name}`;
        
        // เอาชื่อเพลงจาก Spotify ไปค้นหาไฟล์เสียงใน SoundCloud
        const search_result = await play.search(songTitle, { limit: 1, source: { soundcloud: "tracks" } });
        if (!search_result || search_result.length === 0) return message.channel.send('❌ หาไฟล์เสียงไม่เจอครับ');
        
        stream = await play.stream(search_result[0].url);

      } else {
        // กรณีพิมพ์ชื่อเพลงธรรมดา ให้ค้นหาใน SoundCloud โดยตรง
        const search_result = await play.search(query, { limit: 1, source: { soundcloud: "tracks" } });
        if (!search_result || search_result.length === 0) return message.channel.send('❌ หาเพลงไม่เจอครับ');
        
        songTitle = search_result[0].name;
        stream = await play.stream(search_result[0].url);
      }

      const resource = createAudioResource(stream.stream, { inputType: stream.type });
      const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });

      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator,
      });

      player.play(resource);
      connection.subscribe(player);

      message.channel.send(`🎵 กำลังเล่น: **${songTitle}**`);

    } catch (error) {
      console.error(error);
      message.channel.send('❌ เกิดข้อผิดพลาดในการดึงข้อมูลเพลง');
    }
  }

  if (message.content === '!stop') {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) return;
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: message.guild.id,
      adapterCreator: message.guild.voiceAdapterCreator,
    });
    connection.destroy();
    message.reply('🛑 หยุดเพลงและออกจากห้องแล้วครับ');
  }
});

client.login(process.env.TOKEN);