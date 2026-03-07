// Firebase SDKs
// Note: Firebase scripts are included in HTML

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAS9l8O1jRMafPt3r0lF6mqjr2-gl-EbZ0",
    authDomain: "sharkdle-leaderboard.firebaseapp.com",
    databaseURL: "https://sharkdle-leaderboard-default-rtdb.firebaseio.com",
    projectId: "sharkdle-leaderboard",
    storageBucket: "sharkdle-leaderboard.firebasestorage.app",
    messagingSenderId: "429123174628",
    appId: "1:429123174628:web:42ae9baed69c4b087c2cf1",
    measurementId: "G-HV5FFNKM5C"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const common_names = [
    // Orders
    {"scientific": "Carcharhiniformes", "Common": "Ground Sharks"},
    {"scientific": "Orectolobiformes", "Common": "Carpet Sharks"},
    {"scientific": "Lamniformes", "Common": "Mackerel Sharks"},
    {"scientific": "Heterodontiformes", "Common": "Bullhead Sharks"},
    {"scientific": "Squantiniformes", "Common": "Angel Sharks"},
    {"scientific": "Pristiophoriformes", "Common": "Saw Sharks"},
    {"scientific": "Squaliformes", "Common": "Dog Fish"},
    {"scientific": "Hexanchiformes", "Common": "Cow and Frilled Sharks"},
    // Families
    {"scientific": "Sphyrnidae", "Common": "Hammerhead Sharks"},
    {"scientific": "Carcharhinidae", "Common": "Requiem Sharks"},
    {"scientific": "Stegostinatidae", "Common": "Zebra Sharks"},
    {"scientific": "Rhincodontidae", "Common": "Whale Sharks"},
    {"scientific": "Orectolobidae", "Common": "Wobbegong Sharks"},
    {"scientific": "Hemiscylliidae", "Common": "Bamboo Sharks"},
    {"scientific": "Ginglymostomatidae", "Common": "Nurse Sharks"},
    {"scientific": "Dalatiidae", "Common": "Kitefin Sharks"},
    {"scientific": "Etmopteridae", "Common": "Lantern Sharks"},
    {"scientific": "Echinorhinidae", "Common": "Bramble Sharks"},
    {"scientific": "Odontaspididae", "Common": "Sand Tiger Sharks"},
    {"scientific": "Megachasmidae", "Common": "Megamouth Sharks"},
    {"scientific": "Lamnidae", "Common": "Mackerel Sharks"},
    {"scientific": "Hexanchidae", "Common": "Cow Sharks"},
    {"scientific": "Centrophoridae", "Common": "Gulper Sharks"},
    {"scientific": "Pristiophoridae", "Common": "Saw Sharks"},
    {"scientific": "Squatinidae", "Common": "Angel Sharks"},
    {"scientific": "Heterodontidae", "Common": "Bullhead Sharks"},
    {"scientific": "Alopiidae", "Common": "Thresher Sharks"},
    {"scientific": "Cetorhinidae", "Common": "Basking Sharks"},
    {"scientific": "Mitsukurinidae", "Common": "Goblin Sharks"},
    {"scientific": "Brachaeluridae", "Common": "Blind Sharks"},
    {"scientific": "Chlamydoselachidae", "Common": "Frilled Sharks"},
    {"scientific": "Pseudocarchariidae", "Common": "Crocodile Sharks"},
    {"scientific": "Somniosidae", "Common": "Sleeper Sharks"},
    {"scientific": "Pentachidae", "Common": "Deep-Sea CatSharks"},
    {"scientific": "Glyphis", "Common": "River Sharks"},
    {"scientific": "Haploblepharus", "Common": "ShySharks"},
];

let targetShark = sharks[Math.floor(Math.random() * sharks.length)];
let attempts = 12;
// practice mode removed; always count down and store stats


// Developer console command to reveal the correct shark
window.revealShark = function() {
    console.log("The correct shark is: " + targetShark.name);
};

function getLessSpecificName(sharkName) {
    const words = sharkName.split(' ');
    if (words.length > 1) {
        return words.slice(0, -1).join(' ');
    }
    return sharkName;
}

function normalizeInput(input) {
    return input.replace(/\s+/g, '').toLowerCase();
}

