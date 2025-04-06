//@input SceneObject mainMenu
//@input SceneObject practiceMode
//@input SceneObject liveAssistMode

//@input Component.ScriptComponent practiceButton
//@input Component.ScriptComponent liveAssistButton

function switchTo(mode) {
    script.mainMenu.enabled = false;
    script.practiceMode.enabled = (mode === "practice");
    script.liveAssistMode.enabled = (mode === "live");
}

function initUI() {
    if (!script.practiceButton || !script.liveAssistButton) {
        print("❗ MenuManager: Button script inputs are not properly assigned.");
        return;
    }

    // Register Practice button
    script.practiceButton.onPressDown.add(function () {
        print("✅ Practice button pressed");
        switchTo("practice");
    });

    // Register Live Assist button
    script.liveAssistButton.onPressDown.add(function () {
        print("✅ Live Assist button pressed");
        switchTo("live");
    });
}

function showMainMenu() {
    script.mainMenu.enabled = true;
    script.practiceMode.enabled = false;
    script.liveAssistMode.enabled = false;
}

// Defer until all components are awake
script.createEvent("UpdateEvent").bind(function () {
    showMainMenu();
    initUI();
});