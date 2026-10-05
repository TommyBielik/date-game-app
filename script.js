const startButton = document.getElementById("clickableDiv");
const startImage = document.getElementById("startImgUnpressed");
const rulesButton = document.getElementById("rulesButton");
const rulesImg = document.getElementById("rulesImg");
const player = document.getElementById("player");
const gameScreen = document.getElementById("levelOne");

const levelImages = document.querySelectorAll(".level-image");

const controls = document.getElementById("controls");
const leftButton = document.getElementById("leftButton");
const rightButton = document.getElementById("rightButton");
const upButton = document.getElementById("upButton");
const downButton = document.getElementById("downButton");

const collisions = document.querySelectorAll(".hitbox");

const talkBox = document.getElementById("interactHitbox");
const talkButton = document.getElementById("talkButton");
const textBoxImg = document.getElementById("textbox-img");
const textbox = document.getElementById("textbox");
const snackboxText = document.getElementById("snackboxText");

const snackbox = document.getElementById("snackbox");

let audioContext = new (window.AudioContext || window.webkitAudioContext)();

let audioUnlocked = false;

function createSilentWavUrl() {
    const sampleRate = 8000;
    const samples = 800;
    const buffer = new ArrayBuffer(44 + samples * 2);
    const v = new DataView(buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };

    w(0, "RIFF");
    v.setUint32(4, 36 + samples * 2, true);
    w(8, "WAVE");
    w(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, sampleRate, true);
    v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    w(36, "data");
    v.setUint32(40, samples * 2, true);

    return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
}

function unlockAudio() {
    if (audioUnlocked) return;

    // Safari 16.4+: zvuk aj pri vypnutom tlačidle stlmenia
    try {
        if (navigator.audioSession) {
            navigator.audioSession.type = "playback";
        }
    } catch (e) {}

    audioContext.resume();

    // tichý buffer cez Web Audio
    const buf = audioContext.createBuffer(1, 1, 22050);
    const src = audioContext.createBufferSource();
    src.buffer = buf;
    src.connect(audioContext.destination);
    src.start(0);

    // tichý HTML audio – prepne iOS do "playback" režimu
    const silent = new Audio(createSilentWavUrl());
    silent.play().then(() => {
        audioUnlocked = true;
        ["touchend", "pointerup", "click"].forEach(ev =>
            document.removeEventListener(ev, unlockAudio)
        );
        soundsReady.then(() => playSound("mainTheme"));
    }).catch(() => {});
}

["touchend", "pointerup", "click"].forEach(ev =>
    document.addEventListener(ev, unlockAudio, { passive: true })
);

let walkingBuffer = null;
let pickupBuffer = null;
let buttonBuffer = null;
let mainThemeBuffer = null;
let audioFilesReady = false;


