//@input Component.ScriptComponent backButtonScript
//@input float transitionDelay = 0.2

function transitionToMainMenu() {
    // Optionally disable interaction to prevent double-tap errors
    if (script.backButtonScript && script.backButtonScript.api && script.backButtonScript.api.disableInteractable) {
        script.backButtonScript.api.disableInteractable();
    }

    var delayEvent = script.createEvent("DelayedCallbackEvent");
    delayEvent.bind(function () {
        global.sceneManager.unloadSceneByName("PracticeMode");

        global.sceneManager.loadSceneSync("MainMenu", {
            additive: false,
            parent: script.uiAnchorObject
        });
    });
    delayEvent.reset(script.transitionDelay);
}

function init() {
    if (script.backButtonScript && script.backButtonScript.onButtonPinched) {
        script.backButtonScript.onButtonPinched.add(function () {
            transitionToMainMenu();
        });
    }
}

var delayInit = script.createEvent("DelayedCallbackEvent");
delayInit.bind(init);
delayInit.reset(0.05);