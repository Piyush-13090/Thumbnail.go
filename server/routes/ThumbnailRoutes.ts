import express, { Request, Response } from 'express';
import { deleteThumbnail, generateThumbnail } from '../controllers/ThumbnailController.js';
import { generateThumbnailWithClaude } from '../controllers/ClaudeEnhancedThumbnailController.js';
import { generateSimpleThumbnail } from '../controllers/SimpleThumbnailController.js';
import { generateThumbnailWithGeminiProvider } from '../controllers/GeminiProviderThumbnailController.js';
import { generateThumbnailWithImagen } from '../controllers/ImagenThumbnailController.js';
import { generateThumbnailWithUniversalProvider } from '../controllers/UniversalProviderController.js';
import { generateThumbnailWithImagen4 } from '../controllers/Imagen4ThumbnailController.js';
import { generateThumbnailWithGeminiFlash } from '../controllers/GeminiFlashImageController.js';
import { generateThumbnailWithQwen } from '../controllers/QwenImageController.js';
import { generateThumbnailWithGPTImage } from '../controllers/GPTImageController.js';
import { generateThumbnailWithInfip } from '../controllers/InfipImageController.js';
import { generateThumbnailWithHuggingFace, getHuggingFaceModels, testHuggingFaceConnection } from '../controllers/HuggingFaceImageController.js';
import Thumbnail from '../models/Thumbnail.js';
import protect from '../middlewares/auth.js';

const ThumbnailRouter = express.Router();

// Test route
ThumbnailRouter.get('/test', (req: Request, res: Response) => {
  res.json({ message: 'Thumbnail routes working!' });
});

ThumbnailRouter.post('/generate', protect, generateThumbnailWithHuggingFace); // Main endpoint - Switched to Hugging Face
ThumbnailRouter.post('/generate-huggingface', protect, generateThumbnailWithHuggingFace); // Hugging Face API Only
ThumbnailRouter.get('/huggingface-models', getHuggingFaceModels); // Get available HF models
ThumbnailRouter.get('/test-huggingface', testHuggingFaceConnection); // Test HF API connection
ThumbnailRouter.get('/my-generations', protect, async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    console.log('Fetching thumbnails for userId:', userId);
    const thumbnails = await Thumbnail.find({ userId }).sort({ createdAt: -1 });
    console.log('Found thumbnails:', thumbnails.length);
    res.json({ thumbnails });
  } catch (error: any) {
    console.error('Failed to fetch thumbnails:', error);
    res.status(500).json({ message: 'Failed to fetch thumbnails', error: error.message });
  }
});
ThumbnailRouter.post('/generate-gpt-image', protect, generateThumbnailWithGPTImage); // GPT Image 1.5 Premium
ThumbnailRouter.post('/generate-gemini-flash', protect, generateThumbnailWithGeminiFlash); // Gemini 2.5 Flash Image
ThumbnailRouter.post('/generate-universal', protect, generateThumbnailWithUniversalProvider); // Universal Provider
ThumbnailRouter.post('/generate-imagen', protect, generateThumbnailWithImagen); // Direct Imagen 3.5
ThumbnailRouter.post('/generate-gemini', protect, generateThumbnailWithGeminiProvider); // Gemini Provider
ThumbnailRouter.post('/generate-claude', protect, generateThumbnailWithClaude); // Claude-enhanced generation
ThumbnailRouter.post('/generate-simple', protect, generateSimpleThumbnail); // Simple generation
ThumbnailRouter.post('/test-generate', protect, generateThumbnail); // Direct test route
ThumbnailRouter.delete('/delete/:id', protect, deleteThumbnail);

export default ThumbnailRouter;
