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

let auth, db;

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase not yet loaded, retrying...');
        setTimeout(initializeFirebase, 100);
        return;
    }
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Set up auth state listener after Firebase is initialized
    setupAuthStateListener();
}

initializeFirebase();

// Navigation helper function
function navigate(page) {
    window.location.href = page;
}

// ----- shark pass reward definitions -----
// this list is shared by multiple helpers (signup, stats sync, cosmetics)
const levelRewards = [
    { level: 2, imagePath: 'images/levelPfp/Shark6.png', name: 'Angel Shark' },
    { level: 3, imagePath: 'images/levelPfp/Shark7.png', name: 'Blue Shark' },
    { level: 4, imagePath: 'images/levelPfp/Shark8.png', name: 'Blacktip Reef Shark' },
    { level: 5, imagePath: 'images/levelPfp/Shark9.png', name: 'Tiger Shark' },
    { level: 6, imagePath: 'images/levelPfp/Shark10.png', name: 'Thresher Shark' },
    { level: 7, imagePath: 'images/levelPfp/Shark11.png', name: 'Lemon Shark' },
    { level: 8, imagePath: 'images/levelPfp/Shark12.png', name: 'Epaulette Shark' },
    { level: 9, imagePath: 'images/levelPfp/Shark13.png', name: 'Saw Shark' },
    { level: 10, imagePath: 'images/levelPfp/Shark14.png', name: 'Nurse Shark' },
    { level: 15, imagePath: 'images/levelPfp/Shark15.png', name: 'Oceanic Whitetip Shark' },
    { level: 20, imagePath: 'images/levelPfp/Shark16.png', name: 'Mako Shark' }
];

// ----- REDEEM CODE SYSTEM -----
const redeemCodes = {
    'SHARKDLE': { xp: 2500, cosmetics: [{ imagePath: 'images/codePfp/Shark17.png', name: 'Wobbegong Shark' }], description: '2.5k XP + Wobbegong Shark Profile Icon' }
};

// Keep track of redeemed codes in localStorage
function getRedeemedCodes() {
    const redeemed = localStorage.getItem("redeemedCodes");
    return redeemed ? JSON.parse(redeemed) : [];
}

function addRedeemedCode(code) {
    const redeemed = getRedeemedCodes();
    if (!redeemed.includes(code.toUpperCase())) {
        redeemed.push(code.toUpperCase());
        localStorage.setItem("redeemedCodes", JSON.stringify(redeemed));
    }
}

function hasRedeemedCode(code) {
    return getRedeemedCodes().includes(code.toUpperCase());
}

const xpIncrements = [
    0,    // placeholder for level 0/1
    1000, // level 1 → 2
    1500, // level 2 → 3
    2000, // level 3 → 4
    2500, // level 4 → 5
    3000, // level 5 → 6
    4000, // level 6 → 7 
    4500, // level 7 → 8
    5000, // level 8 → 9
    5500, // level 9 →10
    6000, // 10→11
    6500, // 11→12
    7000, // 12→13
    7500, // 13→14
    8000, // 14→15
    8500, // 15→16
    9000, // 16→17
    9500, // 17→18
    10000, // 18→19
    10500 // 19→20
];

function getXPForLevel(level) {
    // cumulative XP required to reach *start* of given level
    if (level <= 1) return 0;
    let sum = 0;
    for (let l = 1; l < level; l++) {
        sum += xpIncrements[l] !== undefined ? xpIncrements[l] : (1000 + (l - 1) * 500);
    }
    return sum;
}

function getLevelFromXP(totalXP) {
    let lvl = 1;
    while (true) {
        const nextXP = getXPForLevel(lvl + 1);
        if (totalXP < nextXP) break;
        lvl++;
    }
    return lvl;
}

function getXPToNextLevel(totalXP) {
    const currentLevel = getLevelFromXP(totalXP);
    const xpForNextLevel = getXPForLevel(currentLevel + 1);
    return xpForNextLevel - totalXP;
}

function getXPInCurrentLevel(totalXP) {
    const currentLevel = getLevelFromXP(totalXP);
    return totalXP - getXPForLevel(currentLevel);
}

// Authentication State
var currentUser = null;

// Set up auth state listener
function setupAuthStateListener() {
    if (!auth) {
        console.warn('Auth not yet initialized, retrying...');
        setTimeout(setupAuthStateListener, 100);
        return;
    }

    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        currentUser = user;
        window.currentUser = user;
        // Ensure DOM is ready before updating UI
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => updateAuthUI());
        } else {
            updateAuthUI();
        }
    });
    
    // Set up profile sync after auth is set up
    setupProfileSync();
}

// Cross-subdomain profile sync
var profileSyncInterval = null;

function setupProfileSync() {
    // Stop previous sync if it exists
    if (profileSyncInterval) {
        clearInterval(profileSyncInterval);
    }

    // Sync profile from Firebase every 45 seconds to keep data fresh across subdomains
    profileSyncInterval = setInterval(() => {
        if (currentUser && document.visibilityState === 'visible') {
            loadUserProfile().catch(err => console.log("Background sync skipped:", err));
        }
    }, 45000);

    // Refresh profile immediately when page becomes visible (user switches back to tab/window)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && currentUser) {
            loadUserProfile().catch(err => console.log("Visibility sync skipped:", err));
        }
    });
}

