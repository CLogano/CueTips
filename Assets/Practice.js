// @input Component.Text text          // Main text display
// @input Component.Text option1       // Option 1 text
// @input Component.Text option2       // Option 2 text
// @input Component.Text option3       // Option 3 text
// @input Component.Text option4       // Option 4 text
// @input Component.Text titleText     // Title text for instructions
// @input SceneObject optionsContainer // Parent object containing all options UI

// Remote service module for fetching data
var voiceMLModule = require("LensStudio:VoiceMLModule");
var remoteServiceModule = require('LensStudio:RemoteServiceModule');

// State management
const STATE = {
    HIDDEN: 0,          // No UI elements shown
    EMOJI_CHOICES: 1,   // Show emoji + emotion word
    RESPONSES: 2        // Show response suggestions
};

var currentState = STATE.HIDDEN;
var lastResponse = null;  // Store the last response to cycle through
var originalOptions = [];  // Store the original options array before shuffling
var correctOptionIndex = -1; // Track which option is correct in current view
var emojiCorrectIndex = -1; // Track correct option index in emoji view
var responseCorrectIndex = -1; // Track correct option index in response view
var shuffledEmojiOrder = []; // Store the order of options in emoji view
var shuffledResponseOrder = []; // Store the order of options in response view

// Default text color and result colors
const DEFAULT_TEXT_COLOR = new vec4(1, 1, 1, 1); // White
const CORRECT_TEXT_COLOR = new vec4(0, 1, 0, 1); // Green
const INCORRECT_TEXT_COLOR = new vec4(1, 0, 0, 1); // Red

script.createEvent("OnStartEvent").bind(() => {
    print("Lens started.");

    print("hi");

    // Initially hide options
    hideOptions();

    let options = VoiceML.ListeningOptions.create();
    options.shouldReturnAsrTranscription = true;
    options.shouldReturnInterimAsrTranscription = true;

    print("Listening options set. Waiting for VoiceML to be enabled...");

    voiceMLModule.onListeningEnabled.add(() => {
        print("VoiceML is enabled. Starting listening...");
        voiceMLModule.startListening(options);
        print("Listening started. Setting up update handler...");
        voiceMLModule.onListeningUpdate.add(onListenUpdate);
    });

    // startPractice(eventData.transcription);
});

function hideOptions() {
    // Hide the options container and clear text
    if (script.optionsContainer) {
        script.optionsContainer.enabled = false;
    }
    
    // Clear all text fields
    clearOptionTexts();
    
    // Clear the title text
    if (script.titleText) {
        script.titleText.text = "";
    }
}

function showOptions() {
    // Show the options container
    if (script.optionsContainer) {
        script.optionsContainer.enabled = true;
    }
}

function clearOptionTexts() {
    // Clear text in all option fields and reset colors
    optionTextComponents.forEach(component => {
        if (component) {
            component.text = "";
            // Reset to default color
            component.textFill.color = DEFAULT_TEXT_COLOR;
        }
    });
    
    // Clear main text
    if (script.text) {
        script.text.text = "";
    }
    
    // Reset all tracking variables
    correctOptionIndex = -1;
    emojiCorrectIndex = -1;
    responseCorrectIndex = -1;
    originalOptions = [];
    shuffledEmojiOrder = [];
    shuffledResponseOrder = [];
}

function onListenUpdate(eventData) {
    print("Received listening update.");

    if (eventData.transcription) {
        print("Transcription: " + eventData.transcription);
    }

    if (eventData.isFinalTranscription) {
        print("Final transcription received.");
        const transcript = eventData.transcription.toLowerCase();
        
        if (transcript.includes("start practice mode")) {
            // Trigger backend call to get emotions/responses
            startPractice(eventData.transcription);
        } 
        else if (transcript.includes("next question") || transcript.includes("next")) {
            // Cycle to next state
            cycleToNextState();
        }
        else if (transcript.includes("end practice mode") || transcript.includes("done") || 
                transcript.includes("hide") || transcript.includes("clear")) {
            // Hide all options
            currentState = STATE.HIDDEN;
            hideOptions();
        }
        else if (transcript.includes("reset") || transcript.includes("clear colors")) {
            // Reset all text colors without changing state
            resetTextColors();
        }
        else {
            // Check if the user is trying to select an option
            checkForCorrectAnswer(transcript);
        }
    } else {
        print("Interim transcription received.");
    }
}

