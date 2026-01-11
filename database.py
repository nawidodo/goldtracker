"""
Database module for Gold Portfolio Tracker
Uses SQLite for persistent storage
"""

import sqlite3
import os
import json
from datetime import datetime
from zoneinfo import ZoneInfo

DATABASE_FILE = os.environ.get('DATABASE_FILE', 'goldtracker.db')

def get_db():
    """Get database connection"""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Holdings table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS holdings (
            id TEXT PRIMARY KEY,
            weight REAL NOT NULL,
            purchase_price REAL NOT NULL,
            purchase_date TEXT NOT NULL,
            notes TEXT DEFAULT '',
            created_at TEXT NOT NULL
        )
    ''')
    
    # Transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            holding_id TEXT NOT NULL,
            weight REAL NOT NULL,
            price REAL NOT NULL,
            date TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

def migrate_from_json(json_file='portfolio.json'):
    """Migrate existing JSON data to SQLite"""
    if not os.path.exists(json_file):
        return False
    
    try:
        with open(json_file, 'r') as f:
            data = json.load(f)
        
        conn = get_db()
        cursor = conn.cursor()
        
        # Migrate holdings
        for h in data.get('holdings', []):
            cursor.execute('''
                INSERT OR REPLACE INTO holdings (id, weight, purchase_price, purchase_date, notes, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (h['id'], h['weight'], h['purchase_price'], h['purchase_date'], 
                  h.get('notes', ''), h.get('created_at', datetime.now(ZoneInfo("Asia/Jakarta")).isoformat())))
        
        # Migrate transactions
        for t in data.get('transactions', []):
            cursor.execute('''
                INSERT INTO transactions (type, holding_id, weight, price, date, timestamp)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (t['type'], t['holding_id'], t['weight'], t['price'], t['date'], t['timestamp']))
        
        conn.commit()
        conn.close()
        
        # Rename old JSON file as backup
        os.rename(json_file, json_file + '.backup')
        return True
    except Exception as e:
        print(f"Migration error: {e}")
        return False

def load_portfolio():
    """Load portfolio from database"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get holdings
    cursor.execute('SELECT * FROM holdings ORDER BY purchase_date DESC')
    holdings = [dict(row) for row in cursor.fetchall()]
    
    # Get transactions
    cursor.execute('SELECT * FROM transactions ORDER BY id DESC')
    transactions = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {"holdings": holdings, "transactions": transactions}

def save_holding(holding):
    """Save a single holding to database"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT OR REPLACE INTO holdings (id, weight, purchase_price, purchase_date, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (holding['id'], holding['weight'], holding['purchase_price'], 
          holding['purchase_date'], holding.get('notes', ''), holding['created_at']))
    
    conn.commit()
    conn.close()

def save_transaction(transaction):
    """Save a transaction to database"""
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO transactions (type, holding_id, weight, price, date, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (transaction['type'], transaction['holding_id'], transaction['weight'], 
          transaction['price'], transaction['date'], transaction['timestamp']))
    
    conn.commit()
    conn.close()

def update_holding(holding_id, updates):
    """Update a holding in database"""
    conn = get_db()
    cursor = conn.cursor()
    
    set_clause = ', '.join([f"{k} = ?" for k in updates.keys()])
    values = list(updates.values()) + [holding_id]
    
    cursor.execute(f'UPDATE holdings SET {set_clause} WHERE id = ?', values)
    
    # Get updated holding
    cursor.execute('SELECT * FROM holdings WHERE id = ?', (holding_id,))
    row = cursor.fetchone()
    
    conn.commit()
    conn.close()
    
    return dict(row) if row else None

def delete_holding(holding_id, record_transaction=True, sell_price=0):
    """Delete a holding from database"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Get holding first
    cursor.execute('SELECT * FROM holdings WHERE id = ?', (holding_id,))
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return None
    
    holding = dict(row)
    
    # Delete holding
    cursor.execute('DELETE FROM holdings WHERE id = ?', (holding_id,))
    
    # Record transaction if needed
    if record_transaction:
        tz = ZoneInfo("Asia/Jakarta")
        cursor.execute('''
            INSERT INTO transactions (type, holding_id, weight, price, date, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', ('SELL' if sell_price > 0 else 'DELETE', holding_id, holding['weight'], 
              sell_price, datetime.now(tz).strftime('%Y-%m-%d'), datetime.now(tz).isoformat()))
    
    conn.commit()
    conn.close()
    
    return holding

def get_holding(holding_id):
    """Get a single holding by ID"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM holdings WHERE id = ?', (holding_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def export_to_csv():
    """Export all holdings to CSV format"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM holdings ORDER BY purchase_date')
    holdings = cursor.fetchall()
    conn.close()
    
    import io
    import csv
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(['Purchase Date', 'Weight', 'Quantity', 'Purchase Price', 'Notes'])
    
    # Data rows
    for h in holdings:
        writer.writerow([h['purchase_date'], h['weight'], 1, h['purchase_price'], h['notes']])
    
    return output.getvalue()

def clear_all_data():
    """Clear all data from database"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM holdings')
    cursor.execute('DELETE FROM transactions')
    conn.commit()
    conn.close()

# Initialize database on module load
init_db()
