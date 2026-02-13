// Definizione dei Tetromini classici con sistema di rotazione SRS

const TETROMINOS = {
    I: {
        shape: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ],
        color: '#00f5ff',
        name: 'I'
    },
    O: {
        shape: [
            [1, 1],
            [1, 1]
        ],
        color: '#ffd700',
        name: 'O'
    },
    T: {
        shape: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff00ff',
        name: 'T'
    },
    S: {
        shape: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ],
        color: '#00ff00',
        name: 'S'
    },
    Z: {
        shape: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff0000',
        name: 'Z'
    },
    J: {
        shape: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#0000ff',
        name: 'J'
    },
    L: {
        shape: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ],
        color: '#ff8800',
        name: 'L'
    }
};

// Classe per gestire i pezzi
class Tetromino {
    constructor(type) {
        this.type = type;
        this.shape = JSON.parse(JSON.stringify(TETROMINOS[type].shape)); // Deep clone
        this.color = TETROMINOS[type].color;
        this.name = TETROMINOS[type].name;
        this.x = 0;
        this.y = 0;
        this.rotation = 0; // 0, 1, 2, 3 per le 4 rotazioni possibili
    }

    // Ruota il pezzo in senso orario
    rotate(clockwise = true) {
        const newShape = this.getRotatedShape(clockwise);
        return newShape;
    }

    // Ottiene la forma ruotata senza modificare l'originale
    getRotatedShape(clockwise = true) {
        const n = this.shape.length;
        const newShape = Array(n).fill(null).map(() => Array(n).fill(0));

        for (let y = 0; y < n; y++) {
            for (let x = 0; x < n; x++) {
                if (clockwise) {
                    newShape[x][n - 1 - y] = this.shape[y][x];
                } else {
                    newShape[n - 1 - x][y] = this.shape[y][x];
                }
            }
        }

        return newShape;
    }

    // Applica la rotazione
    applyRotation(clockwise = true) {
        this.shape = this.rotate(clockwise);
        this.rotation = (this.rotation + (clockwise ? 1 : -1) + 4) % 4;
    }

    // Ottiene i blocchi occupati dal pezzo
    getBlocks() {
        const blocks = [];
        for (let y = 0; y < this.shape.length; y++) {
            for (let x = 0; x < this.shape[y].length; x++) {
                if (this.shape[y][x]) {
                    blocks.push({
                        x: this.x + x,
                        y: this.y + y
                    });
                }
            }
        }
        return blocks;
    }

    // Clona il pezzo
    clone() {
        const cloned = new Tetromino(this.type);
        cloned.shape = JSON.parse(JSON.stringify(this.shape));
        cloned.x = this.x;
        cloned.y = this.y;
        cloned.rotation = this.rotation;
        return cloned;
    }
}

// Sistema di "Bag Randomizer" per generazione equa dei pezzi
class TetrominoGenerator {
    constructor() {
        this.bag = [];
        this.refillBag();
    }

    refillBag() {
        const types = Object.keys(TETROMINOS);
        // Shuffle dei tipi
        for (let i = types.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [types[i], types[j]] = [types[j], types[i]];
        }
        this.bag = types;
    }

    next() {
        if (this.bag.length === 0) {
            this.refillBag();
        }
        const type = this.bag.pop();
        return new Tetromino(type);
    }

    peek(count = 1) {
        const preview = [];
        const tempBag = [...this.bag];

        for (let i = 0; i < count; i++) {
            if (tempBag.length === 0) {
                // Simula il refill per il preview
                const types = Object.keys(TETROMINOS);
                for (let i = types.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [types[i], types[j]] = [types[j], types[i]];
                }
                tempBag.push(...types);
            }
            const type = tempBag.pop();
            preview.push(new Tetromino(type));
        }

        return preview;
    }
}

// Wall Kick Data per SRS (Super Rotation System)
const WALL_KICK_DATA = {
    // Per pezzi J, L, T, S, Z
    JLTSZ: {
        '0->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '1->0': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '1->2': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
        '2->1': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
        '2->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
        '3->2': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '3->0': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
        '0->3': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]
    },
    // Per pezzo I
    I: {
        '0->1': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '1->0': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '1->2': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]],
        '2->1': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '2->3': [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],
        '3->2': [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],
        '3->0': [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],
        '0->3': [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]
    }
};

// Funzione helper per ottenere i wall kick offsets
function getWallKickOffsets(piece, oldRotation, newRotation) {
    // Il pezzo O non ha wall kicks
    if (piece.type === 'O') {
        return [[0, 0]];
    }

    const dataSet = piece.type === 'I' ? WALL_KICK_DATA.I : WALL_KICK_DATA.JLTSZ;
    const key = `${oldRotation}->${newRotation}`;

    return dataSet[key] || [[0, 0]];
}
