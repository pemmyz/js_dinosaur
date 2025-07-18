const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const gameOverContainer = document.getElementById('game-over-container');

// --- Game Constants ---
const GAME_WIDTH = 800;
const GAME_HEIGHT = 250;
const GROUND_Y = GAME_HEIGHT - 30;

// Player constants
const DINO_WIDTH = 40;
const DINO_HEIGHT = 60;
const DINO_CROUCH_WIDTH = 60;
const DINO_CROUCH_HEIGHT = 30;
const DINO_JUMP_POWER = 12;
const GRAVITY = 0.6;

// Game speed
const INITIAL_GAME_SPEED = 5;
const GAME_SPEED_INCREMENT = 0.001;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// --- Game State ---
let player, gameSpeed, score, highScore, isGameOver, obstacles, clouds, frameCount;

// --- Player (Dino) Object ---
class Player {
    constructor(x, y, w, h, crouchW, crouchH) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.crouchW = crouchW;
        this.crouchH = crouchH;
        
        this.velocityY = 0;
        this.isJumping = false;
        this.isCrouching = false;
        this.legToggle = true; // For running animation
    }

    draw() {
        ctx.fillStyle = '#535353';
        const currentHitbox = this.getHitbox();

        if (this.isCrouching) {
             // Crouched Body
            ctx.fillRect(currentHitbox.x, currentHitbox.y, currentHitbox.w, currentHitbox.h);
            // Crouched Head
            ctx.fillRect(currentHitbox.x + currentHitbox.w - 15, currentHitbox.y + 5, 20, 15);
        } else {
            // Standing Body
            ctx.fillRect(currentHitbox.x, currentHitbox.y, currentHitbox.w, currentHitbox.h - 10);
            // Standing Head
            ctx.fillRect(currentHitbox.x + currentHitbox.w * 0.7, currentHitbox.y - 10, currentHitbox.w * 0.6, currentHitbox.h * 0.4);
            // Arm
            ctx.fillRect(currentHitbox.x + currentHitbox.w * 0.6, currentHitbox.y + 20, 10, 5);
            // Legs
            if (this.isJumping) {
                ctx.fillRect(currentHitbox.x + 10, currentHitbox.y + currentHitbox.h - 10, 8, 10);
                ctx.fillRect(currentHitbox.x + currentHitbox.w - 20, currentHitbox.y + currentHitbox.h - 10, 8, 10);
            } else {
                if (this.legToggle) {
                    ctx.fillRect(currentHitbox.x + 5, currentHitbox.y + currentHitbox.h - 10, 8, 10);
                } else {
                    ctx.fillRect(currentHitbox.x + currentHitbox.w - 15, currentHitbox.y + currentHitbox.h - 10, 8, 10);
                }
            }
        }
    }

    update() {
        if (!this.isJumping && !this.isCrouching && frameCount % 10 === 0) {
            this.legToggle = !this.legToggle;
        }

        // Apply gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        // Ground check
        const groundPos = GROUND_Y - (this.isCrouching ? this.crouchH : this.h);
        if (this.y > groundPos) {
            this.y = groundPos;
            this.velocityY = 0;
            this.isJumping = false;
        }
        
        this.draw();
    }

    jump() {
        if (!this.isJumping && !this.isCrouching) {
            this.isJumping = true;
            this.velocityY = -DINO_JUMP_POWER;
        }
    }

    crouch() {
        if (!this.isJumping) {
            this.isCrouching = true;
        }
    }

    stopCrouch() {
        this.isCrouching = false;
        // Adjust position so dino doesn't sink into ground when standing up
        this.y -= (this.h - this.crouchH);
    }
    
    getHitbox() {
        if (this.isCrouching) {
            return { x: this.x, y: this.y, w: this.crouchW, h: this.crouchH };
        }
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

// --- Obstacle Classes ---
class Obstacle {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
    }

    update() {
        this.x -= gameSpeed;
        this.draw();
    }
    
    getHitbox() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
}

class Cactus extends Obstacle {
    constructor(x, y, type) {
        const sizes = {
            'small': { w: 20, h: 40 },
            'large': { w: 30, h: 60 },
            'group': { w: 60, h: 40 }
        };
        super(x, y - sizes[type].h, sizes[type].w, sizes[type].h);
        this.type = type;
    }

    draw() {
        ctx.fillStyle = '#535353';
        if (this.type === 'small') {
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillRect(this.x + 5, this.y - 10, 10, 10);
        } else if (this.type === 'large') {
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.fillRect(this.x + 10, this.y - 20, 10, 20);
        } else if (this.type === 'group') {
            ctx.fillRect(this.x, this.y, 20, 40);
            ctx.fillRect(this.x + 25, this.y - 15, 25, 55);
            ctx.fillRect(this.x + 55, this.y, 20, 40);
        }
    }
}

