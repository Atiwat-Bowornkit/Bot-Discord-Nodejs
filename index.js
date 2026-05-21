const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

// ==========================================
// 1. ส่วนของ Web Server สำหรับ Render + UptimeRobot
// ==========================================
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running 24/7!'); // ข้อความนี้จะโชว์บนหน้าเว็บ
});

app.listen(port, () => {
  console.log(`Web server is listening on port ${port}`);
});

// ==========================================
// 2. ส่วนการทำงานของ Discord Bot
// ==========================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates // จำเป็นหากจะพัฒนาเป็นบอทเพลงในอนาคต
  ],
});

// เมื่อบอทพร้อมทำงาน
client.once('ready', () => {
  console.log(`Bot is online! Logged in as ${client.user.tag}`);
});

// ตัวอย่างคำสั่งพื้นฐาน
client.on('messageCreate', (message) => {
  // ป้องกันไม่ให้บอทคุยกับตัวเอง
  if (message.author.bot) return;

  // ถ้ามีคนพิมพ์ !ping ในแชท
  if (message.content === '!ping') {
    message.reply('Pong! 🏓 บอททำงานปกติครับ');
  }
});

// ใช้ Token เพื่อล็อกอินเข้าสู่ระบบบอท
client.login(process.env.TOKEN);