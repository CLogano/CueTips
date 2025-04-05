// Send datastream to backend
const remoteModule = require('LensStudio:RemoteMediaModule');
// Capture live stream footage
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest;
let cameraTexture;
let cameraTextureProvider;

//@input Component.Image uiImage {"hint":"The image in the scene that will be showing the captured frame."}
//@input string backendURL = "https://your-backend.com/analyze" {"hint":"Backend URL for emotion analysis"}
//@input int intervalMs = 2000 {"hint":"Milliseconds between frame uploads"}
//@input SceneObject textLabel {"hint":"Text label to display returned emotion (optional)"}

let lastSentTime = 0;

script.createEvent('OnStartEvent').bind(() => {
    
  print("🚀 Script started");
    
  cameraRequest = CameraModule.createCameraRequest();
  cameraRequest.cameraId = CameraModule.CameraId.Default_Color;

  cameraTexture = cameraModule.requestCamera(cameraRequest);
  print("📷 Camera texture requested");
  cameraTextureProvider = cameraTexture.control;

  cameraTextureProvider.onNewFrame.add((cameraFrame) => {

    let now = getTime() * 1000;
        if (now - lastSentTime < script.intervalMs) return;

        lastSentTime = now;

        // Convert frame to JPEG
        cameraFrame.getData({ format: cameraModule.ImageFormat.JPEG }, function(jpegData) {
            if (!jpegData) {
                print("❌ Failed to get JPEG from frame");
                return;
            }

            sendFrameToBackend(jpegData);
        });
  });
});

function sendFrameToBackend(jpegData) {
    let request = new remoteModule.Request();
    request.method = "POST";
    request.url = script.backendURL;
    request.setHeader("Content-Type", "image/jpeg");
    request.body = jpegData;

    request.send(function(response) {
        if (!response || response.statusCode !== 200) {
            print("❌ Backend request failed");
            return;
        }

        print("✅ Emotion received: " + response.body);
        updateEmotionText(response.body);
    });
}