// audio_context.js
const fs = require("fs");
const readline = require("readline");
const recorder = require("node-record-lpcm16");
const { OpenAI } = require("openai");
require("dotenv").config({ path: "../.env" });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const fileName = "input.wav";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log("🎧 Voice Cues - JavaScript Edition");
console.log("Instructions:");
console.log("- Press ENTER to start recording");
console.log("- Press ENTER again to stop and analyze");
console.log("- Type 'q' then ENTER to quit");

function waitForEnter(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
    while (true) {
        const cmd = await waitForEnter("\nPress ENTER to start or 'q' to quit: ");
        if (cmd.trim().toLowerCase() === "q") {
            console.log("👋 Exiting...");
            rl.close();
            process.exit(0);
        }

        console.log("🎙️ Recording... Press ENTER again to stop.");

        const file = fs.createWriteStream(fileName, { encoding: "binary" });
        const recording = recorder.record({
            sampleRate: 44100,
            channels: 1,
            threshold: 0.5,
            verbose: false,
            recordProgram: "sox"
        });

        recording.stream().pipe(file);

        await waitForEnter(""); // wait for second ENTER
        recording.stop();
        console.log("✅ Recording complete. Transcribing...");

        const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: fs.createReadStream(fileName),
            response_format: "text"
        });

        const transcript = transcription.trim();
        console.log("📝 Transcription:", transcript);

        console.log("🤖 Asking GPT for social suggestions...");
        const chat = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You help autistic individuals interpret social cues. 
The user will give you a line of dialogue from someone. 
First, summarize the emotion and topic in one sentence:
"This person seems [emotion] about [topic]"
Then, give 3 **concise** suggestions for empathetic responses — keep them short (less than 8 words), like:
1) say you're sorry for their loss
2) share a memory about their cat
3) recommend reaching out to friends`
                },
                { role: "user", content: transcript }
            ],
            max_tokens: 200
        });

        console.log("\n💬 GPT Suggestion:\n" + chat.choices[0].message.content.trim());
    }
}

main();
