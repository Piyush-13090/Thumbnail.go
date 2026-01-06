import express from 'express';
import Thumbnail from '../models/Thumbnail.js';
const router = express.Router();
// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'New thumbnail routes working!' });
});
// Get user's thumbnails
router.get('/my-generations', async (req, res) => {
    try {
        const userId = req.session?.userId || 'test-user-123';
        console.log('Fetching thumbnails for userId:', userId);
        const thumbnails = await Thumbnail.find({ userId }).sort({ createdAt: -1 });
        console.log('Found thumbnails:', thumbnails.length);
        res.json({
            success: true,
            thumbnails,
            count: thumbnails.length,
            userId
        });
    }
    catch (error) {
        console.error('Failed to fetch thumbnails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch thumbnails',
            error: error.message
        });
    }
});
export default router;