function updateAuthUI() {
    const authContainer = document.getElementById("auth-container");
    const loginWarning = document.getElementById("login-warning");
    const loginBtn = document.getElementById("login-btn");

    if (currentUser) {
        // User is logged in
        if (loginWarning) loginWarning.classList.add("hidden");
        if (loginBtn) loginBtn.style.display = "none";
        
        // Create profile button with picture
        if (authContainer && !document.getElementById("profile-btn-nav")) {
            const profileBtn = document.createElement("button");
            profileBtn.id = "profile-btn-nav";
            profileBtn.className = "profile-btn";
            profileBtn.onclick = () => openProfileModal();
            profileBtn.style.cssText = "background: none; border: none; cursor: pointer; padding: 5px; border-radius: 50%; display: flex; align-items: center;";
            
            // Get profile picture from localStorage or use default
            const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
            const pic = profileData.profilePicture || "images/pfp/shark1.png";
            
            profileBtn.innerHTML = `<img id="nav-profile-pic" src="${pic}" alt="Profile" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #00b4d8;">`;
            authContainer.insertBefore(profileBtn, loginBtn);
        }
        
        // Load user profile
        loadUserProfile();
        // Sync local stats to Firebase
        syncStatsToFirebase();
        // Initialize daily login
        initializeDailyLogin();
    } else {
        // User is logged out
        if (loginWarning) loginWarning.classList.remove("hidden");
        if (loginBtn) loginBtn.style.display = "block";
        
        const profileBtn = document.getElementById("profile-btn-nav");
        if (profileBtn) {
            profileBtn.remove();
        }
        // DO NOT clear userProfile
    }
    
    // Always update index stats from localStorage
    if (authContainer) {
        updateIndexStats();
    }

    // Update daily bonus message
    const bonusMsg = document.getElementById("daily-bonus-msg");
    if (bonusMsg) {
        if (currentUser) {
            const currentLoginDay = parseInt(localStorage.getItem("currentLoginDay")) || 1;
            const streak = parseInt(localStorage.getItem("loginStreak")) || 1;
            bonusMsg.style.display = "block";
            bonusMsg.style.cursor = "pointer";
            bonusMsg.style.transition = "all 0.3s ease";
            bonusMsg.onmouseover = () => bonusMsg.style.transform = "scale(1.02)";
            bonusMsg.onmouseout = () => bonusMsg.style.transform = "scale(1)";
            bonusMsg.onclick = () => openDailyLoginModal();
            const cycleNumber = Math.floor((currentLoginDay - 1) / 7) + 1;
            const cycleEndDay = cycleNumber * 7;
            bonusMsg.innerHTML = `🔥 Login Streak: <strong>${streak} days</strong> - Day ${currentLoginDay}/${cycleEndDay} (Click to view rewards)`;
        } else {
            bonusMsg.style.display = "none";
        }
    } else {
    }

    // Update streak display
    const existingStreak = document.getElementById("streak-display");
    if (existingStreak) {
        existingStreak.remove();
    }
    if (currentUser) {
        const streak = parseInt(localStorage.getItem("loginStreak")) || 1;
        if (streak > 0) {
            const streakDisplay = document.createElement("div");
            streakDisplay.id = "streak-display";
            streakDisplay.style.cssText = `
                text-align: center;
                padding: 15px 20px;
                color: #4dd0e1;
                font-weight: 600;
                font-size: 16px;
                margin-top: 10px;
                border-radius: 8px;
                border: 2px solid #ff6b6b;
                background: rgba(255, 107, 107, 0.05);
            `;
            streakDisplay.innerHTML = `🔥 <span style="color: #ff6b6b;">${streak} days</span> on fire!`;
            const statsSection = document.querySelector(".stats");
            if (statsSection) {
                statsSection.parentElement.insertBefore(streakDisplay, statsSection);
            }
        }
    }
}

