import express from 'express';
import mongoose from 'mongoose';
const DebugRouter = express.Router();
// Debug endpoint to check environment variables (be careful with this in production)
DebugRouter.get('/env-check', (req, res) => {
    const apiKey = process.env.OPENAI_API_KEY;
    const mongoUri = process.env.MONGODB_URI;
    const secretKey = process.env.SECRET_KEY;
    res.json({
        hasApiKey: !!apiKey,
        hasMongoUri: !!mongoUri,
        hasSecretKey: !!secretKey,
        dbState: mongoose.connection.readyState, // 0: disconnected, 1: connected, 2: connecting, 3: disconnecting
        keyLength: apiKey?.length || 0,
        keyPrefix: apiKey?.substring(0, 10) || 'none',
        keySuffix: apiKey?.substring(apiKey.length - 5) || 'none'
    });
});
export default DebugRouter;
