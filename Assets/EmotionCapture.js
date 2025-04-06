// // Send datastream to backend
// var remoteServiceModule = require('LensStudio:RemoteServiceModule');
// // Capture live stream footage
// let cameraModule = require('LensStudio:CameraModule');
// let cameraRequest;
// let cameraTexture;
// let cameraTextureProvider;




// //@input int interval = 5000
// //@input string backendUrl = "https://2982-50-168-180-218.ngrok-free.app/analyze"
// //@input Component.Text responseText

// let lastSentTime = 0;

// script.createEvent('OnStartEvent').bind(() => {
    
//   print("🚀 Script started");

//   if (script.responseText) {
//     script.responseText.enabled = true;
// }
    
//   cameraRequest = CameraModule.createCameraRequest();
//   cameraRequest.cameraId = CameraModule.CameraId.Default_Color;

//   cameraTexture = cameraModule.requestCamera(cameraRequest);
//   cameraTextureProvider = cameraTexture.control;

//   cameraTextureProvider.onNewFrame.add((cameraFrame) => {

//     let now = getTime() * 1000;
//     if (now - lastSentTime < script.interval) return; 

//     lastSentTime = now;
        
//     Base64.encodeTextureAsync(
//             cameraTexture,
//             (base64Image) => {
//               //sendImageToBackend(base64Image);
//             },
//             () => {
//                 print("❌ Failed to encode image");
//             },
//             CompressionQuality.HighQuality,
//             EncodingType.Jpg
//     );
//   });
// });

// async function sendImageToBackend(base64Image) {

//   try {
//     const request = new Request(script.backendUrl, {
//       method: 'POST',
//       body: JSON.stringify({
//         image: base64Image
//       }),
//       headers: {
//         'Content-Type': 'application/json',
//       },
//     });

//     const response = await remoteServiceModule.fetch(request);

//     if (response.status === 200) {
//       const responseText = await response.text();
//       print('✅ Backend response: ' + responseText);

//       if (script.responseText) {
//         const trimmed = responseText.trim();
//         if (trimmed && trimmed !== "none") {
//           script.responseText.text = trimmed;
//           script.responseText.enabled = true;
//         } else {
//           script.responseText.text = "";
//           script.responseText.enabled = false;
//           print("ℹ️ No emotion or 'none' detected — disabling response text.");
//         }
//       }
//     } else {
//       const errorText = await response.text();
//       print('❌ Backend error: ' + errorText);
//     }

//   } catch (error) {
//     print('❌ Network error: ' + error);
//   }
// }

// // Disable binding and text on unload
// script.preUnloadHook = function () {
//   return new Promise((resolve) => {
//       print("📦 Unloading LiveAssist scene");

//       if (script.responseText) {
//           script.responseText.enabled = false;
//       }

//       resolve();
//   });
// };

// Send datastream to backend
var remoteServiceModule = require('LensStudio:RemoteServiceModule');

// Capture live stream footage
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest;
let cameraTexture;
let cameraTextureProvider;

//@input int interval = 5000
//@input string backendUrl = "https://d2ba-50-168-180-218.ngrok-free.app/analyze"
//@input Component.Text responseText
//@input string openAIKey

let lastSentTime = 0;
let lastDetectedEmotion = ""; // Store the last valid emotion

script.createEvent('OnStartEvent').bind(() => {
    print("🚀 Script started");

    cameraRequest = CameraModule.createCameraRequest();
    cameraRequest.cameraId = CameraModule.CameraId.Default_Color;

    cameraTexture = cameraModule.requestCamera(cameraRequest);
    cameraTextureProvider = cameraTexture.control;

    // Initialize responseText to be hidden until first emotion is detected
    if (script.responseText) {
        script.responseText.text = "";
        script.responseText.enabled = false;
    }

    cameraTextureProvider.onNewFrame.add((cameraFrame) => {
        let now = getTime() * 1000;
        if (now - lastSentTime < script.interval) return;

        lastSentTime = now;

        Base64.encodeTextureAsync(
            cameraTexture,
            (base64Image) => {
                sendImageToBackend(base64Image);
            },
            () => {
                print("❌ Failed to encode image");
            },
            CompressionQuality.HighQuality,
            EncodingType.Jpg
        );
    });
});

async function sendImageToBackend(base64Image) {
    try {
        const request = new Request(script.backendUrl, {
            method: 'POST',
            body: JSON.stringify({
                image: base64Image
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const response = await remoteServiceModule.fetch(request);

        if (response.status === 200) {
            const responseText = await response.text();
            print('✅ Backend response: ' + responseText);

            if (script.responseText) {
                const trimmed = responseText.trim();
                
                // Only update text if we detect a real emotion
                if (trimmed && trimmed.toLowerCase() !== "none") {
                    lastDetectedEmotion = trimmed; // Store the emotion
                    script.responseText.text = trimmed;
                    script.responseText.enabled = true; // Ensure it's visible
                } else if (lastDetectedEmotion) {
                    // Keep showing the last detected emotion
                    script.responseText.text = lastDetectedEmotion;
                    script.responseText.enabled = true;
                }
            }
        } else {
            const errorText = await response.text();
            print('❌ Backend error: ' + errorText);
            
            // On error, keep showing last emotion if we have one
            if (script.responseText && lastDetectedEmotion) {
                script.responseText.text = lastDetectedEmotion;
                script.responseText.enabled = true;
            }
        }
    } catch (error) {
        print('❌ Network error: ' + error);
        
        // On error, keep showing last emotion if we have one
        if (script.responseText && lastDetectedEmotion) {
            script.responseText.text = lastDetectedEmotion;
            script.responseText.enabled = true;
        }
    }
}