async function loadUserProfile() {
    try {
        if (!currentUser) return;
        
        // Load from userStats collection
        const statsRef = db.collection("userStats").doc(currentUser.uid);
        const statsSnap = await statsRef.get();
        
        // Also check for local data that might be more recent
        const localProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        
        let userData = {};
        if (statsSnap.exists) {
            // Use Firebase data if it exists
            const data = statsSnap.data();
            userData = {
                username: data.username || currentUser.email.split("@")[0],
                email: currentUser.email,
                profilePicture: data.profilePicture || "images/pfp/shark1.png",
                totalGuesses: data.totalGuesses || 0,
                gamesPlayed: data.gamesPlayed || 0,
                wins: data.wins || 0,
                losses: data.losses || 0,
                averageGuesses: data.averageGuesses || 0,
                bestGame: data.bestGame || 0,
                currentStreak: data.currentStreak || 0,
                highestStreak: data.highestStreak || 0,
                totalXP: data.totalXP || data.totalGuesses || 0,
                earnedCosmetics: data.earnedCosmetics || []
            };
            
            // Merge with local data if local data is newer or more complete
            if (localProfile.totalXP && localProfile.totalXP > (userData.totalXP || 0)) {
                userData.totalXP = localProfile.totalXP;
                userData.totalGuesses = localProfile.totalGuesses || userData.totalGuesses;
                userData.gamesPlayed = localProfile.gamesPlayed || userData.gamesPlayed;
                userData.wins = localProfile.wins || userData.wins;
                userData.losses = localProfile.losses || userData.losses;
                userData.averageGuesses = localProfile.averageGuesses || userData.averageGuesses;
                userData.bestGame = localProfile.bestGame || userData.bestGame;
                userData.currentStreak = localProfile.currentStreak || userData.currentStreak;
                userData.highestStreak = localProfile.highestStreak || userData.highestStreak;
                // Sync merged data back to Firebase
                await statsRef.set(userData, { merge: true });
            }
        } else {
            // No Firebase data - check if we have local data
            if (localProfile.totalXP || localProfile.gamesPlayed) {
                // Use local data as it exists
                userData = localProfile;
                // Save it to Firebase so it persists across devices
                await statsRef.set(userData);
            } else {
                // Create new empty user profile
                userData = {
                    username: currentUser.email.split("@")[0],
                    email: currentUser.email,
                    profilePicture: "images/pfp/shark1.png",
                    totalGuesses: 0,
                    gamesPlayed: 0,
                    wins: 0,
                    losses: 0,
                    earnedCosmetics: []
                };
                await statsRef.set(userData);
            }
        }
        
        // Save to localStorage
        localStorage.setItem("userProfile", JSON.stringify(userData));
        // Sync totalXP from Firestore to localStorage for UI
        localStorage.setItem("totalXP", userData.totalXP || 0);
        
        updateProfileDisplay(userData);
        loadAvailablePFPs();
        await syncEarnedCosmetics();
        loadEarnedCosmetics();
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

function updateProfileDisplay(userData) {
    if (!userData) return;
    const profileUsername = document.getElementById("profile-username");
    const profileTotalGuesses = document.getElementById("profile-xp");
    const profileGames = document.getElementById("profile-games");
    const profileWins = document.getElementById("profile-wins");
    const profileLosses = document.getElementById("profile-losses");
    const profileAvgGuesses = document.getElementById("profile-avg-guesses");
    const profileBestGame = document.getElementById("profile-best-game");
    const profileCurrentStreak = document.getElementById("profile-current-streak");
    const profileHighestStreak = document.getElementById("profile-highest-streak");
    const profilePic = document.getElementById("profile-pic");

    if (profileUsername) profileUsername.textContent = userData.username || "Unknown";
    if (profileTotalGuesses) profileTotalGuesses.textContent = userData.totalGuesses ?? 0;
    if (profileGames) profileGames.textContent = userData.gamesPlayed ?? userData.games ?? 0;
    if (profileWins) profileWins.textContent = userData.wins ?? 0;
    if (profileLosses) profileLosses.textContent = userData.losses ?? 0;
    if (profileAvgGuesses) {
        let avg = userData.averageGuesses;
        if (typeof avg !== "number") avg = Number(avg);
        if (isNaN(avg)) avg = 0;
        profileAvgGuesses.textContent = avg.toFixed(2);
    }
    if (profileBestGame) profileBestGame.textContent = userData.bestGame ?? 0;
    if (profileCurrentStreak) profileCurrentStreak.textContent = userData.currentStreak ?? 0;
    if (profileHighestStreak) profileHighestStreak.textContent = userData.highestStreak ?? 0;
    if (profilePic) profilePic.src = userData.profilePicture || "images/pfp/shark1.png";

    // Also update index stats just in case
    updateIndexStats();
}

// helper that mirrors profile stats into the main page elements
function updateIndexStats() {
    const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");

    if (currentUser && profileData) {
        // Logged-in → use profileData
        const gamesEl = document.getElementById("games");
        const winsEl = document.getElementById("wins");
        const lossesEl = document.getElementById("losses");
        const guessesEl = document.getElementById("profile-guesses");
        const totalXpEl = document.getElementById("total-xp");
        const avgGuessesEl = document.getElementById("avg-guesses");
        const bestGameEl = document.getElementById("best-game");
        const currentStreakEl = document.getElementById("current-streak");
        const highestStreakEl = document.getElementById("highest-streak");

        if (gamesEl) gamesEl.textContent = profileData.gamesPlayed || 0;
        if (winsEl) winsEl.textContent = profileData.wins || 0;
        if (lossesEl) lossesEl.textContent = profileData.losses || 0;
        if (guessesEl) guessesEl.textContent = profileData.totalGuesses || 0;
        if (totalXpEl) totalXpEl.textContent = profileData.totalXP || 0;
        if (avgGuessesEl) avgGuessesEl.textContent = (profileData.averageGuesses || 0).toFixed(2);
        if (bestGameEl) bestGameEl.textContent = profileData.bestGame || 0;
        if (currentStreakEl) currentStreakEl.textContent = profileData.currentStreak || 0;
        if (highestStreakEl) highestStreakEl.textContent = profileData.highestStreak || 0;
    } else {
        // Logged-out → show 0
        const gamesEl = document.getElementById("games");
        const winsEl = document.getElementById("wins");
        const lossesEl = document.getElementById("losses");
        const guessesEl = document.getElementById("profile-guesses");
        const totalXpEl = document.getElementById("total-xp");
        const avgGuessesEl = document.getElementById("avg-guesses");
        const bestGameEl = document.getElementById("best-game");
        const currentStreakEl = document.getElementById("current-streak");
        const highestStreakEl = document.getElementById("highest-streak");

        if (gamesEl) gamesEl.textContent = 0;
        if (winsEl) winsEl.textContent = 0;
        if (lossesEl) lossesEl.textContent = 0;
        if (guessesEl) guessesEl.textContent = 0;
        if (totalXpEl) totalXpEl.textContent = 0;
        if (avgGuessesEl) avgGuessesEl.textContent = 0;
        if (bestGameEl) bestGameEl.textContent = 0;
        if (currentStreakEl) currentStreakEl.textContent = 0;
        if (highestStreakEl) highestStreakEl.textContent = 0;
    }
}
// expose for game files
window.updateIndexStats = updateIndexStats;

// ---------- Username editing helpers ----------
function enableUsernameEdit() {
    const profileUsernameEl = document.getElementById("profile-username");
    const input = document.getElementById("username-input");
    const editBtn = document.getElementById("edit-profile-btn");

    if (profileUsernameEl && input) {
        input.value = profileUsernameEl.textContent.trim();
    }
    document.getElementById("username-edit-container").classList.remove("hidden");
    if (editBtn) editBtn.disabled = true;
}

function cancelUsernameEdit() {
    document.getElementById("username-edit-container").classList.add("hidden");
    const editBtn = document.getElementById("edit-profile-btn");
    if (editBtn) editBtn.disabled = false;
}

async function saveUsername() {
    const newName = document.getElementById("username-input").value.trim();
    if (!newName) {
        alert("Username cannot be empty.");
        return;
    }
    await updateUsername(newName);
    cancelUsernameEdit();
}

async function updateUsername(newUsername) {
    if (!currentUser) return;
    try {
        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
        profileData.username = newUsername;
        localStorage.setItem("userProfile", JSON.stringify(profileData));

        const profileUsernameEl = document.getElementById("profile-username");
        if (profileUsernameEl) profileUsernameEl.textContent = newUsername;

        // Save to Firebase
        const statsRef = db.collection("userStats").doc(currentUser.uid);
        await statsRef.set({ username: newUsername }, { merge: true });
    } catch (error) {
        console.warn("Username update failed:", error);
    }
}

function loginUser() {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const errorEl = document.getElementById("auth-error");

    if (!email || !password) {
        errorEl.textContent = "Please fill in all fields.";
        errorEl.style.display = "block";
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(result => {
            errorEl.style.display = "none";
            closeLoginModal();
            loadUserProfile();
        })
        .catch(error => {
            errorEl.textContent = error.message;
            errorEl.style.display = "block";
        });
}

async function signupUser() {
    const email = document.getElementById("signup-email").value.trim();
    const password = document.getElementById("signup-password").value.trim();
    const username = document.getElementById("signup-username").value.trim();
    const errorEl = document.getElementById("auth-error");

    if (!email || !password || !username) {
        errorEl.textContent = "Please fill in all fields.";
        errorEl.style.display = "block";
        return;
    }

    if (password.length < 6) {
        errorEl.textContent = "Password must be at least 6 characters.";
        errorEl.style.display = "block";
        return;
    }

    try {
        // Check if email is already in use
        const methods = await auth.fetchSignInMethodsForEmail(email);
        if (methods.length > 0) {
            errorEl.textContent = "This email is already registered. Please try logging in instead.";
            errorEl.style.display = "block";
            return;
        }

        // Proceed with account creation
        const result = await auth.createUserWithEmailAndPassword(email, password);
        const userRef = db.collection("userStats").doc(result.user.uid);
        
        // Migrate local offline stats - check both new and old storage locations
        const localProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        const _totalXP = localProfile.totalXP || parseInt(localStorage.getItem("totalXP")) || 0;
        const _gamesPlayed = localProfile.gamesPlayed || parseInt(localStorage.getItem("games")) || 0;
        const _wins = localProfile.wins || parseInt(localStorage.getItem("wins")) || 0;
        const _losses = localProfile.losses || parseInt(localStorage.getItem("losses")) || 0;
        const _totalGuesses = localProfile.totalGuesses || 0;
        const _averageGuesses = localProfile.averageGuesses || 0;
        const _bestGame = localProfile.bestGame || 0;
        const _currentStreak = localProfile.currentStreak || 0;
        const _highestStreak = localProfile.highestStreak || 0;
        
        const _currentLevel = getLevelFromXP(_totalXP);
        const _xpInLevel = getXPInCurrentLevel(_totalXP);
        const _xpToNext = getXPToNextLevel(_totalXP);
        const _unlockedPfps = levelRewards
            .filter(r => r.level <= _currentLevel)
            .map(r => ({ level: r.level, name: r.name || r.imagePath }));

        const newProfile = {
            username: username,
            email: email,
            avatar: "🦈",
            totalXP: _totalXP,
            gamesPlayed: _gamesPlayed,
            wins: _wins,
            losses: _losses,
            totalGuesses: _totalGuesses,
            averageGuesses: _averageGuesses,
            bestGame: _bestGame,
            currentStreak: _currentStreak,
            highestStreak: _highestStreak,
            currentLevel: _currentLevel,
            currentXP: _xpInLevel,
            xpToNextLevel: _xpToNext,
            unlockedPfps: _unlockedPfps,
            createdAt: new Date()
        };
        await userRef.set(newProfile);

        errorEl.style.display = "none";
        closeLoginModal();
        loadUserProfile();
    } catch (error) {
        errorEl.textContent = error.message;
        errorEl.style.display = "block";
    }
}

function logoutUser() {
    auth.signOut().then(() => {
        currentUser = null;
        // DO NOT clear userProfile - the data should persist in Firebase
        // Only remove session-specific data
        localStorage.removeItem("dailyLoginModalShownToday");
        localStorage.removeItem("currentLoginDay");
        localStorage.removeItem("loginStreak");
        localStorage.removeItem("lastLoginDate");
        closeProfileModal();
        updateAuthUI();
    });
}

function openLoginModal() {
    document.getElementById("loginModal").classList.remove("hidden");
}

function closeLoginModal() {
    document.getElementById("loginModal").classList.add("hidden");
    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";
    document.getElementById("signup-email").value = "";
    document.getElementById("signup-password").value = "";
    document.getElementById("signup-username").value = "";
    document.getElementById("auth-error").style.display = "none";
    switchToLogin();
}

async function openProfileModal() {
    if (currentUser) {
        // Reload profile data when opening modal
        await loadUserProfile().catch(err => console.error("Error loading profile:", err));
        if (document.getElementById("username-edit-container")) {
            cancelUsernameEdit();
        }
        document.getElementById("profileModal").classList.remove("hidden");
    }
}

function closeProfileModal() {
    document.getElementById("profileModal").classList.add("hidden");
}

function openProfilePicModal() {
    // Ensure both available and earned pfps are loaded before opening
    loadAvailablePFPs();
    loadEarnedCosmetics().catch(err => console.error("Error loading earned cosmetics:", err));
    document.getElementById("profilePicModal").classList.remove("hidden");
}

function closeProfilePicModal() {
    document.getElementById("profilePicModal").classList.add("hidden");
}

function switchToLogin() {
    document.querySelector(".login-form").classList.remove("hidden");
    document.querySelector(".signup-form").classList.add("hidden");
}

function switchToSignup() {
    document.querySelector(".login-form").classList.add("hidden");
    document.querySelector(".signup-form").classList.remove("hidden");
}

async function setProfilePicture(picturePath) {
    if (!currentUser) return;

    try {
        // Update localStorage immediately
        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
        profileData.profilePicture = picturePath;
        localStorage.setItem("userProfile", JSON.stringify(profileData));

        // Update UI immediately
        const profilePic = document.getElementById("profile-pic");
        if (profilePic) profilePic.src = picturePath;
        const navProfilePic = document.getElementById("nav-profile-pic");
        if (navProfilePic) navProfilePic.src = picturePath;

        // Save to Firebase
        const statsRef = db.collection("userStats").doc(currentUser.uid);
        await statsRef.set({ profilePicture: picturePath }, { merge: true });

        closeProfilePicModal();
    } catch (error) {
        console.error("Error setting profile picture:", error);
    }
}

function loadAvailablePFPs() {
    const availablePFPsContainer = document.getElementById("available-pfps");
    if (!availablePFPsContainer) return;

    availablePFPsContainer.innerHTML = "";

    // display only the five default shark PFPs with their actual names
    const pfps = [
        { filename: "shark1.png", name: "Whale Shark" },
        { filename: "shark2.png", name: "Great White Shark" },
        { filename: "shark3.png", name: "Hammerhead Shark" },
        { filename: "shark4.png", name: "Basking Shark" },
        { filename: "shark5.png", name: "Zebra Shark" }
    ];

    pfps.forEach((pfp, index) => {
        const picPath = `images/pfp/${pfp.filename}`;
        const div = document.createElement("div");
        div.style.cssText = "text-align: center; cursor: pointer; transition: all 0.3s ease; padding: 6px; border-radius: 8px;";
        div.onmouseover = () => {
            div.style.transform = "scale(1.08)";
            div.style.background = "rgba(0, 180, 216, 0.15)";
        };
        div.onmouseout = () => {
            div.style.transform = "scale(1)";
            div.style.background = "transparent";
        };
        div.addEventListener("click", (e) => {
            e.preventDefault();
            setProfilePicture(picPath);
        });
        div.innerHTML = `
            <div style="width: 70px; height: 70px; border-radius: 10px; overflow: hidden; background: rgba(0, 180, 216, 0.1); margin: 0 auto 7px; border: 2px solid rgba(0, 180, 216, 0.3);">
                <img src="${picPath}" alt="PFP ${pfp.name}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 500; color: #ddd;">${pfp.name}</p>
        `;
        availablePFPsContainer.appendChild(div);
    });

    // Add Wobbegong Shark from redeem codes if unlocked
    if (hasRedeemedCode('SHARKDLE')) {
        const div = document.createElement("div");
        div.style.cssText = "text-align: center; cursor: pointer; transition: all 0.3s ease; padding: 6px; border-radius: 8px;";
        div.title = "Redeem code reward";
        div.onmouseover = () => {
            div.style.transform = "scale(1.08)";
            div.style.background = "rgba(255, 107, 107, 0.15)";
        };
        div.onmouseout = () => {
            div.style.transform = "scale(1)";
            div.style.background = "transparent";
        };
        div.addEventListener("click", (e) => {
            e.preventDefault();
            setProfilePicture("images/codePfp/Shark17.png");
        });
        div.innerHTML = `
            <div style="width: 70px; height: 70px; border-radius: 10px; overflow: hidden; background: rgba(255, 107, 107, 0.1); margin: 0 auto 7px; border: 2px solid #ff6b6b;">
                <img src="images/codePfp/Shark17.png" alt="PFP Wobbegong Shark" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 600; color: #ff6b6b;">🎁 Wobbegong Shark</p>
        `;
        availablePFPsContainer.appendChild(div);
    }
}

async function loadEarnedCosmetics() {
    if (!currentUser) return;

    try {
        // first, try to fetch the unlockedPfps array directly from userStats
        let unlocked = [];
        const statsDoc = await db.collection('userStats').doc(currentUser.uid).get();
        if (statsDoc.exists && Array.isArray(statsDoc.data().unlockedPfps)) {
            unlocked = statsDoc.data().unlockedPfps.slice(); // copy
        }

        // make sure every item has an imagePath; fall back to global levelRewards
        unlocked = unlocked.map(entry => {
            if (!entry.imagePath) {
                const match = levelRewards.find(r => r.level === entry.level || r.name === entry.name);
                if (match) {
                    entry.imagePath = match.imagePath;
                }
            }
            return entry;
        });

        // fallback: if nothing stored yet, compute by level so that offline users still see something
        if (unlocked.length === 0) {
            const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
            const totalXP = profileData.totalXP !== undefined ? profileData.totalXP : parseInt(localStorage.getItem("totalXP")) || (profileData.totalGuesses || 0);
            const userLevel = getLevelFromXP(totalXP);

            unlocked = levelRewards
                .filter(r => r.level <= userLevel)
                .map(r => ({ level: r.level, name: r.name, imagePath: r.imagePath }));
        }

        // save locally so other parts of the app can use it
        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
        profileData.earnedCosmetics = unlocked;
        localStorage.setItem("userProfile", JSON.stringify(profileData));

        // display in modal
        const earnedPFPsContainer = document.getElementById("earned-pfps");
        if (!earnedPFPsContainer) {
            // Element doesn't exist on this page, silently return
            return;
        }
        const noEarned = document.getElementById("no-earned");
        earnedPFPsContainer.innerHTML = "";

        if (unlocked.length === 0) {
            if (noEarned) noEarned.style.display = "block";
            return;
        } else if (noEarned) {
            noEarned.style.display = "none";
        }

        unlocked.forEach(cosmetic => {
            const div = document.createElement("div");
            div.style.cssText = "text-align: center; cursor: pointer; transition: all 0.3s ease; padding: 6px; border-radius: 8px;";
            div.onmouseover = () => {
                div.style.transform = "scale(1.08)";
                div.style.background = "rgba(76, 175, 80, 0.15)";
            };
            div.onmouseout = () => {
                div.style.transform = "scale(1)";
                div.style.background = "transparent";
            };
            div.addEventListener("click", e => {
                e.preventDefault();
                setProfilePicture(cosmetic.imagePath);
            });
            div.innerHTML = `
                <div style="width: 70px; height: 70px; border-radius: 10px; overflow: hidden; background: rgba(76, 175, 80, 0.1); margin: 0 auto 7px; border: 2px solid #4caf50;">
                    <img src="${cosmetic.imagePath}" alt="${cosmetic.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <p style="margin: 5px 0 0 0; font-size: 11px; font-weight: 600; color: #4caf50;">${cosmetic.name}</p>
            `;
            earnedPFPsContainer.appendChild(div);
        });;

    } catch (error) {
        console.error("Error loading earned cosmetics:", error);
    }
}


// Save stats to Firebase when they update
async function syncEarnedCosmetics() {
    if (!currentUser) return;

    try {
        const totalXP = parseInt(localStorage.getItem("totalXP")) || parseInt(localStorage.getItem("totalGuesses")) || 0;
        const userLevel = getLevelFromXP(totalXP);

        // Get earned cosmetics
        const earnedCosmetics = levelRewards.filter(reward => reward.level <= userLevel);

        // Update Firebase with earned cosmetics
        const statsRef = db.collection("userStats").doc(currentUser.uid);
        await statsRef.set({ earnedCosmetics: earnedCosmetics }, { merge: true });

        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
        profileData.earnedCosmetics = earnedCosmetics;
        localStorage.setItem("userProfile", JSON.stringify(profileData));

        // Reload earned cosmetics display if modal is open
        loadEarnedCosmetics();
    } catch (error) {
        console.error("Error syncing earned cosmetics:", error);
    }
}

// Save stats to Firebase when they update
async function syncStatsToFirebase() {
    if (!firebase.auth().currentUser) return;

    try {
        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
        
        // Don't sync if localStorage has no real data (empty or just defaults)
        // This prevents overwriting Firebase with blank data after clearing localStorage
        if (!profileData.totalXP && !profileData.gamesPlayed && !profileData.wins) {
            console.log("Skipping sync: no meaningful data in localStorage");
            return;
        }
        
        // base stats
        const stats = {
            totalXP: profileData.totalXP || 0,
            // keep totalGuesses for backwards compatibility/analytics
            totalGuesses: profileData.totalGuesses || 0,
            gamesPlayed: profileData.gamesPlayed || 0,
            wins: profileData.wins || 0,
            losses: profileData.losses || 0,
            averageGuesses: profileData.averageGuesses || 0,
            bestGame: profileData.bestGame || 0,
            currentStreak: profileData.currentStreak || 0,
            highestStreak: profileData.highestStreak || 0,
            profilePic: profileData.profilePicture || "images/pfp/shark1.png",
            profilePicture: profileData.profilePicture || "images/pfp/shark1.png",
            lastUpdated: new Date()
        };
        
        // shark pass related values
        const totalXP = profileData.totalXP || 0;
        const currentLevel = getLevelFromXP(totalXP);
        const currentXP = getXPInCurrentLevel(totalXP);
        const xpToNextLevel = getXPToNextLevel(totalXP);
        const unlockedPfps = levelRewards
            .filter(r => r.level <= currentLevel)
            .map(r => ({ level: r.level, name: r.name || r.imagePath }));

        // attach them to stats object so firestore has dedicated fields
        stats.currentLevel = currentLevel;
        stats.currentXP = currentXP;
        stats.xpToNextLevel = xpToNextLevel;
        stats.unlockedPfps = unlockedPfps;

        // Save stats to userStats collection
        const statsRef = db.collection("userStats").doc(firebase.auth().currentUser.uid);
        await statsRef.set(stats, { merge: true });
        
        Object.assign(profileData, stats);
        localStorage.setItem("userProfile", JSON.stringify(profileData));
                // Update navbar profile pic if it exists
        const navProfilePic = document.getElementById("nav-profile-pic");
        if (navProfilePic) navProfilePic.src = profileData.profilePicture;
                // Update display if profile modal is open
        if (document.getElementById("profile-xp")) {
            updateProfileDisplay(profileData);
        }

        // Also sync earned cosmetics based on new XP
        await syncEarnedCosmetics();
        
        // Update the main page stats display after syncing
        updateIndexStats();
    } catch (error) {
        console.error("Error syncing stats:", error);
    }
}

// Navigation
function navigate(page){
    window.location.href = page;
}

// ===== DAILY LOGIN & XP SYSTEM =====

// Daily login rewards - 7 day cycle
const dailyRewards = [
    { day: 1, xp: 50, emoji: '1️⃣' },
    { day: 2, xp: 60, emoji: '2️⃣' },
    { day: 3, xp: 70, emoji: '3️⃣' },
    { day: 4, xp: 80, emoji: '4️⃣' },
    { day: 5, xp: 90, emoji: '5️⃣' },
    { day: 6, xp: 100, emoji: '6️⃣' },
    { day: 7, xp: 500, emoji: '🏆', isBig: true }
];

function initializeDailyLogin() {
    if (!currentUser) return;

    const today = new Date().toDateString();
    const lastLoginDate = localStorage.getItem("lastLoginDate");
    const dailyLoginModalShownToday = localStorage.getItem("dailyLoginModalShownToday");
    const currentLoginDay = parseInt(localStorage.getItem("currentLoginDay")) || 1;
    const totalXP = parseInt(localStorage.getItem("totalXP")) || 0;

    // Check if user has already logged in today
    if (lastLoginDate !== today) {
        // Calculate next day (keeps incrementing)
        let nextDay = currentLoginDay;
        let streak = 1;
        
        if (lastLoginDate) {
            const lastDate = new Date(lastLoginDate);
            const todayObj = new Date(today);
            const daysDiff = Math.floor((todayObj - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                // User logged in yesterday, advance the day
                nextDay = currentLoginDay + 1;
                streak = (parseInt(localStorage.getItem("loginStreak")) || 1) + 1;
            } else if (daysDiff > 1) {
                // User missed days, reset to day 1
                nextDay = 1;
                streak = 1;
            }
        }

        // Get reward for this day using modulo to cycle through 7-day rewards
        const rewardIndex = (nextDay - 1) % 7;
        const reward = dailyRewards[rewardIndex];
        const xpGain = reward.xp;

        // Update localStorage
        localStorage.setItem("lastLoginDate", today);
        localStorage.setItem("currentLoginDay", nextDay);
        localStorage.setItem("loginStreak", streak);
        localStorage.setItem("totalXP", totalXP + xpGain);
        localStorage.setItem("dailyLoginModalShownToday", "true");

        // Show daily login modal only on first load of the day
        showDailyLoginModal(nextDay, xpGain);

        // if logged in, sync to Firebase immediately and refresh cosmetics
        if (currentUser) {
            syncStatsToFirebase();
            syncEarnedCosmetics();
        }
    } else if (!dailyLoginModalShownToday) {
        // Already logged in today, but modal hasn't been shown yet on this page load
        // Mark it as shown and display it
        localStorage.setItem("dailyLoginModalShownToday", "true");
        showDailyLoginModal(currentLoginDay, 0);
    }
    // If both conditions are false (already logged in today and modal already shown), do nothing
}

function showDailyLoginModal(currentDay, xpGained) {
    if (!currentUser) return;
    const modal = document.getElementById("dailyLoginModal");
    const grid = document.getElementById("daily-rewards-grid");
    const day7Container = document.getElementById("day-7-reward");
    
    if (!modal || !grid || !day7Container) return; // Element doesn't exist on this page

    grid.innerHTML = '';
    day7Container.innerHTML = '';

    // Store whether this is a new claim (xpGained > 0) for UI logic
    const isNewClaim = xpGained > 0;

    // Calculate position in current 7-day cycle
    const positionInCycle = (currentDay - 1) % 7 + 1;

    // Add days 1-6 to grid
    for (let i = 1; i <= 6; i++) {
        const reward = dailyRewards[i - 1];
        const isClaimed = i < positionInCycle || (i === positionInCycle && !isNewClaim);
        const isAvailable = i === positionInCycle && isNewClaim;
        
        const dayCard = document.createElement("div");
        dayCard.style.cssText = `
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            background: ${isAvailable ? 'rgba(0, 180, 216, 0.2)' : isClaimed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 255, 255, 0.1)'};
            border: 2px solid ${isAvailable ? '#00b4d8' : isClaimed ? '#4caf50' : '#666'};
            cursor: ${isAvailable ? 'pointer' : 'default'};
            transition: all 0.3s ease;
        `;
        
        if (isAvailable) {
            dayCard.style.boxShadow = '0 0 15px rgba(0, 180, 216, 0.5)';
        }
        
        dayCard.innerHTML = `
            <div style="font-size: 24px; margin-bottom: 8px;">${reward.emoji}</div>
            <div style="font-size: 14px; color: #4dd0e1; font-weight: 600;">${reward.xp} XP</div>
            <div style="font-size: 12px; color: #888; margin-top: 5px;">${isClaimed ? '✓ Claimed' : isAvailable ? 'Available Today!' : 'Locked'}</div>
        `;
        
        if (isAvailable) {
            dayCard.onclick = () => claimDailyReward(i);
        }
        
        grid.appendChild(dayCard);
    }

    const day7Reward = dailyRewards[6];
    const isDay7Claimed = 7 < positionInCycle || (7 === positionInCycle && !isNewClaim);
    const isDay7Available = 7 === positionInCycle && isNewClaim;
    
    const day7Card = document.createElement("div");
    day7Card.style.cssText = `
        padding: 25px;
        border-radius: 12px;
        text-align: center;
        background: ${isDay7Available ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : isDay7Claimed ? 'rgba(76, 175, 80, 0.2)' : 'rgba(255, 255, 255, 0.1)'};
        border: 3px solid ${isDay7Available ? '#ffd700' : isDay7Claimed ? '#4caf50' : '#666'};
        cursor: ${isDay7Available ? 'pointer' : 'default'};
        transition: all 0.3s ease;
        min-width: 150px;
    `;
    
    if (isDay7Available) {
        day7Card.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.8)';
        day7Card.style.transform = 'scale(1.05)';
    }
    
    day7Card.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">${day7Reward.emoji}</div>
        <div style="font-size: 28px; color: #001f3f; font-weight: 700;">${day7Reward.xp} XP</div>
        <div style="font-size: 14px; color: ${isDay7Available ? '#001f3f' : '#888'}; margin-top: 8px; font-weight: 600;">${isDay7Claimed ? '✓ Claimed' : isDay7Available ? 'MEGA REWARD!' : 'Locked'}</div>
    `;
    
    if (isDay7Available) {
        day7Card.onclick = () => claimDailyReward(7);
    }
    
    day7Container.appendChild(day7Card);
    
    modal.classList.remove("hidden");
}

function claimDailyReward(day) {
    // This is a UI-only function since the reward is already claimed in initializeDailyLogin
    // Just close the modal after a brief celebration
    setTimeout(() => {
        closeDailyLoginModal();
    }, 1000);
}

function openDailyLoginModal() {
    if (!currentUser) return;
    const currentDay = parseInt(localStorage.getItem("currentLoginDay")) || 1;
    showDailyLoginModal(currentDay, 0);
}

function closeDailyLoginModal() {
    const modal = document.getElementById("dailyLoginModal");
    if (modal) {
        modal.classList.add("hidden");
    }
}

// Load stats and streaks
document.addEventListener("DOMContentLoaded", function() {
    // Update displayed stats from localStorage
    if (document.getElementById("games")) {
        document.getElementById("games").textContent = localStorage.getItem("games") || 0;
    }
    if (document.getElementById("wins")) {
        document.getElementById("wins").textContent = localStorage.getItem("wins") || 0;
    }
    if (document.getElementById("losses")) {
        document.getElementById("losses").textContent = localStorage.getItem("losses") || 0;
    }

    // Load available PFPs on page load
    if (document.getElementById("available-pfps")) {
        loadAvailablePFPs();
    }

    // If user is already logged in, refresh profile from Firebase immediately
    // This ensures cross-subdomain sync works correctly
    if (currentUser) {
        loadUserProfile().catch(err => console.log("Initial profile load skipped:", err));
    }
});

// ----- REDEEM CODE FUNCTIONS -----
async function redeemCode() {
    if (!currentUser) {
        alert("Please login first to redeem codes.");
        return;
    }

    const codeInput = document.getElementById("redeem-code-input");
    const code = codeInput.value.trim().toUpperCase();
    const messageEl = document.getElementById("redeem-message");

    if (!code) {
        showRedeemMessage("Please enter a code.", false);
        return;
    }

    // Check if code exists
    if (!redeemCodes[code]) {
        showRedeemMessage("Invalid code. Please check and try again.", false);
        codeInput.value = '';
        return;
    }

    // Check if already redeemed
    if (hasRedeemedCode(code)) {
        showRedeemMessage("This code has already been redeemed.", false);
        codeInput.value = '';
        return;
    }

    try {
        // Get current user data
        const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        const currentXP = userProfile.totalXP || 0;
        const codeReward = redeemCodes[code];

        // Add XP
        const newXP = currentXP + codeReward.xp;
        userProfile.totalXP = newXP;

        // Add cosmetics if any
        if (codeReward.cosmetics) {
            if (!userProfile.earnedCosmetics) {
                userProfile.earnedCosmetics = [];
            }
            codeReward.cosmetics.forEach(cosmetic => {
                // Check if cosmetic is not already in the list
                if (!userProfile.earnedCosmetics.some(c => c.name === cosmetic.name)) {
                    userProfile.earnedCosmetics.push(cosmetic);
                }
            });
        }

        // Save to localStorage
        localStorage.setItem("userProfile", JSON.stringify(userProfile));

        // Sync to Firebase
        if (currentUser) {
            const statsRef = db.collection("userStats").doc(currentUser.uid);
            await statsRef.set({
                totalXP: newXP,
                earnedCosmetics: userProfile.earnedCosmetics
            }, { merge: true });
        }

        // Mark code as redeemed
        addRedeemedCode(code);

        // Sync redeemed codes to Firebase
        if (currentUser) {
            const redeemedCodes = getRedeemedCodes();
            const statsRef = db.collection("userStats").doc(currentUser.uid);
            await statsRef.set({ redeemedCodes: redeemedCodes }, { merge: true });
        }

        // Show success message
        showRedeemMessage(`✨ Success! You received ${codeReward.xp} XP!`, true);
        codeInput.value = '';

        // Refresh profile and cosmetics
        loadUserProfile();
        loadEarnedCosmetics();
        loadAvailablePFPs();

        // Close modal after 2 seconds
        setTimeout(() => {
            closeProfileModal();
        }, 2000);

    } catch (error) {
        console.error("Error redeeming code:", error);
        showRedeemMessage("An error occurred. Please try again.", false);
    }
}

function showRedeemMessage(message, isSuccess) {
    const messageEl = document.getElementById("redeem-message");
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.style.display = 'block';
        messageEl.style.color = isSuccess ? '#4caf50' : '#ff6b6b';
        messageEl.style.background = isSuccess ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 107, 107, 0.1)';
    }
}

// ----- CONSOLE COMMANDS FOR STAT MANAGEMENT -----
// Usage in browser console:
// addStats({wins: 5, losses: 2, xp: 1000, gamesPlayed: 7, totalGuesses: 25})
// Or use individual commands: addWin(), addLoss(), addXP(100), etc.

async function addStats(statsObj) {
    const DEV_UID = 'ETPtQC0VA2NiSnX67rS2P2ma2tC2';
    if (!firebase.auth().currentUser || firebase.auth().currentUser.uid !== DEV_UID) {
        console.log("❌ Access denied. This command is for developers only.");
        return;
    }
    if (!currentUser) {
        console.log("❌ Error: User must be logged in");
        return;
    }

    try {
        const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
        
        // Add to requested stats
        if (statsObj.xp) {
            userProfile.totalXP = (userProfile.totalXP || 0) + statsObj.xp;
            console.log(`✅ Added ${statsObj.xp} XP. Total: ${userProfile.totalXP}`);
        }
        if (statsObj.wins) {
            userProfile.wins = (userProfile.wins || 0) + statsObj.wins;
            console.log(`✅ Added ${statsObj.wins} wins. Total: ${userProfile.wins}`);
        }
        if (statsObj.losses) {
            userProfile.losses = (userProfile.losses || 0) + statsObj.losses;
            console.log(`✅ Added ${statsObj.losses} losses. Total: ${userProfile.losses}`);
        }
        if (statsObj.gamesPlayed) {
            userProfile.gamesPlayed = (userProfile.gamesPlayed || 0) + statsObj.gamesPlayed;
            console.log(`✅ Added ${statsObj.gamesPlayed} games. Total: ${userProfile.gamesPlayed}`);
        }
        if (statsObj.totalGuesses) {
            userProfile.totalGuesses = (userProfile.totalGuesses || 0) + statsObj.totalGuesses;
            console.log(`✅ Added ${statsObj.totalGuesses} guesses. Total: ${userProfile.totalGuesses}`);
        }
        if (statsObj.currentStreak !== undefined) {
            userProfile.currentStreak = statsObj.currentStreak;
            console.log(`✅ Set streak to ${statsObj.currentStreak}`);
        }
        if (statsObj.highestStreak) {
            userProfile.highestStreak = Math.max(userProfile.highestStreak || 0, statsObj.highestStreak);
            console.log(`✅ Highest streak: ${userProfile.highestStreak}`);
        }
        
        // Save to localStorage
        localStorage.setItem("userProfile", JSON.stringify(userProfile));
        
        // Sync to Firebase
        const statsRef = db.collection("userStats").doc(currentUser.uid);
        await statsRef.set(userProfile, { merge: true });
        
        console.log("✅ Stats synced to Firebase");
        
        // Refresh UI
        loadUserProfile();
        updateAuthUI();
        
    } catch (error) {
        console.error("❌ Error adding stats:", error);
    }
}

// Individual convenience functions
async function addXP(amount) {
    return addStats({ xp: amount });
}

async function addWin() {
    return addStats({ wins: 1, gamesPlayed: 1 });
}

async function addLoss() {
    return addStats({ losses: 1, gamesPlayed: 1 });
}

async function addGuesses(amount) {
    return addStats({ totalGuesses: amount });
}

// Bulk add function for quick testing
async function addTestStats() {
    const DEV_UID = 'ETPtQC0VA2NiSnX67rS2P2ma2tC2';
    if (!firebase.auth().currentUser || firebase.auth().currentUser.uid !== DEV_UID) {
        console.log("❌ Access denied. This command is for developers only.");
        return;
    }
    return addStats({
        xp: 500,
        wins: 10,
        losses: 5,
        gamesPlayed: 15,
        totalGuesses: 75
    });
}

// Display current stats
function showStats() {
    const userProfile = JSON.parse(localStorage.getItem("userProfile") || "{}");
    console.log("=== CURRENT STATS ===");
    console.log(`XP: ${userProfile.totalXP || 0}`);
    console.log(`Wins: ${userProfile.wins || 0}`);
    console.log(`Losses: ${userProfile.losses || 0}`);
    console.log(`Games Played: ${userProfile.gamesPlayed || 0}`);
    console.log(`Total Guesses: ${userProfile.totalGuesses || 0}`);
    console.log(`Current Streak: ${userProfile.currentStreak || 0}`);
    console.log(`Highest Streak: ${userProfile.highestStreak || 0}`);
    console.log(`Level: ${getLevelFromXP(userProfile.totalXP || 0)}`);
    console.log("====================");
}

// Print available commands
function showCommands() {
    console.log("=== AVAILABLE STAT COMMANDS ===");
    console.log("addStats({xp: 100, wins: 1, losses: 1, gamesPlayed: 1, totalGuesses: 5})");
    console.log("addXP(100) - Add XP");
    console.log("addWin() - Add 1 win");
    console.log("addLoss() - Add 1 loss");
    console.log("addGuesses(10) - Add guesses");
    console.log("addTestStats() - Quick test add (500 XP, 10 wins, 5 losses, 15 games, 75 guesses)");
    console.log("showStats() - Display current stats");
    console.log("showCommands() - Show this help");
    console.log("================================");
}
