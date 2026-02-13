// Gestione localStorage per high scores e statistiche

class StorageManager {
    constructor() {
        this.STORAGE_KEY = 'tetris_highscores';
        this.STATS_KEY = 'tetris_stats';
        this.highScores = this.loadHighScores();
        this.stats = this.loadStats();
    }

    // Carica gli high scores dal localStorage
    loadHighScores() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Errore nel caricamento degli high scores:', error);
        }
        return [];
    }

    // Salva gli high scores nel localStorage
    saveHighScores() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.highScores));
            return true;
        } catch (error) {
            console.error('Errore nel salvataggio degli high scores:', error);
            return false;
        }
    }

    // Carica le statistiche
    loadStats() {
        try {
            const data = localStorage.getItem(this.STATS_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Errore nel caricamento delle statistiche:', error);
        }
        return {
            gamesPlayed: 0,
            totalScore: 0,
            totalLines: 0,
            totalPieces: 0,
            bestScore: 0,
            bestLevel: 0,
            bestLines: 0
        };
    }

    // Salva le statistiche
    saveStats() {
        try {
            localStorage.setItem(this.STATS_KEY, JSON.stringify(this.stats));
            return true;
        } catch (error) {
            console.error('Errore nel salvataggio delle statistiche:', error);
            return false;
        }
    }

    // Aggiunge un nuovo punteggio
    addScore(score, lines, level, pieces) {
        const name = this.promptPlayerName();

        const entry = {
            name: name,
            score: score,
            lines: lines,
            level: level,
            pieces: pieces,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        this.highScores.push(entry);

        // Ordina per punteggio decrescente
        this.highScores.sort((a, b) => b.score - a.score);

        // Mantieni solo i top 10
        this.highScores = this.highScores.slice(0, 10);

        this.saveHighScores();

        // Aggiorna statistiche
        this.updateStats(score, lines, level, pieces);

        return entry;
    }

    // Chiede il nome al giocatore
    promptPlayerName() {
        let name = prompt('🎉 Nuovo punteggio! Inserisci il tuo nome:', '');

        if (!name || name.trim() === '') {
            name = 'Giocatore';
        }

        // Limita la lunghezza del nome
        return name.trim().substring(0, 20);
    }

    // Aggiorna le statistiche globali
    updateStats(score, lines, level, pieces) {
        this.stats.gamesPlayed++;
        this.stats.totalScore += score;
        this.stats.totalLines += lines;
        this.stats.totalPieces += pieces;

        if (score > this.stats.bestScore) {
            this.stats.bestScore = score;
        }
        if (level > this.stats.bestLevel) {
            this.stats.bestLevel = level;
        }
        if (lines > this.stats.bestLines) {
            this.stats.bestLines = lines;
        }

        this.saveStats();
    }

    // Ottiene gli high scores
    getHighScores() {
        return this.highScores;
    }

    // Ottiene il miglior punteggio
    getBestScore() {
        if (this.highScores.length === 0) {
            return 0;
        }
        return this.highScores[0].score;
    }

    // Verifica se un punteggio entra nella top 10
    isHighScore(score) {
        if (this.highScores.length < 10) {
            return true;
        }
        return score > this.highScores[this.highScores.length - 1].score;
    }

    // Ottiene le statistiche
    getStats() {
        return this.stats;
    }

    // Resetta gli high scores
    resetHighScores() {
        if (confirm('Sei sicuro di voler cancellare tutti gli high scores?')) {
            this.highScores = [];
            this.saveHighScores();
            return true;
        }
        return false;
    }

    // Resetta le statistiche
    resetStats() {
        if (confirm('Sei sicuro di voler cancellare tutte le statistiche?')) {
            this.stats = {
                gamesPlayed: 0,
                totalScore: 0,
                totalLines: 0,
                totalPieces: 0,
                bestScore: 0,
                bestLevel: 0,
                bestLines: 0
            };
            this.saveStats();
            return true;
        }
        return false;
    }

    // Formatta la data per la visualizzazione
    static formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return 'Ora';
        } else if (diffMins < 60) {
            return `${diffMins} min fa`;
        } else if (diffHours < 24) {
            return `${diffHours} ore fa`;
        } else if (diffDays < 7) {
            return `${diffDays} giorni fa`;
        } else {
            return date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
    }

    // Renderizza la lista degli high scores nell'HTML
    renderHighScores(containerId = 'highscoresList') {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (this.highScores.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">Nessun punteggio ancora. Inizia a giocare!</p>';
            return;
        }

        container.innerHTML = this.highScores.map((entry, index) => `
            <div class="highscore-item">
                <div class="highscore-rank">#${index + 1}</div>
                <div class="highscore-info">
                    <span class="highscore-name">${this.escapeHtml(entry.name)}</span>
                    <span class="highscore-date">${StorageManager.formatDate(entry.date)}</span>
                    <div class="highscore-details">
                        Livello ${entry.level} • ${entry.lines} linee • ${entry.pieces} pezzi
                    </div>
                </div>
                <div class="highscore-score">${entry.score.toLocaleString()}</div>
            </div>
        `).join('');
    }

    // Escape HTML per prevenire XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}
