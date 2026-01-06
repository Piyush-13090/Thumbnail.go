import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());

const port = process.env.PORT || 3000;

app.get('/', (req: Request, res: Response) => {
    res.send('Simple Server is Live!');
});

app.get('/test', (req: Request, res: Response) => {
    res.json({ message: 'Test route working!' });
});

app.get('/api/thumbnail/my-generations', (req: Request, res: Response) => {
    res.json({ 
        success: true,
        thumbnails: [],
        message: 'Simple route working!'
    });
});

app.listen(port, () => {
    console.log(`Simple server is running at http://localhost:${port}`);
});