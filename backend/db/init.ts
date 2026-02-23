import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(__dirname, '../socialflow.db');
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); // 每次初始化拉起全新库

const db = new Database(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    properties_json TEXT
);

CREATE TABLE IF NOT EXISTS edges (
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    weight REAL DEFAULT 1,
    PRIMARY KEY (source_id, target_id),
    FOREIGN KEY (source_id) REFERENCES users(uid),
    FOREIGN KEY (target_id) REFERENCES users(uid)
);
`);

// 构建极速插入事务
const insertUser = db.prepare('INSERT INTO users (uid, name, properties_json) VALUES (?, ?, ?)');
const insertEdge = db.prepare('INSERT INTO edges (source_id, target_id, weight) VALUES (?, ?, ?)');

const usersData = Array.from({ length: 400 }).map((_, i) => ({
    uid: `user_${i}`,
    name: `测试用户_${i}`,
    properties_json: JSON.stringify({ interests: ['编程', '篮球', '金融', '摄影', '游戏'].sort(() => 0.5 - Math.random()).slice(0, 2) })
}));

// 人为植入重点演示人物 (对应 UI 里的 张三、李四 等)
usersData[0] = { uid: 'node_1', name: '张三', properties_json: JSON.stringify({ interests: ['编程', '架构'] }) };
usersData[1] = { uid: 'node_2', name: '李四', properties_json: JSON.stringify({ interests: ['编程', '数据分析'] }) };
usersData[2] = { uid: 'node_3', name: '王五', properties_json: JSON.stringify({ interests: ['投资', '架构'] }) };
usersData[3] = { uid: 'node_4', name: '赵六', properties_json: JSON.stringify({ interests: ['篮球', '游戏'] }) };

const edgesData: any[] = [];
// 构造关系网络
for (let i = 0; i < 400; i++) {
    const friendCount = Math.floor(Math.random() * 8); // 平均每个人 0-8 个朋友
    for (let j = 0; j < friendCount; j++) {
        const target = Math.floor(Math.random() * 400);
        if (i !== target) {
            edgesData.push([usersData[i].uid, usersData[target].uid, 1]);
        }
    }
}

// 植入必然推导出的三角/社群关系
edgesData.push(['node_1', 'node_2', 1]);
edgesData.push(['node_1', 'node_3', 1]);
edgesData.push(['node_2', 'node_4', 1]);
edgesData.push(['node_3', 'node_4', 1]);

// 事务中全量灌入
db.transaction(() => {
    for (const u of usersData) {
        insertUser.run(u.uid, u.name, u.properties_json);
    }

    // 边去重处理后入库
    const seenEdges = new Set<string>();
    for (const e of edgesData) {
        const minId = e[0] < e[1] ? e[0] : e[1];
        const maxId = e[0] > e[1] ? e[0] : e[1];
        const key = `${minId}-${maxId}`;
        if (!seenEdges.has(key)) {
            seenEdges.add(key);
            insertEdge.run(minId, maxId, e[2]);
        }
    }
})();

console.log('✅ SQLite 初始化预热完成！');
db.close();
