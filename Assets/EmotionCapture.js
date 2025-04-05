// Send datastream to backend
var remoteServiceModule = require('LensStudio:RemoteServiceModule');
// Capture live stream footage
let cameraModule = require('LensStudio:CameraModule');
let cameraRequest;
let cameraTexture;
let cameraTextureProvider;



//@input string openAIKey = "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"
//@input int interval = 10000 {"hint":"Milliseconds between frame uploads"}
//@input Component.Text responseText

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
    if (now - lastSentTime < script.interval) return; 

    lastSentTime = now;
        
    Base64.encodeTextureAsync(
            cameraTexture,
            (base64Image) => {
              sendToOpenAI(base64Image);
            },
            () => {
                print("❌ Failed to encode image");
            },
            CompressionQuality.HighQuality,
            EncodingType.Jpg
    );
  });
});

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