function updateStats(isWin, guessesTaken = 0) {
    // Load current stats
    const stats = {
        gamesPlayed: parseInt(localStorage.getItem('games') || 0),
        wins: parseInt(localStorage.getItem('wins') || 0),
        losses: parseInt(localStorage.getItem('losses') || 0),
        totalGuesses: parseInt(localStorage.getItem('totalGuesses') || 0),
        currentStreak: parseInt(localStorage.getItem('currentStreak') || 0),
        highestStreak: parseInt(localStorage.getItem('highestStreak') || 0),
        bestGame: localStorage.getItem('bestGame') || 'N/A',
    };

    stats.gamesPlayed++;
    if (isWin) {
        stats.wins++;
        stats.totalGuesses += guessesTaken;
        stats.currentStreak++;
        stats.highestStreak = Math.max(stats.highestStreak, stats.currentStreak);
        // Update best game (fewest guesses)
        if (stats.bestGame === 'N/A' || guessesTaken < parseInt(stats.bestGame)) {
            stats.bestGame = guessesTaken;
        }
    } else {
        stats.losses++;
        stats.currentStreak = 0;
    }

    // Save updated stats to localStorage
    localStorage.setItem('games', stats.gamesPlayed);
    localStorage.setItem('wins', stats.wins);
    localStorage.setItem('losses', stats.losses);
    localStorage.setItem('totalGuesses', stats.totalGuesses);
    localStorage.setItem('currentStreak', stats.currentStreak);
    localStorage.setItem('highestStreak', stats.highestStreak);
    localStorage.setItem('bestGame', stats.bestGame);
    // Calculate and save average guesses
    if (stats.wins > 0) {
        localStorage.setItem('averageGuesses', (stats.totalGuesses / stats.wins).toFixed(2));
    }

    // Add to recent games
    const recentGames = JSON.parse(localStorage.getItem('recentGames') || '[]');
    const now = new Date();
    recentGames.unshift({
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        result: isWin ? 'Win' : 'Loss',
        guesses: isWin ? guessesTaken : 'X',
        sharkName: targetShark.name,
        mode: 'Infinite'
    });
    // Only keep the 20 most recent games
    localStorage.setItem('recentGames', JSON.stringify(recentGames.slice(0, 20)));

    // Update display
    if (typeof window.updateIndexStats !== 'undefined') {
        window.updateIndexStats();
    }

    // Sync stats to Firebase if user is logged in
    if (typeof syncStatsToFirebase !== 'undefined') {
        syncStatsToFirebase();
    }
}

