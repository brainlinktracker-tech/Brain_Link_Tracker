
from flask import Flask, request, jsonify, send_file, redirect, render_template_string, send_from_directory
from flask_cors import CORS
import os
import hashlib
import secrets
import time
import requests
import json
from datetime import datetime, timedelta
import uuid
import io
import base64
from urllib.parse import urlparse
import socket
import dns.resolver
import geoip2.database
import geoip2.errors
from user_agents import parse
import bcrypt
from functools import wraps

# Database imports - using PostgreSQL for Vercel
try:
    import psycopg2
    from psycopg2 import Error, sql
    DATABASE_TYPE = "postgresql"
except ImportError:
    # Fallback to SQLite for local development
    import sqlite3
    DATABASE_TYPE = "sqlite"

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), '..', 'static'))
CORS(app, origins="*")

# Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "ej5B3Amppi4gjpbC65te6rJuvJzgVCWW_xfB-ZLR1TE")
app.config["SECRET_KEY"] = SECRET_KEY

# Database configuration
if DATABASE_TYPE == "postgresql":
    DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://neondb_owner:npg_0y9XMKzHCBsN@ep-blue-resonance-add39g5q-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require")
else:
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), "database", "app.db")

def get_db_connection():
    """Get a database connection"""
    if DATABASE_TYPE == "postgresql":
        return psycopg2.connect(DATABASE_URL)
    else:
        return sqlite3.connect(DATABASE_PATH)

