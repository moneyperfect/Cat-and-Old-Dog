// Init Game
// Wait for font load (optional) or just load
window.addEventListener('load', () => {
    const game = new Game();
});

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = window.innerWidth;
        this.height = window.innerHeight;

        this.lastTime = 0;
        this.score = 0;
        this.gameSpeed = 5;
        this.isPlaying = false;
        this.isGameOver = false;

        // Entities
        this.player = new Player(this);
        this.obstacles = [];
        this.background = new Background(this);

        // Audio
        this.sound = new SoundManager();

        // Input
        this.input = new InputHandler(this);

        // Setup Resize Listener
        window.addEventListener('resize', () => this.resize());
        this.resize(); // Initial call

        // Bind UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameOverScreen = document.getElementById('game-over-screen');
        this.scoreEl = document.getElementById('score');
        this.finalScoreEl = document.getElementById('final-score');
        this.restartBtn = document.getElementById('restart-btn');
        this.startBtn = document.getElementById('start-btn');

        this.restartBtn.addEventListener('click', () => this.resetGame());
        this.startBtn.addEventListener('click', () => this.startGame());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.groundLevel = this.height - 100; // Ground 100px from bottom (Classic style)
    }

    startGame() {
        this.isPlaying = true;
        this.isGameOver = false;
        this.score = 0;
        this.gameSpeed = 6; // Start slightly faster
        this.obstacles = [];
        this.lastTime = 0;
        this.player.reset();

        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');

        if (this.sound.ctx.state === 'suspended') {
            this.sound.ctx.resume();
        }

        requestAnimationFrame((ts) => this.loop(ts));
    }

    resetGame() {
        this.startGame();
    }

    gameOver() {
        this.isPlaying = false;
        this.isGameOver = true;
        this.finalScoreEl.innerText = Math.floor(this.score);
        this.gameOverScreen.classList.remove('hidden');
        this.sound.die();
    }

    update(deltaTime) {
        if (!this.isPlaying) return;

        this.background.update();
        this.player.update(this.input, deltaTime);

        // Obstacle Handling
        if (this.obstacles.length === 0 ||
            this.obstacles[this.obstacles.length - 1].x < this.width - (300 + Math.random() * 500)) { // Random spacing
            // Random chance to spawn
            this.obstacles.push(new Obstacle(this));
        }

        this.obstacles.forEach((obstacle, index) => {
            obstacle.update();
            if (obstacle.markedForDeletion) this.obstacles.splice(index, 1);

            // Collision Detection
            if (this.checkCollision(this.player, obstacle)) {
                this.gameOver();
            }
        });

        // Score
        const previousScore = Math.floor(this.score);
        this.score += 0.15; // Faster accumulation
        const currentScore = Math.floor(this.score);

        if (previousScore % 100 !== 0 && currentScore % 100 === 0) {
            this.sound.score();
        }

        this.scoreEl.innerText = currentScore.toString().padStart(5, '0');

        // Speed scaling (Cap at some point)
        if (this.gameSpeed < 15) this.gameSpeed += 0.001;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.background.draw(this.ctx);
        this.player.draw(this.ctx);
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
    }

    checkCollision(player, obstacle) {
        // Shrink hitbox slightly for fairness
        const hitboxX = player.x + 10;
        const hitboxY = player.y + 10;
        const hitboxW = player.width - 20;
        const hitboxH = player.height - 15;

        const obsHitboxX = obstacle.x + 5;
        const obsHitboxY = obstacle.y + 5;
        const obsHitboxW = obstacle.width - 10;
        const obsHitboxH = obstacle.height - 10;

        return (
            hitboxX < obsHitboxX + obsHitboxW &&
            hitboxX + hitboxW > obsHitboxX &&
            hitboxY < obsHitboxY + obsHitboxH &&
            hitboxY + hitboxH > obsHitboxY
        );
    }

    loop(timestamp) {
        if (!this.isPlaying) return;
        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((ts) => this.loop(ts));
    }
}

class InputHandler {
    constructor(game) {
        this.keys = [];
        window.addEventListener('keydown', e => {
            if ((e.code === 'Space' ||
                e.code === 'ArrowUp' ||
                e.code === 'ArrowDown')
                && this.keys.indexOf(e.code) === -1) {
                this.keys.push(e.code);
            }
            if (e.code === 'Enter' && !game.isPlaying) game.startGame();
        });

        window.addEventListener('keyup', e => {
            if (e.code === 'Space' ||
                e.code === 'ArrowUp' ||
                e.code === 'ArrowDown') {
                this.keys.splice(this.keys.indexOf(e.code), 1);
            }
        });

        window.addEventListener('touchstart', () => {
            if (this.keys.indexOf('Space') === -1) this.keys.push('Space');
        });
        window.addEventListener('touchend', () => {
            this.keys.splice(this.keys.indexOf('Space'), 1);
        });
    }
}

