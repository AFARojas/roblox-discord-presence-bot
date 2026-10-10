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
const url = require('url');

// Obtener la URL base pública del bot (Render u otro host)
function getBaseUrl() {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, '');
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '');
  return 'https://roblox-presence-ohio.onrender.com';
}

// Generador de interfaz web para redirección directa a la lobby/servidor de Roblox
function renderJoinHtml(placeId, gameId, gameName) {
  const safePlaceId = String(placeId || '').replace(/[^0-9]/g, '');
  const safeGameId = String(gameId || '').replace(/[^a-zA-Z0-9-]/g, '');
  const safeGameName = (gameName || 'Partida de Roblox').replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&#39;';
      default: return c;
    }
  });

  const protocolUrl = safeGameId 
    ? `roblox://experiences/start?placeId=${safePlaceId}&gameInstanceId=${safeGameId}`
    : `roblox://experiences/start?placeId=${safePlaceId}`;
  const webUrl = `https://www.roblox.com/games/${safePlaceId}` + (safeGameId ? `?serverJobId=${safeGameId}` : '');
  const consoleScript = safeGameId 
    ? `Roblox.GameLauncher.joinGameInstance(${safePlaceId}, "${safeGameId}")`
    : `Roblox.GameLauncher.joinGameInstance(${safePlaceId})`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unirse a ${safeGameName} | Roblox Direct Join</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(circle at 50% 20%, #1e1b4b 0%, #090d16 60%, #030712 100%);
      color: #f1f5f9;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: rgba(15, 23, 42, 0.78);
      border: 1px solid rgba(99, 102, 241, 0.3);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.15);
      border-radius: 24px;
      max-width: 520px;
      width: 100%;
      padding: 36px 32px;
      text-align: center;
      position: relative;
    }
    .badge-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(34, 197, 94, 0.15);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 20px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 10px #22c55e;
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      margin-bottom: 8px;
      color: #ffffff;
      line-height: 1.3;
    }
    p.subtitle {
      color: #94a3b8;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 14px 20px;
      border-radius: 14px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      margin-bottom: 12px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: #ffffff;
      box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 15px 25px -5px rgba(79, 70, 229, 0.6);
      background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%);
    }
    .btn-secondary {
      background: rgba(30, 41, 59, 0.7);
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
    .btn-secondary:hover {
      background: rgba(51, 65, 85, 0.8);
      color: #ffffff;
    }
    .info-box {
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.15);
      border-radius: 12px;
      padding: 12px 14px;
      margin-top: 18px;
      text-align: left;
    }
    .info-label {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .copy-btn {
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(99, 102, 241, 0.4);
      color: #a5b4fc;
      border-radius: 6px;
      font-size: 11px;
      padding: 2px 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      background: #6366f1;
      color: #ffffff;
    }
    .info-val {
      font-family: monospace;
      font-size: 12px;
      color: #cbd5e1;
      word-break: break-all;
    }
    details {
      margin-top: 18px;
      text-align: left;
      font-size: 13px;
      color: #94a3b8;
    }
    summary {
      cursor: pointer;
      font-weight: 500;
      color: #a5b4fc;
      user-select: none;
    }
    .code-snippet {
      background: #020617;
      border: 1px solid #1e293b;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 11px;
      color: #38bdf8;
      margin-top: 8px;
      word-break: break-all;
    }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #475569;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge-status">
      <div class="pulse-dot"></div>
      <span>Servidor Activo Detectado</span>
    </div>

    <h1>${safeGameName}</h1>
    <p class="subtitle">Conectando a la partida específica en Roblox...</p>

    <a href="${protocolUrl}" class="btn btn-primary" id="launchBtn">
      🚀 Abrir Servidor en Roblox
    </a>

    <a href="${webUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
      🌐 Abrir en roblox.com (Soporta BTRoblox / RoPro)
    </a>

    ${safeGameId ? `
    <div class="info-box">
      <div class="info-label">
        <span>JobId / ID del Servidor</span>
        <button class="copy-btn" onclick="copyText('${safeGameId}', this)">Copiar ID</button>
      </div>
      <div class="info-val">${safeGameId}</div>
    </div>
    ` : ''}

    <details>
      <summary>💡 ¿No se abre el juego en tu servidor?</summary>
      <div style="margin-top: 10px; line-height: 1.5;">
        <p>1. Asegúrate de tener la aplicación de <strong>Roblox</strong> instalada en tu equipo.</p>
        <p style="margin-top: 6px;">2. Si usas extensiones como <strong>BTRoblox</strong> o <strong>RoPro</strong>, haz clic en el botón web ("Abrir en roblox.com").</p>
        <p style="margin-top: 6px;">3. O pega este comando en la consola del navegador (F12) en la página del juego:</p>
        <div class="code-snippet" id="consoleCode">${consoleScript}</div>
        <button class="copy-btn" style="margin-top: 6px;" onclick="copyText(document.getElementById('consoleCode').innerText, this)">Copiar Comando</button>
      </div>
    </details>

    <div class="footer">
      Roblox Presence Bot • Conexión directa
    </div>
  </div>

  <script>
    function copyText(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        const orig = btn.innerText;
        btn.innerText = '¡Copiado! ✓';
        btn.style.background = '#22c55e';
        btn.style.color = '#fff';
        setTimeout(() => {
          btn.innerText = orig;
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
      });
    }

    // Intento de apertura automática del protocolo de Roblox tras 600ms
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.location.href = "${protocolUrl}";
      }, 600);
    });
  </script>
