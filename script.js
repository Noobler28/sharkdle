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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ----- shark pass reward definitions -----
// this list is shared by multiple helpers (signup, stats sync, cosmetics)
const levelRewards = [
    { level: 2, imagePath: 'images/levelPfp/Shark6.png', name: 'Wobbegong Shark' },
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

// XP progression data (hard‑coded increments per level).
// index i represents XP required to go from level i to i+1.
// we start with a dummy 0 for level 0/1 to align indices.
const xpIncrements = [
    0,    // placeholder for level 0/1
    1000, // level 1 → 2
    1500, // level 2 → 3
    2000, // level 3 → 4
    2500, // level 4 → 5
    3000, // level 5 → 6
    4000, // level 6 → 7 (adjusted per your request)
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
    10500 // 19→20 (bumped accordingly)
    // add more entries if you plan to extend beyond 20
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
let currentUser = null;



// Listen for auth state changes
auth.onAuthStateChanged(user => {
    currentUser = user;
    updateAuthUI();
});

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
    } else {
        // User is logged out
        if (loginWarning) loginWarning.classList.remove("hidden");
        if (loginBtn) loginBtn.style.display = "block";
        
        const profileBtn = document.getElementById("profile-btn-nav");
        if (profileBtn) {
            profileBtn.remove();
        }
        localStorage.removeItem("userProfile");
    }
    
    // Always update index stats from localStorage (only if container exists)
    if (authContainer) {
        updateIndexStats();
    }
}

