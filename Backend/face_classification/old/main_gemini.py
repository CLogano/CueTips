import google.generativeai as genai
import cv2
import time
from PIL import Image

import os
from dotenv import load_dotenv

load_dotenv()
openai_api_key = os.getenv("OPENAI_API_KEY")

genai.configure(api_key=openai_api_key)

# use opencv's Haar Cascade classifier to detect faces
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# start webcam
cap = cv2.VideoCapture(0)

# set initial timestamp for controlling snapshot frequency
last_snapshot = time.time()

# keep looping
while True:
    # get the current frame
    ret, frame = cap.read()
    if not ret:
        break

    # convert to grayscale for face detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # detect faces in the image
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    # Only process the first face detected
    if len(faces) > 0:
        # Get only the first face
        (x, y, w, h) = faces[0]
        
        # draw box around each face
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)

        # every 5 seconds, take a snapshot of the detected face and call Gemini
        if time.time() - last_snapshot >= 5:
            face_crop = frame[y:y+h, x:x+w]
            
            # Save original for display purposes if needed
            cv2.imwrite("face_original.jpg", face_crop)
            
            # Resize to 256x256 using PIL for better quality
            face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB))
            face_resized = face_pil.resize((256, 256), Image.LANCZOS)
            face_resized.save("face.jpg")
            
            last_snapshot = time.time()

            # Use the resized image for the API call
            model = genai.GenerativeModel("gemini-1.5-pro") # choose model
            response = model.generate_content(
                # [user prompt, system instructions]
                [face_resized, "Describe this face in **one word**: happy, sad, angry, surprised, etc."]
            )
            # print the response from Gemini
            print("Gemini says:", response.text.strip())

    cv2.imshow("Webcam", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()