async function playBuffer(buffer, volume = 1) {
    if (!audioFilesReady || !buffer) {
        console.log("Audio not ready");
        return;
    }

    if (audioContext.state !== "running") {
        await audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();

    source.buffer = buffer;
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(audioContext.destination);

    source.start(0);
}

async function preloadSounds() {
    async function load(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        return await audioContext.decodeAudioData(arrayBuffer);
    }

    walkingBuffer = await load("assets/sounds/steps.mp3");
    pickupBuffer = await load("assets/sounds/pickup-sound.mp3");
    buttonBuffer = await load("assets/sounds/button-click.mp3");
    mainThemeBuffer = await load("assets/sounds/main-theme.mp3")

    audioFilesReady = true;

    console.log("Sounds loaded!");
}

document.querySelectorAll(".buttonsound").forEach(button => {
    button.addEventListener("click", () => {
        playSound("buttonSound");
    })
})

let mainThemeSource = null;
let mainThemeGain = null;
let mainThemeStarting = false;
let gameStarted = false;

async function playMainTheme(volume = 0.8) {
    if (gameStarted || mainThemeStarting || mainThemeSource) return;
    if (!audioFilesReady || !mainThemeBuffer) return;

    mainThemeStarting = true;

    if (audioContext.state !== "running") {
        await audioContext.resume();
    }

    // hráč medzitým stlačil Start
    if (gameStarted) {
        mainThemeStarting = false;
        return;
    }

    mainThemeSource = audioContext.createBufferSource();
    mainThemeGain = audioContext.createGain();

    mainThemeSource.buffer = mainThemeBuffer;
    mainThemeSource.loop = true;
    mainThemeGain.gain.value = volume;

    mainThemeSource.connect(mainThemeGain);
    mainThemeGain.connect(audioContext.destination);
    mainThemeSource.start(0);

    mainThemeStarting = false;
}

function stopMainTheme() {
    if (!mainThemeSource) return;

    try {
        mainThemeSource.stop();
    } catch (e) {}

    mainThemeSource.disconnect();
    mainThemeSource = null;
    mainThemeGain = null;
}

let talkedToTommy = false;
let hasSnackbox = false;
let dialogueStep = 0;
let dialogueNum = 1;
talkButton.addEventListener("click", (e) => {
    e.stopPropagation();

    textBoxImg.style.display = "block";
    textbox.style.display = "block";
    controls.style.display = "none";

    if(hasSnackbox) {
        dialogueNum = 2;
        textbox.textContent = "So you've found my snackbox huh... Alright then, I will be waiting for you in real life chump!!!";
    }
});

document.addEventListener("click", () => {
    if(textBoxImg.style.display !== "block") {
        return;
    }

    if(dialogueNum === 1 && dialogueStep === 0) {
        playSound("buttonSound");

        textBoxImg.style.display = "none";
        textbox.style.display = "none";
        controls.style.display = "flex";
        talkedToTommy = true;
    } else if(dialogueNum === 2 && dialogueStep === 0) {
        playSound("buttonSound");
        textbox.textContent = "A-and just because I've invited you to date doesn't mean I l-like you or anything so don't get too cocky!!!"
        dialogueStep++;
    } else if(dialogueNum === 2 && dialogueStep === 1) {
        playSound("buttonSound");
        textBoxImg.style.display = "none";
        textbox.style.display = "none";
        controls.style.display = "flex";
        dialogueStep = 0;
    }
})

function checkInteraction() {
    const playerHitbox = getPlayerHitbox();

    const interactionBox = {
        left: talkBox.offsetLeft,
        top: talkBox.offsetTop,
        right: talkBox.offsetLeft + talkBox.offsetWidth,
        bottom: talkBox.offsetTop + talkBox.offsetHeight
    };

    const isInside =
        playerHitbox.left < interactionBox.right &&
        playerHitbox.right > interactionBox.left &&
        playerHitbox.top < interactionBox.bottom &&
        playerHitbox.bottom > interactionBox.top;

    if (isInside) {
        talkButton.style.display = "block";
    } else {
        talkButton.style.display = "none";
    }
}

function checkSnackbox() {
    if (hasSnackbox) {
        return;
    }

    const playerRect = player.getBoundingClientRect();
    const snackboxRect = snackbox.getBoundingClientRect();

    const isColliding =
        playerRect.left < snackboxRect.right &&
        playerRect.right > snackboxRect.left &&
        playerRect.top < snackboxRect.bottom &&
        playerRect.bottom > snackboxRect.top;

    if (isColliding) {
        hasSnackbox = true;
        snackbox.style.display = "none";
        snackboxText.style.display = "block";
        setTimeout(() => {
            snackboxText.style.display = "none";
        }, 2000);

        playSound("pickupSound");
    }
}

function getPlayerHitbox() {
    return {
        left: playerX + 10,
        top: playerY + 100,
        right: playerX + 60,
        bottom: playerY + 135
    }
}

function willCollide(x, y) {
    const hitbox = {
        left: x + 10,
        top: y + 100,
        right: x + 60,
        bottom: y + 135
    };

    for (const collision of collisions) {
        const collisionBox = {
            left: collision.offsetLeft,
            top: collision.offsetTop,
            right: collision.offsetLeft + collision.offsetWidth,
            bottom: collision.offsetTop + collision.offsetHeight
        };

        if (
            hitbox.left < collisionBox.right &&
            hitbox.right > collisionBox.left &&
            hitbox.top < collisionBox.bottom &&
            hitbox.bottom > collisionBox.top
        ) {
            return true;
        }
    }

    return false;
}

let playerX = 170;
let playerY = 300;
const speed = 100;

let levelNum = "0";
let sceneNum = 0;

let direction = {
    x: 0,
    y: 0
};

const saskaAnimations = {
    front: [
        "assets/sprites/saska/saska-front-1.png",
        "assets/sprites/saska/saska-front-2.png",
        "assets/sprites/saska/saska-front-1.png",
        "assets/sprites/saska/saska-front-3.png"
    ],

    back: [
        "assets/sprites/saska/saska-back-1.png",
        "assets/sprites/saska/saska-back-2.png",
        "assets/sprites/saska/saska-back-1.png",
        "assets/sprites/saska/saska-back-3.png"
    ],

    left: [
        "assets/sprites/saska/saska-left-1.png",
        "assets/sprites/saska/saska-left-2.png",
        "assets/sprites/saska/saska-left-1.png",
        "assets/sprites/saska/saska-left-3.png"
    ],

    right: [
        "assets/sprites/saska/saska-right-1.png",
        "assets/sprites/saska/saska-right-2.png",
        "assets/sprites/saska/saska-right-1.png",
        "assets/sprites/saska/saska-right-3.png"
    ]
}

const screens = {
    tap: document.getElementById("tapScreen"),
    title: document.getElementById("titleScreen"),
    loading: document.getElementById("loadingScreen"),
    rules: document.getElementById("rulesScreen"),
    levels: document.getElementById("levelsScreen"),
    levelOne: document.getElementById("levelOne"),
};

let currentDirection = "front";
let animationFrame = 0;
let animationTimer = 0;

const animationSpeed = 0.12;

let lastTime = performance.now();

function updateAnimation(deltaTime) {
    if (direction.x === 0 && direction.y === 0) {
        animationFrame = 0;
        animationTimer = 0;

        player.src = saskaAnimations[currentDirection][0];
        return;
    }

    if (direction.x < 0) {
        currentDirection = "left";
    } else if (direction.x > 0) {
        currentDirection = "right";
    } else if (direction.y < 0) {
        currentDirection = "back";
    } else if (direction.y > 0) {
        currentDirection = "front";
    }

    animationTimer += deltaTime;

    if (animationTimer >= animationSpeed) {
        animationTimer = 0;

        animationFrame++;

        if (animationFrame >= saskaAnimations[currentDirection].length) {
            animationFrame = 0;
        }

        if (animationFrame === 1) {
            playWalkingSound();
        }
        player.src = saskaAnimations[currentDirection][animationFrame];
    }
}

function movePlayer(deltaTime) {

    const moveX = direction.x * speed * deltaTime;
    const moveY = direction.y * speed * deltaTime;

    const steps = Math.ceil(Math.max(
        Math.abs(moveX),
        Math.abs(moveY)
    ));

    const stepX = moveX / steps;
    const stepY = moveY / steps;

    for (let i = 0; i < steps; i++) {

        const newX = playerX + stepX;
        const newY = playerY + stepY;

        if (willCollide(newX, newY)) {
            break;
        }

        playerX = newX;
        playerY = newY;
    }
}

function gameLoop(currentTime) {
    const deltaTime = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    movePlayer(deltaTime);

    player.style.left = playerX + "px";
    player.style.top = playerY + "px";

    updateAnimation(deltaTime);
    checkBoundaries();
    checkInteraction();
    checkSnackbox();

    requestAnimationFrame(gameLoop);
}

function checkBoundaries() {
    if (sceneNum === 1) {

        if (playerX < 0) {
            playerX = 0;
        }

        if (playerX + player.offsetWidth > gameScreen.clientWidth) {
            if(talkedToTommy) {
                loadSnackboxScene();
                sceneNum = 3;
            } else {
                playerX = gameScreen.clientWidth - player.offsetWidth;
            }
        }

        if (playerY + player.offsetHeight > gameScreen.clientHeight) {
            playerY = gameScreen.clientHeight - player.offsetHeight;
        }

        if (direction.y < 0 && playerY + player.offsetHeight < 0) {
            if (levelNum === "1" && sceneNum === 1) {
                loadNextScene();
            }
        }
    }

    if (sceneNum === 2) {

        if (playerX < 0) {
            playerX = 0;
        }

        if (playerX + player.offsetWidth > gameScreen.clientWidth) {
            playerX = gameScreen.clientWidth - player.offsetWidth;
        }

        if (playerY + player.offsetHeight > gameScreen.clientHeight) {
            sceneNum = 1;

            showScreen("levelOne");
            document.getElementById("seaScene").classList.remove("active");
            document.getElementById("wavesSound").muted = true;

            playerY = 0;
            player.style.top = playerY + "px";
        }
    }

    if (sceneNum === 3) {

        if (playerX < 0) {
            sceneNum = 1;

            showScreen("levelOne");
            document.getElementById("snackboxScene").classList.remove("active");

            playerX = gameScreen.clientWidth - player.offsetWidth;

            player.style.left = playerX + "px";
            player.style.top = playerY + "px";
        }

        if (playerX + player.offsetWidth > gameScreen.clientWidth) {
            playerX = gameScreen.clientWidth - player.offsetWidth;
        }

        if (playerY < 0) {
            playerY = 0;
        }

        if (playerY + player.offsetHeight > gameScreen.clientHeight) {
            playerY = gameScreen.clientHeight - player.offsetHeight;
        }
    }
}

function setPlayerAtBottomCenter() {
    playerX = (gameScreen.clientWidth - player.offsetWidth) / 2;
    playerY = gameScreen.clientHeight - player.offsetHeight - 20;

    player.style.left = playerX + "px";
    player.style.top = playerY + "px";
}

function loadSnackboxScene() {
    document.getElementById("snackboxScene").classList.add("active");
    playerX = 0;
}

function loadNextScene() {
    if(levelNum === "1" && sceneNum === 1) {
        document.getElementById("seaScene").classList.add("active");
        sceneNum = 2;
        const wavesSound = document.getElementById("wavesSound");

        wavesSound.muted = false;
        wavesSound.volume = 0.8;
        wavesSound.currentTime = 0;
        wavesSound.play();
    }
    setPlayerAtBottomCenter();
}

requestAnimationFrame(gameLoop);

leftButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    direction.x = -1;
    direction.y = 0;
});

rightButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    direction.x = 1;
    direction.y = 0;
});

upButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    direction.x = 0;
    direction.y = -1;
});

downButton.addEventListener("touchstart", (e) => {
    e.preventDefault();
    direction.x = 0;
    direction.y = 1;
});

leftButton.addEventListener("touchend", () => {
    direction.x = 0;
    direction.y = 0;
});

rightButton.addEventListener("touchend", () => {
    direction.x = 0;
    direction.y = 0;
});

upButton.addEventListener("touchend", () => {
    direction.x = 0;
    direction.y = 0;
});

downButton.addEventListener("touchend", () => {
    direction.x = 0;
    direction.y = 0;
});

levelImages.forEach(level => {
    level.addEventListener("click", () => {
        if(level.dataset.locked === "true") {
            return;
        }
        levelNum = level.dataset.level;
        startLevel(levelNum)
    })
})

function startLevel(levelNum) {
    console.log("Starting level:", levelNum);

    if(levelNum === "1"){
        startLevelOne();
    }
}

function startLevelOne() {
    sceneNum = 1;
    showScreen("levelOne");
    setPlayerAtBottomCenter();
}

startButton.addEventListener("click", async () => {
    gameStarted = true;
    stopMainTheme();
    unlockAudio();
    startImage.src = "assets/images/Start-button-pressed.png";

    screens.title.classList.add("title-hide");

    startButton.style.pointerEvents = "none";

    await audioContext.resume();

    console.log("Audio context:", audioContext.state);

    await soundsReady;

    console.log("Audio ready:", audioFilesReady);

    const wavesSound = document.getElementById("wavesSound");

    wavesSound.muted = true;
    wavesSound.currentTime = 0;
    wavesSound.play();

    setTimeout(() => {
        showLoadingScreen();
        screens.title.classList.remove("title-hide");
    }, 2000);

    setTimeout(() => {
        startImage.src = "assets/images/Start-button-unpressed.png";
    }, 150);
});