# Initialize database
def init_db():
    try:
        print("Attempting to initialize database...")
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_TYPE == "postgresql":
            # PostgreSQL table creation
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL DEFAULT 'member',
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    parent_id INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP WITH TIME ZONE,
                    subscription_status VARCHAR(50) DEFAULT 'inactive',
                    subscription_expires TIMESTAMP WITH TIME ZONE,
                    FOREIGN KEY (parent_id) REFERENCES users (id)
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_permissions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    permission VARCHAR(255) NOT NULL,
                    granted_by INTEGER,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id),
                    FOREIGN KEY (granted_by) REFERENCES users (id)
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    session_token VARCHAR(255) UNIQUE NOT NULL,
                    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    user_id INTEGER NOT NULL,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) DEFAULT 'active',
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tracking_links (
                    id SERIAL PRIMARY KEY,
                    campaign_id INTEGER,
                    user_id INTEGER NOT NULL,
                    original_url VARCHAR(2048) NOT NULL,
                    tracking_token VARCHAR(255) UNIQUE NOT NULL,
                    recipient_email VARCHAR(255),
                    recipient_name VARCHAR(255),
                    link_status VARCHAR(50) DEFAULT 'active',
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP WITH TIME ZONE,
                    click_limit INTEGER DEFAULT 0,
                    click_count INTEGER DEFAULT 0,
                    last_clicked TIMESTAMP WITH TIME ZONE,
                    custom_message TEXT,
                    redirect_delay INTEGER DEFAULT 0,
                    password_protected INTEGER DEFAULT 0,
                    access_password VARCHAR(255),
                    geo_restrictions TEXT,
                    device_restrictions TEXT,
                    time_restrictions TEXT,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tracking_events (
                    id SERIAL PRIMARY KEY,
                    tracking_token VARCHAR(255) NOT NULL,
                    event_type VARCHAR(50) NOT NULL,
                    ip_address VARCHAR(45),
                    user_agent TEXT,
                    referrer TEXT,
                    country VARCHAR(10),
                    city VARCHAR(255),
                    device_type VARCHAR(50),
                    browser VARCHAR(100),
                    os VARCHAR(100),
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    additional_data TEXT,
                    campaign_id INTEGER,
                    user_id INTEGER,
                    is_bot INTEGER DEFAULT 0,
                    bot_confidence REAL,
                    bot_reason TEXT,
                    status VARCHAR(50) DEFAULT 'processed',
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                );
            """)
        else:
            # SQLite table creation
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'member',
                    status TEXT NOT NULL DEFAULT 'pending',
                    parent_id INTEGER,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP,
                    subscription_status TEXT DEFAULT 'inactive',
                    subscription_expires TIMESTAMP,
                    FOREIGN KEY (parent_id) REFERENCES users (id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    session_token TEXT UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS campaigns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    description TEXT,
                    user_id INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status TEXT DEFAULT 'active',
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tracking_links (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    campaign_id INTEGER,
                    user_id INTEGER NOT NULL,
                    original_url TEXT NOT NULL,
                    tracking_token TEXT UNIQUE NOT NULL,
                    recipient_email TEXT,
                    recipient_name TEXT,
                    link_status TEXT DEFAULT 'active',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP,
                    click_limit INTEGER DEFAULT 0,
                    click_count INTEGER DEFAULT 0,
                    last_clicked TIMESTAMP,
                    custom_message TEXT,
                    redirect_delay INTEGER DEFAULT 0,
                    password_protected INTEGER DEFAULT 0,
                    access_password TEXT,
                    geo_restrictions TEXT,
                    device_restrictions TEXT,
                    time_restrictions TEXT,
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tracking_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tracking_token TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    referrer TEXT,
                    country TEXT,
                    city TEXT,
                    device_type TEXT,
                    browser TEXT,
                    os TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    additional_data TEXT,
                    campaign_id INTEGER,
                    user_id INTEGER,
                    is_bot INTEGER DEFAULT 0,
                    bot_confidence REAL,
                    bot_reason TEXT,
                    status TEXT DEFAULT 'processed',
                    FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            """)
        
        # Check if admin user exists
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' ")
        else:
            cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'admin' ")
        
        admin_count = cursor.fetchone()[0]
        
        if admin_count == 0:
            # Create default admin user
            admin_password = bcrypt.hashpw("Mayflower1!!".encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
            
            if DATABASE_TYPE == "postgresql":
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, role, status)
                    VALUES (%s, %s, %s, %s, %s)
                """, ("Brain", "brain@brainlinktracker.com", admin_password, "admin", "active"))
            else:
                cursor.execute("""
                    INSERT INTO users (username, email, password_hash, role, status)
                    VALUES (?, ?, ?, ?, ?)
                """, ("Brain", "brain@brainlinktracker.com", admin_password, "admin", "active"))
            
            print("✅ Default admin user created: Brain / Mayflower1!!")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("✅ Database initialized successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        return False

# Authentication decorator
def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        session_token = request.headers.get("Authorization")
        if not session_token:
            return jsonify({"error": "No authorization token provided"}), 401
        
        if session_token.startswith("Bearer "):
            session_token = session_token[7:]
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if DATABASE_TYPE == "postgresql":
                cursor.execute("""
                    SELECT u.id, u.username, u.role, u.status 
                    FROM users u 
                    JOIN user_sessions s ON u.id = s.user_id 
                    WHERE s.session_token = %s AND s.expires_at > CURRENT_TIMESTAMP
                """, (session_token,))
            else:
                cursor.execute("""
                    SELECT u.id, u.username, u.role, u.status 
                    FROM users u 
                    JOIN user_sessions s ON u.id = s.user_id 
                    WHERE s.session_token = ? AND s.expires_at > datetime('now')
                """, (session_token,))
            
            user = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if not user:
                return jsonify({"error": "Invalid or expired session"}), 401
            
            if user[3] != 'active':  # status
                return jsonify({"error": "Account not active"}), 401
            
            # Add user info to request context
            request.current_user = {
                "id": user[0],
                "username": user[1],
                "role": user[2],
                "status": user[3]
            }
            
            return f(*args, **kwargs)
            
        except Exception as e:
            print(f"Auth error: {e}")
            return jsonify({"error": "Authentication failed"}), 401
    
    return decorated_function

# Frontend serving routes
@app.route("/")
def serve_frontend():
    """Serve the main frontend page"""
    return send_from_directory(app.static_folder, "index.html")

@app.route("/<path:path>")
def serve_static_files(path):
    """Serve static files"""
    try:
        return send_from_directory(app.static_folder, path)
    except:
        # If file not found, serve index.html for SPA routing
        return send_from_directory(app.static_folder, "index.html")

# Health check endpoint
@app.route("/api/health")
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Brain Link Tracker API is running",
        "version": "1.0.0",
        "database": DATABASE_TYPE
    })

# Authentication endpoints
@app.route("/api/auth/login", methods=["POST"])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        
        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT id, username, password_hash, role, status FROM users WHERE username = %s", (username,))
        else:
            cursor.execute("SELECT id, username, password_hash, role, status FROM users WHERE username = ?", (username,))
        
        user = cursor.fetchone()
        
        if not user:
            cursor.close()
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
        
        user_id, username, password_hash, role, status = user
        
        if status != 'active':
            cursor.close()
            conn.close()
            return jsonify({"error": "Account not active"}), 401
        
        if not bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8")):
            cursor.close()
            conn.close()
            return jsonify({"error": "Invalid credentials"}), 401
        
        # Create session
        session_token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=1)
        
        if DATABASE_TYPE == "postgresql":
            cursor.execute("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (%s, %s, %s)",
                           (user_id, session_token, expires_at))
        else:
            cursor.execute("INSERT INTO user_sessions (user_id, session_token, expires_at) VALUES (?, ?, ?)",
                           (user_id, session_token, expires_at))
        
        conn.commit()
        
        # Update last login
        if DATABASE_TYPE == "postgresql":
            cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = %s", (user_id,))
        else:
            cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            "message": "Login successful",
            "token": session_token,
            "user": {"id": user_id, "username": username, "role": role}
        }), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": "An error occurred during login"}), 500

@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def logout():
    """User logout endpoint"""
    try:
        session_token = request.headers.get("Authorization")[7:] # Remove "Bearer " prefix
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_TYPE == "postgresql":
            cursor.execute("DELETE FROM user_sessions WHERE session_token = %s", (session_token,))
        else:
            cursor.execute("DELETE FROM user_sessions WHERE session_token = ?", (session_token,))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Logout successful"}), 200
    except Exception as e:
        print(f"Logout error: {e}")
        return jsonify({"error": "An error occurred during logout"}), 500

@app.route("/api/auth/register", methods=["POST"])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        username = data.get("username")
        email = data.get("email")
        password = data.get("password")
        
        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if username or email already exists
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = %s OR email = %s", (username, email))
        else:
            cursor.execute("SELECT COUNT(*) FROM users WHERE username = ? OR email = ?", (username, email))
        
        if cursor.fetchone()[0] > 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "Username or email already registered"}), 409
        
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        
        if DATABASE_TYPE == "postgresql":
            cursor.execute("INSERT INTO users (username, email, password_hash, role, status) VALUES (%s, %s, %s, %s, %s)",
                           (username, email, hashed_password, "member", "pending"))
        else:
            cursor.execute("INSERT INTO users (username, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
                           (username, email, hashed_password, "member", "pending"))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Registration successful. Account pending approval."}), 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"error": "An error occurred during registration"}), 500

@app.route("/api/auth/change_password", methods=["POST"])
@require_auth
def change_password():
    """Change user password endpoint"""
    try:
        data = request.get_json()
        old_password = data.get("old_password")
        new_password = data.get("new_password")
        user_id = request.current_user["id"]
        
        if not old_password or not new_password:
            return jsonify({"error": "Old password and new password required"}), 400
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT password_hash FROM users WHERE id = %s", (user_id,))
        else:
            cursor.execute("SELECT password_hash FROM users WHERE id = ?", (user_id,))
        
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(old_password.encode("utf-8"), user[0].encode("utf-8")):
            cursor.close()
            conn.close()
            return jsonify({"error": "Invalid old password"}), 401
        
        hashed_new_password = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        
        if DATABASE_TYPE == "postgresql":
            cursor.execute("UPDATE users SET password_hash = %s WHERE id = %s", (hashed_new_password, user_id))
        else:
            cursor.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hashed_new_password, user_id))
        
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"message": "Password changed successfully"}), 200
        
    except Exception as e:
        print(f"Change password error: {e}")
        return jsonify({"error": "An error occurred during password change"}), 500

# User management endpoints (Admin only)
@app.route("/api/admin/users", methods=["GET"])
@require_auth
def get_users():
    """Get all users (Admin only)"""
    if request.current_user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if DATABASE_TYPE == "postgresql":
        cursor.execute("SELECT id, username, email, role, status, created_at, last_login, subscription_status, subscription_expires FROM users")
    else:
        cursor.execute("SELECT id, username, email, role, status, created_at, last_login, subscription_status, subscription_expires FROM users")
    
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    
    user_list = []
    for user in users:
        user_list.append({
            "id": user[0],
            "username": user[1],
            "email": user[2],
            "role": user[3],
            "status": user[4],
            "created_at": user[5].isoformat() if user[5] else None,
            "last_login": user[6].isoformat() if user[6] else None,
            "subscription_status": user[7],
            "subscription_expires": user[8].isoformat() if user[8] else None
        })
    return jsonify(user_list), 200

@app.route("/api/admin/users/<int:user_id>", methods=["PUT"])
@require_auth
def update_user(user_id):
    """Update user role or status (Admin only)"""
    if request.current_user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    
    data = request.get_json()
    role = data.get("role")
    status = data.get("status")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if role:
        updates.append("role = %s" if DATABASE_TYPE == "postgresql" else "role = ?")
        params.append(role)
    if status:
        updates.append("status = %s" if DATABASE_TYPE == "postgresql" else "status = ?")
        params.append(status)
        
    if not updates:
        cursor.close()
        conn.close()
        return jsonify({"message": "No updates provided"}), 400
        
    params.append(user_id)
    
    query = f"UPDATE users SET {', '.join(updates)} WHERE id = %s" if DATABASE_TYPE == "postgresql" else f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
    
    if DATABASE_TYPE == "postgresql":
        cursor.execute(query, tuple(params))
    else:
        cursor.execute(query, tuple(params))
        
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "User updated successfully"}), 200

@app.route("/api/admin/users/<int:user_id>", methods=["DELETE"])
@require_auth
def delete_user(user_id):
    """Delete a user (Admin only)"""
    if request.current_user["role"] != "admin":
        return jsonify({"error": "Unauthorized"}), 403
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if DATABASE_TYPE == "postgresql":
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    else:
        cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
        
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "User deleted successfully"}), 200

# Campaign management endpoints
@app.route("/api/campaigns", methods=["POST"])
@require_auth
def create_campaign():
    """Create a new campaign"""
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")
    user_id = request.current_user["id"]
    
    if not name:
        return jsonify({"error": "Campaign name is required"}), 400
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if DATABASE_TYPE == "postgresql":
        cursor.execute("INSERT INTO campaigns (name, description, user_id) VALUES (%s, %s, %s) RETURNING id",
                       (name, description, user_id))
    else:
        cursor.execute("INSERT INTO campaigns (name, description, user_id) VALUES (?, ?, ?)",
                       (name, description, user_id))
    
    campaign_id = cursor.fetchone()[0] if DATABASE_TYPE == "postgresql" else cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Campaign created successfully", "campaign_id": campaign_id}), 201

@app.route("/api/campaigns", methods=["GET"])
@require_auth
def get_campaigns():
    """Get all campaigns for the current user or all campaigns if admin"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns")
        else:
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns WHERE user_id = %s", (user_id,))
        else:
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns WHERE user_id = ?", (user_id,))
            
    campaigns = cursor.fetchall()
    cursor.close()
    conn.close()
    
    campaign_list = []
    for campaign in campaigns:
        campaign_list.append({
            "id": campaign[0],
            "name": campaign[1],
            "description": campaign[2],
            "user_id": campaign[3],
            "created_at": campaign[4].isoformat() if campaign[4] else None,
            "status": campaign[5]
        })
    return jsonify(campaign_list), 200

