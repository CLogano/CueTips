require("dotenv").config({ path: "../../.env" });
const axios = require("axios");
const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");

const API_KEY = process.env.OPENAI_API_KEY;
const INTERVAL = 5000;
const WIDTH = 256;
const HEIGHT = 256;
const IMAGE_PATH = "test.jpg";

async function getEmotionFromImage(base64Image) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: "Describe this person's facial emotion using an emoji followed by one word (e.g., 😁 happy).",
            },
          ],
        },
      ],
      max_tokens: 10,
    },
    {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  return response.data.choices[0].message.content.trim();
}

async function loadAndEncodeImage(path) {
  const img = await loadImage(path);
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, WIDTH, HEIGHT);
  const buffer = canvas.toBuffer("image/jpeg");
  return buffer.toString("base64");
}

(async () => {
  const base64Image = await loadAndEncodeImage(IMAGE_PATH);

  console.log("Press Ctrl+C to quit...");

  while (true) {
    console.log("Sending image to GPT-4o...");

    try {
      const emotion = await getEmotionFromImage(base64Image);
      console.log("GPT-4 says:", emotion);
    } catch (err) {
      console.error("Error:", err.message);
    }

    await new Promise((resolve) => setTimeout(resolve, INTERVAL));
  }
})();