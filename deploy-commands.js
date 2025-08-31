// deploy-commands.js

// .env 파일에서 환경 변수를 로드합니다.
require('dotenv').config(); 
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

// config.json 대신 process.env에서 환경 변수를 가져옵니다.
const { CLIENT_ID, DISCORD_TOKEN } = process.env;

const commands = [
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('pong!'),
    new SlashCommandBuilder()
        .setName('시간')
        .setDescription('현재 시간을 표시합니다.'),
    new SlashCommandBuilder()
        .setName('내정보')
        .setDescription('사용자의 정보를 표시합니다.')
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log('Started refreshing application (/) commands globally.');

        // 길드 명령어가 아닌 글로벌 명령어로 등록합니다.
        await rest.put(
            Routes.applicationCommands(CLIENT_ID), // guildId가 필요 없습니다.
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands globally.');

    } catch (error) {
        console.error(error);
    }
})();