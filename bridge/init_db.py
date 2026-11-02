"""Database initialization module for GASTECT."""
import os
import sqlite3

DB_PATH = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                        "..", "database", "history.db"))

# Extra spec fields added to the readings table. These are tracked as separate
# columns so the history route can report arming / silencing / valve state.
EXTRA_COLUMNS = [
    ("armed", "INTEGER DEFAULT 1"),
    ("silenced", "INTEGER DEFAULT 0"),
    ("servo", "INTEGER DEFAULT 90"),
]


def ensure_extra_columns(conn=None):
    """Add the extended fields to an existing readings table, if missing."""
    close = conn is None
    if conn is None:
        conn = sqlite3.connect(DB_PATH)
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(readings)")
        existing = {row[1] for row in cursor.fetchall()}
        for column, declaration in EXTRA_COLUMNS:
            if column not in existing:
                cursor.execute(
                    f"ALTER TABLE readings ADD COLUMN {column} {declaration}"
                )
        conn.commit()
    finally:
        if close:
            conn.close()


def init_db():
    """Initialize the SQLite history database and create the readings table."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ppm INTEGER,
            flame INTEGER,
            ldr INTEGER,
            motion INTEGER,
            touch INTEGER,
            battery INTEGER,
            status TEXT,
            armed INTEGER DEFAULT 1,
            silenced INTEGER DEFAULT 0,
            servo INTEGER DEFAULT 90,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    conn.commit()
    ensure_extra_columns(conn)
    conn.close()
    print("Database initialized successfully at:", DB_PATH)


if __name__ == "__main__":
    init_db()
