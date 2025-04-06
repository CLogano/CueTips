var delayEvent = script.createEvent("DelayedCallbackEvent");
delayEvent.bind(function () {
    global.sceneManager.loadSceneSync("MainMenu", {
        additive: false,
        parent: script.uiAnchorObject
    });
});
delayEvent.reset(0.05);