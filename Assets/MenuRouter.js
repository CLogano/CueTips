//@input Component.ScriptComponent practiceButtonScript
//@input Component.ScriptComponent liveAssistButtonScript
//@input float transitionDelay = 0.2

function safelyTransitionTo(sceneName) {
    if (script.practiceButtonScript && script.practiceButtonScript.api && script.practiceButtonScript.api.disableInteractable) {
        script.practiceButtonScript.api.disableInteractable();
    }
    if (script.liveAssistButtonScript && script.liveAssistButtonScript.api && script.liveAssistButtonScript.api.disableInteractable) {
        script.liveAssistButtonScript.api.disableInteractable();
    }

    var delayEvent = script.createEvent("DelayedCallbackEvent");
    delayEvent.bind(function () {
        global.sceneManager.unloadSceneByName("MainMenu");
        global.sceneManager.loadSceneSync(sceneName, { additive: false, parent: script.uiAnchorObject });
    });
    delayEvent.reset(script.transitionDelay);
}

function init() {
    if (script.practiceButtonScript && script.practiceButtonScript.onButtonPinched) {
        script.practiceButtonScript.onButtonPinched.add(function () {
            safelyTransitionTo("PracticeMode");
        });
    }

    if (script.liveAssistButtonScript && script.liveAssistButtonScript.onButtonPinched) {
        script.liveAssistButtonScript.onButtonPinched.add(function () {
            safelyTransitionTo("LiveAssistMode");
        });
    }
}

var delayInit = script.createEvent("DelayedCallbackEvent");
delayInit.bind(init);
delayInit.reset(0.05);