import { Configuration, OpenAIApi } from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.API_KEY,
  })
);

export default async function chatGPT(sock, sender, message) {
  try {
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

    console.log(`[log] response: ${responseMessage}`);

    await sock.sendMessage(sender, {
      text: responseMessage.trim(),
    });
  } catch (error) {
    console.log(`error : ${error}`);
  }
}