// Function to reset text colors without changing state
function resetTextColors() {
    optionTextComponents.forEach(component => {
        if (component) {
            component.textFill.color = DEFAULT_TEXT_COLOR;
        }
    });
    print("Text colors reset");
}

function checkForCorrectAnswer(transcript) {
    // Only check if we have a valid correct option
    if (correctOptionIndex >= 0 && correctOptionIndex < optionTextComponents.length) {
        let selectedIndex = -1;
        
        // Check for phrases like "spot 1", "option 2", "number 3", etc.
        const spotMatches = transcript.match(/\b(spot|option|number)\s*(\d)\b/i);
        if (spotMatches && spotMatches.length >= 3) {
            const spotNumber = parseInt(spotMatches[2]);
            // Convert to zero-based index (spot 1 = index 0)
            selectedIndex = spotNumber - 1;
        }
        
        // Check for spoken numbers like "one", "two", "three", "four"
        else if (transcript.includes("one") || transcript.includes("1")) {
            selectedIndex = 0;
        }
        else if (transcript.includes("two") || transcript.includes("2")) {
            selectedIndex = 1;
        }
        else if (transcript.includes("three") || transcript.includes("3")) {
            selectedIndex = 2;
        }
        else if (transcript.includes("four") || transcript.includes("4")) {
            selectedIndex = 3;
        }
        
        // If no position-based selection was made, check for content-based selection
        if (selectedIndex === -1) {
            // Check each option's text content
            for (let i = 0; i < optionTextComponents.length; i++) {
                const optionText = optionTextComponents[i].text.toLowerCase();
                
                // If the option has meaningful text (not empty)
                if (optionText && optionText.length > 0) {
                    // For emoji/tone view, we need to be more specific since texts are short
                    if (currentState === STATE.EMOJI_CHOICES) {
                        // Split by space to check emoji and tone word separately
                        const parts = optionText.split(" ");
                        if (parts.length >= 2) {
                            // Check if transcript contains either the emoji or the tone word
                            if (transcript.includes(parts[0]) || transcript.includes(parts[1])) {
                                selectedIndex = i;
                                print("Selected by emoji/tone word match: " + optionText);
                                break;
                            }
                        }
                    } 
                    // For response view, we can check for key phrases or exact match
                    else if (currentState === STATE.RESPONSES) {
                        // Look for unique substrings (at least 5 chars) from the option text
                        const uniquePhrases = findUniquePhrases(optionText, 5);
                        
                        // Check if any unique phrase is in the transcript
                        for (let phrase of uniquePhrases) {
                            if (transcript.includes(phrase)) {
                                selectedIndex = i;
                                print("Selected by response text match: " + phrase);
                                break;
                            }
                        }
                        
                        // If found a match, break the outer loop too
                        if (selectedIndex !== -1) break;
                    }
                }
            }
        }
        
        // If a valid index was selected, highlight it appropriately
        if (selectedIndex >= 0 && selectedIndex < optionTextComponents.length) {
            print("User selected position " + (selectedIndex + 1) + " (index " + selectedIndex + ")");
            
            // Check if the selected position is the correct one
            if (selectedIndex === correctOptionIndex) {
                print("Correct answer detected!");
                // Set the correct option text to green
                optionTextComponents[correctOptionIndex].textFill.color = CORRECT_TEXT_COLOR;
            } else {
                print("Incorrect selection detected.");
                // Set the selected (but incorrect) option text to red
                optionTextComponents[selectedIndex].textFill.color = INCORRECT_TEXT_COLOR;
                // Also show the correct answer in green
                optionTextComponents[correctOptionIndex].textFill.color = CORRECT_TEXT_COLOR;
            }
        }
    }
}

// Helper function to find unique phrases in a string
function findUniquePhrases(text, minLength) {
    const phrases = [];
    
    // Simple approach: extract words and short phrases
    const words = text.split(/\s+/);
    
    // Add individual words that are long enough
    for (let i = 0; i < words.length; i++) {
        if (words[i].length >= minLength) {
            phrases.push(words[i]);
        }
    }
    
    // Add sequential word pairs
    for (let i = 0; i < words.length - 1; i++) {
        phrases.push(words[i] + ' ' + words[i + 1]);
    }
    
    // Add some partial sentences if text is long
    if (text.length > 20) {
        // Get the first part of the text
        phrases.push(text.substring(0, Math.min(20, text.length)));
        
        // Get the middle part if long enough
        if (text.length > 30) {
            const midStart = Math.floor(text.length / 2) - 10;
            phrases.push(text.substring(midStart, Math.min(midStart + 20, text.length)));
        }
    }
    
    return phrases;
}

