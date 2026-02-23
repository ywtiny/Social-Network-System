import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(__dirname, '../socialflow.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    DROP TABLE IF EXISTS edges;
    DROP TABLE IF EXISTS users;

    CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        properties_json TEXT DEFAULT '{}'
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

// ====== 微服务节点数据 ======
const services: [string, string, any][] = [
    // API 网关层
    ["gw_main", "API-Gateway", { techStack: ["Nginx", "OpenResty"], tier: "网关层", desc: "主入口网关" }],
    ["gw_admin", "Admin-Gateway", { techStack: ["Nginx"], tier: "网关层", desc: "后台管理网关" }],
    ["gw_ws", "WebSocket-Gateway", { techStack: ["Node.js", "Socket.IO"], tier: "网关层", desc: "长连接网关" }],

    // BFF 层
    ["bff_app", "App-BFF", { techStack: ["Node.js", "Express"], tier: "BFF层", desc: "移动端聚合层" }],
    ["bff_web", "Web-BFF", { techStack: ["Node.js", "GraphQL"], tier: "BFF层", desc: "Web端聚合层" }],
    ["bff_admin", "Admin-BFF", { techStack: ["Go", "Gin"], tier: "BFF层", desc: "后台管理聚合" }],

    // 核心业务服务
    ["svc_user", "User-Service", { techStack: ["Java", "Spring Boot"], tier: "核心链路", desc: "用户中心" }],
    ["svc_order", "Order-Service", { techStack: ["Java", "Spring Boot"], tier: "核心链路", desc: "订单服务" }],
    ["svc_pay", "Payment-Service", { techStack: ["Java", "Spring Boot"], tier: "核心链路", desc: "支付服务" }],
    ["svc_product", "Product-Service", { techStack: ["Java", "Spring Boot"], tier: "核心链路", desc: "商品服务" }],
    ["svc_inventory", "Inventory-Service", { techStack: ["Java", "Spring Boot"], tier: "核心链路", desc: "库存服务" }],
    ["svc_cart", "Cart-Service", { techStack: ["Go", "gRPC"], tier: "核心链路", desc: "购物车服务" }],
    ["svc_search", "Search-Service", { techStack: ["Java", "Elasticsearch"], tier: "核心链路", desc: "搜索引擎服务" }],
    ["svc_recommend", "Recommend-Service", { techStack: ["Python", "TensorFlow"], tier: "核心链路", desc: "推荐引擎" }],
    ["svc_pricing", "Pricing-Service", { techStack: ["Go"], tier: "核心链路", desc: "价格计算引擎" }],
    ["svc_coupon", "Coupon-Service", { techStack: ["Java", "Spring Boot"], tier: "核心链路", desc: "优惠券服务" }],

    // 中间件层
    ["svc_auth", "Auth-Service", { techStack: ["Go", "JWT"], tier: "中间件", desc: "认证鉴权服务" }],
    ["svc_config", "Config-Center", { techStack: ["Java", "Nacos"], tier: "中间件", desc: "配置中心" }],
    ["svc_registry", "Service-Registry", { techStack: ["Java", "Nacos"], tier: "中间件", desc: "服务注册发现" }],
    ["svc_mq", "Message-Queue", { techStack: ["RocketMQ"], tier: "中间件", desc: "消息队列" }],
    ["svc_cache", "Cache-Cluster", { techStack: ["Redis", "Sentinel"], tier: "中间件", desc: "缓存集群" }],
    ["svc_limiter", "Rate-Limiter", { techStack: ["Go", "Redis"], tier: "中间件", desc: "限流熔断" }],

    // 通知与异步
    ["svc_notify", "Notify-Service", { techStack: ["Node.js"], tier: "旁路服务", desc: "消息推送中心" }],
    ["svc_sms", "SMS-Service", { techStack: ["Java"], tier: "旁路服务", desc: "短信服务" }],
    ["svc_email", "Email-Service", { techStack: ["Python", "Celery"], tier: "旁路服务", desc: "邮件服务" }],
    ["svc_audit", "Audit-Log", { techStack: ["Go"], tier: "旁路服务", desc: "审计日志服务" }],
    ["svc_report", "Report-Service", { techStack: ["Python", "Pandas"], tier: "旁路服务", desc: "报表引擎" }],
    ["svc_file", "File-Service", { techStack: ["Go", "MinIO"], tier: "旁路服务", desc: "文件存储" }],
    ["svc_cron", "Scheduler", { techStack: ["Java", "XXL-Job"], tier: "旁路服务", desc: "定时任务调度" }],

    // 数据层
    ["db_user", "UserDB-MySQL", { techStack: ["MySQL 8.0"], tier: "数据层", desc: "用户主库" }],
    ["db_order", "OrderDB-MySQL", { techStack: ["MySQL 8.0"], tier: "数据层", desc: "订单主库" }],
    ["db_product", "ProductDB-MySQL", { techStack: ["MySQL 8.0"], tier: "数据层", desc: "商品主库" }],
    ["db_pay", "PayDB-MySQL", { techStack: ["MySQL 8.0", "TiDB"], tier: "数据层", desc: "支付流水库" }],
    ["db_log", "LogDB-ClickHouse", { techStack: ["ClickHouse"], tier: "数据层", desc: "日志分析库" }],
    ["db_es", "ES-Cluster", { techStack: ["Elasticsearch 8"], tier: "数据层", desc: "全文搜索集群" }],
    ["db_mongo", "MongoDB-Cluster", { techStack: ["MongoDB 6"], tier: "数据层", desc: "文档存储" }],
    ["db_redis", "Redis-Master", { techStack: ["Redis 7"], tier: "数据层", desc: "缓存主节点" }],

    // 监控与运维
    ["svc_monitor", "Monitor-Center", { techStack: ["Prometheus", "Grafana"], tier: "运维平台", desc: "监控告警中心" }],
    ["svc_trace", "Trace-System", { techStack: ["Jaeger", "OpenTelemetry"], tier: "运维平台", desc: "链路追踪系统" }],
    ["svc_log_agg", "Log-Aggregator", { techStack: ["Filebeat", "Logstash"], tier: "运维平台", desc: "日志采集聚合" }],
    ["svc_cicd", "CI/CD-Pipeline", { techStack: ["Jenkins", "ArgoCD"], tier: "运维平台", desc: "持续交付流水线" }],
    ["svc_k8s", "K8s-Cluster", { techStack: ["Kubernetes 1.28"], tier: "运维平台", desc: "容器编排引擎" }],
];

// ====== 有向调用关系: [source 调用 target, weight] ======
const callRelations: [string, string, number][] = [
    // 网关 -> BFF
    ["gw_main", "bff_app", 1], ["gw_main", "bff_web", 1], ["gw_admin", "bff_admin", 1],
    ["gw_main", "svc_auth", 1], ["gw_admin", "svc_auth", 1], ["gw_ws", "svc_notify", 1],
    ["gw_main", "svc_limiter", 1],

    // BFF -> 核心服务
    ["bff_app", "svc_user", 1], ["bff_app", "svc_order", 1], ["bff_app", "svc_product", 1],
    ["bff_app", "svc_cart", 1], ["bff_app", "svc_search", 1], ["bff_app", "svc_recommend", 1],
    ["bff_web", "svc_user", 1], ["bff_web", "svc_order", 1], ["bff_web", "svc_product", 1],
    ["bff_web", "svc_cart", 1], ["bff_web", "svc_search", 1],
    ["bff_admin", "svc_user", 1], ["bff_admin", "svc_order", 1], ["bff_admin", "svc_product", 1],
    ["bff_admin", "svc_report", 1], ["bff_admin", "svc_audit", 1],

    // 核心服务 -> 核心服务（调用关系）
    ["svc_order", "svc_pay", 1], ["svc_order", "svc_inventory", 1], ["svc_order", "svc_coupon", 1],
    ["svc_order", "svc_pricing", 1], ["svc_order", "svc_user", 1],
    ["svc_cart", "svc_product", 1], ["svc_cart", "svc_pricing", 1], ["svc_cart", "svc_inventory", 1],
    ["svc_pay", "svc_notify", 1], ["svc_pay", "svc_audit", 1],
    ["svc_product", "svc_inventory", 1], ["svc_product", "svc_pricing", 1],
    ["svc_search", "svc_product", 1], ["svc_recommend", "svc_user", 1], ["svc_recommend", "svc_product", 1],

    // 核心服务 -> 中间件
    ["svc_user", "svc_cache", 1], ["svc_order", "svc_mq", 1], ["svc_pay", "svc_mq", 1],
    ["svc_product", "svc_cache", 1], ["svc_inventory", "svc_cache", 1],
    ["svc_auth", "svc_cache", 1], ["svc_coupon", "svc_cache", 1],
    ["svc_limiter", "svc_cache", 1],

    // 核心服务 -> 数据层
    ["svc_user", "db_user", 1], ["svc_order", "db_order", 1], ["svc_product", "db_product", 1],
    ["svc_pay", "db_pay", 1], ["svc_search", "db_es", 1], ["svc_recommend", "db_mongo", 1],
    ["svc_cache", "db_redis", 1], ["svc_audit", "db_log", 1],

    // 通知链路
    ["svc_notify", "svc_sms", 1], ["svc_notify", "svc_email", 1], ["svc_notify", "gw_ws", 1],

    // 报表 -> 多数据源
    ["svc_report", "db_order", 1], ["svc_report", "db_user", 1], ["svc_report", "db_log", 1],

    // 定时任务
    ["svc_cron", "svc_inventory", 1], ["svc_cron", "svc_report", 1], ["svc_cron", "svc_coupon", 1],

    // 文件服务
    ["svc_product", "svc_file", 1], ["svc_user", "svc_file", 1],

    // 监控 -> 全量
    ["svc_monitor", "svc_trace", 1], ["svc_monitor", "svc_log_agg", 1],
    ["svc_log_agg", "db_log", 1], ["svc_trace", "db_log", 1],

    // CI/CD -> K8s
    ["svc_cicd", "svc_k8s", 1],

    // 所有服务注册
    ["svc_user", "svc_registry", 1], ["svc_order", "svc_registry", 1], ["svc_pay", "svc_registry", 1],
    ["svc_product", "svc_registry", 1], ["svc_cart", "svc_registry", 1],
    ["svc_config", "svc_registry", 1],
];

// ====== 写入 ======
const insertUser = db.prepare('INSERT OR REPLACE INTO users (uid, name, properties_json) VALUES (?, ?, ?)');
const insertEdge = db.prepare('INSERT OR REPLACE INTO edges (source_id, target_id, weight) VALUES (?, ?, ?)');

const tx = db.transaction(() => {
    for (const [uid, name, props] of services) {
        insertUser.run(uid, name, JSON.stringify(props));
    }
    for (const [src, tgt, w] of callRelations) {
        insertEdge.run(src, tgt, w);
    }
});

tx();
console.log(`✅ 微服务拓扑数据初始化完成！${services.length} 个服务节点，${callRelations.length} 条调用关系。`);
db.close();
