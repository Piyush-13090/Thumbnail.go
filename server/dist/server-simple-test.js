import express from 'express';
import cors from 'cors';
import 'dotenv/config';
const app = express();
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
const port = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('Simple Server is Live!');
});
app.get('/test', (req, res) => {
    res.json({ message: 'Test route working!' });
});
app.get('/api/thumbnail/my-generations', (req, res) => {
    res.json({
        success: true,
        thumbnails: [],
        message: 'Simple route working!'
    });
});
app.listen(port, () => {
    console.log(`Simple server is running at http://localhost:${port}`);
});