class Pterodactyl extends Obstacle {
    constructor(x, y) {
        super(x, y, 50, 30);
        this.wingToggle = true;
    }

    draw() {
        ctx.fillStyle = '#535353';
        ctx.fillRect(this.x, this.y + 10, this.w, 10); // Body
        ctx.fillRect(this.x + this.w, this.y + 5, 15, 10); // Head

        if (this.wingToggle) {
            ctx.fillRect(this.x + 10, this.y, 30, 10); // Wings up
        } else {
            ctx.fillRect(this.x + 10, this.y + 20, 30, 10); // Wings down
        }
    }

    update() {
        if (frameCount % 15 === 0) {
            this.wingToggle = !this.wingToggle;
        }
        super.update();
    }
}

// --- Cloud Class ---
class Cloud {
    constructor(x, y, size) {
        this.x = x;
        this.y = y;
        this.size = size;
    }

    draw() {
        ctx.fillStyle = 'rgba(83, 83, 83, 0.3)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size, this.y - 5, this.size, 0, Math.PI * 2);
        ctx.arc(this.x + this.size * 2, this.y, this.size * 1.2, 0, Math.PI * 2);
        ctx.fill();
    }

    update() {
        this.x -= gameSpeed * 0.5; // Parallax effect
        this.draw();
    }
}

// --- Game Functions ---
function init() {
    player = new Player(50, GROUND_Y - DINO_HEIGHT, DINO_WIDTH, DINO_HEIGHT, DINO_CROUCH_WIDTH, DINO_CROUCH_HEIGHT);
    gameSpeed = INITIAL_GAME_SPEED;
    score = 0;
    highScore = localStorage.getItem('dinoHighScore') || 0;
    highScoreEl.textContent = highScore;
    isGameOver = false;
    obstacles = [];
    clouds = [];
    frameCount = 0;
    
    for(let i = 0; i < 3; i++) { spawnCloud(); }

    gameOverContainer.classList.add('hidden');
    obstacleSpawnTimer = getRandomInt(80, 150);
    gameLoop();
}

let obstacleSpawnTimer = 0;
let cloudSpawnTimer = 0;

function gameLoop() {
    if (isGameOver) {
        showGameOver();
        return;
    }

    frameCount++;
    gameSpeed += GAME_SPEED_INCREMENT;
    score++;
    scoreEl.textContent = Math.floor(score / 10);

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Clouds
    cloudSpawnTimer--;
    if (cloudSpawnTimer <= 0) {
        spawnCloud();
        cloudSpawnTimer = getRandomInt(200, 400);
    }
    clouds = clouds.filter(c => c.x + c.size * 3 > 0);
    clouds.forEach(cloud => cloud.update());
    
    // Player
    player.update();

    // Obstacles
    obstacleSpawnTimer--;
    if (obstacleSpawnTimer <= 0) {
        spawnObstacle();
        obstacleSpawnTimer = getRandomInt(60, 140) / (gameSpeed / INITIAL_GAME_SPEED);
    }
    obstacles = obstacles.filter(obs => obs.x + obs.w > 0);
    obstacles.forEach(obs => {
        obs.update();
        if (checkCollision(player.getHitbox(), obs.getHitbox())) {
            isGameOver = true;
        }
    });

    requestAnimationFrame(gameLoop);
}

function spawnObstacle() {
    const obstacleType = Math.random();
    if (obstacleType < 0.7 && !player.isCrouching) { // Cactuses can't spawn if you're holding crouch
        const cactusType = ['small', 'large', 'group'][getRandomInt(0, 2)];
        obstacles.push(new Cactus(GAME_WIDTH, GROUND_Y, cactusType));
    } else {
        // Low flying Pterodactyl that requires crouching.
        // It spawns at a height of 50px from the ground.
        // The standing dino is 60px tall and will collide.
        // The crouching dino is 30px tall and will pass under.
        const pteroY = GROUND_Y - 50; 
        obstacles.push(new Pterodactyl(GAME_WIDTH, pteroY));
    }
}

function spawnCloud() {
    const x = GAME_WIDTH + 50;
    const y = getRandomInt(30, 100);
    const size = getRandomInt(15, 30);
    clouds.push(new Cloud(x, y, size));
}

function checkCollision(box1, box2) {
    return (
        box1.x < box2.x + box2.w &&
        box1.x + box1.w > box2.x &&
        box1.y < box2.y + box2.h &&
        box1.y + box1.h > box2.y
    );
}

function showGameOver() {
    const finalScore = Math.floor(score / 10);
    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('dinoHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
    gameOverContainer.classList.remove('hidden');
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Event Listeners ---
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        if (isGameOver) {
            init();
        } else {
            player.jump();
        }
    } else if (e.code === 'ArrowDown') {
        if (!isGameOver) {
            player.crouch();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
        if (!isGameOver) {
            player.stopCrouch();
        }
    }
});

// Start the game
init();
