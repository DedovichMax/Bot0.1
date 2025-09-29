const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.dbPath = path.join(process.cwd(), 'bets.db');
        this.initDatabase();
    }

    initDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                teams TEXT NOT NULL,
                coefficients TEXT NOT NULL,
                probabilities TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `;

        this.db.run(createTableQuery, (err) => {
            if (err) {
                console.error('Error creating table:', err);
            }
        });
    }

    saveAnalysis(userId, teams, coefficients, probabilities) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO analyses (user_id, teams, coefficients, probabilities)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(query, [
                userId,
                teams,
                JSON.stringify(coefficients),
                JSON.stringify(probabilities)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    getUserHistory(userId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT teams, coefficients, probabilities, timestamp
                FROM analyses 
                WHERE user_id = ? 
                ORDER BY timestamp DESC 
                LIMIT 10
            `;

            this.db.all(query, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = Database;