@app.route("/api/campaigns/<int:campaign_id>", methods=["GET"])
@require_auth
def get_campaign(campaign_id):
    """Get a specific campaign by ID"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns WHERE id = %s", (campaign_id,))
        else:
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns WHERE id = ?", (campaign_id,))
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns WHERE id = %s AND user_id = %s", (campaign_id, user_id))
        else:
            cursor.execute("SELECT id, name, description, user_id, created_at, status FROM campaigns WHERE id = ? AND user_id = ?", (campaign_id, user_id))
            
    campaign = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not campaign:
        return jsonify({"error": "Campaign not found or unauthorized"}), 404
        
    return jsonify({
        "id": campaign[0],
        "name": campaign[1],
        "description": campaign[2],
        "user_id": campaign[3],
        "created_at": campaign[4].isoformat() if campaign[4] else None,
        "status": campaign[5]
    }), 200

@app.route("/api/campaigns/<int:campaign_id>", methods=["PUT"])
@require_auth
def update_campaign(campaign_id):
    """Update a campaign"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    data = request.get_json()
    name = data.get("name")
    description = data.get("description")
    status = data.get("status")
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    updates = []
    params = []
    
    if name:
        updates.append("name = %s" if DATABASE_TYPE == "postgresql" else "name = ?")
        params.append(name)
    if description:
        updates.append("description = %s" if DATABASE_TYPE == "postgresql" else "description = ?")
        params.append(description)
    if status:
        updates.append("status = %s" if DATABASE_TYPE == "postgresql" else "status = ?")
        params.append(status)
        
    if not updates:
        cursor.close()
        conn.close()
        return jsonify({"message": "No updates provided"}), 400
        
    params.append(campaign_id)
    if user_role != "admin":
        params.append(user_id)
        query = f"UPDATE campaigns SET {', '.join(updates)} WHERE id = %s AND user_id = %s" if DATABASE_TYPE == "postgresql" else f"UPDATE campaigns SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    else:
        query = f"UPDATE campaigns SET {', '.join(updates)} WHERE id = %s" if DATABASE_TYPE == "postgresql" else f"UPDATE campaigns SET {', '.join(updates)} WHERE id = ?"
        
    if DATABASE_TYPE == "postgresql":
        cursor.execute(query, tuple(params))
    else:
        cursor.execute(query, tuple(params))
        
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Campaign updated successfully"}), 200