</body>
</html>`;
}

// Servidor HTTP simple para mantener vivo el bot en Render/Glitch y gestionar uniones directas
const PORT = process.env.PORT || 3000;
http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/join') {
    const { placeId, gameId, jobId, gameName } = parsedUrl.query;
    if (!placeId) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h1>Error 400: Falta el parámetro placeId</h1>');
    }
    const html = renderJoinHtml(placeId, gameId || jobId, gameName);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  if (parsedUrl.pathname === '/diag') {
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

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Roblox Discord presence bot is active!\n');
}).listen(PORT, () => {
  console.log(`Servidor HTTP de mantenimiento y redirección iniciado en el puerto ${PORT}`);
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
      return {
        everyoneMentionEnabled: typeof data.everyoneMentionEnabled === 'boolean' 
          ? data.everyoneMentionEnabled 
          : (typeof data.notificationsEnabled === 'boolean' ? data.notificationsEnabled : true),
        autoUnfriend: typeof data.autoUnfriend === 'boolean' ? data.autoUnfriend : false
      };
    }
  } catch (err) {
    console.error('Error al cargar settings.json:', err.message);
  }
  return { everyoneMentionEnabled: true, autoUnfriend: false };
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
  gameId: null,
  offlineChecksCount: 0,
  friendsInServer: new Set() // IDs de amigos que están en la partida actualmente
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

// Mapa de amigos cacheados: ID -> { id, name, displayName }
let cachedFriendsMap = new Map();
let lastFriendsFetchTime = 0;
const FRIENDS_REFRESH_INTERVAL = 10 * 60 * 1000; // Refrescar lista de amigos cada 10 minutos

// Función para obtener y cachear la lista de amigos del usuario monitoreado
async function getRobloxUserFriends(userId, forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedFriendsMap.size > 0 && (now - lastFriendsFetchTime < FRIENDS_REFRESH_INTERVAL)) {
    return cachedFriendsMap;
  }

  try {
    const headers = {};
    if (ROBLOX_COOKIE) {
      headers['Cookie'] = `.ROBLOSECURITY=${ROBLOX_COOKIE}`;
    }
    const res = await axios.get(`https://friends.roblox.com/v1/users/${userId}/friends`, { headers });
    const friendIds = (res.data?.data || []).map(f => f.id);

    if (friendIds.length === 0) {
      cachedFriendsMap.clear();
      lastFriendsFetchTime = now;
      return cachedFriendsMap;
    }

    // Obtener detalles de los amigos (name y displayName) en bloques de hasta 100
    const newMap = new Map();
    for (let i = 0; i < friendIds.length; i += 100) {
      const chunk = friendIds.slice(i, i + 100);
      try {
        const usersRes = await axios.post('https://users.roblox.com/v1/users', { userIds: chunk }, { headers });
        (usersRes.data?.data || []).forEach(u => newMap.set(u.id, u));
      } catch (e) {
        console.error('Error al obtener detalles de amigos en lote:', e.message);
        chunk.forEach(id => newMap.set(id, { id, name: `Usuario_${id}`, displayName: `Usuario ${id}` }));
      }
    }

    cachedFriendsMap = newMap;
    lastFriendsFetchTime = now;
    console.log(`[Amigos] Lista de amigos actualizada: ${cachedFriendsMap.size} amigo(s) monitoreado(s).`);
  } catch (err) {
    console.error('Error al consultar lista de amigos de Roblox:', err.message);
  }

  return cachedFriendsMap;
}

