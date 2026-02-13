// Motore principale del gioco Tetris

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30;

// Stati del gioco
const GameState = {
    READY: 'ready',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// Sistema di punteggio
const SCORE_SYSTEM = {
    SINGLE: 100,
    DOUBLE: 300,
    TRIPLE: 500,
    TETRIS: 800,
    SOFT_DROP: 1,
    HARD_DROP: 2
};

class TetrisGame {
    constructor() {
        // Canvas
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('nextCanvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('holdCanvas');
        this.holdCtx = this.holdCanvas.getContext('2d');

        // Griglia di gioco
        this.board = this.createEmptyBoard();

        // Sistema di generazione pezzi
        this.generator = new TetrominoGenerator();

        // Pezzi
        this.currentPiece = null;
        this.nextPiece = null;
        this.holdPiece = null;
        this.canHold = true;
        this.ghostPiece = null;

        // Stato del gioco
        this.state = GameState.READY;
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.piecesPlaced = 0;

        // Timing
        this.dropInterval = 1000; // millisecondi
        this.lastDropTime = 0;
        this.fastDrop = false;
        this.animationId = null;

        // Sistema di animazione per linee completate
        this.clearedLines = [];
        this.clearingAnimation = false;

        // Managers
        this.storage = new StorageManager();
        this.audio = new AudioManager();

        // Input
        this.keys = {};
        this.lastMoveTime = 0;
        this.moveDelay = 100;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
        this.storage.renderHighScores();
        this.drawBoard();
        this.drawNextPiece();
        this.drawHoldPiece();

        // Marca i canvas come attivi per rimuovere animazione pulse
        this.canvas.classList.add('active');
        this.nextCanvas.classList.add('active');
        this.holdCanvas.classList.add('active');
    }

    createEmptyBoard() {
        return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    }

    setupEventListeners() {
        // Tastiera
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Pulsanti UI
        document.getElementById('startBtn').addEventListener('click', () => this.start());
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());
        document.getElementById('muteBtn').addEventListener('click', () => this.toggleMute());
        document.getElementById('overlayBtn').addEventListener('click', () => this.restart());

        // Controlli Touch Mobile
        this.setupTouchControls();
    }

    setupTouchControls() {
        const touchLeft = document.getElementById('touchLeft');
        const touchRight = document.getElementById('touchRight');
        const touchDown = document.getElementById('touchDown');
        const touchRotate = document.getElementById('touchRotate');
        const touchDrop = document.getElementById('touchDrop');
        const touchHold = document.getElementById('touchHold');

        // Previeni il comportamento di default per tutti i pulsanti touch
        const preventDefaults = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        // Sinistra
        touchLeft.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (this.state === GameState.PLAYING) {
                this.movePiece(-1, 0);
            }
        });

        // Destra
        touchRight.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (this.state === GameState.PLAYING) {
                this.movePiece(1, 0);
            }
        });

        // Giù (soft drop)
        let downInterval = null;
        touchDown.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (this.state === GameState.PLAYING) {
                this.fastDrop = true;
                this.movePiece(0, 1);
                // Continua a muovere giù mentre il pulsante è premuto
                downInterval = setInterval(() => {
                    if (this.state === GameState.PLAYING) {
                        this.movePiece(0, 1);
                    }
                }, 50);
            }
        });

        touchDown.addEventListener('touchend', (e) => {
            preventDefaults(e);
            this.fastDrop = false;
            if (downInterval) {
                clearInterval(downInterval);
                downInterval = null;
            }
        });

        // Rotazione
        touchRotate.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (this.state === GameState.PLAYING) {
                this.rotatePiece(true);
            }
        });

        // Hard Drop
        touchDrop.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (this.state === GameState.PLAYING) {
                this.hardDrop();
            }
        });

        // Hold
        touchHold.addEventListener('touchstart', (e) => {
            preventDefaults(e);
            if (this.state === GameState.PLAYING) {
                this.holdCurrentPiece();
            }
        });

        // Aggiungi anche supporto per click (per testare su desktop)
        touchLeft.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) this.movePiece(-1, 0);
        });
        touchRight.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) this.movePiece(1, 0);
        });
        touchDown.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) this.movePiece(0, 1);
        });
        touchRotate.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) this.rotatePiece(true);
        });
        touchDrop.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) this.hardDrop();
        });
        touchHold.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) this.holdCurrentPiece();
        });
    }

    handleKeyDown(e) {
        if (this.state !== GameState.PLAYING) return;

        if (this.keys[e.key]) return; // Evita ripetizione
        this.keys[e.key] = true;

        const now = Date.now();

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.movePiece(-1, 0);
                this.lastMoveTime = now;
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.movePiece(1, 0);
                this.lastMoveTime = now;
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.fastDrop = true;
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.rotatePiece(true);
                break;
            case 'z':
            case 'Z':
                e.preventDefault();
                this.rotatePiece(false);
                break;
            case 'x':
            case 'X':
                e.preventDefault();
                this.rotatePiece(true);
                break;
            case ' ':
                e.preventDefault();
                this.hardDrop();
                break;
            case 'c':
            case 'C':
                e.preventDefault();
                this.holdCurrentPiece();
                break;
            case 'p':
            case 'P':
                e.preventDefault();
                this.togglePause();
                break;
        }
    }

    handleKeyUp(e) {
        this.keys[e.key] = false;

        if (e.key === 'ArrowDown') {
            this.fastDrop = false;
        }
    }

    start() {
        if (this.state === GameState.PLAYING) return;

        this.board = this.createEmptyBoard();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.piecesPlaced = 0;
        this.canHold = true;
        this.holdPiece = null;

        this.generator = new TetrominoGenerator();
        this.spawnNewPiece();
        this.nextPiece = this.generator.next();

        this.state = GameState.PLAYING;
        this.updateUI();
        this.hideOverlay();

        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;

        this.lastDropTime = Date.now();
        this.gameLoop();
    }

    restart() {
        this.stop();
        this.start();
    }

    stop() {
        this.state = GameState.READY;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
    }

    togglePause() {
        if (this.state === GameState.PLAYING) {
            this.state = GameState.PAUSED;
            document.getElementById('pauseBtn').textContent = 'Riprendi';
            this.showOverlay('PAUSA', 'Premi P o Riprendi per continuare');
        } else if (this.state === GameState.PAUSED) {
            this.state = GameState.PLAYING;
            document.getElementById('pauseBtn').textContent = 'Pausa';
            this.hideOverlay();
            this.lastDropTime = Date.now();
            this.gameLoop();
        }
    }

    gameLoop(timestamp = 0) {
        if (this.state !== GameState.PLAYING) return;

        const now = Date.now();
        const dropSpeed = this.fastDrop ? 50 : this.getDropSpeed();

        if (now - this.lastDropTime > dropSpeed) {
            this.dropPiece();
            this.lastDropTime = now;
        }

        this.render();

        this.animationId = requestAnimationFrame((ts) => this.gameLoop(ts));
    }

    getDropSpeed() {
        // Velocità aumenta con il livello
        return Math.max(100, this.dropInterval - (this.level - 1) * 50);
    }

    spawnNewPiece() {
        if (!this.nextPiece) {
            this.currentPiece = this.generator.next();
            this.nextPiece = this.generator.next();
        } else {
            this.currentPiece = this.nextPiece;
            this.nextPiece = this.generator.next();
        }

        // Posiziona il pezzo in alto al centro
        this.currentPiece.x = Math.floor((BOARD_WIDTH - this.currentPiece.shape.length) / 2);
        this.currentPiece.y = 0;

        this.canHold = true;
        // this.updateGhostPiece(); // Ghost piece rimosso

        // Controlla se il pezzo può essere posizionato (altrimenti game over)
        if (!this.isValidPosition(this.currentPiece)) {
            this.gameOver();
        }

        this.piecesPlaced++;
        this.updateUI();
        this.drawNextPiece();
    }

    dropPiece() {
        if (!this.movePiece(0, 1)) {
            // Il pezzo non può scendere, lo fissiamo
            this.lockPiece();
        }
    }

    movePiece(dx, dy) {
        if (!this.currentPiece) return false;

        this.currentPiece.x += dx;
        this.currentPiece.y += dy;

        if (!this.isValidPosition(this.currentPiece)) {
            this.currentPiece.x -= dx;
            this.currentPiece.y -= dy;
            return false;
        }

        if (dx !== 0) {
            this.audio.playMove();
        }

        // this.updateGhostPiece(); // Ghost piece rimosso
        return true;
    }

    rotatePiece(clockwise = true) {
        if (!this.currentPiece) return;

        const oldRotation = this.currentPiece.rotation;
        const newRotation = (oldRotation + (clockwise ? 1 : -1) + 4) % 4;
        const oldShape = this.currentPiece.shape;
        const newShape = this.currentPiece.rotate(clockwise);

        // Prova i wall kicks
        const offsets = getWallKickOffsets(this.currentPiece, oldRotation, newRotation);

        for (const [offsetX, offsetY] of offsets) {
            this.currentPiece.shape = newShape;
            this.currentPiece.rotation = newRotation;
            this.currentPiece.x += offsetX;
            this.currentPiece.y += offsetY;

            if (this.isValidPosition(this.currentPiece)) {
                this.audio.playRotate();
                // this.updateGhostPiece(); // Ghost piece rimosso
                return;
            }

            // Ripristina posizione per il prossimo tentativo
            this.currentPiece.x -= offsetX;
            this.currentPiece.y -= offsetY;
        }

        // Nessun wall kick funziona, ripristina
        this.currentPiece.shape = oldShape;
        this.currentPiece.rotation = oldRotation;
        this.audio.playInvalidMove();
    }

    hardDrop() {
        if (!this.currentPiece) return;

        let dropDistance = 0;
        while (this.movePiece(0, 1)) {
            dropDistance++;
        }

        this.score += dropDistance * SCORE_SYSTEM.HARD_DROP;
        this.updateUI();

        this.audio.playDrop();
        this.lockPiece();
    }

    lockPiece() {
        if (!this.currentPiece) return;

        // Aggiungi il pezzo alla board
        const blocks = this.currentPiece.getBlocks();
        blocks.forEach(block => {
            if (block.y >= 0 && block.y < BOARD_HEIGHT && block.x >= 0 && block.x < BOARD_WIDTH) {
                this.board[block.y][block.x] = this.currentPiece.color;
            }
        });

        // Controlla linee completate
        this.checkLines();

        // Spawna nuovo pezzo
        this.spawnNewPiece();
    }

    checkLines() {
        const completedLines = [];

        for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            if (this.board[y].every(cell => cell !== 0)) {
                completedLines.push(y);
            }
        }

        if (completedLines.length > 0) {
            this.clearLines(completedLines);
        }
    }

    clearLines(lineIndices) {
        // Animazione e rimozione linee
        this.clearedLines = lineIndices;
        this.clearingAnimation = true;

        setTimeout(() => {
            // Rimuovi le linee (dal basso verso l'alto per evitare problemi con gli indici)
            lineIndices.sort((a, b) => b - a).forEach(y => {
                this.board.splice(y, 1);
            });

            // Aggiungi righe vuote in alto
            for (let i = 0; i < lineIndices.length; i++) {
                this.board.unshift(Array(BOARD_WIDTH).fill(0));
            }

            // Aggiorna punteggio
            const lineCount = lineIndices.length;
            let points = 0;

            switch (lineCount) {
                case 1:
                    points = SCORE_SYSTEM.SINGLE;
                    break;
                case 2:
                    points = SCORE_SYSTEM.DOUBLE;
                    break;
                case 3:
                    points = SCORE_SYSTEM.TRIPLE;
                    break;
                case 4:
                    points = SCORE_SYSTEM.TETRIS;
                    break;
            }

            points *= this.level;
            this.score += points;
            this.lines += lineCount;

            // Level up ogni 10 linee
            const newLevel = Math.floor(this.lines / 10) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.audio.playLevelUp();
            }

            this.audio.playLineClear(lineCount);
            this.updateUI();

            this.clearedLines = [];
            this.clearingAnimation = false;
        }, 200);
    }

    holdCurrentPiece() {
        if (!this.canHold || !this.currentPiece) return;

        this.audio.playHold();

        if (this.holdPiece === null) {
            this.holdPiece = new Tetromino(this.currentPiece.type);
            this.spawnNewPiece();
        } else {
            const temp = new Tetromino(this.holdPiece.type);
            this.holdPiece = new Tetromino(this.currentPiece.type);
            this.currentPiece = temp;

            this.currentPiece.x = Math.floor((BOARD_WIDTH - this.currentPiece.shape.length) / 2);
            this.currentPiece.y = 0;

            if (!this.isValidPosition(this.currentPiece)) {
                this.gameOver();
                return;
            }

            // this.updateGhostPiece(); // Ghost piece rimosso
        }

        this.canHold = false;
        this.drawHoldPiece();
    }

    updateGhostPiece() {
        if (!this.currentPiece) return;

        this.ghostPiece = this.currentPiece.clone();

        while (this.isValidPosition(this.ghostPiece, 0, 1)) {
            this.ghostPiece.y++;
        }
    }

    isValidPosition(piece, offsetX = 0, offsetY = 0) {
        const blocks = piece.getBlocks();

        for (const block of blocks) {
            const x = block.x + offsetX;
            const y = block.y + offsetY;

            // Controlla limiti
            if (x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT) {
                return false;
            }

            // Controlla collisione con pezzi esistenti (ignora se sopra la board)
            if (y >= 0 && this.board[y][x] !== 0) {
                return false;
            }
        }

        return true;
    }

    gameOver() {
        this.state = GameState.GAME_OVER;
        this.audio.playGameOver();

        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('startBtn').disabled = false;

        // Controlla high score
        if (this.storage.isHighScore(this.score)) {
            setTimeout(() => {
                this.storage.addScore(this.score, this.lines, this.level, this.piecesPlaced);
                this.storage.renderHighScores();
                this.updateUI();
            }, 1000);
        }

        this.showOverlay('GAME OVER', `Punteggio finale: ${this.score}`);
    }

    showOverlay(title, message) {
        const overlay = document.getElementById('gameOverlay');
        document.getElementById('overlayTitle').textContent = title;
        document.getElementById('overlayMessage').innerHTML = message;
        document.getElementById('finalScore').textContent = this.score;
        overlay.classList.remove('hidden');
    }

    hideOverlay() {
        document.getElementById('gameOverlay').classList.add('hidden');
    }

    toggleMute() {
        const muted = this.audio.toggleMute();
        const btn = document.getElementById('muteBtn');
        btn.textContent = muted ? '🔇' : '🔊';
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
        document.getElementById('pieces').textContent = this.piecesPlaced;
        document.getElementById('highScore').textContent = this.storage.getBestScore();
    }

    // Rendering
    render() {
        this.drawBoard();
        // Ghost piece rimosso per pulizia visiva
        // this.drawGhostPiece();
        this.drawCurrentPiece();
    }

    drawBoard() {
        // Pulisci canvas
        this.ctx.fillStyle = '#0a0a1e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Prima disegna tutta la griglia grigia
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                this.ctx.strokeRect(
                    x * BLOCK_SIZE,
                    y * BLOCK_SIZE,
                    BLOCK_SIZE,
                    BLOCK_SIZE
                );
            }
        }

        // Poi disegna i blocchi fissi (sopra la griglia)
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (this.board[y][x] !== 0) {
                    const color = this.board[y][x];
                    const isClearing = this.clearedLines.includes(y);

                    if (isClearing) {
                        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    } else {
                        this.ctx.fillStyle = color;
                    }

                    this.drawBlock(x, y, color, !isClearing);
                }
            }
        }
    }

    drawBlock(x, y, color, withGradient = true) {
        const px = x * BLOCK_SIZE;
        const py = y * BLOCK_SIZE;

        if (withGradient) {
            // Gradiente per dare profondità
            const gradient = this.ctx.createLinearGradient(px, py, px + BLOCK_SIZE, py + BLOCK_SIZE);
            gradient.addColorStop(0, color);
            gradient.addColorStop(1, this.darkenColor(color, 0.3));
            this.ctx.fillStyle = gradient;
        }

        this.ctx.fillRect(px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2);

        // Bordo interno per effetto 3D
        this.ctx.strokeStyle = this.lightenColor(color, 0.3);
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
    }

    drawGhostPiece() {
        if (!this.ghostPiece) return;

        const blocks = this.ghostPiece.getBlocks();
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;

        blocks.forEach(block => {
            if (block.y >= 0) {
                const px = block.x * BLOCK_SIZE;
                const py = block.y * BLOCK_SIZE;
                this.ctx.strokeRect(px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4);
            }
        });
    }

    drawCurrentPiece() {
        if (!this.currentPiece) return;

        const blocks = this.currentPiece.getBlocks();
        blocks.forEach(block => {
            if (block.y >= 0) {
                this.drawBlock(block.x, block.y, this.currentPiece.color);
            }
        });
    }

    drawNextPiece() {
        if (!this.nextPiece) return;

        this.nextCtx.fillStyle = '#0a0a1e';
        this.nextCtx.fillRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);

        const size = this.nextPiece.shape.length;
        const blockSize = 25;
        const offsetX = (this.nextCanvas.width - size * blockSize) / 2;
        const offsetY = (this.nextCanvas.height - size * blockSize) / 2;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (this.nextPiece.shape[y][x]) {
                    const px = offsetX + x * blockSize;
                    const py = offsetY + y * blockSize;

                    this.nextCtx.fillStyle = this.nextPiece.color;
                    this.nextCtx.fillRect(px + 1, py + 1, blockSize - 2, blockSize - 2);

                    this.nextCtx.strokeStyle = this.lightenColor(this.nextPiece.color, 0.3);
                    this.nextCtx.lineWidth = 1;
                    this.nextCtx.strokeRect(px + 2, py + 2, blockSize - 4, blockSize - 4);
                }
            }
        }
    }

    drawHoldPiece() {
        this.holdCtx.fillStyle = '#0a0a1e';
        this.holdCtx.fillRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);

        if (!this.holdPiece) return;

        const size = this.holdPiece.shape.length;
        const blockSize = 25;
        const offsetX = (this.holdCanvas.width - size * blockSize) / 2;
        const offsetY = (this.holdCanvas.height - size * blockSize) / 2;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (this.holdPiece.shape[y][x]) {
                    const px = offsetX + x * blockSize;
                    const py = offsetY + y * blockSize;

                    const alpha = this.canHold ? 1 : 0.3;
                    this.holdCtx.globalAlpha = alpha;

                    this.holdCtx.fillStyle = this.holdPiece.color;
                    this.holdCtx.fillRect(px + 1, py + 1, blockSize - 2, blockSize - 2);

                    this.holdCtx.strokeStyle = this.lightenColor(this.holdPiece.color, 0.3);
                    this.holdCtx.lineWidth = 1;
                    this.holdCtx.strokeRect(px + 2, py + 2, blockSize - 4, blockSize - 4);

                    this.holdCtx.globalAlpha = 1;
                }
            }
        }
    }

    // Utility per manipolare colori
    darkenColor(color, amount) {
        const col = color.substring(1);
        const num = parseInt(col, 16);
        const r = Math.max(0, (num >> 16) - amount * 255);
        const g = Math.max(0, ((num >> 8) & 0x00FF) - amount * 255);
        const b = Math.max(0, (num & 0x0000FF) - amount * 255);
        return `rgb(${r},${g},${b})`;
    }

    lightenColor(color, amount) {
        const col = color.substring(1);
        const num = parseInt(col, 16);
        const r = Math.min(255, (num >> 16) + amount * 255);
        const g = Math.min(255, ((num >> 8) & 0x00FF) + amount * 255);
        const b = Math.min(255, (num & 0x0000FF) + amount * 255);
        return `rgb(${r},${g},${b})`;
    }
}

// Inizializza il gioco quando la pagina è caricata
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new TetrisGame();
});