async function loadUserProfile() {
    try {
        if (!currentUser) return;
        
        // Load from userStats collection
        const statsRef = db.collection("userStats").doc(currentUser.uid);
        const statsSnap = await statsRef.get();
        
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
        } else {
            // Create new user profile
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
        
        // Save to localStorage
        localStorage.setItem("userProfile", JSON.stringify(userData));
        
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
    if (profileAvgGuesses) profileAvgGuesses.textContent = (userData.averageGuesses ?? 0).toFixed(2);
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
        const guessesEl = document.getElementById("guesses");
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
        const guessesEl = document.getElementById("guesses");
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
        // compute default pass values based on current local XP
        const _totalXP = parseInt(localStorage.getItem("totalXP")) || 0;
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
            games: parseInt(localStorage.getItem("games")) || 0,
            wins: parseInt(localStorage.getItem("wins")) || 0,
            losses: parseInt(localStorage.getItem("losses")) || 0,
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
        localStorage.removeItem("userProfile");
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

    // display only the five default shark PFPs
    const pfps = ["shark1.png", "shark2.png", "shark3.png", "shark4.png", "shark5.png"];

    pfps.forEach((pfp, index) => {
        const picPath = `images/pfp/${pfp}`;
        const div = document.createElement("div");
        div.style.cssText = "text-align: center; cursor: pointer; transition: transform 0.3s;";
        div.onmouseover = () => div.style.transform = "scale(1.1)";
        div.onmouseout = () => div.style.transform = "scale(1)";
        div.addEventListener("click", (e) => {
            e.preventDefault();
            setProfilePicture(picPath);
        });
        div.innerHTML = `
            <div style="width: 90px; height: 90px; border-radius: 8px; overflow: hidden; background: rgba(0, 180, 216, 0.1); margin: 0 auto 8px;">
                <img src="${picPath}" alt="PFP ${index + 1}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
            <p style="margin: 5px 0; font-size: 12px;">Shark ${index + 1}</p>
        `;
        availablePFPsContainer.appendChild(div);
    });
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
            div.style.cssText = "text-align: center; cursor: pointer; transition: transform 0.3s; margin-bottom: 10px;";
            div.onmouseover = () => div.style.transform = "scale(1.1)";
            div.onmouseout = () => div.style.transform = "scale(1)";
            div.addEventListener("click", e => {
                e.preventDefault();
                setProfilePicture(cosmetic.imagePath);
            });
            div.innerHTML = `
                <div style="width: 90px; height: 90px; border-radius: 8px; overflow: hidden; background: rgba(76, 175, 80, 0.1); margin: 0 auto 8px; border: 2px solid #4caf50;">
                    <img src="${cosmetic.imagePath}" alt="${cosmetic.name}" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <p style="margin: 5px 0; font-size: 12px; font-weight: 600; color: #4caf50;">${cosmetic.name}</p>
            `;
            earnedPFPsContainer.appendChild(div);
        });

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
    if (!currentUser) return;

    try {
        const profileData = JSON.parse(localStorage.getItem("userProfile") || "{}");
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
        const statsRef = db.collection("userStats").doc(currentUser.uid);
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
        // Calculate next day in the 7-day cycle
        let nextDay = currentLoginDay;
        let streak = 1;
        
        if (lastLoginDate) {
            const lastDate = new Date(lastLoginDate);
            const todayObj = new Date(today);
            const daysDiff = Math.floor((todayObj - lastDate) / (1000 * 60 * 60 * 24));
            
            if (daysDiff === 1) {
                // User logged in yesterday, advance the day
                nextDay = currentLoginDay >= 7 ? 1 : currentLoginDay + 1;
                streak = (parseInt(localStorage.getItem("loginStreak")) || 1) + 1;
            } else if (daysDiff > 1) {
                // User missed days, reset to day 1
                nextDay = 1;
                streak = 1;
            }
        }

        // Get reward for this day
        const reward = dailyRewards[nextDay - 1];
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

    // Add days 1-6 to grid
    for (let i = 1; i <= 6; i++) {
        const reward = dailyRewards[i - 1];
        const isClaimed = i < currentDay || (i === currentDay && !isNewClaim);
        const isAvailable = i === currentDay && isNewClaim;
        
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

    // Add day 7 (big reward)
    const day7Reward = dailyRewards[6];
    const isDay7Claimed = 7 < currentDay || (7 === currentDay && !isNewClaim);
    const isDay7Available = 7 === currentDay && isNewClaim;
    
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
    // Initialize daily login
    initializeDailyLogin();

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

    // Show streak info on index page
    const streak = localStorage.getItem("loginStreak") || 0;
    const totalXP = parseInt(localStorage.getItem("totalXP")) || 0;
    
    // Update daily bonus message in hero section
    const bonusMsg = document.getElementById("daily-bonus-msg");
    if (bonusMsg && currentUser) {
        const currentLoginDay = parseInt(localStorage.getItem("currentLoginDay")) || 1;
        const streak = parseInt(localStorage.getItem("loginStreak")) || 1;
        bonusMsg.style.cursor = "pointer";
        bonusMsg.style.transition = "all 0.3s ease";
        bonusMsg.onmouseover = () => bonusMsg.style.transform = "scale(1.02)";
        bonusMsg.onmouseout = () => bonusMsg.style.transform = "scale(1)";
        bonusMsg.onclick = () => openDailyLoginModal();
        bonusMsg.innerHTML = `🔥 Login Streak: <strong>${streak} days</strong> - Day ${currentLoginDay}/7 (Click to view rewards)`;
    }

    // Show streak display in stats
    const streakDisplay = document.createElement("div");
    streakDisplay.id = "streak-display";
    streakDisplay.style.cssText = `
        text-align: center;
        padding: 10px;
        color: #4dd0e1;
        font-weight: 600;
        font-size: 16px;
        margin-top: 10px;
    `;
    if (streak > 0 && currentUser) {
        streakDisplay.innerHTML = `📊 Login Streak: <span style="color: #ff6b6b;">${streak} days 🔥</span>`;
        const statsSection = document.querySelector(".stats");
        if (statsSection) {
            statsSection.parentElement.insertBefore(streakDisplay, statsSection);
        }
    }

    // Load available PFPs on page load
    if (document.getElementById("available-pfps")) {
        loadAvailablePFPs();
    }
});