// Función para eliminar a un amigo de Roblox (unfriend)
async function unfriendRobloxUser(friendId) {
  try {
    await makeRobloxPostRequest(`https://friends.roblox.com/v1/users/${friendId}/unfriend`, {});
    console.log(`[Auto-Unfriend] Amigo ${friendId} eliminado exitosamente de la cuenta.`);
    return { success: true };
  } catch (error) {
    console.error(`[Auto-Unfriend] Error al eliminar amigo ${friendId}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Variables de estado para el monitoreo de nuevos amigos
let initialFriendsBaselineLoaded = false;
let knownFriendIdsSet = new Set();

// Función para monitorear altas/bajas de amigos y aplicar auto-eliminación si /noamigos está activo
async function checkFriendsChanges(discordChannel, robloxUser) {
  try {
    const headers = {};
    if (ROBLOX_COOKIE) {
      headers['Cookie'] = `.ROBLOSECURITY=${ROBLOX_COOKIE}`;
    }
    const res = await axios.get(`https://friends.roblox.com/v1/users/${ROBLOX_USER_ID}/friends`, { headers, timeout: 10000 });
    const currentFriendIds = (res.data?.data || []).map(f => f.id);

    // Inicializar lista base al arrancar el bot (sin emitir alertas por amigos preexistentes)
    if (!initialFriendsBaselineLoaded) {
      knownFriendIdsSet = new Set(currentFriendIds);
      initialFriendsBaselineLoaded = true;
      console.log(`[Control de Amigos] Lista base de amigos cargada: ${knownFriendIdsSet.size} amigos iniciales.`);
      return;
    }

    // Detectar amigos nuevos que no estaban en la lista conocida
    const addedFriendIds = currentFriendIds.filter(id => !knownFriendIdsSet.has(id));

    // Sincronizar amigos que hayan sido eliminados manualmente o por el bot
    for (const oldId of knownFriendIdsSet) {
      if (!currentFriendIds.includes(oldId)) {
        knownFriendIdsSet.delete(oldId);
        cachedFriendsMap.delete(oldId);
        console.log(`[Control de Amigos] Amigo ${oldId} eliminado o ya no forma parte de la lista.`);
      }
    }

    if (addedFriendIds.length === 0) return;

    for (const newId of addedFriendIds) {
      const friendInfo = await getRobloxUserInfo(newId);
      const profileUrl = `https://www.roblox.com/users/${newId}/profile`;
      const avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${newId}&width=150&height=150&format=png`;

      if (botSettings.autoUnfriend) {
        // MODO /noamigos: Eliminar automáticamente de Roblox al instante
        console.log(`[Auto-Unfriend] ¡Detectado nuevo amigo (${friendInfo.displayName} / ${newId})! Procediendo a eliminarlo automáticamente...`);
        const unfriendResult = await unfriendRobloxUser(newId);

        const alertEmbed = new EmbedBuilder()
          .setColor(0xE74C3C) // Rojo
          .setTitle('🛡️ ¡Nuevo amigo agregado y eliminado automáticamente!')
          .setDescription(`**${robloxUser.displayName}** (@${robloxUser.name}) agregó a un nuevo amigo, pero **fue eliminado al instante de su cuenta de Roblox** porque el modo **/noamigos** está activo.`)
          .addFields(
            { name: '👤 Amigo detectado', value: `**${friendInfo.displayName}** (@${friendInfo.name})`, inline: true },
            { name: '🆔 ID de Usuario', value: `\`${newId}\``, inline: true },
            { name: '⚙️ Acción ejecutada', value: unfriendResult.success ? '✅ Amistad eliminada de Roblox exitosamente' : `⚠️ Error al eliminar: ${unfriendResult.error}`, inline: false },
            { name: '🔗 Perfil de Roblox', value: `[Ver perfil en Roblox](${profileUrl})`, inline: false }
          )
          .setThumbnail(avatarUrl)
          .setTimestamp()
          .setFooter({ 
            text: 'Control de Amigos (/noamigos activado) • Roblox Presence', 
            iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' 
          });

        await discordChannel.send({ embeds: [alertEmbed] });

        // Lo quitamos también del cache
        cachedFriendsMap.delete(newId);
      } else {
        // MODO /siamigos: Permitir y enviar notificación
        console.log(`[Amigos] ¡Detectado nuevo amigo (${friendInfo.displayName} / ${newId})! Modo permitido (/siamigos). Notificando...`);
        knownFriendIdsSet.add(newId);
        cachedFriendsMap.set(newId, friendInfo);

        const notifyEmbed = new EmbedBuilder()
          .setColor(0x2ECC71) // Verde
          .setTitle('➕ ¡Nuevo amigo agregado a la cuenta!')
          .setDescription(`**${robloxUser.displayName}** (@${robloxUser.name}) acaba de agregar a un nuevo amigo en Roblox.`)
          .addFields(
            { name: '👤 Nuevo amigo', value: `**${friendInfo.displayName}** (@${friendInfo.name})`, inline: true },
            { name: '🆔 ID de Usuario', value: `\`${newId}\``, inline: true },
            { name: '⚙️ Estado', value: '✅ Amistad permitida (Modo `/siamigos` activo)', inline: false },
            { name: '🔗 Perfil de Roblox', value: `[Ver perfil en Roblox](${profileUrl})`, inline: false }
          )
          .setThumbnail(avatarUrl)
          .setTimestamp()
          .setFooter({ 
            text: 'Notificación de Amigos (/siamigos) • Roblox Presence', 
            iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' 
          });

        await discordChannel.send({ embeds: [notifyEmbed] });
      }
    }
  } catch (error) {
    console.error('Error al verificar cambios en la lista de amigos:', error.message);
  }
}