function makeGuess() {
    const guessInput = normalizeInput(document.getElementById("sharkGuess").value.trim());
    const messageDiv = document.getElementById("message");
    const attemptsLeftDiv = document.getElementById("attempts-left");
    const winLoseScreen = document.getElementById("win-lose-screen");

    const guessedShark = sharks.find(s => normalizeInput(s.name).startsWith(guessInput));
    if (!guessedShark) {
        messageDiv.textContent = "Shark not found in the list.";
        return;
    }

    if (guessedShark.guessed) {
        messageDiv.textContent = "You already guessed this shark.";
        return;
    }

    guessedShark.guessed = true;

    // decrement attempts and update display
    attempts--;
    attemptsLeftDiv.textContent = `Attempts left: ${attempts}`;
    
    const feedback = [
        { category: "Family", value: guessedShark.family, correct: guessedShark.family === targetShark.family },
        { category: "Order", value: guessedShark.order, correct: guessedShark.order === targetShark.order },
        { category: "Genus", value: guessedShark.genus, correct: guessedShark.genus === targetShark.genus }
    ];
    
    renderGuess(guessedShark, feedback);
    
    if (normalizeInput(guessedShark.name) === normalizeInput(targetShark.name)) {
        const guessesTaken = 12 - attempts;
        // Gain XP and save to totalXP for Shark Pass
        let totalXP = parseInt(localStorage.getItem("totalXP")) || 0;
        const xpGain = 40 + guessesTaken * 5;
        totalXP += xpGain;
        localStorage.setItem("totalXP", totalXP);

        updateStats(true, guessesTaken);
        submitStatsToLeaderboard(true, guessesTaken);
        
        // Disable input
        document.getElementById("sharkGuess").disabled = true;
        document.getElementById("guessBtn").disabled = true;
        
        // Display win screen
        winLoseScreen.innerHTML = `
            <h2 style="margin-top: 0; font-size: 32px; margin-bottom: 20px;">🎉 You Found It!</h2>
            <p style="font-size: 18px; margin: 10px 0; color: inherit;">The shark was <b>${targetShark.name}</b></p>
            <p style="font-size: 16px; margin: 10px 0; opacity: 0.9;">You took ${guessesTaken} guess${guessesTaken !== 1 ? 'es' : ''}.</p>
            <div style="margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.2); border-radius: 8px;">
                <p style="font-size: 28px; font-weight: bold; margin: 0; color: inherit;">+${xpGain} XP</p>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
                <button onclick="location.reload()" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(255,255,255,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Play Again</button>
                <button onclick="window.location.href='index.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(0,0,0,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Back to Home</button>
            </div>
        `;
        winLoseScreen.classList.add("win");
        winLoseScreen.classList.remove("lose");
        winLoseScreen.style.display = "block";
        createBubbles();
        
    } else if (attempts === 0) {
        updateStats(false);
        submitStatsToLeaderboard(false, 0); // Submit stats on loss
        
        // Disable input
        document.getElementById("sharkGuess").disabled = true;
        document.getElementById("guessBtn").disabled = true;
        
        // Display lose screen
        winLoseScreen.innerHTML = `
            <h2 style="margin-top: 0; font-size: 32px; margin-bottom: 20px;">😢 You Lost</h2>
            <p style="font-size: 18px; margin: 10px 0; color: inherit;">The shark was <b>${targetShark.name}</b></p>
            <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: center;">
                <button onclick="location.reload()" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(255,255,255,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Try Again</button>
                <button onclick="window.location.href='index.html'" style="padding: 12px 25px; font-size: 15px; cursor: pointer; background: rgba(0,0,0,0.3); border: none; border-radius: 6px; color: inherit; font-weight: bold; transition: background 0.3s;">Back to Home</button>
            </div>
        `;
        winLoseScreen.classList.add("lose");
        winLoseScreen.classList.remove("win");
        winLoseScreen.style.display = "block";

    } else {
        messageDiv.textContent = "";
    }

    document.getElementById("sharkGuess").value = "";
}

function renderGuess(shark, feedback){

const card = document.createElement("div")
card.className="guess-card"

card.innerHTML = `<b>${shark.name}</b> (click)`

const feedbackDiv = document.createElement("div")
feedbackDiv.className="feedback"

feedback.forEach(item => {
    const div = document.createElement("div");
    div.className = "category";
    if (item.correct) div.classList.add("correct");

    let commonName;
    if (item.category === "Family") {
        commonName = common_names.find(cn => cn.scientific === shark.family);
    } else if (item.category === "Order") {
        commonName = common_names.find(cn => cn.scientific === shark.order);
    } else if (item.category === "Genus") {
        commonName = common_names.find(cn => cn.scientific === shark.genus);
    }

    if (commonName) {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        tooltip.textContent = `${item.category}: ${item.value}`;

        const tooltipText = document.createElement("span");
        tooltipText.className = "tooltiptext";
        tooltipText.textContent = commonName.Common;

        tooltip.appendChild(tooltipText);
        div.appendChild(tooltip);
    } else {
        div.textContent = `${item.category}: ${item.value}`;
    }

    feedbackDiv.appendChild(div);
});

card.appendChild(feedbackDiv)

card.onclick = ()=>{

feedbackDiv.style.display = feedbackDiv.style.display==="flex"?"none":"flex"

}

document.getElementById("guesses").prepend(card)

}

function createBubbles() {
    const winLoseScreen = document.getElementById("win-lose-screen");
    for (let i = 0; i < 10; i++) {
        const bubble = document.createElement("div");
        bubble.className = "bubble";
        bubble.style.width = `${Math.random() * 20 + 10}px`;
        bubble.style.height = bubble.style.width;
        bubble.style.left = `${Math.random() * 100}%`;
        bubble.style.animationDelay = `${Math.random() * 2}s`;
        bubble.style.bottom = '0';  
        winLoseScreen.appendChild(bubble);
    }
}

document.getElementById("sharkGuess").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        makeGuess();
    }
});

document.getElementById("guessBtn").addEventListener("click", makeGuess);

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
            mode: "infinite",
            userId: firebase.auth().currentUser.uid  // optional: track user ID
        });
        console.log("Stats submitted successfully");
    } catch (error) {
        console.error("Error submitting stats:", error);
    }
}