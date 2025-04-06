//@input SceneObject emotionText  // Assign the global EmotionText here

global.sceneManager.onSceneLoaded.add(function (loadedScene) {
    if (!loadedScene || !loadedScene.source || !script.emotionText) {
        return;
    }

    var name = loadedScene.source.sceneName;
    print("📌 Scene loaded: " + name);

    // Enable EmotionText only when LiveAssist scene is loaded
    script.emotionText.enabled = (name === "LiveAssistMode");
});

global.sceneManager.onSceneUnloaded.add(function (unloadedScene) {
    if (!unloadedScene || !unloadedScene.source || !script.emotionText) {
        return;
    }

    var name = unloadedScene.source.sceneName;
    print("📤 Scene unloaded: " + name);

    // Disable EmotionText only if LiveAssist is being unloaded
    if (name === "LiveAssistMode") {
        script.emotionText.enabled = false;
    }
});