startButton.addEventListener("animationend", () => {
    startButton.style.pointerEvents = "auto";
});

rulesButton.addEventListener("click", () => {
    rulesImg.src = "assets/images/button-rules-unpressed.png";
    screens.rules.classList.add("title-hide");
    rulesButton.style.pointerEvents = "none";

    setTimeout(() => {
        showScreen("levels");
        screens.rules.classList.remove("title-hide");
    }, 2000);
    setTimeout(() => {
        rulesImg.src = "assets/images/button-rules-pressed.png";
    }, 150);
});

function showScreen(screenName) {
    Object.values(screens).forEach(screen => {
        screen.classList.remove("active")
    });

    screens[screenName].classList.add("active");
}

function showLoadingScreen() {
    showScreen("loading");

    setTimeout(() => {
        showScreen("rules");
    }, 4000);
}

function startGame() {
    showScreen("tap");
}

screens.tap.addEventListener("click", () => {
    showScreen("title");
});

function playSound(soundName) {
    if (soundName === "buttonSound") {
        playBuffer(buttonBuffer, 0.8);
    }

    if (soundName === "pickupSound") {
        playBuffer(pickupBuffer, 0.8);
    }

    if(soundName === "mainTheme") {
        playMainTheme(0.8);
    }
}

function playWalkingSound() {
    playBuffer(walkingBuffer, 0.6);
}


startGame();
const soundsReady = preloadSounds();