function cycleToNextState() {
    // If we have a stored response
    if (lastResponse) {
        if (currentState === STATE.EMOJI_CHOICES) {
            // Switch to showing responses
            currentState = STATE.RESPONSES;
            displayResponsesFromLastData();
            // Update the correct option index for this view
            correctOptionIndex = responseCorrectIndex;
            // Update the title text
            if (script.titleText) {
                script.titleText.text = "What response do you think would be good in this scenario?";
            }
        } else {
            // Either already in RESPONSES state or HIDDEN, return to emoji choices
            currentState = STATE.EMOJI_CHOICES;
            displayEmojiChoicesFromLastData();
            // Update the correct option index for this view
            correctOptionIndex = emojiCorrectIndex;
            // Update the title text
            if (script.titleText) {
                script.titleText.text = "How was the person feeling when they said this?";
            }
        }
    } else {
        print("No response data available to cycle through states");
    }
}

const optionTextComponents = [
    script.option1,
    script.option2,
    script.option3,
    script.option4,
];

async function startPractice(transcript) {
    try {
        const request = new Request("https://d2ba-50-168-180-218.ngrok-free.app/analyze_rec_custom", {
            method: 'POST',
            body: JSON.stringify({ text: transcript }),
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const response = await remoteServiceModule.fetch(request);

        if (response.status === 200) {
            const jsonResponse = await response.json();
            print('Backend response: ' + JSON.stringify(jsonResponse));

            // Store the response for cycling through states
            lastResponse = jsonResponse;
            
            // Store the original options array before any shuffling
            if (jsonResponse.options && Array.isArray(jsonResponse.options)) {
                originalOptions = [...jsonResponse.options];
            }
            
            // Display the transcribed text
            if (script.text) {
                script.text.text = jsonResponse.input;
            }

            // Set state to show emoji choices first
            currentState = STATE.EMOJI_CHOICES;
            
            // Show the options container
            showOptions();
            
            // Set the title text
            if (script.titleText) {
                script.titleText.text = "How was the person feeling when they said this?";
            }
            
            // Generate different random orders for each view
            generateShuffledOrders();
            
            // Display emoji choices first
            displayEmojiChoicesFromLastData();
            
            // Set the correct option index for emoji view
            correctOptionIndex = emojiCorrectIndex;
            
        } else {
            const errorText = await response.text();
            print('Backend error: ' + errorText);
        }
    } catch (error) {
        print('Network error: ' + error);
    }
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    let currentIndex = array.length;
    let temporaryValue, randomIndex;

    // While there remain elements to shuffle
    while (currentIndex !== 0) {
        // Pick a remaining element
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // Swap it with the current element
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

// Generate shuffled orders for both views
function generateShuffledOrders() {
    if (!originalOptions || originalOptions.length === 0) {
        print("No options to shuffle");
        return;
    }

    // Create arrays with indices [0, 1, 2, 3]
    shuffledEmojiOrder = [0, 1, 2, 3].slice(0, originalOptions.length);
    shuffledResponseOrder = [0, 1, 2, 3].slice(0, originalOptions.length);
    
    // Shuffle both arrays differently
    shuffleArray(shuffledEmojiOrder);
    shuffleArray(shuffledResponseOrder);
    
    print("Emoji order: " + JSON.stringify(shuffledEmojiOrder));
    print("Response order: " + JSON.stringify(shuffledResponseOrder));
    
    // Find the correct option in original data
    let originalCorrectIndex = -1;
    for (let i = 0; i < originalOptions.length; i++) {
        if (originalOptions[i].startsWith('*')) {
            originalCorrectIndex = i;
            break;
        }
    }
    
    // Map the correct index to each shuffled order
    if (originalCorrectIndex !== -1) {
        // Find where the original correct index ended up in each shuffled order
        for (let i = 0; i < shuffledEmojiOrder.length; i++) {
            if (shuffledEmojiOrder[i] === originalCorrectIndex) {
                emojiCorrectIndex = i;
                break;
            }
        }
        
        for (let i = 0; i < shuffledResponseOrder.length; i++) {
            if (shuffledResponseOrder[i] === originalCorrectIndex) {
                responseCorrectIndex = i;
                break;
            }
        }
        
        print("Original correct index: " + originalCorrectIndex);
        print("Emoji correct index: " + emojiCorrectIndex);
        print("Response correct index: " + responseCorrectIndex);
    }
}

function displayEmojiChoicesFromLastData() {
    if (!lastResponse || !originalOptions.length === 0 || shuffledEmojiOrder.length === 0) {
        print("No valid options data available");
        return;
    }
    
    // Make sure UI is visible
    showOptions();
    
    // Reset all text colors first
    optionTextComponents.forEach(component => {
        if (component) {
            component.textFill.color = DEFAULT_TEXT_COLOR;
        }
    });
    
    // Process each option to display emoji + emotion word using shuffled order
    for (let displayIndex = 0; displayIndex < shuffledEmojiOrder.length; displayIndex++) {
        if (displayIndex < optionTextComponents.length) {
            // Get the original option index from shuffled order
            const originalIndex = shuffledEmojiOrder[displayIndex];
            let option = originalOptions[originalIndex];
            
            // Remove asterisk if present
            if (option.startsWith('*')) {
                option = option.substring(1).trim();
            }
            
            // Split the option by commas
            const parts = option.split(',');
            
            if (parts.length >= 2) {
                // Extract emoji (from the first part) - clean any numbers or periods
                const emoji = parts[0].trim().replace(/^\d+\.?\s*/, '');
                
                // Extract the first word after the first comma (the tone word)
                // Remove any numbers or periods that might be present
                const toneWord = parts[1].trim().split(' ')[0].replace(/^\d+\.?\s*/, '');
                
                // Combine emoji and tone word without any numbers
                optionTextComponents[displayIndex].text = emoji + " " + toneWord;
            } else {
                // Fallback if the expected format isn't found
                optionTextComponents[displayIndex].text = option.replace(/^\d+\.?\s*/, '');
            }
        }
    }
}

function displayResponsesFromLastData() {
    if (!lastResponse || !originalOptions.length === 0 || shuffledResponseOrder.length === 0) {
        print("No valid options data available");
        return;
    }
    
    // Make sure UI is visible
    showOptions();
    
    // Reset all text colors first
    optionTextComponents.forEach(component => {
        if (component) {
            component.textFill.color = DEFAULT_TEXT_COLOR;
        }
    });
    
    // Process each option to display full response suggestions using shuffled order
    for (let displayIndex = 0; displayIndex < shuffledResponseOrder.length; displayIndex++) {
        if (displayIndex < optionTextComponents.length) {
            // Get the original option index from shuffled order
            const originalIndex = shuffledResponseOrder[displayIndex];
            let option = originalOptions[originalIndex];
            
            // Remove asterisk if present
            if (option.startsWith('*')) {
                option = option.substring(1).trim();
            }
            
            // First approach: Find the response part by looking for the pattern after tone
            const tonePatternMatch = option.match(/,\s*\w+\s+tone,\s*(.+)$/);
            
            if (tonePatternMatch && tonePatternMatch[1]) {
                // We found the pattern and extracted the content after "tone,"
                let responseText = tonePatternMatch[1].trim();
                
                // Remove any surrounding quotes
                responseText = responseText.replace(/^"/, '').replace(/"$/, '');
                
                // Update the text component with the clean response text
                optionTextComponents[displayIndex].text = responseText;
            } else {
                // Fallback extraction method - get everything after second comma
                const parts = option.split(',');
                if (parts.length >= 3) {
                    // Join all parts after the second comma (handle cases with commas in response)
                    let responseText = parts.slice(2).join(',').trim();
                    
                    // Remove any surrounding quotes
                    responseText = responseText.replace(/^"/, '').replace(/"$/, '');
                    
                    // Update the text component
                    optionTextComponents[displayIndex].text = responseText;
                } else {
                    // Last resort fallback
                    optionTextComponents[displayIndex].text = option.trim().replace(/^"/, '').replace(/"$/, '');
                }
            }
        }
    }
}