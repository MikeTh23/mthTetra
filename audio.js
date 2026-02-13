// Gestione audio con Web Audio API

class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3;
        this.muted = false;
        this.sounds = {};

        // Inizializza l'audio context al primo click dell'utente (richiesto dai browser)
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume context se è sospeso (policy dei browser)
            if (this.audioContext.state === 'suspended') {
                document.addEventListener('click', () => {
                    this.audioContext.resume();
                }, { once: true });
            }
        } catch (error) {
            console.warn('Web Audio API non supportata:', error);
        }
    }

    // Crea un oscillatore per generare suoni
    createOscillator(frequency, type = 'sine', duration = 0.1) {
        if (!this.audioContext || this.muted) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        // Envelope ADSR semplificato
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume, now + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        return { oscillator, gainNode, duration };
    }

    // Suono per il movimento dei pezzi
    playMove() {
        if (!this.audioContext || this.muted) return;

        const sound = this.createOscillator(300, 'square', 0.05);
        if (sound) {
            sound.oscillator.start();
            sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
        }
    }

    // Suono per la rotazione
    playRotate() {
        if (!this.audioContext || this.muted) return;

        const sound = this.createOscillator(400, 'sine', 0.08);
        if (sound) {
            sound.oscillator.start();
            sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
        }
    }

    // Suono per il drop
    playDrop() {
        if (!this.audioContext || this.muted) return;

        const frequencies = [500, 400, 300, 200];
        frequencies.forEach((freq, i) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'triangle', 0.05);
                if (sound) {
                    sound.oscillator.start();
                    sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
                }
            }, i * 20);
        });
    }

    // Suono per linea completata (con intensità variabile)
    playLineClear(lineCount = 1) {
        if (!this.audioContext || this.muted) return;

        // Suoni diversi in base al numero di linee
        const sequences = {
            1: [523, 659, 784],           // Do, Mi, Sol
            2: [523, 659, 784, 1047],     // Do, Mi, Sol, Do alto
            3: [523, 659, 784, 1047, 1319], // + Mi alto
            4: [523, 659, 784, 1047, 1319, 1568] // Tetris! + Sol alto
        };

        const sequence = sequences[Math.min(lineCount, 4)] || sequences[1];

        sequence.forEach((freq, i) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'sine', 0.15);
                if (sound) {
                    sound.oscillator.start();
                    sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
                }
            }, i * 80);
        });
    }

    // Suono per level up
    playLevelUp() {
        if (!this.audioContext || this.muted) return;

        const melody = [523, 659, 784, 1047, 1319];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'square', 0.12);
                if (sound) {
                    sound.oscillator.start();
                    sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
                }
            }, i * 60);
        });
    }

    // Suono per game over
    playGameOver() {
        if (!this.audioContext || this.muted) return;

        const melody = [659, 622, 587, 554, 523, 494, 466, 440];
        melody.forEach((freq, i) => {
            setTimeout(() => {
                const sound = this.createOscillator(freq, 'sawtooth', 0.2);
                if (sound) {
                    sound.oscillator.start();
                    sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
                }
            }, i * 100);
        });
    }

    // Suono per hold piece
    playHold() {
        if (!this.audioContext || this.muted) return;

        const sound = this.createOscillator(600, 'sine', 0.1);
        if (sound) {
            sound.oscillator.start();
            // Piccolo glide verso il basso
            sound.oscillator.frequency.exponentialRampToValueAtTime(
                400,
                this.audioContext.currentTime + 0.08
            );
            sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
        }
    }

    // Suono per quando si cerca di fare una mossa non valida
    playInvalidMove() {
        if (!this.audioContext || this.muted) return;

        const sound = this.createOscillator(150, 'sawtooth', 0.1);
        if (sound) {
            sound.oscillator.start();
            sound.oscillator.stop(this.audioContext.currentTime + sound.duration);
        }
    }

    // Toggle mute
    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    // Set volume (0.0 - 1.0)
    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }

    // Ottieni lo stato mute
    isMuted() {
        return this.muted;
    }

    // Background music semplice (loop melodico)
    startBackgroundMusic() {
        if (!this.audioContext || this.muted) return;

        // Melodia classica di Tetris (semplificata)
        const melody = [
            { note: 659, duration: 0.4 },  // E
            { note: 494, duration: 0.2 },  // B
            { note: 523, duration: 0.2 },  // C
            { note: 587, duration: 0.4 },  // D
            { note: 523, duration: 0.2 },  // C
            { note: 494, duration: 0.2 },  // B
            { note: 440, duration: 0.4 },  // A
            { note: 440, duration: 0.2 },  // A
            { note: 523, duration: 0.2 },  // C
            { note: 659, duration: 0.4 },  // E
            { note: 587, duration: 0.2 },  // D
            { note: 523, duration: 0.2 },  // C
            { note: 494, duration: 0.6 },  // B
            { note: 523, duration: 0.2 },  // C
            { note: 587, duration: 0.4 },  // D
            { note: 659, duration: 0.4 },  // E
            { note: 523, duration: 0.4 },  // C
            { note: 440, duration: 0.4 },  // A
            { note: 440, duration: 0.4 }   // A
        ];

        this.playMelody(melody, true);
    }

    // Riproduce una melodia
    playMelody(melody, loop = false) {
        if (!this.audioContext || this.muted) return;

        let time = this.audioContext.currentTime;

        const playSequence = () => {
            melody.forEach(note => {
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(this.audioContext.destination);

                oscillator.type = 'square';
                oscillator.frequency.value = note.note;

                gainNode.gain.setValueAtTime(0, time);
                gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, time + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, time + note.duration - 0.05);

                oscillator.start(time);
                oscillator.stop(time + note.duration);

                time += note.duration;
            });

            if (loop && !this.muted) {
                const totalDuration = melody.reduce((sum, note) => sum + note.duration, 0);
                setTimeout(() => playSequence(), totalDuration * 1000 + 2000); // Pausa di 2 secondi tra i loop
            }
        };

        playSequence();
    }

    // Stop background music (non implementato per semplicità, ma potrebbe essere esteso)
    stopBackgroundMusic() {
        // Per ora semplicemente muta
        this.muted = true;
    }
}
