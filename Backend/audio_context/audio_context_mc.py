# audio_context.py
import sounddevice as sd
import numpy as np
import scipy.io.wavfile as wav
import io
import random
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
                "content": (
                    "You help autistic individuals interpret social cues. The user will provide a line of dialogue. "
                    "Your task is to generate exactly 4 multiple-choice response options based on the dialogue. "
                    "Each option must be a single line containing 3 comma-separated parts: "
                    "1. An emoji representing the emotion, "
                    "2. A description of the tone of the speech, "
                    "3. A suggested empathetic response. "
                    "Only one option should be the correct interpretation reflecting the genuine emotion and context, "
                    "while the other three should be clearly incorrect. "
                    "If there is any indication of sarcasm (for example, a mismatch between overly positive words and the context), "
                    "please include an option that identifies the sarcastic tone. "
                    "For example, if the input is: "
                    "\"My boss assigned me more work today. I'm so happy to do it.\" "
                    "A correct sarcastic interpretation might be: "
                    "\"😒 sarcastic, ironic, acknowledge the hidden frustration about the extra work\". "
                    "Return exactly 4 options, each on a new line."
                )
            },
            {
                "role": "user",
                "content": transcript_text
            }
        ],
        max_tokens=200
    )

    gpt_output = response.choices[0].message.content.strip()
    print("\nOriginal GPT Multiple Choice Options:\n")
    print(gpt_output)

    # Split the GPT output into an array of options
    options = [line.strip() for line in gpt_output.split('\n') if line.strip() != '']
    
    # Randomize the order of the options so the correct one isn't always first
    random.shuffle(options)

    # Print out the randomized array
    print("\nRandomized Options Array:\n")
    print(options)

    # Here you could return the 'options' array or further process it as needed.