// Función para determinar qué amigos están en la misma partida / servidor
function findFriendsInSameGame(targetPresence, allPresences, friendsMap) {
  if (!targetPresence || targetPresence.userPresenceType !== 2) return [];

  const targetPlace = targetPresence.rootPlaceId || targetPresence.placeId;
  const targetGameId = targetPresence.gameId;
  const targetUniverse = targetPresence.universeId;

  const friendsPlaying = [];

  for (const p of allPresences) {
    if (String(p.userId) === String(targetPresence.userId)) continue;
    if (p.userPresenceType !== 2) continue;

    const friendPlace = p.rootPlaceId || p.placeId;
    const friendGameId = p.gameId;
    const friendUniverse = p.universeId;

    const sameServer = Boolean(targetGameId && friendGameId && targetGameId === friendGameId);
    const sameGame = Boolean((targetPlace && friendPlace && targetPlace === friendPlace) || (targetUniverse && friendUniverse && targetUniverse === friendUniverse));

    // Si coincide el JobId/servidor exacto o coinciden en el juego
    if (sameServer || (sameGame && !targetGameId)) {
      const friendInfo = friendsMap.get(p.userId) || { id: p.userId, name: `Usuario_${p.userId}`, displayName: `Amigo ${p.userId}` };
      friendsPlaying.push({
        friend: friendInfo,
        exactServer: sameServer,
        presence: p
      });
    }
  }

  return friendsPlaying;
}

