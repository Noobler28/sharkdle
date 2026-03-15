const today = new Date().toISOString().split('T')[0]

const dailySharkIndex = hashDate(today) % sharks.length
const targetShark = sharks[dailySharkIndex]

let attempts = 12
let guesses = []
let gameCompleted = false
let gameWon = false

const messageDiv = document.getElementById("message");



// Load game state from localStorage
function loadGameState() {
    const stored = localStorage.getItem(`daily_${today}`)
    if (stored) {
        const state = JSON.parse(stored)
        guesses = state.guesses || []
        attempts = state.attempts || 12
        gameCompleted = state.completed || false
        gameWon = state.won || false
    }
}

// Save game state to localStorage
function saveGameState() {
    const state = {
        guesses: guesses,
        attempts: attempts,
        completed: gameCompleted,
        won: gameWon
    }
    localStorage.setItem(`daily_${today}`, JSON.stringify(state))
}

// Initialize game
loadGameState()

// Set attempts display if game not completed
if (!gameCompleted) {
    document.getElementById("attempts-left").textContent = "Attempts left: " + attempts;
}

// If game already completed, show the result
if (gameCompleted) {
    if (gameWon) {
        showWin(0, guesses.length) // XP already gained
    } else {
        showLose()
    }
    // Disable input
    document.getElementById("sharkGuess").disabled = true
    document.getElementById("guessBtn").disabled = true
    document.getElementById("attempts-left").textContent = "Game completed for today"
}

// Render existing guesses
guesses.forEach(guess => {
    renderGuess(guess.shark, guess.feedback)
})

// Close guesses with no correct information
const cards = document.querySelectorAll('#guesses .guess-card');
cards.forEach(card => {
    const feedbackDiv = card.querySelector('.feedback');
    const correctCount = feedbackDiv.querySelectorAll('.correct').length;
    if (correctCount === 0) {
        feedbackDiv.style.display = 'none';
    }
});

function hashDate(date){

let hash=0

for(let i=0;i<date.length;i++){

hash=(hash<<5)-hash+date.charCodeAt(i)
hash|=0

}

return Math.abs(hash)

}


document.getElementById("guessBtn").onclick = makeGuess

// Allow Enter key to submit guess
document.getElementById("sharkGuess").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        makeGuess();
    }
});

// Autocomplete functionality
const sharkGuessInput = document.getElementById("sharkGuess");
const suggestionsDiv = document.getElementById("suggestions");

sharkGuessInput.addEventListener("input", function() {
    const input = this.value.toLowerCase().trim();
    
    if (input.length === 0) {
        suggestionsDiv.classList.remove("active");
        return;
    }
    
    // Filter sharks that match the input
    const matches = sharks.filter(shark => 
        shark.name.toLowerCase().includes(input)
    ).slice(0, 10); // Limit to 10 suggestions
    
    if (matches.length === 0) {
        suggestionsDiv.classList.remove("active");
        return;
    }
    
    // Build suggestions HTML
    suggestionsDiv.innerHTML = matches.map(shark => 
        `<div class="suggestion-item" onclick="selectShark('${shark.name}')">${shark.name}</div>`
    ).join("");
    
    suggestionsDiv.classList.add("active");
});

// Close suggestions when clicking outside
document.addEventListener("click", function(event) {
    if (event.target !== sharkGuessInput && !event.target.closest(".suggestions-dropdown")) {
        suggestionsDiv.classList.remove("active");
    }
});

function selectShark(sharkName) {
    document.getElementById("sharkGuess").value = sharkName;
    document.getElementById("suggestions").classList.remove("active");
}


