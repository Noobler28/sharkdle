// Shark Pass System

let claimedPfps = [];

async function renderPassUI() {
    // fetch claimed rewards for logged-in user (from Firestore)
    claimedPfps = [];
    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
        try {
            const uid = firebase.auth().currentUser.uid;
            const doc = await db.collection('userStats').doc(uid).get();
            if (doc.exists && Array.isArray(doc.data().unlockedPfps)) {
                claimedPfps = doc.data().unlockedPfps;
            }
        } catch (err) {
            console.error('Could not load claimed PFPs:', err);
        }
    }

    const levelPfps = [

{ level: 2, img: 'images/levelPfp/Shark6.png', name: 'Angel Shark' },
{ level: 3, img: 'images/levelPfp/Shark7.png', name: 'Blue Shark' },
{ level: 4, img: 'images/levelPfp/Shark8.png', name: 'Blacktip Reef Shark' },
{ level: 5, img: 'images/levelPfp/Shark9.png', name: 'Tiger Shark' },
{ level: 6, img: 'images/levelPfp/Shark10.png', name: 'Thresher Shark' },
{ level: 7, img: 'images/levelPfp/Shark11.png', name: 'Lemon Shark' },
{ level: 8, img: 'images/levelPfp/Shark12.png', name: 'Epaulette Shark' },
{ level: 9, img: 'images/levelPfp/Shark13.png', name: 'Saw Shark' },
{ level: 10, img: 'images/levelPfp/Shark14.png', name: 'Nurse Shark' },
{ level: 15, img: 'images/levelPfp/Shark15.png', name: 'Oceanic Whitetip Shark' },
{ level: 20, img: 'images/levelPfp/Shark16.png', name: 'Mako Shark' }

];

// compute level/Xp values using shared helper functions from script.js
const totalXP = parseInt(localStorage.getItem("totalXP")) || 0;

const userLevel = getLevelFromXP(totalXP);

const xpInLevel = getXPInCurrentLevel(totalXP);

// xp required to advance one more level (used for bar denominator)
// xp remaining until the next level boundary (used for bar width)
const xpToNextLevel = (xpIncrements[userLevel] !== undefined ? xpIncrements[userLevel] : (1000 + (userLevel - 1) * 500)) - xpInLevel;

// figure out how much XP is needed for the *next reward* specifically
let xpToNextReward = xpToNextLevel; // fallback if no rewards left
const upcoming = levelPfps.find(r => r.level > userLevel);
if (upcoming) {
    const xpForReward = getXPForLevel(upcoming.level);
    xpToNextReward = Math.max(0, xpForReward - totalXP);
}


/* Update UI */

document.getElementById("current-xp").textContent = xpInLevel;
// denominator should show the full size of current level for context
const xpLevelSize = (xpIncrements[userLevel] !== undefined)
    ? xpIncrements[userLevel]
    : (1000 + (userLevel - 1) * 500);
document.getElementById("xp-to-next").textContent = xpLevelSize;
document.getElementById("current-level").textContent = userLevel;

/* XP BAR */

const progress = Math.round((xpInLevel / (xpInLevel + xpToNextLevel)) * 100);

const bar = document.getElementById("xp-bar-fill");

bar.style.width = progress + "%";


/* Reward Grid */

const grid = document.getElementById("level-pfp-grid");

grid.innerHTML = "";


/* Recently unlocked (claimed) */

const unlockedRewards = levelPfps
.filter(r => claimedPfps.some(c => c.level === r.level))
.slice(-3);

if (unlockedRewards.length > 0) {
    const title = createTitle("✨ Recently Unlocked");
    grid.appendChild(title);

    const container = document.createElement("div");
    container.className = "reward-row";

    unlockedRewards.forEach(pfp => {
        container.appendChild(createRewardElement(pfp, true));
    });

    grid.appendChild(container);
}


/* Claimable rewards (eligible but not yet claimed) */
const claimableRewards = levelPfps.filter(r => r.level <= userLevel && !claimedPfps.some(c => c.level === r.level));
if (claimableRewards.length > 0) {
    const title = createTitle("🎁 Claimable Rewards");
    grid.appendChild(title);

    const container = document.createElement("div");
    container.className = "reward-row";

    claimableRewards.forEach(pfp => {
        container.appendChild(createRewardElement(pfp, false, false, true));
    });

    grid.appendChild(container);
}

/* Next reward */
const nextReward = levelPfps.find(r => r.level > userLevel);
if (nextReward) {
    const title = createTitle(`🎯 Next Reward (Level ${nextReward.level})`);
    grid.appendChild(title);

    const container = document.createElement("div");
    container.className = "reward-row center";
    container.appendChild(createRewardElement(nextReward, false, true));
    grid.appendChild(container);

    /* XP needed text */
    const xpText = document.createElement("div");
    xpText.className = "xp-needed";
    xpText.textContent = `${xpToNextReward} XP needed for next reward`;
    grid.appendChild(xpText);
} else {
    const maxed = document.createElement("div");
    maxed.className = "max-rewards";
    maxed.textContent = "🏆 You've unlocked all rewards!";
    grid.appendChild(maxed);
}


