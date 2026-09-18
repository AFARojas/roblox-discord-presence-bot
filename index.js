require('dotenv').config();
const fs = require('fs');
const path = require('path');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits, ActivityType } = require('discord.js');
const axios = require('axios');
const http = require('http');

// Servidor HTTP simple para mantener vivo el bot en Render/Glitch (evita la suspensión)
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  if (req.url === '/diag') {
    try {
      const start = Date.now();
      const r = await axios.get('https://discord.com/api/v10/gateway/bot', {
        headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` },
        timeout: 10000
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, duration: Date.now() - start, data: r.data }));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: false,
        status: e.response?.status,
        statusText: e.response?.statusText,
        data: e.response?.data,
        message: e.message
      }));
    }
  }
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

// Inicializar cliente de Discord (Intents completos para texto e interacciones)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, 
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Archivo de persistencia de configuración local (para recordar el estado de /on y /off)
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (typeof data.everyoneMentionEnabled === 'boolean') {
        return { everyoneMentionEnabled: data.everyoneMentionEnabled };
      }
      if (typeof data.notificationsEnabled === 'boolean') {
        return { everyoneMentionEnabled: data.notificationsEnabled };
      }
    }
  } catch (err) {
    console.error('Error al cargar settings.json:', err.message);
  }
  return { everyoneMentionEnabled: true };
}

function saveSettings(settings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('Error al guardar settings.json:', err.message);
  }
}

let botSettings = loadSettings();

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
  0: 'Offline 🔴',
  1: 'Online (Sitio Web) 🌐',
  2: 'En Juego 🎮',
  3: 'En Studio 🛠️'
};

const PresenceColors = {
  0: 0xE74C3C, // Rojo
  1: 0x3498DB, // Azul
  2: 0x2ECC71, // Verde
  3: 0xF39C12  // Naranja
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

// Generar Embed de respuesta
async function buildPresenceEmbed(robloxUser) {
  const data = await makeRobloxPostRequest('https://presence.roblox.com/v1/presence/users', {
    userIds: [parseInt(ROBLOX_USER_ID, 10)]
  });

  const presenceData = data?.userPresences?.[0];
  if (!presenceData) return null;

  const { userPresenceType, placeId, rootPlaceId, lastLocation } = presenceData;
  const currentRoot = rootPlaceId || placeId;
  const isPlaying = userPresenceType === 2;
  const gameUrl = currentRoot ? `https://www.roblox.com/games/${currentRoot}` : null;

  const statusText = PresenceTypes[userPresenceType] || 'Desconocido ❓';
  const embedColor = PresenceColors[userPresenceType] || 0x95A5A6;

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🔎 Estado en tiempo real: ${robloxUser.displayName}`)
    .setDescription(`Consulta realizada mediante el comando **/detected**.`)
    .addFields(
      { name: '👤 Usuario', value: `**${robloxUser.displayName}** (@${robloxUser.name})`, inline: true },
      { name: '📊 Estado actual', value: statusText, inline: true },
      { name: '📢 Mención @everyone', value: botSettings.everyoneMentionEnabled ? 'Activada 🟢 (/on)' : 'Desactivada 🔴 (/off)', inline: true },
      { name: '🎮 Juego actual', value: isPlaying ? (lastLocation || 'Juego Desconocido') : 'No está en juego', inline: false }
    );

  if (isPlaying && gameUrl) {
    embed.addFields({ name: '🔗 Enlace para unirte', value: `[Haz clic aquí para entrar al juego](${gameUrl})`, inline: false });
  }

  embed
    .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${ROBLOX_USER_ID}&width=150&height=150&format=png`)
    .setTimestamp()
    .setFooter({ text: 'Monitoreo de Roblox (Sin mención)', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

  return embed;
}

// Responder por Slash Command
async function handleDetectedSlashCommand(interaction, robloxUser) {
  try {
    await interaction.deferReply();
    const embed = await buildPresenceEmbed(robloxUser);

    if (!embed) {
      await interaction.editReply('No se pudieron obtener datos de presencia de Roblox en este momento.');
      return;
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error al ejecutar /detected por slash:', error.message);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('Ocurrió un error al consultar el estado de Roblox.');
    } else {
      await interaction.reply('Ocurrió un error al consultar el estado de Roblox.');
    }
  }
}

// Responder por mensaje directo de texto (/detected)
async function handleDetectedTextMessage(message, robloxUser) {
  try {
    const embed = await buildPresenceEmbed(robloxUser);
    if (!embed) {
      await message.channel.send('No se pudieron obtener datos de presencia de Roblox en este momento.');
      return;
    }
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error al ejecutar /detected por texto:', error.message);
    await message.channel.send('Ocurrió un error al consultar el estado de Roblox.');
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
      // 2. O si ya estaba en juego, pero cambió a un juego principal completamente diferente
      const startedPlaying = lastState.presenceType !== 2;
      const changedGame = lastState.presenceType === 2 && 
        universeId && lastState.universeId && 
        lastState.universeId !== universeId;

      if (startedPlaying || changedGame) {
        console.log(`¡Detectado cambio o inicio de juego! Mención @everyone: ${botSettings.everyoneMentionEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
        
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
          .setFooter({ 
            text: `Monitoreo de Roblox • ${botSettings.everyoneMentionEnabled ? '@everyone activo' : 'Modo silencioso (sin @everyone)'}`, 
            iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' 
          });

        if (botSettings.everyoneMentionEnabled) {
          await discordChannel.send({ 
            content: '@everyone', 
            embeds: [embed],
            allowedMentions: { parse: ['everyone'] }
          });
          console.log(`Notificación enviada con éxito al canal CON @everyone.`);
        } else {
          await discordChannel.send({ 
            embeds: [embed],
            allowedMentions: { parse: [] }
          });
          console.log(`Notificación enviada con éxito al canal SIN @everyone (modo silencioso).`);
        }
      } else {
        console.log(`ℹ️ [Filtro Antispam] ${robloxUser.displayName} sigue en el mismo juego ("${lastLocation}"). Ya fue notificado previamente, no se repite el aviso.`);
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
      
      // Si se mantiene fuera durante 2 consultas (1 minuto), reseteamos el estado oficial para detectar un nuevo reingreso
      if (lastState.offlineChecksCount >= 2 || lastState.presenceType === null) {
        if (lastState.presenceType === 2) {
          console.log(`Usuario salió del juego. Estado reseteado para permitir nueva notificación al reingresar.`);
        }
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

// Manejador para el comando de borrado de mensajes (/clear)
async function handleClearCommand(channel, amount) {
  if (!amount || amount < 1) {
    return { success: false, message: 'Debes especificar un número mayor a 0.' };
  }

  try {
    let toDelete = amount;
    let totalDeleted = 0;

    // Discord bulkDelete permite un máximo de 100 mensajes por llamada
    while (toDelete > 0) {
      const batchSize = Math.min(toDelete, 100);
      const deleted = await channel.bulkDelete(batchSize, true);
      totalDeleted += deleted.size;

      // Si no se borraron mensajes o menos del lote solicitado, no hay más mensajes recientes (<14 días)
      if (deleted.size < batchSize) {
        break;
      }
      toDelete -= batchSize;

      // Si aún quedan mensajes por borrar, esperamos 1 segundo para respetar los límites de la API de Discord
      if (toDelete > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (totalDeleted === 0) {
      return {
        success: true,
        count: 0,
        message: '⚠️ No se encontraron mensajes recientes (menores a 14 días) para borrar.'
      };
    }

    let extraNote = '';
    if (totalDeleted < amount) {
      extraNote = `\n*(Nota: No habían más mensajes en el canal o los restantes tienen más de 14 días de antigüedad, los cuales Discord no permite borrar en masa).*`;
    }

    return { 
      success: true, 
      count: totalDeleted,
      message: `🗑️ Se han borrado exitosamente **${totalDeleted}** de **${amount}** mensaje(s) solicitados.${extraNote}`
    };
  } catch (error) {
    console.error('Error al borrar mensajes:', error);
    if (error.code === 50013) {
      return { 
        success: false, 
        message: '❌ El bot no tiene el permiso **Gestionar Mensajes** activado en este canal o servidor en Discord.' 
      };
    }
    return { success: false, message: `❌ Error al intentar borrar los mensajes: ${error.message}` };
  }
}

// Manejador para activar o desactivar la mención @everyone (/on y /off)
function handleToggleNotifications(enable, robloxUser) {
  const userName = robloxUser ? robloxUser.displayName : `Usuario (${ROBLOX_USER_ID})`;
  const userTag = robloxUser ? `(@${robloxUser.name})` : '';

  if (enable) {
    if (botSettings.everyoneMentionEnabled) {
      const embed = new EmbedBuilder()
        .setColor(0x3498DB) // Azul
        .setTitle('ℹ️ Modo sin cambios: Ya estaba activado')
        .setDescription(`El bot ya está configurado para enviar alertas **CON mención @everyone** para **${userName}** ${userTag}.`)
        .setTimestamp();
      return { alreadyInState: true, embed };
    }

    botSettings.everyoneMentionEnabled = true;
    saveSettings(botSettings);
    console.log(`[Configuración] Modo cambiado: Mención @everyone activada (/on).`);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71) // Verde
      .setTitle('🔔 Modo Cambiado: Mención @everyone Activada')
      .setDescription(`✅ **Configuración actualizada con éxito.**\n\nAhora, cuando **${userName}** ${userTag} entre a un juego, el bot enviará la alerta **mencionando a @everyone**.`)
      .setTimestamp();
    return { alreadyInState: false, embed };
  } else {
    if (!botSettings.everyoneMentionEnabled) {
      const embed = new EmbedBuilder()
        .setColor(0x3498DB) // Azul
        .setTitle('ℹ️ Modo sin cambios: Ya estaba desactivado')
        .setDescription(`El bot ya está configurado para enviar alertas **SIN mención @everyone** para **${userName}** ${userTag}.`)
        .setTimestamp();
      return { alreadyInState: true, embed };
    }

    botSettings.everyoneMentionEnabled = false;
    saveSettings(botSettings);
    console.log(`[Configuración] Modo cambiado: Mención @everyone desactivada (/off).`);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C) // Rojo
      .setTitle('🔕 Modo Cambiado: Mención @everyone Desactivada')
      .setDescription(`✅ **Configuración actualizada con éxito.**\n\nAhora, cuando **${userName}** ${userTag} entre a un juego, **se seguirá enviando el mensaje con la tarjeta del juego y enlace**, pero **SIN mencionar a @everyone** (modo silencioso).`)
      .setTimestamp();
    return { alreadyInState: false, embed };
  }
}

// Escuchar interacciones (Slash Commands /detected, /clear, /on, /off)
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'detected') {
    try {
      await interaction.deferReply();
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const embed = await buildPresenceEmbed(cachedRobloxUser);
      if (!embed) {
        await interaction.editReply('No se pudieron obtener datos de presencia de Roblox en este momento.');
        return;
      }
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /detected por slash:', error.message);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Ocurrió un error al consultar el estado de Roblox.');
      } else {
        await interaction.reply({ content: 'Ocurrió un error al consultar el estado de Roblox.', ephemeral: true });
      }
    }
  } else if (interaction.commandName === 'clear') {
    const amount = interaction.options.getInteger('cantidad');
    await interaction.deferReply({ ephemeral: true });

    const result = await handleClearCommand(
      interaction.channel, 
      amount, 
      interaction.member
    );

    await interaction.editReply({ content: result.message });
  } else if (interaction.commandName === 'on') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleNotifications(true, cachedRobloxUser);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /on por slash:', error.message);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Ocurrió un error al activar las notificaciones.');
      } else {
        await interaction.reply({ content: 'Ocurrió un error al activar las notificaciones.', ephemeral: true });
      }
    }
  } else if (interaction.commandName === 'off') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleNotifications(false, cachedRobloxUser);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /off por slash:', error.message);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Ocurrió un error al desactivar las notificaciones.');
      } else {
        await interaction.reply({ content: 'Ocurrió un error al desactivar las notificaciones.', ephemeral: true });
      }
    }
  }
});

// Escuchar mensajes de texto directo (/detected y /clear)
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  if (content.toLowerCase() === '/detected' || content.toLowerCase() === '!detected') {
    if (!cachedRobloxUser) {
      cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
    }
    await handleDetectedTextMessage(message, cachedRobloxUser);
  } else if (/^[/!]clear\s+(\d+)$/i.test(content)) {
    const match = content.match(/^[/!]clear\s+(\d+)$/i);
    const amount = parseInt(match[1], 10);

    // Borrar el mensaje de invocación del comando primero si es posible
    await message.delete().catch(() => {});

    const result = await handleClearCommand(
      message.channel,
      amount,
      message.member
    );

    const replyMsg = await message.channel.send(result.message);
    // Eliminar automáticamente el mensaje de confirmación después de 4 segundos
    setTimeout(() => {
      replyMsg.delete().catch(() => {});
    }, 4000);
  } else if (content.toLowerCase() === '/on' || content.toLowerCase() === '!on') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleNotifications(true, cachedRobloxUser);
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /on por texto:', error.message);
      await message.channel.send('Ocurrió un error al activar las notificaciones.');
    }
  } else if (content.toLowerCase() === '/off' || content.toLowerCase() === '!off') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleNotifications(false, cachedRobloxUser);
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /off por texto:', error.message);
      await message.channel.send('Ocurrió un error al desactivar las notificaciones.');
    }
  }
});

client.on('error', (error) => {
  console.error('[DISCORD ERROR]', error);
});

client.on('warn', (warning) => {
  console.warn('[DISCORD WARN]', warning);
});

client.on('debug', (info) => {
  console.log('[DISCORD DEBUG]', info);
});

client.on('shardError', (error, shardId) => {
  console.error(`[DISCORD SHARD ERROR ${shardId}]`, error);
});

client.on('shardDisconnect', (event, shardId) => {
  console.warn(`[DISCORD SHARD DISCONNECT ${shardId}]`, event);
});

client.once('ready', async () => {
  console.log(`Bot conectado exitosamente como ${client.user.tag}`);

  // Configurar presencia activa en verde
  try {
    client.user.setPresence({
      status: 'online',
      activities: [{
        name: 'Roblox Presence 🟢',
        type: ActivityType.Watching
      }]
    });
  } catch (err) {
    console.error('Error al configurar presencia:', err.message);
  }
  
  const slashCommands = [
    {
      name: 'detected',
      description: 'Muestra el estado en tiempo real del usuario monitoreado de Roblox'
    },
    {
      name: 'clear',
      description: 'Borra una cantidad específica de mensajes en este canal',
      options: [
        {
          name: 'cantidad',
          description: 'Número de mensajes a borrar (de abajo hacia arriba)',
          type: 4, // INTEGER
          required: true,
          min_value: 1,
          max_value: 1000
        }
      ]
    },
    {
      name: 'on',
      description: 'Activa la mención @everyone en los mensajes cuando entra a jugar'
    },
    {
      name: 'off',
      description: 'Desactiva la mención @everyone (sigue enviando mensaje pero sin ping)'
    }
  ];

  // Registrar comandos slash tanto a nivel de servidor (inmediato para autocompletar) como global
  try {
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(slashCommands);
      console.log(`Comandos slash registrados inmediatamente en servidor: ${guild.name} (${guild.id})`);
    }
    await client.application.commands.set(slashCommands);
    console.log('Comandos slash sincronizados globalmente y en servidores.');
  } catch (err) {
    console.error('Error al sincronizar comandos slash:', err.message);
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

console.log('Conectando cliente a Discord Gateway con el token proporcionado...');
client.login(DISCORD_TOKEN)
  .then(() => {
    console.log('client.login promesa resuelta correctamente.');
  })
  .catch((err) => {
    console.error('ERROR CRÍTICO AL CONECTAR CON DISCORD:', err);
  });
