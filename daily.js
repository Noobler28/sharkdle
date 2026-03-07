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

// If game already completed, show the result
if (gameCompleted) {
    if (gameWon) {
        showWin(0) // XP already gained
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
    genus: shark.genus === targetShark.genus
}

guesses.push({ shark: shark, feedback: feedback })
saveGameState()

renderGuess(shark, feedback)

if(shark.name === targetShark.name){

    // Track total guesses for this game
    const guessesTaken = 13 - attempts;

    if (window.currentUser) {
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
        const xpGain = 40 + attempts * 5;
        profileData.totalXP = (profileData.totalXP || 0) + xpGain;

        localStorage.setItem("userProfile", JSON.stringify(profileData));

        // Sync to Firebase
        if (typeof syncStatsToFirebase !== 'undefined') {
            syncStatsToFirebase();
        }
    }

    gameCompleted = true
    gameWon = true
    saveGameState()

    // Update display
    if (typeof window.updateIndexStats !== 'undefined') {
        window.updateIndexStats();
    }

    showWin(xpGain);

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


card.appendChild(feedbackDiv)


card.onclick = ()=>{

feedbackDiv.style.display = feedbackDiv.style.display==="flex"?"none":"flex"

}


document.getElementById("guesses").prepend(card)

}


function createCategory(name, value, correct){

const div = document.createElement("div")

div.className="category"

if(correct) div.classList.add("correct")

div.textContent = `${name}: ${value}`

return div

}


function showWin(xpGained){

const win = document.getElementById("win-screen")

win.style.display="block"

win.innerHTML = `
<h2>🎉 You Found It!</h2>
<p>The shark was ${targetShark.name}</p>
<p>XP gained: +${xpGained}</p>
<div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
    <button onclick="window.location.href='infinite.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(255,255,255,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Play Infinite</button>
    <button onclick="window.location.href='index.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(0,0,0,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Back to Home</button>
</div>
`

}


function showLose(){

const win = document.getElementById("win-screen")

win.style.display="block"

win.innerHTML = `
<h2>😢 You Lost</h2>
<p>The shark was ${targetShark.name}</p>
<div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
    <button onclick="window.location.href='infinite.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(255,255,255,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Play Infinite</button>
    <button onclick="window.location.href='index.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(0,0,0,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Back to Home</button>
</div>
`
}
