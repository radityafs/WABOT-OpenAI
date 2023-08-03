import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { Sticker, StickerTypes } from "wa-sticker-formatter";

export default async function mediaToSticker(instance, sender, message) {
  try {
    const buffer = await downloadMediaMessage(message, "buffer", {});

    const sticker = new Sticker(buffer, {
      pack: "Raditya Ganteng",
      author: "RadityaFS",
      type: StickerTypes.FULL,
      categories: ["🤩", "🎉"],
      id: "12345",
      quality: 50,
    });

    await instance.sendMessage(sender, {
      sticker: await sticker.build(),
    });
  } catch (error) {
    console.log(`error : ${error}`);
  }
}