function makeGuess(){

if (gameCompleted) return

const input = document.getElementById("sharkGuess")
const guess = input.value.toLowerCase()

// Clear previous message
if (messageDiv) messageDiv.textContent = "";

const shark = sharks.find(s=>s.name.toLowerCase().startsWith(guess))

if(!shark) {
    if (messageDiv) messageDiv.textContent = "Shark not found in the list.";
    return;
}

// Check if already guessed
if (guesses.some(g => g.shark.name === shark.name)) {
    if (messageDiv) messageDiv.textContent = "You already guessed this shark.";
    return;
}

attempts--

document.getElementById("attempts-left").textContent="Attempts left: "+attempts

const feedback = {
    family: shark.family === targetShark.family,
    order: shark.order === targetShark.order,
    genus: shark.genus === targetShark.genus,
    yod: shark.yod === targetShark.yod
}

guesses.push({ shark: shark, feedback: feedback })
saveGameState()

renderGuess(shark, feedback)

// Close guesses with no correct information, then open the newest
const cards = document.querySelectorAll('#guesses .guess-card');
cards.forEach(card => {
    const feedbackDiv = card.querySelector('.feedback');
    const correctCount = feedbackDiv.querySelectorAll('.correct').length;
    if (correctCount === 0) {
        feedbackDiv.style.display = 'none';
    }
});
// Open the newest (first) guess
if (cards.length > 0) {
    const newestFeedback = cards[0].querySelector('.feedback');
    newestFeedback.style.display = 'flex';
}

if(shark.name === targetShark.name){

    // Track total guesses for this game
    const guessesTaken = 12 - attempts;

    // Calculate XP gain (170 - 10 per guess, minimum 50)
    const xpGain = Math.max(50, 170 - guessesTaken * 10);

    // Save stats to localStorage
    let profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");

    // Track total guesses accumulated
    profileData.totalGuesses = (profileData.totalGuesses || 0) + guessesTaken;

    // Update stats
    profileData.gamesPlayed = (profileData.gamesPlayed || 0) + 1;
    profileData.wins = (profileData.wins || 0) + 1;
    profileData.currentStreak = (profileData.currentStreak || 0) + 1;
    profileData.highestStreak = Math.max(profileData.highestStreak || 0, profileData.currentStreak);
    
    // Update best game (fewest guesses)
    if (!profileData.bestGame || profileData.bestGame === 'N/A' || guessesTaken < parseInt(profileData.bestGame)) {
        profileData.bestGame = guessesTaken;
    }
    
    // Calculate and save average guesses
    if (profileData.gamesPlayed > 0) {
        profileData.averageGuesses = (profileData.totalGuesses / profileData.gamesPlayed).toFixed(2);
    }

    // Gain XP and save to totalXP for Shark Pass
    profileData.totalXP = (profileData.totalXP || 0) + xpGain;

    localStorage.setItem("userProfile", JSON.stringify(profileData));

    // Sync to Firebase
    if (typeof syncStatsToFirebase !== 'undefined') {
        syncStatsToFirebase();
    }

    gameCompleted = true
    gameWon = true
    saveGameState()

    // Update display
    if (typeof window.updateIndexStats !== 'undefined') {
        window.updateIndexStats();
    }

    showWin(xpGain, guessesTaken);

}

if(attempts===0){

    if (window.currentUser) {
        let profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");

        // Track total guesses for this game (all 12 attempts used)
        const guessesTaken = 12;
        profileData.totalGuesses = (profileData.totalGuesses || 0) + guessesTaken;

        // Update stats
        profileData.gamesPlayed = (profileData.gamesPlayed || 0) + 1;
        profileData.losses = (profileData.losses || 0) + 1;
        profileData.currentStreak = 0; // Reset streak on loss
        
        // Calculate and save average guesses
        if (profileData.gamesPlayed > 0) {
            profileData.averageGuesses = (profileData.totalGuesses / profileData.gamesPlayed).toFixed(2);
        }

        localStorage.setItem("userProfile", JSON.stringify(profileData));

        // Sync to Firebase
        if (typeof syncStatsToFirebase !== 'undefined') {
            syncStatsToFirebase();
        }
    }

    gameCompleted = true
    gameWon = false
    saveGameState()

    // Update display
    if (typeof window.updateIndexStats !== 'undefined') {
        window.updateIndexStats();
    }

    showLose()

}

input.value=""

}


function renderGuess(shark, feedback){

const card = document.createElement("div")
card.className="guess-card"

card.innerHTML = `<b>${shark.name}</b> (click)`


const feedbackDiv = document.createElement("div")
feedbackDiv.className="feedback"

feedbackDiv.appendChild(createCategory("Family", shark.family, feedback.family))
feedbackDiv.appendChild(createCategory("Order", shark.order, feedback.order))
feedbackDiv.appendChild(createCategory("Genus", shark.genus, feedback.genus))

// Calculate arrow for year of discovery
let yodArrow = ""
if (shark.yod !== targetShark.yod) {
    yodArrow = shark.yod < targetShark.yod ? "⬆️" : "⬇️"
}
feedbackDiv.appendChild(createCategory("Year of Discovery", shark.yod, feedback.yod, yodArrow))


card.appendChild(feedbackDiv)


card.onclick = ()=>{

feedbackDiv.style.display = feedbackDiv.style.display==="flex"?"none":"flex"

}


document.getElementById("guesses").prepend(card)

}