class Player {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = 80; // Little closer to left
        this.reset();

        // Physics Tuning
        this.jumpForce = 22; // Stronger initial pop
        this.weight = 0.8;   // Lower gravity for "floatier" feel
    }

    reset() {
        this.y = this.game.groundLevel - this.height;
        this.vy = 0;
        this.game.groundLevel = this.game.height - 100; // Sync
    }

    update(input, deltaTime) {
        // Jump
        if ((input.keys.includes('Space') || input.keys.includes('ArrowUp')) && this.onGround()) {
            this.vy = -this.jumpForce;
            this.game.sound.jump();
        }

        // Physics
        this.y += this.vy;
        if (!this.onGround()) {
            this.vy += this.weight;
        } else {
            this.vy = 0;
            this.y = this.game.groundLevel - this.height;
        }

        // Fast Fall
        if (input.keys.includes('ArrowDown') && !this.onGround()) {
            this.vy += 2;
        }
    }

    draw(ctx) {
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = '40px Arial'; // Or a custom symbol

        // Simple pixel-ish Cat or Emoji
        // Use Black Emoji or Grayscale
        ctx.fillStyle = '#000000';
        ctx.fillText('🐱', this.x, this.y);
    }

    onGround() {
        return this.y >= this.game.groundLevel - this.height;
    }
}

class Obstacle {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 40;
        this.x = this.game.width;
        this.y = this.game.groundLevel - this.height;
        this.markedForDeletion = false;
        // Darkened Dog
        this.type = Math.random() < 0.5 ? '🐕' : '🐩';
    }

    update() {
        this.x -= this.game.gameSpeed;
        if (this.x < -this.width) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.font = '40px Arial';
        ctx.fillStyle = '#000000'; // Pure Black
        ctx.fillText(this.type, this.x, this.y);
    }
}

class Background {
    constructor(game) {
        this.game = game;
        this.clouds = [];
        this.trees = [];
        this.cloudTimer = 0;
        this.treeTimer = 0;
    }

    update() {
        // Clouds (Slow, high)
        if (Math.random() < 0.005) {
            this.clouds.push({
                x: this.game.width,
                y: Math.random() * (this.game.height / 3),
                size: 30 + Math.random() * 40,
                speed: 0.2
            });
        }

        // Trees on Ground (Irregular)
        // Chance to spawn tree independent of obstacles, but background layer
        if (Math.random() < 0.015) {
            this.trees.push({
                x: this.game.width,
                y: this.game.groundLevel - 15, // Grounded
                size: 20 + Math.random() * 10,
                type: Math.random() < 0.5 ? '🌲' : '🌳'
            });
        }

        // Move
        this.clouds.forEach(c => c.x -= c.speed);
        this.trees.forEach(t => t.x -= this.game.gameSpeed);

        // Cleanup
        this.clouds = this.clouds.filter(c => c.x > -100);
        this.trees = this.trees.filter(t => t.x > -100);
    }

    draw(ctx) {
        // Ground Line
        ctx.strokeStyle = '#535353';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, this.game.groundLevel);
        ctx.lineTo(this.game.width, this.game.groundLevel);
        ctx.stroke();

        // Clouds (Gray)
        ctx.fillStyle = '#EEEEEE'; // Very light gray for depth
        this.clouds.forEach(c => {
            ctx.font = `${c.size}px Arial`;
            ctx.fillText('☁️', c.x, c.y);
            // Note: Emojis have colors, we can use filter or just simple shapes if needed.
            // CSS grayscale(100%) on canvas handles the color removal.
        });

        // Trees (Gray)
        ctx.fillStyle = '#999999';
        this.trees.forEach(t => {
            ctx.font = `${t.size}px Arial`;
            // Emojis might still show color unless canvas has filter.
            // But we will apply filter to canvas in style.css or here.
            ctx.filter = 'grayscale(100%) opacity(50%)';
            ctx.fillText(t.type, t.x, t.y - t.size / 2);
            ctx.filter = 'none'; // Reset
        });
    }
}

class SoundManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playTone(freq, type, duration) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    jump() {
        this.playTone(600, 'square', 0.1); // Retro beep
    }

    score() {
        this.playTone(1200, 'sine', 0.1);
    }

    die() {
        this.playTone(150, 'sawtooth', 0.4);
    }
}
