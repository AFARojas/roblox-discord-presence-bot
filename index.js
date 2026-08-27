require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const http = require('http');

// Servidor HTTP simple para mantener vivo el bot en Render/Glitch (evita la suspensión)
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Roblox Discord presence bot is active!\n');
}).listen(PORT, () => {
  console.log(`Servidor HTTP de mantenimiento iniciado en el puerto ${PORT}`);
});

// Validación de variables de entorno
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const ROBLOX_USER_ID = process.env.ROBLOX_USER_ID;
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL, 10) || 30000;

if (!DISCORD_TOKEN || !CHANNEL_ID || !ROBLOX_USER_ID) {
  console.error('Error: Faltan variables de entorno necesarias en el archivo .env.');
  console.error('Por favor asegúrate de configurar DISCORD_TOKEN, DISCORD_CHANNEL_ID y ROBLOX_USER_ID.');
  process.exit(1);
}

// Inicializar cliente de Discord (Intents estándar sin MessageContent privilegiado)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages
  ]
});

// Guardar el último estado para evitar notificaciones repetidas
let lastState = {
  presenceType: null,
  placeId: null,
  rootPlaceId: null,
  universeId: null,
  offlineChecksCount: 0
};

let cachedRobloxUser = null;

// Mapeo de tipos de presencia de Roblox
const PresenceTypes = {
  0: 'Offline',
  1: 'Online (Sitio Web)',
  2: 'En Juego 🎮',
  3: 'En Studio 🛠️'
};

const ROBLOX_COOKIE = process.env.ROBLOX_COOKIE;
let csrfToken = null;

// Función para realizar peticiones POST autenticadas a Roblox (maneja CSRF)
async function makeRobloxPostRequest(url, data) {
  const headers = {};
  if (ROBLOX_COOKIE) {
    headers['Cookie'] = `.ROBLOSECURITY=${ROBLOX_COOKIE}`;
    if (csrfToken) {
      headers['x-csrf-token'] = csrfToken;
    }
  }

  try {
    const response = await axios.post(url, data, { headers });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 403 && error.response.headers['x-csrf-token']) {
      csrfToken = error.response.headers['x-csrf-token'];
      headers['x-csrf-token'] = csrfToken;
      const retryResponse = await axios.post(url, data, { headers });
      return retryResponse.data;
    }
    throw error;
  }
}

// Función para obtener información del usuario (Nombre y Nombre de usuario)
async function getRobloxUserInfo(userId) {
  try {
    const headers = {};
    if (ROBLOX_COOKIE) {
      headers['Cookie'] = `.ROBLOSECURITY=${ROBLOX_COOKIE}`;
    }
    const response = await axios.get(`https://users.roblox.com/v1/users/${userId}`, { headers });
    return response.data;
  } catch (error) {
    console.error(`Error al obtener información del usuario de Roblox (${userId}):`, error.message);
    return { name: `Usuario ${userId}`, displayName: `Usuario ${userId}` };
  }
}

