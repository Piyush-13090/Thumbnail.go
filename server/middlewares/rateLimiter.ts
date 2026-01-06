import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter (use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = 10; // requests per hour
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const thumbnailRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize counter
    requestCounts.set(userId, { count: 1, resetTime: now + WINDOW_MS });
    return next();
  }

  if (userLimit.count >= RATE_LIMIT) {
    return res.status(429).json({ 
      message: 'Rate limit exceeded. Please try again later.',
      resetTime: new Date(userLimit.resetTime).toISOString()
    });
  }

  userLimit.count++;
  next();
};