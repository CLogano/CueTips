# from flask import Flask, request
# from flask_cors import CORS
# from openai import OpenAI
# import cv2
# import numpy as np
# from PIL import Image
# import io
# import base64
# import os
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()
# openai_api_key = os.getenv("OPENAI_API_KEY")
# client = OpenAI(api_key=openai_api_key)

# app = Flask(__name__)
# CORS(app)

# # Load OpenCV's built-in face detector
# face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# def pil_to_base64(image):
#     buffered = io.BytesIO()
#     image.save(buffered, format="JPEG")
#     return base64.b64encode(buffered.getvalue()).decode("utf-8")

# @app.route('/analyze', methods=['POST'])
# def analyze():
#     print("📥 Received a POST request to /analyze")

#     data = request.get_json()

#     if not data or 'image' not in data:
#         print("❌ No image found in request JSON")
#         return "No base64 image found in request", 400

#     try:
#         print("🔄 Decoding base64 image data")
#         image_data = base64.b64decode(data['image'].split(",")[-1])
#         np_arr = np.frombuffer(image_data, np.uint8)
#         frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

#         gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
#         faces = face_cascade.detectMultiScale(gray, 1.3, 5)

#         if len(faces) == 0:
#             print("😐 No face detected — returning 'none'")
#             return "none", 200

#         print(f"✅ Detected {len(faces)} face(s), using the first one")
#         (x, y, w, h) = faces[0]
#         face_crop = frame[y:y+h, x:x+w]
#         face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)).resize((256, 256), Image.LANCZOS)
#         base64_face = pil_to_base64(face_pil)

#         print("📤 Sending cropped face to OpenAI GPT-4o")

#         response = client.chat.completions.create(
#             model="gpt-4o",
#             messages=[
#                 {
#                     "role": "user",
#                     "content": [
#                         {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_face}"}},
#                         {"type": "text", "text": "Describe this person's facial emotion using an emoji followed by one word (e.g., 😁 happy)."}
#                     ]
#                 }
#             ],
#             max_tokens=10
#         )

#         result = response.choices[0].message.content.strip()
#         print(f"🤖 GPT-4o response: {result}")
#         return result, 200

#     except Exception as e:
#         print(f"❌ Error during processing: {str(e)}")
#         return str(e), 500

# if __name__ == '__main__':
#     print("🚀 Starting Flask app on 0.0.0.0:5001")
#     app.run(host='0.0.0.0', port=5001, debug=True)









from flask import Flask, request
from flask_cors import CORS
from openai import OpenAI
import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import time
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

if __name__ == '__main__':
    print("🚀 Starting Flask app on 0.0.0.0:5001")
    app.run(host='0.0.0.0', port=5001, debug=True)