// Generar Embed de respuesta
async function buildPresenceEmbed(robloxUser) {
  const friendsMap = await getRobloxUserFriends(ROBLOX_USER_ID);
  const friendIds = Array.from(friendsMap.keys()).map(id => parseInt(id, 10));
  const userIdsToQuery = [parseInt(ROBLOX_USER_ID, 10), ...friendIds];

  const data = await makeRobloxPostRequest('https://presence.roblox.com/v1/presence/users', {
    userIds: userIdsToQuery
  });

  const presences = data?.userPresences || [];
  const presenceData = presences.find(p => String(p.userId) === String(ROBLOX_USER_ID));
  if (!presenceData) return null;

  const { userPresenceType, placeId, rootPlaceId, lastLocation, gameId } = presenceData;
  const currentRoot = rootPlaceId || placeId;
  const isPlaying = userPresenceType === 2;
  const baseUrl = getBaseUrl();
  const gameUrl = currentRoot ? `https://www.roblox.com/games/${currentRoot}` : null;
  const directJoinUrl = currentRoot 
    ? `${baseUrl}/join?placeId=${currentRoot}` + (gameId ? `&gameId=${encodeURIComponent(gameId)}` : '') + (lastLocation ? `&gameName=${encodeURIComponent(lastLocation)}` : '')
    : null;

  const statusText = PresenceTypes[userPresenceType] || 'Desconocido ❓';
  const embedColor = PresenceColors[userPresenceType] || 0x95A5A6;

  // Analizar amigos presentes
  const friendsInServer = isPlaying ? findFriendsInSameGame(presenceData, presences, friendsMap) : [];
  let friendsFieldText = 'No está en juego';
  if (isPlaying) {
    if (friendsInServer.length > 0) {
      friendsFieldText = friendsInServer.map(f => `• **${f.friend.displayName}** (@${f.friend.name})` + (f.exactServer ? ' 🟢 *(Mismo servidor)*' : ' *(Mismo juego)*')).join('\n');
    } else {
      friendsFieldText = '🎮 **Jugando en solitario** *(Sin amigos en su servidor)*';
    }
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`🔎 Estado en tiempo real: ${robloxUser.displayName}`)
    .setDescription(`Consulta realizada mediante el comando **/detected**.`)
    .addFields(
      { name: '👤 Usuario', value: `**${robloxUser.displayName}** (@${robloxUser.name})`, inline: true },
      { name: '📊 Estado actual', value: statusText, inline: true },
      { name: '📢 Mención @everyone', value: botSettings.everyoneMentionEnabled ? 'Activada 🟢 (/on)' : 'Desactivada 🔴 (/off)', inline: true },
      { name: '🛡️ Control de Amigos', value: botSettings.autoUnfriend ? 'Bloqueo activo 🔴 (/noamigos)' : 'Permitidos 🟢 (/siamigos)', inline: true },
      { name: '🎮 Juego actual', value: isPlaying ? (lastLocation || 'Juego Desconocido') : 'No está en juego', inline: false }
    );

  if (isPlaying) {
    embed.addFields({ name: '👥 Jugando con amigos', value: friendsFieldText, inline: false });
  }

  if (isPlaying && directJoinUrl) {
    let joinValue = `[🚀 Unirse a esta lobby / servidor](${directJoinUrl})\n[🌐 Ver página en Roblox.com](${gameUrl})`;
    if (gameId) {
      joinValue += `\n🆔 **JobId:** \`${gameId}\``;
    }
    embed.addFields({ name: '🔗 Enlaces para unirte', value: joinValue, inline: false });
  }

  embed
    .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${ROBLOX_USER_ID}&width=150&height=150&format=png`)
    .setTimestamp()
    .setFooter({ text: 'Monitoreo de Roblox • Detección de Amigos', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

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

// Función para verificar el estado de la cookie de Roblox
async function verifyRobloxCookie() {
  const currentCookie = process.env.ROBLOX_COOKIE || ROBLOX_COOKIE;
  if (!currentCookie) {
    return {
      valid: false,
      reason: 'No hay ninguna cookie configurada en la variable ROBLOX_COOKIE.'
    };
  }

  try {
    const response = await axios.get('https://users.roblox.com/v1/users/authenticated', {
      headers: {
        'Cookie': `.ROBLOSECURITY=${currentCookie};`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data && response.data.id) {
      return {
        valid: true,
        user: response.data // { id, name, displayName }
      };
    }

    return {
      valid: false,
      reason: 'Respuesta inesperada al validar con Roblox.'
    };
  } catch (error) {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      return {
        valid: false,
        status: error.response.status,
        reason: 'Cookie expirada, revocada o sesión invalidada (Error 401/403).'
      };
    }
    return {
      valid: false,
      status: error.response?.status,
      reason: error.message || 'Error de conexión con los servidores de Roblox.'
    };
  }
}

// Construir Embed para el estado de la cookie (/cookie)
async function buildCookieEmbed() {
  const result = await verifyRobloxCookie();

  if (result.valid) {
    const isTargetUser = String(result.user.id) === String(ROBLOX_USER_ID);
    const embed = new EmbedBuilder()
      .setColor(0x2ECC71) // Verde
      .setTitle('🍪 Estado de la Cookie: Operativa 🟢')
      .setDescription('La cookie de autenticación de Roblox **está activa y funcionando correctamente**.')
      .addFields(
        { name: '👤 Cuenta autenticada', value: `**${result.user.displayName}** (@${result.user.name})`, inline: true },
        { name: '🆔 ID de Usuario', value: `\`${result.user.id}\``, inline: true },
        { name: '🎯 Vinculación objetivo', value: isTargetUser ? '✅ Coincide con la cuenta monitoreada' : `⚠️ Monitoreando a ID \`${ROBLOX_USER_ID}\``, inline: false },
        { name: '⏰ Auto-chequeo (12h)', value: 'Verificación automática cada 12 horas activa (solo emitirá alerta si deja de funcionar).', inline: false }
      )
      .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${result.user.id}&width=150&height=150&format=png`)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Autenticación • Roblox Presence', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

    return { valid: true, embed };
  } else {
    const embed = new EmbedBuilder()
      .setColor(0xE74C3C) // Rojo
      .setTitle('🍪 Estado de la Cookie: NO Operativa 🔴')
      .setDescription('⚠️ **La cookie de Roblox actual no está funcionando o ha expirado.**')
      .addFields(
        { name: '❌ Causa / Diagnóstico', value: result.reason || 'No autorizada / sesión caducada', inline: false },
        { name: '🛠️ Solución', value: 'Debes obtener una nueva cookie `.ROBLOSECURITY` desde el navegador y actualizar la variable `ROBLOX_COOKIE` en Render.', inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Sistema de Autenticación • Roblox Presence', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

    return { valid: false, embed };
  }
}

// Responder por Slash Command (/cookie)
async function handleCookieSlashCommand(interaction) {
  try {
    await interaction.deferReply();
    const { embed } = await buildCookieEmbed();
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error al ejecutar /cookie por slash:', error.message);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply('Ocurrió un error al verificar la cookie de Roblox.');
    } else {
      await interaction.reply({ content: 'Ocurrió un error al verificar la cookie de Roblox.', ephemeral: true });
    }
  }
}

// Responder por mensaje de texto directo (/cookie)
async function handleCookieTextMessage(message) {
  try {
    const { embed } = await buildCookieEmbed();
    await message.channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error al ejecutar /cookie por texto:', error.message);
    await message.channel.send('Ocurrió un error al verificar la cookie de Roblox.');
  }
}

// Verificación automática de la cookie cada 12 horas (solo avisa si NO funciona)
const COOKIE_CHECK_INTERVAL = 12 * 60 * 60 * 1000; // 12 horas

async function checkCookiePeriodic(channel) {
  console.log(`[${new Date().toLocaleTimeString()}] Ejecutando verificación periódica de cookie de Roblox (cada 12h)...`);
  const result = await verifyRobloxCookie();

  if (result.valid) {
    console.log(`[Cookie Check 12h] Cookie operativa para ${result.user.name} (${result.user.id}). No se envía mensaje a Discord.`);
  } else {
    console.warn(`[Cookie Check 12h] ¡ALERTA! La cookie de Roblox ha dejado de funcionar: ${result.reason}`);
    
    const alertEmbed = new EmbedBuilder()
      .setColor(0xE74C3C) // Rojo
      .setTitle('🚨 ALERTA: La cookie de Roblox ha dejado de funcionar')
      .setDescription('La verificación automática periódica (cada 12h) detectó que **la cookie de sesión de Roblox ha expirado o ya no es válida**.')
      .addFields(
        { name: '❌ Motivo', value: result.reason || 'Sesión no autorizada', inline: false },
        { name: '⚠️ Impacto en el Bot', value: 'El bot no podrá consultar la presencia autenticada ni datos privados hasta que la cookie sea renovada.', inline: false },
        { name: '🛠️ Instrucción de renovación', value: 'Inicia sesión en Roblox, extrae la nueva cookie `.ROBLOSECURITY` y actualízala en el panel o variables de Render (`ROBLOX_COOKIE`).', inline: false }
      )
      .setTimestamp()
      .setFooter({ text: 'Verificación Automática de Salud (12h) • Roblox Presence', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });

    try {
      await channel.send({
        content: '@everyone ⚠️ **Atención:** La cookie de Roblox configurada ha expirado o dejado de funcionar.',
        embeds: [alertEmbed],
        allowedMentions: { parse: ['everyone'] }
      });
      console.log('Alerta de cookie expirada enviada al canal de Discord.');
    } catch (err) {
      console.error('Error al enviar alerta de cookie a Discord:', err.message);
    }
  }
}

// Función principal de monitoreo
async function checkRobloxPresence(discordChannel, robloxUser) {
  try {
    // Verificar cambios en amigos (altas/bajas y auto-unfriend si /noamigos está activo)
    await checkFriendsChanges(discordChannel, robloxUser);

    const friendsMap = await getRobloxUserFriends(ROBLOX_USER_ID);
    const friendIds = Array.from(friendsMap.keys()).map(id => parseInt(id, 10));
    const userIdsToQuery = [parseInt(ROBLOX_USER_ID, 10), ...friendIds];

    const data = await makeRobloxPostRequest('https://presence.roblox.com/v1/presence/users', {
      userIds: userIdsToQuery
    });

    const presences = data?.userPresences || [];
    const presenceData = presences.find(p => String(p.userId) === String(ROBLOX_USER_ID));
    if (!presenceData) {
      console.log('No se recibieron datos de presencia de Roblox.');
      return;
    }

    const { userPresenceType, placeId, rootPlaceId, lastLocation, universeId, gameId } = presenceData;
    const currentRoot = rootPlaceId || placeId;
    
    // Buscar amigos en el mismo servidor en esta consulta
    const friendsInServer = userPresenceType === 2 ? findFriendsInSameGame(presenceData, presences, friendsMap) : [];
    const currentFriendIds = new Set(friendsInServer.map(f => f.friend.id));

    console.log(`[${new Date().toLocaleTimeString()}] Estado de ${robloxUser.displayName}: ${PresenceTypes[userPresenceType] || 'Desconocido'}` + 
      (userPresenceType === 2 ? ` en "${lastLocation}" (ID: ${placeId}, Root ID: ${currentRoot}, Universe: ${universeId})` : '') +
      (friendsInServer.length > 0 ? ` [Con ${friendsInServer.length} amigo(s): ${friendsInServer.map(f => f.friend.displayName).join(', ')}]` : ''));

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
        
        const baseUrl = getBaseUrl();
        const gameUrl = `https://www.roblox.com/games/${currentRoot}`;
        const directJoinUrl = `${baseUrl}/join?placeId=${currentRoot}` + (gameId ? `&gameId=${encodeURIComponent(gameId)}` : '') + (lastLocation ? `&gameName=${encodeURIComponent(lastLocation)}` : '');
        
        let joinValue = `[🚀 Unirse a esta lobby / servidor](${directJoinUrl})\n[🌐 Ver página en Roblox.com](${gameUrl})`;
        if (gameId) {
          joinValue += `\n🆔 **JobId:** \`${gameId}\``;
        }

        let friendsPlayingText = 'Jugando en solitario *(Sin amigos detectados)*';
        if (friendsInServer.length > 0) {
          friendsPlayingText = friendsInServer.map(f => `• **${f.friend.displayName}** (@${f.friend.name})` + (f.exactServer ? ' 🟢 *(Mismo servidor)*' : ' *(Mismo juego)*')).join('\n');
        }

        const embed = new EmbedBuilder()
          .setColor(0x00FF00) // Verde
          .setTitle(`¡${robloxUser.displayName} está jugando a algo!`)
          .setDescription(`**${robloxUser.displayName}** (@${robloxUser.name}) acaba de entrar a un juego.`)
          .addFields(
            { name: '🎮 Juego', value: lastLocation || 'Juego Desconocido', inline: true },
            { name: '👥 Amigos en la partida', value: friendsPlayingText, inline: false },
            { name: '🔗 Enlaces para unirte', value: joinValue, inline: false }
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

        // Guardamos los amigos que estaban al inicio
        lastState.friendsInServer = currentFriendIds;
      } else {
        // El usuario ya estaba en el juego: Detectar si un amigo se unió a su servidor
        const newlyJoined = friendsInServer.filter(f => !lastState.friendsInServer.has(f.friend.id));

        if (newlyJoined.length > 0) {
          for (const item of newlyJoined) {
            console.log(`¡Amigo detectado uniéndose al servidor de ${robloxUser.displayName}! -> ${item.friend.displayName} (@${item.friend.name})`);
            const baseUrl = getBaseUrl();
            const gameUrl = `https://www.roblox.com/games/${currentRoot}`;
            const directJoinUrl = `${baseUrl}/join?placeId=${currentRoot}` + (gameId ? `&gameId=${encodeURIComponent(gameId)}` : '') + (lastLocation ? `&gameName=${encodeURIComponent(lastLocation)}` : '');
            
            let friendJoinValue = `[🚀 Unirse a su servidor](${directJoinUrl})\n[🌐 Ver página en Roblox.com](${gameUrl})`;
            if (gameId) {
              friendJoinValue += `\n🆔 **JobId:** \`${gameId}\``;
            }

            const friendJoinEmbed = new EmbedBuilder()
              .setColor(0x9B59B6) // Morado / Púrpura elegante
              .setTitle(`👥 ¡Un amigo se ha unido a su servidor!`)
              .setDescription(`**${item.friend.displayName}** (@${item.friend.name}) se acaba de unir al servidor de **${robloxUser.displayName}**.`)
              .addFields(
                { name: '🎮 Juego', value: lastLocation || 'Juego Desconocido', inline: true },
                { name: '👤 Amigo que se unió', value: `**${item.friend.displayName}** (@${item.friend.name})`, inline: true },
                { name: '🔗 Enlaces para entrar', value: friendJoinValue, inline: false }
              )
              .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${item.friend.id}&width=150&height=150&format=png`)
              .setTimestamp()
              .setFooter({ 
                text: 'Detección de Amigos • Roblox Presence', 
                iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' 
              });

            await discordChannel.send({
              embeds: [friendJoinEmbed],
              allowedMentions: { parse: [] }
            });
            console.log(`Alerta de amigo unido enviada a Discord para ${item.friend.displayName}.`);
          }

          // Actualizamos la lista de amigos presentes en el servidor
          lastState.friendsInServer = currentFriendIds;
        } else {
          // Si algún amigo salió, actualizamos el set sin spamear
          lastState.friendsInServer = currentFriendIds;
          console.log(`ℹ️ [Filtro Antispam] ${robloxUser.displayName} sigue en el mismo juego ("${lastLocation}"). Ya fue notificado previamente, no se repite el aviso.`);
        }
      }

      // Reiniciar contador de desconexión porque está en juego
      lastState.presenceType = 2;
      lastState.placeId = placeId;
      lastState.rootPlaceId = currentRoot;
      lastState.universeId = universeId;
      lastState.gameId = gameId;
      lastState.offlineChecksCount = 0;
    } else {
      // El usuario no está en juego. Incrementamos el contador de desconexión.
      lastState.offlineChecksCount += 1;
      lastState.friendsInServer.clear();
      
      // Si se mantiene fuera durante 2 consultas (1 minuto), reseteamos el estado oficial para detectar un nuevo reingreso
      if (lastState.offlineChecksCount >= 2 || lastState.presenceType === null) {
        if (lastState.presenceType === 2) {
          console.log(`Usuario salió del juego. Estado reseteado para permitir nueva notificación al reingresar.`);
        }
        lastState.presenceType = userPresenceType;
        lastState.placeId = null;
        lastState.rootPlaceId = null;
        lastState.universeId = null;
        lastState.gameId = null;
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

// Manejador para activar o desactivar el auto-eliminado de amigos (/noamigos y /siamigos)
function handleToggleAutoUnfriend(enableAutoUnfriend, robloxUser) {
  const userName = robloxUser ? robloxUser.displayName : `Usuario (${ROBLOX_USER_ID})`;
  const userTag = robloxUser ? `(@${robloxUser.name})` : '';

  if (enableAutoUnfriend) {
    if (botSettings.autoUnfriend) {
      const embed = new EmbedBuilder()
        .setColor(0x3498DB) // Azul
        .setTitle('ℹ️ Modo sin cambios: Ya estaba activado')
        .setDescription(`El modo **/noamigos** ya está activado para **${userName}** ${userTag}. Cualquier amigo nuevo que agregue será eliminado automáticamente de Roblox.`)
        .setTimestamp();
      return { embed };
    }

    botSettings.autoUnfriend = true;
    saveSettings(botSettings);
    console.log(`[Configuración] Modo cambiado: Auto-eliminación de amigos ACTIVADA (/noamigos).`);

    const embed = new EmbedBuilder()
      .setColor(0xE74C3C) // Rojo
      .setTitle('🛡️ Modo Bloqueo de Amigos: ACTIVADO (/noamigos)')
      .setDescription(`✅ **Configuración actualizada con éxito.**\n\nA partir de ahora, cada vez que **${userName}** ${userTag} agregue a un nuevo amigo en Roblox:\n\n1. ❌ El bot **lo eliminará automáticamente de su cuenta de Roblox al instante**.\n2. 🚨 Se enviará una alerta aquí con el nombre, ID y perfil del usuario eliminado.`)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Seguridad de Amigos • Roblox Presence', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });
    return { embed };
  } else {
    if (!botSettings.autoUnfriend) {
      const embed = new EmbedBuilder()
        .setColor(0x3498DB) // Azul
        .setTitle('ℹ️ Modo sin cambios: Ya estaba activado')
        .setDescription(`El modo **/siamigos** ya está activado para **${userName}** ${userTag}. Los nuevos amigos son permitidos y se notifican en Discord.`)
        .setTimestamp();
      return { embed };
    }

    botSettings.autoUnfriend = false;
    saveSettings(botSettings);
    console.log(`[Configuración] Modo cambiado: Permitir amigos ACTIVADO (/siamigos).`);

    const embed = new EmbedBuilder()
      .setColor(0x2ECC71) // Verde
      .setTitle('🤝 Modo Permitir Amigos: ACTIVADO (/siamigos)')
      .setDescription(`✅ **Configuración actualizada con éxito.**\n\nA partir de ahora, los nuevos amigos **serán permitidos con normalidad** en la cuenta de **${userName}** ${userTag}.\n\nCada vez que agregue a un amigo, el bot **enviará una notificación aquí** con sus datos y enlace al perfil.`)
      .setTimestamp()
      .setFooter({ text: 'Sistema de Seguridad de Amigos • Roblox Presence', iconURL: 'https://images.rbxcdn.com/264b971e44cc076f7b3a7b9319853c07.png' });
    return { embed };
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
  } else if (interaction.commandName === 'cookie') {
    await handleCookieSlashCommand(interaction);
  } else if (interaction.commandName === 'noamigos') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleAutoUnfriend(true, cachedRobloxUser);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /noamigos por slash:', error.message);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Ocurrió un error al activar el modo /noamigos.');
      } else {
        await interaction.reply({ content: 'Ocurrió un error al activar el modo /noamigos.', ephemeral: true });
      }
    }
  } else if (interaction.commandName === 'siamigos') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleAutoUnfriend(false, cachedRobloxUser);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /siamigos por slash:', error.message);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('Ocurrió un error al activar el modo /siamigos.');
      } else {
        await interaction.reply({ content: 'Ocurrió un error al activar el modo /siamigos.', ephemeral: true });
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
  } else if (content.toLowerCase() === '/cookie' || content.toLowerCase() === '!cookie') {
    await handleCookieTextMessage(message);
  } else if (content.toLowerCase() === '/noamigos' || content.toLowerCase() === '!noamigos') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleAutoUnfriend(true, cachedRobloxUser);
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /noamigos por texto:', error.message);
      await message.channel.send('Ocurrió un error al activar el modo /noamigos.');
    }
  } else if (content.toLowerCase() === '/siamigos' || content.toLowerCase() === '!siamigos') {
    try {
      if (!cachedRobloxUser) {
        cachedRobloxUser = await getRobloxUserInfo(ROBLOX_USER_ID);
      }
      const { embed } = handleToggleAutoUnfriend(false, cachedRobloxUser);
      await message.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error('Error al ejecutar /siamigos por texto:', error.message);
      await message.channel.send('Ocurrió un error al activar el modo /siamigos.');
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
    },
    {
      name: 'cookie',
      description: 'Verifica si la cookie de autenticación de Roblox sigue operativa'
    },
    {
      name: 'noamigos',
      description: 'Activa el borrado automático de cualquier nuevo amigo que agregue la cuenta'
    },
    {
      name: 'siamigos',
      description: 'Permite nuevos amigos y activa alertas cada vez que agregue a alguien'
    }
  ];

  // Sincronizar comandos tanto a nivel de servidor (aparición inmediata) como global
  try {
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.set(slashCommands);
    }
    await client.application.commands.set(slashCommands);
    console.log('Comandos slash sincronizados exitosamente en servidores y de forma global.');
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

  // Cargar lista inicial de amigos
  console.log(`Cargando lista inicial de amigos de Roblox...`);
  await getRobloxUserFriends(ROBLOX_USER_ID, true);

  // Ejecutar inmediatamente al iniciar y luego configurar intervalo
  checkRobloxPresence(channel, cachedRobloxUser);
  setInterval(() => checkRobloxPresence(channel, cachedRobloxUser), POLL_INTERVAL);

  // Verificación periódica de la cookie cada 12 horas (solo avisa si deja de funcionar)
  setInterval(() => checkCookiePeriodic(channel), COOKIE_CHECK_INTERVAL);
});

console.log('Conectando cliente a Discord Gateway con el token proporcionado...');
client.login(DISCORD_TOKEN)
  .then(() => {
    console.log('client.login promesa resuelta correctamente.');
  })
  .catch((err) => {
    console.error('ERROR CRÍTICO AL CONECTAR CON DISCORD:', err);
  });
