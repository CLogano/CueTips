// Send datastream to backend
var remoteServiceModule = require('LensStudio:RemoteServiceModule');
// Capture live stream footage
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest;
let cameraTexture;
let cameraTextureProvider;




//@input int interval = 5000
//@input string backendUrl = "https://2982-50-168-180-218.ngrok-free.app/analyze"
//@input Component.Text responseText

let lastSentTime = 0;

script.createEvent('OnStartEvent').bind(() => {
    
  print("🚀 Script started");
    
  cameraRequest = CameraModule.createCameraRequest();
  cameraRequest.cameraId = CameraModule.CameraId.Default_Color;

  cameraTexture = cameraModule.requestCamera(cameraRequest);
  cameraTextureProvider = cameraTexture.control;

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
        if (trimmed && trimmed !== "none") {
          script.responseText.text = trimmed;
          script.responseText.enabled = true;
        } else {
          script.responseText.text = "";
          script.responseText.enabled = false;
          print("ℹ️ No emotion or 'none' detected — disabling response text.");
        }
      }
    } else {
      const errorText = await response.text();
      print('❌ Backend error: ' + errorText);
    }

  } catch (error) {
    print('❌ Network error: ' + error);
  }
}

async function sendToOpenAI(base64Image) {
  const prompt = 'Describe this face in **one word**: happy, sad, angry, surprised, etc. If you cannot detect a face or come up with an emotion, simply put "None".'

  try {
    const url = 'https://api.openai.com/v1/chat/completions'
      const request = new Request(url, {
        method: 'POST',
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { 'url': `data:image/jpeg;base64,${base64Image}` } },
              ],
            },
          ],
          max_tokens: 10,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${script.openAIKey}`,
        },
      });

    const response = await remoteServiceModule.fetch(request)

    if (response.status === 200) {
      const json = await response.json()
      const result = json.choices[0].message.content.trim()
      print('🧠 Emotion Detected: ' + result)

      if (script.responseText) {
        script.responseText.text = result
      }
    } else {
      const errorText = await response.text()
      print('❌ OpenAI request failed: ' + errorText)
      throw new Error('Failed to get response from OpenAI')
    }
  } catch (error) {
    print('❌ Network error: ' + error)
  }
}