@app.route("/api/campaigns/<int:campaign_id>", methods=["DELETE"])
@require_auth
def delete_campaign(campaign_id):
    """Delete a campaign"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("DELETE FROM campaigns WHERE id = %s", (campaign_id,))
        else:
            cursor.execute("DELETE FROM campaigns WHERE id = ?", (campaign_id,))
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("DELETE FROM campaigns WHERE id = %s AND user_id = %s", (campaign_id, user_id))
        else:
            cursor.execute("DELETE FROM campaigns WHERE id = ? AND user_id = ?", (campaign_id, user_id))
            
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Campaign deleted successfully"}), 200

# Tracking link management endpoints
@app.route("/api/tracking_links", methods=["POST"])
@require_auth
def create_tracking_link():
    """Create a new tracking link"""
    data = request.get_json()
    campaign_id = data.get("campaign_id")
    original_url = data.get("original_url")
    recipient_email = data.get("recipient_email")
    recipient_name = data.get("recipient_name")
    custom_message = data.get("custom_message")
    redirect_delay = data.get("redirect_delay", 0)
    password_protected = data.get("password_protected", 0)
    access_password = data.get("access_password")
    geo_restrictions = data.get("geo_restrictions")
    device_restrictions = data.get("device_restrictions")
    time_restrictions = data.get("time_restrictions")
    
    user_id = request.current_user["id"]
    
    if not original_url:
        return jsonify({"error": "Original URL is required"}), 400
        
    tracking_token = secrets.token_urlsafe(8)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if DATABASE_TYPE == "postgresql":
        cursor.execute("""
            INSERT INTO tracking_links (
                campaign_id, user_id, original_url, tracking_token, recipient_email, recipient_name,
                custom_message, redirect_delay, password_protected, access_password,
                geo_restrictions, device_restrictions, time_restrictions
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id
        """, (
            campaign_id, user_id, original_url, tracking_token, recipient_email, recipient_name,
            custom_message, redirect_delay, password_protected, access_password,
            json.dumps(geo_restrictions) if geo_restrictions else None,
            json.dumps(device_restrictions) if device_restrictions else None,
            json.dumps(time_restrictions) if time_restrictions else None
        ))
    else:
        cursor.execute("""
            INSERT INTO tracking_links (
                campaign_id, user_id, original_url, tracking_token, recipient_email, recipient_name,
                custom_message, redirect_delay, password_protected, access_password,
                geo_restrictions, device_restrictions, time_restrictions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            campaign_id, user_id, original_url, tracking_token, recipient_email, recipient_name,
            custom_message, redirect_delay, password_protected, access_password,
            json.dumps(geo_restrictions) if geo_restrictions else None,
            json.dumps(device_restrictions) if device_restrictions else None,
            json.dumps(time_restrictions) if time_restrictions else None
        ))
        
    link_id = cursor.fetchone()[0] if DATABASE_TYPE == "postgresql" else cursor.lastrowid
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Tracking link created successfully", "tracking_token": tracking_token, "link_id": link_id}), 201

