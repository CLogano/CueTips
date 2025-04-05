from openai import OpenAI
import cv2
import time
from PIL import Image
import io
import base64
import os
from dotenv import load_dotenv

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

# create the openai client using your api key
client = OpenAI(api_key=openai_api_key)

# load opencv's built-in face detector
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# open the webcam
cap = cv2.VideoCapture(0)

last_snapshot = time.time()

def pil_to_base64(image):
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    return base64.b64encode(buffered.getvalue()).decode("utf-8")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

        if time.time() - last_snapshot >= 5:
            face_crop = frame[y:y+h, x:x+w]
            face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)).resize((256, 256), Image.LANCZOS)

            base64_image = pil_to_base64(face_pil)

            print("Sending image to GPT-4o")

            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                            {"type": "text", "text": "Describe this person's facial emotion using an emoji followed by one word (e.g., 😁 happy)."}
                        ]
                    }
                ],
                max_tokens=10
            )

            result = response.choices[0].message.content.strip()
            print("GPT-4 says:", result)

            last_snapshot = time.time()

    cv2.imshow("Webcam", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
