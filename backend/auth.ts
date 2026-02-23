import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'sf_jwt_secret_2024_microservice_topo';
const JWT_EXPIRES_IN = '24h';
const BCRYPT_ROUNDS = 10;

function getDb() {
    const dbPath = path.resolve(__dirname, 'socialflow.db');
    const db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    return db;
}

export function ensureAccountsTable() {
    const db = getDb();
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'viewer' CHECK(role IN ('admin', 'viewer')),
            created_at TEXT DEFAULT (datetime('now'))
        );
    `);

    const existing = db.prepare('SELECT id FROM accounts WHERE username = ?').get('admin');
    if (!existing) {
        const hash = bcrypt.hashSync('admin123', BCRYPT_ROUNDS);
        db.prepare('INSERT INTO accounts (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
        console.log('[Auth] 默认管理员账号已创建: admin / admin123');
    }
    db.close();
}

export function register(username: string, password: string, role: string = 'viewer') {
    if (!username || username.length < 2) throw new Error('用户名至少 2 个字符');
    if (!password || password.length < 6) throw new Error('密码至少 6 个字符');
    if (!['admin', 'viewer'].includes(role)) throw new Error('角色必须是 admin 或 viewer');

    const db = getDb();
    try {
        const exists = db.prepare('SELECT id FROM accounts WHERE username = ?').get(username);
        if (exists) throw new Error('用户名已存在');

        const hash = bcrypt.hashSync(password, BCRYPT_ROUNDS);
        const result = db.prepare('INSERT INTO accounts (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role);
        return { id: result.lastInsertRowid, username, role };
    } finally {
        db.close();
    }
}

export function login(username: string, password: string) {
    if (!username || !password) throw new Error('用户名和密码不能为空');

    const db = getDb();
    try {
        const user = db.prepare('SELECT id, username, password_hash, role FROM accounts WHERE username = ?').get(username) as any;
        if (!user) throw new Error('用户名或密码错误');

        const valid = bcrypt.compareSync(password, user.password_hash);
        if (!valid) throw new Error('用户名或密码错误');

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        return {
            token,
            user: { id: user.id, username: user.username, role: user.role }
        };
    } finally {
        db.close();
    }
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET) as { id: number; username: string; role: string };
    } catch {
        return null;
    }
}
