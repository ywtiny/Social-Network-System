import { Request, Response, NextFunction } from 'express';
import { verifyToken } from './auth';

declare global {
    namespace Express {
        interface Request {
            user?: { id: number; username: string; role: string };
        }
    }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ code: 401, message: '未登录，请先认证' });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ code: 401, message: 'Token 无效或已过期' });
    }

    req.user = payload;
    next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    authMiddleware(req, res, () => {
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ code: 403, message: '需要管理员权限' });
        }
        next();
    });
}
