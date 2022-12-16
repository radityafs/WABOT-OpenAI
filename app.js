const makeWASocket = require('@adiwajshing/baileys').default
const { BufferJSON, useMultiFileAuthState, DisconnectReason } = require('@adiwajshing/baileys');
const fs = require('fs');
const { Configuration, OpenAIApi } = require("openai")

const configuration = new Configuration({
    apiKey: "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",
});
const openai = new OpenAIApi(configuration);


async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true,
        logger: 'off'
    })
    // this will be called as soon as the credentials are updated
    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            if (typeof lastDisconnect !== 'undefined' && lastDisconnect !== null) {
                const shouldReconnect = typeof lastDisconnect !== 'undefined' && typeof lastDisconnect.error !== 'undefined' && typeof lastDisconnect.error.output !== 'undefined' && typeof lastDisconnect.error.output.statusCode !== 'undefined' && lastDisconnect.error.output.statusCode != DisconnectReason.loggedOut
                if (shouldReconnect) {
                    connectToWhatsApp()
                }
            }
        } else if (connection === 'open') {
            console.log('opened connection')
        }
    })
    sock.ev.on('messages.upsert', async ({ messages }) => {

        const m = messages[0]

        if (!m.message) return // if there is no text or media message
        const messageType = Object.keys(m.message)[0] // get what type of message it is -- text, image, video
        if (messageType === 'conversation') {
            if (typeof m.key.remoteJid !== 'undefined' && m.key.remoteJid !== null) {
                const senderId = m.key.remoteJid
                const senderMessage = m.message[messageType]
                const response = await openai.createCompletion({
                    model: "text-davinci-003",
                    prompt: senderMessage,
                    temperature: 0,
                    max_tokens: 1000,
                    top_p: 1,
                    frequency_penalty: 0.2,
                    presence_penalty: 0,
                });

                const resultnya = response.data.choices[0].text;

                await sock.sendMessage(senderId, { text: resultnya })
                console.log(`Message from ${senderId}: ${senderMessage} | Response: ${resultnya}`)
            }
        } else {
            // console.log(m)
        }
    })


}
// run in main file
connectToWhatsApp()
