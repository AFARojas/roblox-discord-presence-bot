# Roblox Presence Discord Bot

This is a simple Discord bot that monitors a specific Roblox user's presence and sends a notification to a Discord channel when they join a game.

Created by 00JXPI.

---

## Features

- Monitors the Roblox presence API periodically.
- Supports cookie authentication (.ROBLOSECURITY) to monitor presence even when the target user's join privacy is restricted.
- Sends detailed messages with direct join links.
- Includes a native HTTP server to prevent sleep on free hosting platforms like Render.

---

## Prerequisites

- Node.js (version 16.9 or higher).
- A Discord bot token.
- A Discord channel ID.
- A Roblox user ID.
- (Optional) A Roblox session cookie (.ROBLOSECURITY) to track private presence.

---

## Setup Instructions

1. Clone or download this repository.
2. Create a `.env` file in the root directory and copy the variables from `.env.example`:
   ```env
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_CHANNEL_ID=your_discord_channel_id
   ROBLOX_USER_ID=target_roblox_user_id
   POLL_INTERVAL=30000
   ROBLOX_COOKIE=optional_roblox_cookie
   ```
3. Run `npm install` in your terminal to install dependencies.
4. Start the bot with `npm start`.



# Bot de Presencia de Roblox para Discord (Español)

Este es un bot de Discord sencillo que monitorea la presencia de un usuario de Roblox específico y envía una notificación a un canal de Discord cuando entra a un juego.

Creado por 00JXPI.

---

## Características

- Monitorea la API de presencia de Roblox periódicamente.
- Soporta autenticación por cookie (.ROBLOSECURITY) para monitorear perfiles incluso si su privacidad está restringida a amigos o privada.
- Envía mensajes detallados con enlaces directos para unirse.
- Incluye un servidor HTTP nativo para evitar la suspensión en plataformas de hosting gratuito como Render.

---

## Requisitos

- Node.js (versión 16.9 o superior).
- Un token de bot de Discord.
- Un ID de canal de Discord.
- Un ID de usuario de Roblox.
- (Opcional) Una cookie de sesión de Roblox (.ROBLOSECURITY).

---

## Instalación y Configuración

1. Clona o descarga este repositorio.
2. Crea un archivo `.env` en la carpeta raíz y copia las variables de `.env.example`:
   ```env
   DISCORD_TOKEN=tu_token_de_discord
   DISCORD_CHANNEL_ID=tu_id_de_canal
   ROBLOX_USER_ID=id_de_usuario_roblox
   POLL_INTERVAL=30000
   ROBLOX_COOKIE=tu_cookie_opcional
   ```
3. Ejecuta `npm install` en tu terminal para instalar las dependencias.
4. Inicia el bot con `npm start`.


