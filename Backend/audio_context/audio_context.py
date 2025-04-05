# audio_context.py
import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import io
from openai import OpenAI

import os
from dotenv import load_dotenv

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# create the openai client using your api key
client = OpenAI(api_key=openai_api_key)

samplerate = 44100
channels = 1

print("Welcome to Voice Cues")
print("Instructions:")
print("- Press ENTER to start recording.")
print("- Press ENTER again to stop and process.")
print("- Type 'q' and press ENTER to quit.")

while True:
    cmd = input("Press ENTER to start recording or 'q' to quit: ").strip().lower()
    if cmd == 'q':
        print("Exiting...")
        break

    print("Recording... Press ENTER again to stop.")
    sd.wait()

    recording = []
    def callback(indata, frames, time, status):
        recording.append(indata.copy())

    with sd.InputStream(samplerate=samplerate, channels=channels, callback=callback):
        input()  # Wait for ENTER to stop recording

    print("Recording stopped. Processing...")

    # Convert to np array and save to buffer
    audio_np = np.concatenate(recording, axis=0)
    buffer = io.BytesIO()
    wav.write(buffer, samplerate, audio_np)
    buffer.seek(0)  # Rewind for reading

    print("Transcribing audio...")
    transcription = client.audio.transcriptions.create(
        model="whisper-1",
        file=("audio.wav", buffer, "audio/wav")
    )
    transcript_text = transcription.text.strip()
    print("Transcribed Text:\n", transcript_text)

    print("Analyzing with GPT-4o...")

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {
                "role": "system",
                # "content": (
                #     "You help autistic individuals by interpreting conversations. "
                #     "Based on what someone just said, give empathetic suggestions in this format:\n\n"
                #     "\"This person seems ___ about ___\"\n"
                #     "1) ___\n2) ___\n3) ___"
                # )
                "content": (
                    "You help autistic individuals interpret social cues. "
                    "The user will give you a line of dialogue from someone. "
                    "First, summarize the emotion and topic in one sentence:\n"
                    "\"This person seems [emotion] about [topic]\"\n"
                    "Then, give 3 **concise** suggestions for empathetic responses — keep them short (less than 8 words), like:\n"
                    "1) say you're sorry for their loss\n"
                    "2) share a memory about their cat\n"
                    "3) recommend reaching out to friends"
                )
            },
            {
                "role": "user",
                "content": transcript_text
            }
        ],
        max_tokens=200
    )

    print("\nGPT Suggestion:\n")
    print(response.choices[0].message.content.strip())