function createCategory(name, value, correct, arrow = ""){

const div = document.createElement("div")

div.className="category"

if(correct) div.classList.add("correct")

if(arrow) {
    div.textContent = `${name}: ${value} ${arrow}`
} else {
    div.textContent = `${name}: ${value}`
}

return div

}


function createBubbles(container) {
    for (let i = 0; i < 10; i++) {
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.style.width = `${Math.random() * 20 + 10}px`;
        bubble.style.height = bubble.style.width;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        bubble.style.bottom = '0';  
        container.appendChild(bubble);
    }
}

function showWin(xpGained, guessesTaken){

const win = document.getElementById("win-screen")

win.style.display="block"
win.classList.add("win")
win.classList.remove("lose")

win.innerHTML = `
<h2 style="margin-top: 0; font-size: 32px; margin-bottom: 20px;">🎉 You Found It!</h2>
<p style="font-size: 18px; margin: 10px 0; color: inherit;">The shark was <b>${targetShark.name}</b></p>
<p style="font-size: 16px; margin: 10px 0; opacity: 0.9;">Discovered in ${targetShark.yod}</p>
<p style="font-size: 16px; margin: 10px 0; opacity: 0.9;">You took ${guessesTaken} guess${guessesTaken !== 1 ? 'es' : ''}.</p>
<div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
    <p style="font-size: 28px; font-weight: bold; margin: 0; color: inherit;">+${xpGained} XP</p>
</div>
<div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
    <button onclick="window.location.href='infinite.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(255,255,255,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Play Infinite</button>
    <button onclick="window.location.href='index.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(0,0,0,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Back to Home</button>
</div>
`

createBubbles(win);

}


function showLose(){

const win = document.getElementById("win-screen")

win.style.display="block"
win.classList.add("lose")
win.classList.remove("win")

win.innerHTML = `
<h2 style="margin-top: 0; font-size: 32px; margin-bottom: 20px;">😢 You Lost</h2>
<p style="font-size: 18px; margin: 10px 0; color: inherit;">The shark was <b>${targetShark.name}</b></p>
<p style="font-size: 16px; margin: 10px 0; opacity: 0.9;">Discovered in ${targetShark.yod}</p>
<div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
    <button onclick="window.location.href='infinite.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(255,255,255,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Play Infinite</button>
    <button onclick="window.location.href='index.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(0,0,0,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Back to Home</button>
</div>
`
}

// Console command for testing: revealShark() - Dev only
window.revealShark = function() {
    const DEV_UID = 'ETPtQC0VA2NiSnX67rS2P2ma2tC2';
    if (!firebase.auth().currentUser || firebase.auth().currentUser.uid !== DEV_UID) {
        console.log("Access denied. This command is for developers only.");
        return;
    }
    console.log("TESTING ONLY: The target shark is: " + targetShark.name);
};

async function submitStatsToLeaderboard(won, guesses) {
    try {
        // Only submit if user is authenticated
        if (!firebase.auth().currentUser) {
            console.log("User not authenticated, skipping leaderboard submission");
            return;
        }

        const username = firebase.auth().currentUser.displayName || firebase.auth().currentUser.email || "Anonymous";
        const docRef = db.collection("leaderboard").doc();
        await docRef.set({
            username: username,
            won: won,
            guesses: guesses,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            mode: "daily",
            userId: firebase.auth().currentUser.uid  // optional: track user ID
        });
        console.log("Stats submitted successfully");
    } catch (error) {
        console.error("Error submitting stats:", error);
    }
}

async function submitStatsToLeaderboard(won, guesses) {
    try {
        // Only submit if user is authenticated
        if (!firebase.auth().currentUser) {
            console.log("User not authenticated, skipping leaderboard submission");
            return;
        }

        const username = firebase.auth().currentUser.displayName || firebase.auth().currentUser.email || "Anonymous";
        const docRef = db.collection("leaderboard").doc();
        await docRef.set({
            username: username,
            won: won,
            guesses: guesses,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            mode: "daily",
            userId: firebase.auth().currentUser.uid  // optional: track user ID
        });
        console.log("Stats submitted successfully");
    } catch (error) {
        console.error("Error submitting stats:", error);
    }
}
