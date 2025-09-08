// index.js

// .env 파일에서 환경 변수를 로드합니다.
require('dotenv').config();
const { Client, Events, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const dadJokes = require('./jokes.js');

// Gemini AI 클라이언트 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// 대화 세션을 저장하는 Map (유저별로 관리)
const chatSessions = new Map();
// 대화 세션 타이머를 관리하는 Map
const sessionTimers = new Map();

// 대화 세션 만료 시간 (30분 = 30 * 60 * 1000ms)
const SESSION_TIMEOUT = 30 * 60 * 1000;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// 아재개그를 랜덤으로 선택하는 함수 정의
function getRandomDadJoke() {
    const randomIndex = Math.floor(Math.random() * dadJokes.length);
    return dadJokes[randomIndex];
}

// Gemini API 호출 함수 (일회성 질문)
async function askGemini(question) {
    try {
        const result = await model.generateContent(question);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini API 오류:', error);
        return '죄송합니다. 현재 AI 서비스에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
}

// 대화 세션 타이머를 설정/재설정하는 함수
function resetSessionTimer(userId) {
    // 기존 타이머가 있으면 제거
    if (sessionTimers.has(userId)) {
        clearTimeout(sessionTimers.get(userId));
    }
    
    // 새로운 타이머 설정
    const timer = setTimeout(() => {
        chatSessions.delete(userId);
        sessionTimers.delete(userId);
        console.log(`사용자 ${userId}의 대화 세션이 만료되어 삭제되었습니다.`);
    }, SESSION_TIMEOUT);
    
    sessionTimers.set(userId, timer);
}

// Gemini 대화 세션 함수 (연속 대화)
async function chatWithGemini(userId, message) {
    try {
        // 해당 유저의 대화 세션이 없으면 새로 생성
        if (!chatSessions.has(userId)) {
            chatSessions.set(userId, model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 1000,
                },
            }));
            console.log(`사용자 ${userId}의 새로운 대화 세션이 시작되었습니다.`);
        }

        // 대화 세션 타이머 재설정 (활동이 있을 때마다 30분 연장)
        resetSessionTimer(userId);

        const chat = chatSessions.get(userId);
        const result = await chat.sendMessage(message);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini Chat API 오류:', error);
        return '죄송합니다. 현재 AI 서비스에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
    }
}

// 텍스트를 Discord 메시지 길이 제한에 맞게 분할하는 함수
function splitMessage(text, maxLength = 2000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxLength) {
        chunks.push(text.slice(i, i + maxLength));
    }
    return chunks;
}

client.once(Events.ClientReady, readyClient => {
    console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    } 
    else if (interaction.commandName === '시간') {
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
    }
    else if (interaction.commandName === '아재개그') {
        const randomJoke = getRandomDadJoke();
        
        const embed = new EmbedBuilder()
            .setColor(0xffff00)
            .setTitle('🤣 아재개그')
            .setDescription(randomJoke)
            .setFooter({ text: '메롱' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
    else if (interaction.commandName === '잼민이') {
        const question = interaction.options.getString('질문');
        
        // 응답 지연을 알려주는 메시지
        await interaction.deferReply();
        
        const answer = await askGemini(question);
        
        // 답변이 너무 길면 분할해서 전송
        const chunks = splitMessage(answer);
        
        const embed = new EmbedBuilder()
            .setColor(0x4285f4)
            .setTitle('🍋🐉 잼민이 AI 답변')
            .setDescription(chunks[0])
            .setFooter({ text: `질문자: ${interaction.user.displayName}` })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // 추가 청크가 있으면 followUp으로 전송
        for (let i = 1; i < chunks.length; i++) {
            const followUpEmbed = new EmbedBuilder()
                .setColor(0x4285f4)
                .setDescription(chunks[i]);
                
            await interaction.followUp({ embeds: [followUpEmbed] });
        }
    }
    else if (interaction.commandName === '잼민이대화초기화') {
        const userId = interaction.user.id;
        
        if (chatSessions.has(userId)) {
            // 대화 세션 삭제
            chatSessions.delete(userId);
            // 타이머도 삭제
            if (sessionTimers.has(userId)) {
                clearTimeout(sessionTimers.get(userId));
                sessionTimers.delete(userId);
            }
            
            const embed = new EmbedBuilder()
                .setColor(0xff9900)
                .setTitle('🔄 대화 초기화 완료')
                .setDescription('잼민이와의 대화 기록이 초기화되었습니다.\n이제 새로운 대화를 시작할 수 있습니다!')
                .setFooter({ text: `요청자: ${interaction.user.displayName}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed] });
        } else {
            const embed = new EmbedBuilder()
                .setColor(0x999999)
                .setTitle('ℹ️ 초기화할 대화가 없습니다')
                .setDescription('현재 진행 중인 잼민이 대화가 없습니다.')
                .setFooter({ text: `요청자: ${interaction.user.displayName}` })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
    else if (interaction.commandName === '잼민이대화') {
        const message = interaction.options.getString('메시지');
        const userId = interaction.user.id;
        
        // 응답 지연을 알려주는 메시지
        await interaction.deferReply();
        
        const answer = await chatWithGemini(userId, message);
        
        // 답변이 너무 길면 분할해서 전송
        const chunks = splitMessage(answer);
        
        const embed = new EmbedBuilder()
            .setColor(0x34a853)
            .setTitle('💬 잼민이 대화')
            .setDescription(chunks[0])
            .addFields(
                { name: '💭 당신의 메시지', value: message.length > 100 ? message.substring(0, 100) + '...' : message }
            )
            .setFooter({ text: `대화 상대: ${interaction.user.displayName} | 대화는 30분 후 자동 만료됩니다` })
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        
        // 추가 청크가 있으면 followUp으로 전송
        for (let i = 1; i < chunks.length; i++) {
            const followUpEmbed = new EmbedBuilder()
                .setColor(0x34a853)
                .setDescription(chunks[i]);
                
            await interaction.followUp({ embeds: [followUpEmbed] });
        }
    }
});

// 환경 변수에서 직접 토큰을 가져와 봇에 로그인합니다.
client.login(process.env.DISCORD_TOKEN);