@app.route("/api/tracking_links", methods=["GET"])
@require_auth
def get_tracking_links():
    """Get all tracking links for the current user or all links if admin"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id")
        else:
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id WHERE tl.user_id = %s", (user_id,))
        else:
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id WHERE tl.user_id = ?", (user_id,))
            
    links = cursor.fetchall()
    cursor.close()
    conn.close()
    
    link_list = []
    for link in links:
        link_list.append({
            "id": link[0],
            "campaign_id": link[1],
            "user_id": link[2],
            "original_url": link[3],
            "tracking_token": link[4],
            "recipient_email": link[5],
            "recipient_name": link[6],
            "link_status": link[7],
            "created_at": link[8].isoformat() if link[8] else None,
            "expires_at": link[9].isoformat() if link[9] else None,
            "click_limit": link[10],
            "click_count": link[11],
            "last_clicked": link[12].isoformat() if link[12] else None,
            "custom_message": link[13],
            "redirect_delay": link[14],
            "password_protected": bool(link[15]),
            "access_password": link[16],
            "geo_restrictions": json.loads(link[17]) if link[17] else None,
            "device_restrictions": json.loads(link[18]) if link[18] else None,
            "time_restrictions": json.loads(link[19]) if link[19] else None,
            "campaign_name": link[20],
            "creator_username": link[21]
        })
    return jsonify(link_list), 200

@app.route("/api/tracking_links/<int:link_id>", methods=["GET"])
@require_auth
def get_tracking_link(link_id):
    """Get a specific tracking link by ID"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id WHERE tl.id = %s", (link_id,))
        else:
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id WHERE tl.id = ?", (link_id,))
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id WHERE tl.id = %s AND tl.user_id = %s", (link_id, user_id))
        else:
            cursor.execute("SELECT tl.id, tl.campaign_id, tl.user_id, tl.original_url, tl.tracking_token, tl.recipient_email, tl.recipient_name, tl.link_status, tl.created_at, tl.expires_at, tl.click_limit, tl.click_count, tl.last_clicked, tl.custom_message, tl.redirect_delay, tl.password_protected, tl.access_password, tl.geo_restrictions, tl.device_restrictions, tl.time_restrictions, c.name as campaign_name, u.username as creator_username FROM tracking_links tl LEFT JOIN campaigns c ON tl.campaign_id = c.id LEFT JOIN users u ON tl.user_id = u.id WHERE tl.id = ? AND tl.user_id = ?", (link_id, user_id))
            
    link = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not link:
        return jsonify({"error": "Tracking link not found or unauthorized"}), 404
        
    return jsonify({
        "id": link[0],
        "campaign_id": link[1],
        "user_id": link[2],
        "original_url": link[3],
        "tracking_token": link[4],
        "recipient_email": link[5],
        "recipient_name": link[6],
        "link_status": link[7],
        "created_at": link[8].isoformat() if link[8] else None,
        "expires_at": link[9].isoformat() if link[9] else None,
        "click_limit": link[10],
        "click_count": link[11],
        "last_clicked": link[12].isoformat() if link[12] else None,
        "custom_message": link[13],
        "redirect_delay": link[14],
        "password_protected": bool(link[15]),
        "access_password": link[16],
        "geo_restrictions": json.loads(link[17]) if link[17] else None,
        "device_restrictions": json.loads(link[18]) if link[18] else None,
        "time_restrictions": json.loads(link[19]) if link[19] else None,
        "campaign_name": link[20],
        "creator_username": link[21]
    }), 200

@app.route("/api/tracking_links/<int:link_id>", methods=["PUT"])
@require_auth
def update_tracking_link(link_id):
    """Update a tracking link"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    data = request.get_json()
    
    updates = []
    params = []
    
    # Fields that can be updated
    updatable_fields = [
        "campaign_id", "original_url", "recipient_email", "recipient_name",
        "link_status", "expires_at", "click_limit", "custom_message",
        "redirect_delay", "password_protected", "access_password",
        "geo_restrictions", "device_restrictions", "time_restrictions"
    ]
    
    for field in updatable_fields:
        if field in data:
            value = data.get(field)
            if field in ["geo_restrictions", "device_restrictions", "time_restrictions"]:
                value = json.dumps(value) if value else None
            updates.append(f"{field} = %s" if DATABASE_TYPE == "postgresql" else f"{field} = ?")
            params.append(value)
            
    if not updates:
        return jsonify({"message": "No updates provided"}), 400
        
    params.append(link_id)
    if user_role != "admin":
        params.append(user_id)
        query = f"UPDATE tracking_links SET {', '.join(updates)} WHERE id = %s AND user_id = %s" if DATABASE_TYPE == "postgresql" else f"UPDATE tracking_links SET {', '.join(updates)} WHERE id = ? AND user_id = ?"
    else:
        query = f"UPDATE tracking_links SET {', '.join(updates)} WHERE id = %s" if DATABASE_TYPE == "postgresql" else f"UPDATE tracking_links SET {', '.join(updates)} WHERE id = ?"
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if DATABASE_TYPE == "postgresql":
        cursor.execute(query, tuple(params))
    else:
        cursor.execute(query, tuple(params))
        
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Tracking link updated successfully"}), 200

@app.route("/api/tracking_links/<int:link_id>", methods=["DELETE"])
@require_auth
def delete_tracking_link(link_id):
    """Delete a tracking link"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("DELETE FROM tracking_links WHERE id = %s", (link_id,))
        else:
            cursor.execute("DELETE FROM tracking_links WHERE id = ?", (link_id,))
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("DELETE FROM tracking_links WHERE id = %s AND user_id = %s", (link_id, user_id))
        else:
            cursor.execute("DELETE FROM tracking_links WHERE id = ? AND user_id = ?", (link_id, user_id))
            
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Tracking link deleted successfully"}), 200

