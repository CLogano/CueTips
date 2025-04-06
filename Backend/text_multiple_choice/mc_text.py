# text_context.py
import random
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# Create the OpenAI client using your API key
client = OpenAI(api_key=openai_api_key)

print("Welcome to Voice Cues")
print("Instructions:")
print("- Type a sentence to analyze.")
print("- Type 'q' to quit.")

while True:
    user_text = input("Enter a sentence to analyze (or 'q' to quit): ").strip()
    if user_text.lower() == 'q':
        print("Exiting...")
        break

    transcript_text = user_text  # Directly use the input text
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

    # Split the GPT output into an array of options and randomize the order
    options = [line.strip() for line in gpt_output.split('\n') if line.strip() != '']
    random.shuffle(options)

    # Print out the randomized array
    print("\nRandomized Options Array:\n")
    print(options)

    # Further processing of the 'options' array can be done here if needed.
