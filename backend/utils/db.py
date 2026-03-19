import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'database.db')

def init_db():
    """Initialize the database and create the history table if it doesn't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            emotion TEXT NOT NULL,
            emoji TEXT NOT NULL,
            confidence REAL NOT NULL,
            image_path TEXT
        )
    ''')
    conn.commit()
    conn.close()

def add_history_entry(emotion, emoji, confidence, image_path=None):
    """Add a new detection result to history"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO history (emotion, emoji, confidence, image_path)
            VALUES (?, ?, ?, ?)
        ''', (emotion, emoji, confidence, image_path))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Database error: {e}")
        return False

def get_history_entries():
    """Retrieve all history entries, ordered by newest first"""
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM history ORDER BY timestamp DESC')
        rows = cursor.fetchall()
        
        history = []
        for row in rows:
            history.append({
                'id': row['id'],
                'timestamp': row['timestamp'],
                'emotion': row['emotion'],
                'emoji': row['emoji'],
                'confidence': row['confidence'],
                'image_path': row['image_path']
            })
        
        conn.close()
        return history
    except Exception as e:
        print(f"Database error: {e}")
        return []

def delete_history_entry(entry_id):
    """Delete a specific history entry by ID"""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM history WHERE id = ?', (entry_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"Database error: {e}")
        return False