# Tracking event endpoint (publicly accessible)
@app.route("/track/<tracking_token>", methods=["GET"])
def track_link(tracking_token):
    """Track a link click and redirect"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    link = None
    if DATABASE_TYPE == "postgresql":
        cursor.execute("SELECT id, original_url, click_limit, click_count, link_status, redirect_delay, password_protected, access_password, geo_restrictions, device_restrictions, time_restrictions, user_id, campaign_id FROM tracking_links WHERE tracking_token = %s", (tracking_token,))
    else:
        cursor.execute("SELECT id, original_url, click_limit, click_count, link_status, redirect_delay, password_protected, access_password, geo_restrictions, device_restrictions, time_restrictions, user_id, campaign_id FROM tracking_links WHERE tracking_token = ?", (tracking_token,))
    
    link = cursor.fetchone()
    
    if not link:
        cursor.close()
        conn.close()
        return "Link not found", 404
        
    link_id, original_url, click_limit, click_count, link_status, redirect_delay, password_protected, access_password, geo_restrictions_json, device_restrictions_json, time_restrictions_json, user_id, campaign_id = link
    
    if link_status != 'active':
        cursor.close()
        conn.close()
        return "Link is not active", 403
        
    if click_limit > 0 and click_count >= click_limit:
        cursor.close()
        conn.close()
        return "Link click limit reached", 403
        
    # Process restrictions
    ip_address = request.remote_addr
    user_agent_string = request.headers.get('User-Agent')
    referrer = request.headers.get('Referer')
    
    # GeoIP lookup
    country = None
    city = None
    try:
        # Path to your GeoLite2-City.mmdb file
        # You'll need to download this from MaxMind and place it in a known location
        # For Vercel, this would typically be bundled with your deployment
        reader = geoip2.database.Reader('GeoLite2-City.mmdb')
        response = reader.city(ip_address)
        country = response.country.iso_code
        city = response.city.name
    except geoip2.errors.AddressNotFoundError:
        print(f"GeoIP: Address not found for {ip_address}")
    except Exception as e:
        print(f"GeoIP error: {e}")
        
    # User Agent parsing
    user_agent = parse(user_agent_string)
    device_type = user_agent.device.family
    browser = user_agent.browser.family
    os_name = user_agent.os.family
    
    # Bot detection (simplified example)
    is_bot = 0
    bot_confidence = 0.0
    bot_reason = None
    
    if user_agent.is_bot:
        is_bot = 1
        bot_confidence = 0.9
        bot_reason = "User agent identified as bot"
    elif "bot" in user_agent_string.lower() or "spider" in user_agent_string.lower():
        is_bot = 1
        bot_confidence = 0.7
        bot_reason = "User agent string contains bot keywords"
    
    # Check for blacklisted IPs, referrers, etc. (implement these functions)
    # if is_blacklisted_ip(ip_address):
    #     is_bot = 1
    #     bot_confidence = 1.0
    #     bot_reason = "Blacklisted IP"
    
    # if is_blacklisted_referrer(referrer):
    #     is_bot = 1
    #     bot_confidence = 1.0
    #     bot_reason = "Blacklisted Referrer"
        
    # Increment click count and update last clicked time
    if DATABASE_TYPE == "postgresql":
        cursor.execute("UPDATE tracking_links SET click_count = click_count + 1, last_clicked = CURRENT_TIMESTAMP WHERE id = %s", (link_id,))
    else:
        cursor.execute("UPDATE tracking_links SET click_count = click_count + 1, last_clicked = CURRENT_TIMESTAMP WHERE id = ?", (link_id,))
    
    # Record tracking event
    if DATABASE_TYPE == "postgresql":
        cursor.execute("""
            INSERT INTO tracking_events (
                tracking_token, event_type, ip_address, user_agent, referrer, 
                country, city, device_type, browser, os, campaign_id, user_id, 
                is_bot, bot_confidence, bot_reason
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tracking_token, "click", ip_address, user_agent_string, referrer,
            country, city, device_type, browser, os_name, campaign_id, user_id,
            is_bot, bot_confidence, bot_reason
        ))
    else:
        cursor.execute("""
            INSERT INTO tracking_events (
                tracking_token, event_type, ip_address, user_agent, referrer, 
                country, city, device_type, browser, os, campaign_id, user_id, 
                is_bot, bot_confidence, bot_reason
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            tracking_token, "click", ip_address, user_agent_string, referrer,
            country, city, device_type, browser, os_name, campaign_id, user_id,
            is_bot, bot_confidence, bot_reason
        ))
        
    conn.commit()
    cursor.close()
    conn.close()
    
    # Redirect after delay
    if redirect_delay > 0:
        time.sleep(redirect_delay)
        
    return redirect(original_url)

# Analytics endpoints
@app.route("/api/analytics/clicks", methods=["GET"])
@require_auth
def get_click_analytics():
    """Get click analytics data"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT tracking_token, event_type, ip_address, user_agent, referrer, country, city, device_type, browser, os, timestamp, is_bot, bot_confidence, bot_reason, campaign_id, user_id FROM tracking_events ORDER BY timestamp DESC")
        else:
            cursor.execute("SELECT tracking_token, event_type, ip_address, user_agent, referrer, country, city, device_type, browser, os, timestamp, is_bot, bot_confidence, bot_reason, campaign_id, user_id FROM tracking_events ORDER BY timestamp DESC")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT te.tracking_token, te.event_type, te.ip_address, te.user_agent, te.referrer, te.country, te.city, te.device_type, te.browser, te.os, te.timestamp, te.is_bot, te.bot_confidence, te.bot_reason, te.campaign_id, te.user_id FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s ORDER BY te.timestamp DESC", (user_id,))
        else:
            cursor.execute("SELECT te.tracking_token, te.event_type, te.ip_address, te.user_agent, te.referrer, te.country, te.city, te.device_type, te.browser, te.os, te.timestamp, te.is_bot, te.bot_confidence, te.bot_reason, te.campaign_id, te.user_id FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? ORDER BY te.timestamp DESC", (user_id,))
            
    clicks = cursor.fetchall()
    cursor.close()
    conn.close()
    
    click_list = []
    for click in clicks:
        click_list.append({
            "tracking_token": click[0],
            "event_type": click[1],
            "ip_address": click[2],
            "user_agent": click[3],
            "referrer": click[4],
            "country": click[5],
            "city": click[6],
            "device_type": click[7],
            "browser": click[8],
            "os": click[9],
            "timestamp": click[10].isoformat() if click[10] else None,
            "is_bot": bool(click[11]),
            "bot_confidence": click[12],
            "bot_reason": click[13],
            "campaign_id": click[14],
            "user_id": click[15]
        })
    return jsonify(click_list), 200

