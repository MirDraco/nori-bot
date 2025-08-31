// index.js

// .env 파일에서 환경 변수를 로드합니다.
require('dotenv').config();
const { Client, Events, GatewayIntentBits } = require('discord.js');

// config.json에서 token을 가져오는 줄을 삭제합니다.
// const { token } = require('./config.json'); -> 이 줄 삭제

const client = new Client({ intents: [
    GatewayIntentBits.Guilds
]});

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } else if (interaction.commandName === '시간') {
        const userNickname = interaction.member.displayName; 

        const now = new Date();
        const formattedTime = now.toLocaleString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Seoul'
        });
    
        await interaction.reply(`안녕하세요 ${userNickname}님, 현재 시간은 ${formattedTime}입니다.`);
    }
    else if (interaction.commandName === '내정보') {
        const user = interaction.user;
        const member = interaction.member;

        const embed = {
            color : 0x0099ff,
            title : `${member.displayName}님의 정보`,
            description : `${member.displayName}님의 디스코드 정보입니다.`,
            thumbnail : {
                url : user.displayAvatarURL({ dynamic : true })
            },
            fields : [
                {
                    name : `닉네임`,
                    value : `${member.displayName}`,
                    inline : true    
                },
                {
                    name : `계정 생성일`,
                    value : `${new Date(user.createdAt).toLocaleDateString('ko-KR')}`,
                    inline : true
                },
                {
                    name : `서버 가입일`,
                    value : `${new Date(member.joinedAt).toLocaleDateString('ko-KR')}`,
                    inline : true
                }
            ],
            timestamp : new Date(),
            footer : {
                text : `ID : ${user.id}`,
            },
    };
        await interaction.reply({ embeds : [embed] });
    }; 
});

// 환경 변수에서 직접 토큰을 가져와 봇에 로그인합니다.
client.login(process.env.DISCORD_TOKEN);