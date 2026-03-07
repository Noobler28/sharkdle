const urlParams = new URLSearchParams(window.location.search);

const result = urlParams.get("result");
const sharkName = urlParams.get("sharkName");
const guessesTaken = urlParams.get("guessesTaken");

const title = document.getElementById("gameOverTitle");
const message = document.getElementById("message");
const resultText = document.getElementById("result");


if(result === "win"){

title.textContent = "You Win! 🦈";

message.textContent = `You guessed it in ${guessesTaken} guesses`;

resultText.textContent = `The shark was ${sharkName}`;

}
else{

title.textContent = "You Lose 💀";

message.textContent = `The shark was ${sharkName}`;

}


function playAgain(){

window.location.href = "infinite.html";

}

function returnToMenu(){

window.location.href = "index.html";

}


/* Bubble animation */

const container = document.getElementById("bubbleContainer");

function createBubble(){

const bubble = document.createElement("div");

bubble.className = "bubble";

const size = Math.random()*20 + 10;

bubble.style.width = size+"px";
bubble.style.height = size+"px";

bubble.style.left = Math.random()*100+"%";

bubble.style.animationDuration = (Math.random()*4+4)+"s";

container.appendChild(bubble);

setTimeout(()=>{

bubble.remove();

},8000);

}

setInterval(createBubble,300);