@app.route("/api/analytics/summary", methods=["GET"])
@require_auth
def get_summary_analytics():
    """Get summary analytics data"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    total_links = 0
    total_clicks = 0
    unique_clicks = 0
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT COUNT(*) FROM tracking_links")
            total_links = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tracking_events")
            total_clicks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT ip_address) FROM tracking_events")
            unique_clicks = cursor.fetchone()[0]
        else:
            cursor.execute("SELECT COUNT(*) FROM tracking_links")
            total_links = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tracking_events")
            total_clicks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT ip_address) FROM tracking_events")
            unique_clicks = cursor.fetchone()[0]
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT COUNT(*) FROM tracking_links WHERE user_id = %s", (user_id,))
            total_links = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s", (user_id,))
            total_clicks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT te.ip_address) FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s", (user_id,))
            unique_clicks = cursor.fetchone()[0]
        else:
            cursor.execute("SELECT COUNT(*) FROM tracking_links WHERE user_id = ?", (user_id,))
            total_links = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ?", (user_id,))
            total_clicks = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(DISTINCT te.ip_address) FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ?", (user_id,))
            unique_clicks = cursor.fetchone()[0]
            
    conn.close()
    
    return jsonify({
        "total_links": total_links,
        "total_clicks": total_clicks,
        "unique_clicks": unique_clicks
    }), 200

@app.route("/api/analytics/geo", methods=["GET"])
@require_auth
def get_geo_analytics():
    """Get geographical click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT country, COUNT(*) as count FROM tracking_events WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC")
        else:
            cursor.execute("SELECT country, COUNT(*) as count FROM tracking_events WHERE country IS NOT NULL GROUP BY country ORDER BY count DESC")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT te.country, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s AND te.country IS NOT NULL GROUP BY te.country ORDER BY count DESC", (user_id,))
        else:
            cursor.execute("SELECT te.country, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? AND te.country IS NOT NULL GROUP BY te.country ORDER BY count DESC", (user_id,))
            
    geo_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    geo_list = []
    for row in geo_data:
        geo_list.append({"country": row[0], "count": row[1]})
    return jsonify(geo_list), 200

@app.route("/api/analytics/device", methods=["GET"])
@require_auth
def get_device_analytics():
    """Get device type click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT device_type, COUNT(*) as count FROM tracking_events WHERE device_type IS NOT NULL GROUP BY device_type ORDER BY count DESC")
        else:
            cursor.execute("SELECT device_type, COUNT(*) as count FROM tracking_events WHERE device_type IS NOT NULL GROUP BY device_type ORDER BY count DESC")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT te.device_type, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s AND te.device_type IS NOT NULL GROUP BY te.device_type ORDER BY count DESC", (user_id,))
        else:
            cursor.execute("SELECT te.device_type, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? AND te.device_type IS NOT NULL GROUP BY te.device_type ORDER BY count DESC", (user_id,))
            
    device_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    device_list = []
    for row in device_data:
        device_list.append({"device_type": row[0], "count": row[1]})
    return jsonify(device_list), 200

@app.route("/api/analytics/browser", methods=["GET"])
@require_auth
def get_browser_analytics():
    """Get browser click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT browser, COUNT(*) as count FROM tracking_events WHERE browser IS NOT NULL GROUP BY browser ORDER BY count DESC")
        else:
            cursor.execute("SELECT browser, COUNT(*) as count FROM tracking_events WHERE browser IS NOT NULL GROUP BY browser ORDER BY count DESC")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT te.browser, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s AND te.browser IS NOT NULL GROUP BY te.browser ORDER BY count DESC", (user_id,))
        else:
            cursor.execute("SELECT te.browser, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? AND te.browser IS NOT NULL GROUP BY te.browser ORDER BY count DESC", (user_id,))
            
    browser_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    browser_list = []
    for row in browser_data:
        browser_list.append({"browser": row[0], "count": row[1]})
    return jsonify(browser_list), 200

