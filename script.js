const searchInput = document.getElementById('searchInput');
const micBtn = document.getElementById('micBtn');
const clearBtn = document.getElementById('clearBtn');
const searchSubmitBtn = document.getElementById('searchSubmitBtn');
const langSelect = document.getElementById('langSelect');
const statusText = document.getElementById('statusText');
const glassCard = document.querySelector('.glass-card');
const recentContainer = document.getElementById('recentContainer');
const recentHeader = document.getElementById('recentHeader');
const chipsList = document.getElementById('chipsList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

//state veriables
let recognition = null;
let isListening = false;
let finalTranscript = '';
const STORAGE_KEY = 'voice_search_recent';

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        handleUnsupportBrowser();
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = langSelect.value;

    recognition.onstart = () => {
        isListening = true;
        updateUI('listening');
    };

    recognition.onresult = (event) => {
        let interim = '';
        finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptSegment = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcriptSegment;
            } else {
                interim += transcriptSegment;
            }
        }

        if (finalTranscript) {
            searchInput.value = finalTranscript.trim();
            updateUI('success');

            addSearchHistory(searchInput.value);
            executeGoogleSearch(searchInput.value);
        } else if (interim) {
            searchInput.value = interim;
            updateUI('listening-interim', interim);
        }

        toggleClearButton();
    };

    recognition.onerror = (event) => {
        handleError(event.error);
    };
    
    recognition.onend = () => {
        if(isListening) {
            isListening = false;
            updateUI('idle');
        }
    };
}

//handle browser lacking web speech API

function handleUnsupportBrowser() {
    micBtn.disabled = true;
    micBtn.title = "Web Speech API not supported in this browser";
    updateUI('unsupported');
}

//start voice recognition
function startListening() {
    if (!recognition) return;
    try {
        recognition.lang = langSelect.value;
        finalTranscript = '';
        recognition.start();
    } catch (e) {
        console.error(e);
        stopListening();
    }
}

//stop voice recognition
function stopListening() {
    if(!recognition) return;
    try {
        isListening = false;
        recognition.stop();
        updateUI('idle');
    } catch (e) {
        console.error(e);
    }
}

//toggle Listening state on mic click
function toggleListening() {
    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

//update ui state 
function updateUI(state, message = '') {
    glassCard.classList.remove('is-listening', 'is-success', 'is-error');
    switch (state) {
        case 'idle':
            isListening = false;
            micBtn.setAttribute('aria-label', 'Start voice search');
            micBtn.title = 'Click to speak';
            statusText.textContent = 'Tap the mic and speak';
            break;
        
        case 'listening':
            isListening = true;
            glassCard.classList.add('is-listening');
            micBtn.setAttribute('aria-label', 'Stop listening');
            micBtn.title = "Listening... Click to stop";
            statusText.textContent = "Listening...";
            break;

        case 'listening-interim':
            isListening = true;
            glassCard.classList.add('is-listening');
            statusText.textContent = `Heard: "${message}"`;
            break;

        case 'success':
            isListening = false;
            glassCard.classList.add('is-success');
            statusText.textContent = "Search complete! Opening Google...";
            setTimeout(() => updateUI('idle'), 3000);
            break;

        case 'error':
            isListening = false;
            glassCard.classList.add('is-error');
            statusText.textContent = message;
            setTimeout(() => updateUI('idle'), 4000);
            break;

        case 'unsupported':
            isListening = false;
            statusText.textContent = "Speech recognition not supported in this browser";
            break;
    }
}

//error handler 
function handleError(errorType) {
    let friendMessage = "An error occured during recognition.";

    switch (errorType) {
        case 'not-allowed':
        case 'service-not-allowed':
            friendMessage = 'Microphone permission denied. Please allow mic access.';
            break;
        case 'no-speech':
            friendMessage = "No Speech detected. Please try again.";
            break;
        case 'audio-capture':
            friendMessage = "No microphonefound. Please check your device";
            break;
        case 'network':
            friendMessage = "Network error. Speech server requires internet";
            break;
        case 'aborted':
            friendMessage = `Error: ${errorType}`;
            break;
    }

    updateUI('error', friendMessage);
}


//execute Google search in a new tab
function executeGoogleSearch(query) {
    if (!query || !query.trim()) return;
    const cleanQuery = encodeURIComponent(query.trim());
    const searchUrl = `https://google.com/search?q=${cleanQuery}`;

    window.open(searchUrl, '_blank', 'noopener,noreferrer');
}

//toggle clear function
function toggleClearButton() {
    if (searchInput.value.trim().length > 0) {
        clearBtn.classList.remove('hidden');
    } else {
        clearBtn.classList.add('hidden');
    }
}

//local storage search history
function getSearchHistory() {
    try {
        const history = localStorage.getItem(STORAGE_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        return [];
    }
}

function addSearchHistory(query) {
    if (!query || !query.trim()) return;
    const term = query.trim();
    let history = getSearchHistory();

    history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
    history.unshift(term);

    if (history.length > 5) {
        history = history.slice(0, 5);
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
        console.error(e);
    }

    renderSearchHistory();
}

function renderSearchHistory() {
    const history = getSearchHistory();
    chipsList.innerHTML = '';

    if (history.length === 0) {
        recentHeader.classList.add('hidden');
        return;
    }

    recentHeader.classList.remove('hidden');
    history.forEach(term => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'search-chip';

        chip.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${term}`;
        chip.setAttribute('aria-label', `Search for ${term}`);

        chip.addEventListener('click', () => {
            searchInput.value = term;
            toggleClearButton();
            executeGoogleSearch(term);
        });

        chipsList.appendChild(chip);
    });
}

function clearSearchHistory() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error(e);
    }

    renderSearchHistory();
}

function initEventListeners() {
    micBtn.addEventListener('click', toggleListening);

    micBtn.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            toggleListening();
        }
    });

    searchInput.addEventListener('input', () => {
        toggleClearButton();
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value;
            if (query.trim()) {
                addSearchHistory(query);
                executeGoogleSearch(query);
            }
        }
    });

    searchSubmitBtn.addEventListener('click', () => {
        const query = searchInput.value;
        if (query.trim()) {
            addSearchHistory(query);
            executeGoogleSearch(query);
        }
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        toggleClearButton();
        searchInput.focus();
        statusText.textContent = "Tap the mic and speak";
    });

    clearHistoryBtn.addEventListener(
        'click', clearSearchHistory
    );
}

//initialize on DO< load
document.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    initEventListeners();
    renderSearchHistory();
    toggleClearButton();
});
