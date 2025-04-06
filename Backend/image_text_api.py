from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import time
import random
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")
client = OpenAI(api_key=openai_api_key)

app = Flask(__name__)
CORS(app)

# Load OpenCV's built-in face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def pil_to_base64(image):
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

@app.route('/analyze', methods=['POST'])
def analyze():
    print("📥 Received a POST request to /analyze")
    data = request.get_json()
    if not data or 'image' not in data:
        print("❌ No image found in request JSON")
        return "No base64 image found in request", 400

    try:
        # Decode the base64 image data
        print("🔄 Decoding base64 image data")
        image_data = base64.b64decode(data['image'].split(",")[-1])
        np_arr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        # Create images folder if it doesn't exist
        images_dir = "images"
        if not os.path.exists(images_dir):
            os.makedirs(images_dir)

        # Convert to grayscale and detect faces
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        # If no face is detected, save the original image and return "none"
        if len(faces) == 0:
            print("😐 No face detected — returning 'none'")
            filename = os.path.join(images_dir, f"{int(time.time())}_noface.jpg")
            cv2.imwrite(filename, frame)
            return "none", 200

        # If a face is detected, draw bounding box on the image
        print(f"✅ Detected {len(faces)} face(s), using the first one")
        (x, y, w, h) = faces[0]
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)
        filename = os.path.join(images_dir, f"{int(time.time())}_face.jpg")
        cv2.imwrite(filename, frame)

        # Crop the detected face for analysis
        face_crop = frame[y:y+h, x:x+w]
        face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)).resize((256, 256), Image.LANCZOS)
        base64_face = pil_to_base64(face_pil)

        print("📤 Sending cropped face to OpenAI GPT-4o")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_face}"}},
                        {"type": "text", "text": "Describe this person's facial emotion using an emoji followed by one word (e.g., 😁 happy)."}
                    ]
                }
            ],
            max_tokens=10
        )

        result = response.choices[0].message.content.strip()
        print(f"🤖 GPT-4o response: {result}")
        return result, 200

    except Exception as e:
        print(f"❌ Error during processing: {str(e)}")
        return str(e), 500

@app.route('/analyze_text', methods=['POST'])
def analyze_text():
    print("📥 Received a POST request to /analyze_text")
    data = request.get_json()
    if not data or 'text' not in data:
        print("❌ No text found in request JSON")
        return "No text found in request", 400

    user_text = data['text']
    print("Received text input:")
    print(user_text)

    try:
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
                    "content": user_text
                }
            ],
            max_tokens=200
        )

        gpt_output = response.choices[0].message.content.strip()
        print("Original GPT Multiple Choice Options:")
        print(gpt_output)
        # Split the GPT output into an array and randomize the order
        options = [line.strip() for line in gpt_output.split('\n') if line.strip() != '']
        random.shuffle(options)
        print("Randomized Options Array:")
        print(options)
        # Return both the original input text and the generated options
        return jsonify({"input": user_text, "options": options}), 200

    except Exception as e:
        print(f"❌ Error during text analysis: {str(e)}")
        return str(e), 500

if __name__ == '__main__':
    print("🚀 Starting Flask app on 0.0.0.0:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