@app.route("/api/analytics/os", methods=["GET"])
@require_auth
def get_os_analytics():
    """Get operating system click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT os, COUNT(*) as count FROM tracking_events WHERE os IS NOT NULL GROUP BY os ORDER BY count DESC")
        else:
            cursor.execute("SELECT os, COUNT(*) as count FROM tracking_events WHERE os IS NOT NULL GROUP BY os ORDER BY count DESC")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT te.os, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s AND te.os IS NOT NULL GROUP BY te.os ORDER BY count DESC", (user_id,))
        else:
            cursor.execute("SELECT te.os, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? AND te.os IS NOT NULL GROUP BY te.os ORDER BY count DESC", (user_id,))
            
    os_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    os_list = []
    for row in os_data:
        os_list.append({"os": row[0], "count": row[1]})
    return jsonify(os_list), 200

@app.route("/api/analytics/time", methods=["GET"])
@require_auth
def get_time_analytics():
    """Get time-based click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('day', timestamp) as day, COUNT(*) as count FROM tracking_events GROUP BY day ORDER BY day")
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m-%d', timestamp) as day, COUNT(*) as count FROM tracking_events GROUP BY day ORDER BY day")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('day', te.timestamp) as day, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s GROUP BY day ORDER BY day", (user_id,))
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m-%d', te.timestamp) as day, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? GROUP BY day ORDER BY day", (user_id,))
            
    time_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    time_list = []
    for row in time_data:
        time_list.append({"day": row[0].isoformat() if DATABASE_TYPE == "postgresql" else row[0], "count": row[1]})
    return jsonify(time_list), 200

@app.route("/api/analytics/hourly", methods=["GET"])
@require_auth
def get_hourly_analytics():
    """Get hourly click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('hour', timestamp) as hour, COUNT(*) as count FROM tracking_events GROUP BY hour ORDER BY hour")
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m-%d %H', timestamp) as hour, COUNT(*) as count FROM tracking_events GROUP BY hour ORDER BY hour")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('hour', te.timestamp) as hour, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s GROUP BY hour ORDER BY hour", (user_id,))
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m-%d %H', te.timestamp) as hour, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? GROUP BY hour ORDER BY hour", (user_id,))
            
    hourly_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    hourly_list = []
    for row in hourly_data:
        hourly_list.append({"hour": row[0].isoformat() if DATABASE_TYPE == "postgresql" else row[0], "count": row[1]})
    return jsonify(hourly_list), 200

@app.route("/api/analytics/daily", methods=["GET"])
@require_auth
def get_daily_analytics():
    """Get daily click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('day', timestamp) as day, COUNT(*) as count FROM tracking_events GROUP BY day ORDER BY day")
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m-%d', timestamp) as day, COUNT(*) as count FROM tracking_events GROUP BY day ORDER BY day")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('day', te.timestamp) as day, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s GROUP BY day ORDER BY day", (user_id,))
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m-%d', te.timestamp) as day, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? GROUP BY day ORDER BY day", (user_id,))
            
    daily_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    daily_list = []
    for row in daily_data:
        daily_list.append({"day": row[0].isoformat() if DATABASE_TYPE == "postgresql" else row[0], "count": row[1]})
    return jsonify(daily_list), 200

@app.route("/api/analytics/monthly", methods=["GET"])
@require_auth
def get_monthly_analytics():
    """Get monthly click analytics"""
    user_id = request.current_user["id"]
    user_role = request.current_user["role"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_role == "admin":
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('month', timestamp) as month, COUNT(*) as count FROM tracking_events GROUP BY month ORDER BY month")
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m', timestamp) as month, COUNT(*) as count FROM tracking_events GROUP BY month ORDER BY month")
    else:
        if DATABASE_TYPE == "postgresql":
            cursor.execute("SELECT DATE_TRUNC('month', te.timestamp) as month, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = %s GROUP BY month ORDER BY month", (user_id,))
        else:
            cursor.execute("SELECT STRFTIME('%Y-%m', te.timestamp) as month, COUNT(*) as count FROM tracking_events te JOIN tracking_links tl ON te.tracking_token = tl.tracking_token WHERE tl.user_id = ? GROUP BY month ORDER BY month", (user_id,))
            
    monthly_data = cursor.fetchall()
    cursor.close()
    conn.close()
    
    monthly_list = []
    for row in monthly_data:
        monthly_list.append({"month": row[0].isoformat() if DATABASE_TYPE == "postgresql" else row[0], "count": row[1]})
    return jsonify(monthly_list), 200

# Main entry point for Flask app
if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)