/* Cosmetic badge */

const badge = document.createElement("div");

badge.className = "cosmetic-badge";

badge.textContent =
"💎 All rewards are purely cosmetic and have no effect on gameplay";

grid.appendChild(badge);

// after building the UI we can send fresh values to Firebase
if (typeof syncStatsToFirebase === 'function') {
    // this will pick up totalXP and the newly added pass fields
    syncStatsToFirebase();
}
if (typeof syncEarnedCosmetics === 'function') {
    syncEarnedCosmetics();
}
}

// initial render
document.addEventListener('DOMContentLoaded', renderPassUI);

// also rerender whenever auth status changes (login/logout)
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(() => {
        renderPassUI();
    });
}


/* Reward card */

function createRewardElement(reward, unlocked = false, isNext = false, claimable = false) {
    const wrapper = document.createElement("div");
    wrapper.className = "reward-card";
    if (unlocked) wrapper.classList.add("unlocked");
    if (isNext) wrapper.classList.add("next");

    // --- Rarity color logic (circle border) ---
    const isBlackTip = reward.name === "Port Jackson Shark" && /Shark19\.png/.test(reward.img);
    const isMako = /Shark16\.png/.test(reward.img);
    const isRare = /Shark1[2-5]\.png/.test(reward.img);
    let rarityBorder = "#4caf50";
    if (isBlackTip) {
        rarityBorder = "#222";
    } else if (isMako) {
        rarityBorder = "#ffc107";
    } else if (isRare) {
        rarityBorder = "#e91e63";
    }

    // Outer card border (rarity color)
    wrapper.style.cssText = `text-align: center; transition: all 0.3s ease; padding: 6px; border-radius: 8px; position: relative; background: transparent; border: 3px solid ${rarityBorder};`;
    wrapper.onmouseover = () => {
        wrapper.style.transform = "scale(1.08)";
    };
    wrapper.onmouseout = () => {
        wrapper.style.transform = "scale(1)";
    };

    // --- Reward image as a circle, with rarity border (no extra border) ---
    const imgWrap = document.createElement("div");
    imgWrap.style.cssText = `width: 70px; height: 70px; border-radius: 50%; overflow: hidden; background: #222; margin: 0 auto 7px; border: 4px solid ${rarityBorder}; position:relative; display:flex; align-items:center; justify-content:center;`;
    const img = document.createElement("img");
    img.src = reward.img;
    img.alt = reward.name;
    img.style.cssText = "width: 90%; height: 90%; object-fit: cover; border-radius: 50%; background: #222; border: none;";
    if (!unlocked) {
        img.classList.add("locked");
    }
    imgWrap.appendChild(img);
    wrapper.appendChild(imgWrap);

    // --- Reward name (rarity color) ---
    const label = document.createElement("div");
    label.className = "reward-name";
    label.style.cssText = `margin: 5px 0 0 0; font-size: 11px; font-weight: 700; color: ${rarityBorder};`;
    label.textContent = reward.name;
    wrapper.appendChild(label);

    if (claimable) {
        const btn = document.createElement("button");
        btn.className = "claim-btn";
        btn.style.cssText = "margin-top:8px;padding:6px 12px;font-size:12px;cursor:pointer;";

        if (!firebase.auth().currentUser) {
            btn.textContent = "Login to Claim";
            btn.disabled = true;
        } else {
            btn.textContent = "Claim";
            btn.onclick = async (e) => {
                e.stopPropagation();
                btn.disabled = true;
                btn.textContent = "Claiming...";
                await claimReward(reward);
                wrapper.remove();
            };
        }
        wrapper.appendChild(btn);
    }

    return wrapper;
}

async function claimReward(reward) {
    if (!firebase.auth().currentUser) {
        alert('You must be logged in to claim rewards.');
        return;
    }
    try {
        const uid = firebase.auth().currentUser.uid;
        const userStatsRef = db.collection('userStats').doc(uid);
        const entry = { level: reward.level, name: reward.name || reward.img, imagePath: reward.img };
        await userStatsRef.update({ unlockedPfps: firebase.firestore.FieldValue.arrayUnion(entry) });
        claimedPfps.push(entry);
        // optionally show a brief confirmation
        console.log('Reward claimed:', entry);
        // if profile picker is open, update that section as well
        if (typeof loadEarnedCosmetics === 'function') {
            loadEarnedCosmetics().catch(err=>console.error('Error refreshing earned cosmetics after claim:', err));
        }
    } catch (err) {
        console.error('Error claiming reward:', err);
    }
}



/* Section titles */

function createTitle(text) {

const title = document.createElement("h3");

title.className = "reward-section-title";

title.textContent = text;

return title;

}
