# Roblox Presence Discord Bot 🎮🤖

Este bot de Discord monitorea el estado de un usuario de Roblox específico y envía una notificación a un canal de Discord cuando dicho usuario entra a jugar a algún juego de Roblox.

---

## 🛠️ Requisitos Previos

1. **Node.js** instalado en tu computadora (Versión 16.9 o superior recomendada).
2. Una **cuenta de Discord** y permisos para agregar bots en un servidor.
3. Un **ID de usuario de Roblox** (puedes obtenerlo de la URL de su perfil, ej. `https://www.roblox.com/users/12345678/profile` -> el ID es `12345678`).

---

## 🚀 Guía de Configuración Paso a Paso

### 1. Crear el Bot en Discord Developer Portal
1. Ve al portal de desarrolladores de Discord: [Discord Developer Portal](https://discord.com/developers/applications).
2. Haz clic en **"New Application"** (Nueva Aplicación) y ponle un nombre (ej. `Roblox Tracker`).
3. Ve a la pestaña **"Bot"** en el menú de la izquierda y haz clic en **"Add Bot"** (Añadir Bot).
4. **Obtener el Token:**
   - Haz clic en **"Reset Token"** y copia el token generado. **¡Guárdalo bien!** Este será tu `DISCORD_TOKEN`.
5. **Configurar Intents:**
   - En la misma sección del Bot, desplázate hacia abajo hasta **"Privileged Gateway Intents"**.
   - Activa las siguientes opciones:
     - **Presence Intent**
     - **Server Members Intent**
     - **Message Content Intent** (opcional, pero recomendado).
   - Guarda los cambios.

### 2. Invitar el Bot a tu Servidor
1. Ve a la pestaña **"OAuth2"** -> **"URL Generator"** en el menú de la izquierda.
2. En la sección **"Scopes"**, selecciona la casilla **`bot`**.
3. En la sección **"Bot Permissions"**, selecciona las siguientes casillas:
   - `Send Messages` (Enviar Mensajes)
   - `Embed Links` (Insertar Enlaces)
   - `Read Message History` (Leer Historial de Mensajes)
4. Copia la URL generada al final de la página, pégala en tu navegador e invita al bot a tu servidor de Discord.

### 3. Obtener el ID del Canal de Discord
1. En Discord, ve a **Ajustes de Usuario** -> **Avanzado** y activa el **"Modo Desarrollador"**.
2. Ve al canal de texto donde quieres recibir los avisos, haz clic derecho sobre el canal y selecciona **"Copiar ID"**. Este será tu `DISCORD_CHANNEL_ID`.

---

## 💻 Instalación y Ejecución

1. Abre una terminal o consola en la carpeta de este proyecto (`C:\Users\Usuario\.gemini\antigravity-ide\scratch\roblox-discord-bot`).
2. Abre el archivo [`.env`](file:///C:/Users/Usuario/.gemini/antigravity-ide/scratch/roblox-discord-bot/.env) en tu editor y edita los valores con tu token, el ID del canal y el ID del usuario de Roblox:
   ```env
   DISCORD_TOKEN=tu_token_aqui
   DISCORD_CHANNEL_ID=tu_canal_id_aqui
   ROBLOX_USER_ID=tu_roblox_user_id_aqui
   POLL_INTERVAL=30000
   ```
3. Instala las dependencias necesarias ejecutando el siguiente comando:
   ```bash
   npm install
   ```
4. Inicia el bot:
   ```bash
   npm start
   ```

El bot se conectará y empezará a verificar cada 30 segundos si el usuario configurado está jugando. Cuando detecte que entró a un juego, enviará un mensaje elegante con los detalles del juego y el enlace para unirse directamente.
