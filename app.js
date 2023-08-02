import { makeWASocket } from "@whiskeysockets/baileys";

import {
  useMultiFileAuthState,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import { Configuration, OpenAIApi } from "openai";
import chalk from "chalk";

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });
  // this will be called as soon as the credentials are updated
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

    if (!m.message) return; // if there is no text or media message
    const messageType = Object.keys(m.message)[0]; // get what type of message it is -- text, image, video

    if (
      messageType === "conversation" ||
      messageType === "extendedTextMessage"
    ) {
      if (typeof m.key.remoteJid !== "undefined" && m.key.remoteJid !== null) {
        try {
          const senderId = m.key.remoteJid;
          const senderMessage =
            m.message.conversation || m.message.extendedTextMessage.text;

          const command = senderMessage?.toLowerCase()?.substring(0, 4);
          const message = senderMessage?.toLowerCase()?.substring(5);

          if (command === "!ask") {
            const completion = await openai.createCompletion({
              model: "text-davinci-003",
              prompt: message,
              temperature: 0.5,
              max_tokens: 1024,
              top_p: 0.3,
              frequency_penalty: 0.5,
              presence_penalty: 0.0,
            });

            const responseMessage = completion.data.choices[0].text;
            await sock.sendMessage(senderId, { text: responseMessage.trim() });

            console.log(
              chalk.green(
                `[!ask] ${senderId} asked ${message} and got ${responseMessage} as a response.`
              )
            );
          } else {
            if (m.key.fromMe) return;

            console.log(
              chalk.red(
                `[chat] ${senderId} sent ${senderMessage} [ ${messageType}]`
              )
            );
          }
        } catch (error) {
          console.log(`Got an error: ${error}`);
        }
      }
    }
  });
}
// run in main file
connectToWhatsApp();
