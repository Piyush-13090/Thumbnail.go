import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './configs/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo'; 
import AuthRouter from './routes/AuthRoutes.js';
import ThumbnailRouter from './routes/ThumbnailRoutes.js';
import UserRouter from './routes/UserRoutes.js';
import TestRouter from './routes/TestRoutes.js';

declare module 'express-session' {
  interface SessionData {
    isLoggedIn: boolean;
    userId: string;
  }
}

console.log("Server starting with OpenAI configuration...");
console.log("Connecting to DB...");
await connectDB();

const app = express();
app.set('trust proxy', 1); // Trust first proxy

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.headers.origin);
  next();
});

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow any localhost origin
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Allow Vercel and Render domains
    if (origin.includes('.vercel.app') || origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    // Check against specific production domains if you have a custom domain
    // if (origin === 'https://your-custom-domain.com') return callback(null, true);
    
    console.log('Blocked by CORS:', origin);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}))
app.use(session({
  secret: process.env.SECRET_KEY as string,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, //  1 week
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // must be 'none' to enable cross-site delivery
  },
   store: MongoStore.create({
  mongoUrl: process.env.MONGODB_URI as string,
  collectionName: "sessions"
})
}))
app.use(express.json());

const port = process.env.PORT || 3000; 

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

// Test route directly
app.get('/test-direct', (req: Request, res: Response) => {
    res.json({ message: 'Direct route working!' });
});

app.get('/api/test-api', (req: Request, res: Response) => {
    res.json({ message: 'API route working!' });
});

// Simple test endpoint for OpenAI
app.post('/test-openai', async (req: Request, res: Response) => {
  try {
    console.log('Testing OpenAI directly...');
    
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY as string
    });
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "A simple test image of a red circle",
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });

    if (!response.data || !response.data[0]) {
      throw new Error("No image data received");
    }
    
    res.json({
      success: true,
      message: 'OpenAI is working!',
      imageUrl: response.data[0].url
    });
    
  } catch (error: any) {
    console.error('OpenAI test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple test endpoint for Claude
app.post('/test-claude', async (req: Request, res: Response) => {
  try {
    console.log('Testing Claude directly...');
    
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY as string,
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
    
  } catch (error: any) {
    console.error('Claude test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.use('/api/auth', AuthRouter);
app.use('/api/thumbnail', ThumbnailRouter);
app.use('/api/user', UserRouter);
app.use('/api/test', TestRouter);

// Direct thumbnail routes
app.get('/api/thumbnail/test', (req: Request, res: Response) => {
  res.json({ message: 'Direct thumbnail route working!' });
});

app.get('/api/thumbnail/my-generations', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Failed to fetch thumbnails:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch thumbnails', 
      error: error.message 
    });
  }
});

// Temporary direct route for testing
app.get('/api/thumbnail/my-generations-direct', async (req: Request, res: Response) => {
  try {
    const { default: Thumbnail } = await import('./models/Thumbnail.js');
    const userId = req.session?.userId || 'test-user-123';
    console.log('Fetching thumbnails for userId:', userId);
    const thumbnails = await Thumbnail.find({ userId }).sort({ createdAt: -1 });
    console.log('Found thumbnails:', thumbnails.length);
    res.json({ thumbnails, userId });
  } catch (error: any) {
    console.error('Failed to fetch thumbnails:', error);
    res.status(500).json({ message: 'Failed to fetch thumbnails', error: error.message });
  }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});