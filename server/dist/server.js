import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import AuthRouter from './routes/AuthRoutes.js';
import UserRouter from './routes/UserRoutes.js';
import TestRouter from './routes/TestRoutes.js';
console.log("Server starting with OpenAI configuration...");
console.log("Connecting to DB...");
await connectDB();
const app = express();
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, //  1 week
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions"
    })
}));
app.use(express.json());
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('Server is Live!');
});
// Test route directly
app.get('/test-direct', (req, res) => {
    res.json({ message: 'Direct route working!' });
});
app.get('/api/test-api', (req, res) => {
    res.json({ message: 'API route working!' });
});
// Simple test endpoint for OpenAI
app.post('/test-openai', async (req, res) => {
    try {
        console.log('Testing OpenAI directly...');
        const OpenAI = (await import('openai')).default;
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: "A simple test image of a red circle",
            n: 1,
            size: "1024x1024",
            quality: "standard"
        });
        res.json({
            success: true,
            message: 'OpenAI is working!',
            imageUrl: response.data[0].url
        });
    }
    catch (error) {
        console.error('OpenAI test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Simple test endpoint for Claude
app.post('/test-claude', async (req, res) => {
    try {
        console.log('Testing Claude directly...');
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 100,
            messages: [
                {
                    role: "user",
                    content: "Say hello in a creative way"
                }
            ]
        });
        res.json({
            success: true,
            message: 'Claude is working!',
            response: response.content[0]
        });
    }
    catch (error) {
        console.error('Claude test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.use('/api/auth', AuthRouter);
// app.use('/api/thumbnail', ThumbnailRouter);
app.use('/api/user', UserRouter);
app.use('/api/test', TestRouter);
// Direct thumbnail routes
app.get('/api/thumbnail/test', (req, res) => {
    res.json({ message: 'Direct thumbnail route working!' });
});
app.get('/api/thumbnail/my-generations', async (req, res) => {
    try {
        const { default: Thumbnail } = await import('./models/Thumbnail.js');
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
// Temporary direct route for testing
app.get('/api/thumbnail/my-generations-direct', async (req, res) => {
    try {
        const { default: Thumbnail } = await import('./models/Thumbnail.js');
        const userId = req.session?.userId || 'test-user-123';
        console.log('Fetching thumbnails for userId:', userId);
        const thumbnails = await Thumbnail.find({ userId }).sort({ createdAt: -1 });
        console.log('Found thumbnails:', thumbnails.length);
        res.json({ thumbnails, userId });
    }
    catch (error) {
        console.error('Failed to fetch thumbnails:', error);
        res.status(500).json({ message: 'Failed to fetch thumbnails', error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