// Función para responder al Slash Command /detected
async function handleDetectedSlashCommand(interaction, robloxUser) {
  try {
    await interaction.deferReply();

    const data = await makeRobloxPostRequest('https://presence.roblox.com/v1/presence/users', {
      userIds: [parseInt(ROBLOX_USER_ID, 10)]
    });

    const presenceData = data?.userPresences?.[0];
    if (!presenceData) {
      await interaction.editReply('No se pudieron obtener datos de presencia de Roblox en este momento.');
      return;
    }

    const { userPresenceType, placeId, rootPlaceId, lastLocation } = presenceData;
    const currentRoot = rootPlaceId || placeId;
    const isPlaying = userPresenceType === 2;
    const gameUrl = currentRoot ? `https://www.roblox.com/games/${currentRoot}` : null;

    const embed = new EmbedBuilder()
      .setColor(isPlaying ? 0x00FF00 : 0x3498DB)
      .setTitle(`🔎 Estado en tiempo real: ${robloxUser.displayName}`)
      .setDescription(`Consulta realizada mediante el comando **/detected**.`)
      .addFields(
        { name: '👤 Usuario', value: `**${robloxUser.displayName}** (@${robloxUser.name})`, inline: true },
        { name: '📊 Estado', value: PresenceTypes[userPresenceType] || 'Desconocido', inline: true },
        { name: '🎮 Juego actual', value: isPlaying ? (lastLocation || 'Juego Desconocido') : 'No está en juego', inline: false }
      );

    if (isPlaying && gameUrl) {
      embed.addFields({ name: '🔗 Enlace para unirte', value: `[Haz clic aquí para entrar al juego](${gameUrl})`, inline: false });
    }

    embed
      .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${ROBLOX_USER_ID}&width=150&height=150&format=png`)
      .setTimestamp()
      .setFooter({ text: 'Monitoreo de Roblox (Sin mención)', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error al ejecutar /detected:', error.message);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('Ocurrió un error al consultar el estado de Roblox.');
    } else {
      await interaction.reply('Ocurrió un error al consultar el estado de Roblox.');
    }
  }
}

// Función principal de monitoreo
async function checkRobloxPresence(discordChannel, robloxUser) {
  try {
    const data = await makeRobloxPostRequest('https://presence.roblox.com/v1/presence/users', {
      userIds: [parseInt(ROBLOX_USER_ID, 10)]
    });

    const presenceData = data?.userPresences?.[0];
    if (!presenceData) {
      console.log('No se recibieron datos de presencia de Roblox.');
      return;
    }

    const { userPresenceType, placeId, rootPlaceId, lastLocation, universeId } = presenceData;
    const currentRoot = rootPlaceId || placeId;
    
    console.log(`[${new Date().toLocaleTimeString()}] Estado de ${robloxUser.displayName}: ${PresenceTypes[userPresenceType] || 'Desconocido'}` + 
      (userPresenceType === 2 ? ` en "${lastLocation}" (ID: ${placeId}, Root ID: ${currentRoot}, Universe: ${universeId})` : ''));

    // Detectar si el usuario ha entrado a un juego (Tipo de presencia 2 = InGame)
    if (userPresenceType === 2) {
      // Se notifica si:
      // 1. El estado anterior no era "En juego" (2)
      // 2. O si ya estaba en juego, pero cambió a un juego principal completamente diferente (universeId diferente y ambos válidos).
      const startedPlaying = lastState.presenceType !== 2;
      const changedGame = lastState.presenceType === 2 && 
        universeId && lastState.universeId && 
        lastState.universeId !== universeId;

      if (startedPlaying || changedGame) {
        console.log(`¡Detectado cambio o inicio de juego! Enviando notificación a Discord...`);
        
        const gameUrl = `https://www.roblox.com/games/${currentRoot}`;
        const embed = new EmbedBuilder()
          .setColor(0x00FF00) // Verde
          .setTitle(`¡${robloxUser.displayName} está jugando a algo!`)
          .setDescription(`**${robloxUser.displayName}** (@${robloxUser.name}) acaba de entrar a un juego.`)
          .addFields(
            { name: '🎮 Juego', value: lastLocation || 'Juego Desconocido', inline: true },
            { name: '🔗 Enlace al juego', value: `[Haz clic aquí para unirte](${gameUrl})`, inline: true }
          )
          .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${ROBLOX_USER_ID}&width=150&height=150&format=png`)
          .setTimestamp()
          .setFooter({ text: 'Monitoreo de Roblox', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

        await discordChannel.send({ content: '@everyone', embeds: [embed] });
      }

      // Reiniciar contador de desconexión porque está en juego
      lastState.presenceType = 2;
      lastState.placeId = placeId;
      lastState.rootPlaceId = currentRoot;
      lastState.universeId = universeId;
      lastState.offlineChecksCount = 0;
    } else {
      // El usuario no está en juego. Incrementamos el contador de desconexión.
      lastState.offlineChecksCount += 1;
      
      // Solo consideramos que ha salido del juego oficialmente si se mantiene fuera
      // durante 6 consultas consecutivas (aproximadamente 3 minutos con intervalo de 30s).
      // Esto evita falsos positivos durante pantallas de carga y teletransportaciones largas.
      if (lastState.offlineChecksCount >= 6 || lastState.presenceType === null) {
        lastState.presenceType = userPresenceType;
        lastState.placeId = null;
        lastState.rootPlaceId = null;
        lastState.universeId = null;
      }
    }

  } catch (error) {
    console.error('Error al consultar la API de Roblox:', error.message);
  }
}

// Escuchar interacciones (Slash Command /detected)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'detected') {
    if (!cachedRobloxUser) {
      cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
    }
    await handleDetectedSlashCommand(interaction, cachedRobloxUser);
  }
});

client.once('ready', async () => {
  console.log(`Bot conectado exitosamente como ${client.user.tag}`);
  
  // Registrar el comando de barra /detected globalmente en Discord
  try {
    await client.application.commands.create({
      name: 'detected',
      description: 'Muestra el estado en tiempo real del usuario monitoreado de Roblox'
    });
    console.log('Comando /detected registrado en Discord.');
  } catch (err) {
    console.error('Error al registrar comando /detected:', err.message);
  }

  // Buscar el canal de Discord
  const channel = await client.channels.fetch(CHANNEL_ID).catch(err => {
    console.error(`Error al buscar el canal con ID ${CHANNEL_ID}:`, err.message);
    return null;
  });

  if (!channel) {
    console.error('No se pudo encontrar el canal de Discord configurado. Verifica el ID.');
    process.exit(1);
  }

  // Obtener info del usuario de Roblox una vez al iniciar
  console.log(`Obteniendo información del usuario de Roblox con ID ${ROBLOX_USER_ID}...`);
  cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
  console.log(`Monitoreando a: ${cachedRobloxUser.displayName} (@${cachedRobloxUser.name})`);

  // Ejecutar inmediatamente al iniciar y luego configurar intervalo
  checkRobloxPresence(channel, cachedRobloxUser);
  setInterval(() => checkRobloxPresence(channel, cachedRobloxUser), POLL_INTERVAL);
});

client.login(DISCORD_TOKEN);
