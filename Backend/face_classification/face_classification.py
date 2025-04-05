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

# list and print all available models (optional, for debugging)
# models = client.models.list()
# for model in models.data:
#     print(model.id)

# load opencv's built-in face detector (haar cascade xml file)
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# open the webcam (device 0 = default camera)
cap = cv2.VideoCapture(0)

# store time of last snapshot so we can have a starting time basis for computation
last_snapshot = time.time()

# function to convert a PIL image to base64 string (for sending to openai)
def pil_to_base64(image):
    buffered = io.BytesIO()                      # create a temporary buffer
    image.save(buffered, format="JPEG")          # save image as jpeg into the buffer
    return base64.b64encode(buffered.getvalue()).decode("utf-8")  # convert to base64 string

# main loop - runs until you press 'q'
while True:
    ret, frame = cap.read()                      # grab the current frame from the webcam
    if not ret:
        break                                    # if no frame was read, exit the loop

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)         # convert the frame to grayscale for face detection
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)    # detect faces in the image

    if len(faces) > 0:
        (x, y, w, h) = faces[0]                  # get the first face detected
        cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 0), 2)  # draw a blue box around the face

        # if 5 seconds have passed since the last snapshot, process the face
        if time.time() - last_snapshot >= 5:
            face_crop = frame[y:y+h, x:x+w]      # crop just the face area from the frame
            face_pil = Image.fromarray(cv2.cvtColor(face_crop, cv2.COLOR_BGR2RGB)).resize((256, 256), Image.LANCZOS)  # convert to PIL format and resize to 256x256

            base64_image = pil_to_base64(face_pil)  # encode the image to base64

            print("Sending image to GPT-4o")

            # send the image and prompt to openai's gpt-4o to get a one-word emotion description
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        # call format is [user content, system instructions]
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}},
                            {"type": "text", "text": "Describe this face in **one word**: happy, sad, angry, surprised, etc."}
                        ]
                    }
                ],
                max_tokens=10  # limit the response to a short answer
            )

            # print the ai's one-word emotion response
            print("GPT-4 says:", response.choices[0].message.content.strip())

            # update the last snapshot time so we wait another 5 seconds
            last_snapshot = time.time()

    # show the current webcam frame with face box drawn
    cv2.imshow("Webcam", frame)

    # if 'q' key is pressed, break the loop and close
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# release the webcam and close any open windows
cap.release()
cv2.destroyAllWindows()
