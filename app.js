import { makeWASocket } from "@whiskeysockets/baileys";
import {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import chalk from "chalk";
import dotenv from "dotenv";
import chatGPT from "./features/chatgpt.js";
import sendSticker from "./features/sticker.js";
dotenv.config();

if (!process.env.API_KEY) {
  console.log(chalk.red("Please add your OpenAI API key to the .env file."));
  process.exit(1);
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
    browser: Browsers.appropriate("Desktop"),
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      if (typeof lastDisconnect !== "undefined" && lastDisconnect !== null) {
        const shouldReconnect =
          typeof lastDisconnect !== "undefined" &&
          typeof lastDisconnect.error !== "undefined" &&
          typeof lastDisconnect.error.output !== "undefined" &&
          typeof lastDisconnect.error.output.statusCode !== "undefined" &&
          lastDisconnect.error.output.statusCode != DisconnectReason.loggedOut;
        if (shouldReconnect) {
          connectToWhatsApp();
        }
      }
    } else if (connection === "open") {
      console.log("opened connection");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const m = messages[0];

    if (!m.message) return;
    if (m.key.fromMe) return;

    if (typeof m.key.remoteJid !== "undefined" && m.key.remoteJid !== null) {
      try {
        const messageType = Object.keys(m.message)[0];

        const senderId = m.key.remoteJid;
        const senderMessage =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.imageMessage?.caption;

        const command = senderMessage?.match(/![a-z]+/)?.[0];

        // Text Message
        if (
          messageType === "conversation" ||
          messageType === "extendedTextMessage"
        ) {
          const message = senderMessage?.replace(command, "").trim();
          if (command === "!ask") {
            chatGPT(sock, senderId, message);
          }

          // Image Message
        } else if (messageType === "imageMessage") {
          if (command === "!sticker") {
            sendSticker(sock, senderId, m);
          }
        }
      } catch (error) {
        console.log(`Got an error: ${error}`);
      }
    }
  });
}

connectToWhatsApp();
