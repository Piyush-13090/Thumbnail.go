import express from 'express';
import OpenAI from 'openai';

const TestRouter = express.Router();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string
});

// Test OpenAI connection
TestRouter.get('/openai-status', async (req, res) => {
  try {
    console.log('Testing OpenAI API connection...');
    
    // Try a simple image generation
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: "A simple red circle on white background",
      n: 1,
      size: "1024x1024",
      quality: "standard"
    });
    
    res.json({
      status: 'success',
      message: 'OpenAI DALL-E is working correctly',
      imageUrl: response.data[0].url,
      revisedPrompt: response.data[0].revised_prompt
    });
    
  } catch (error: any) {
    console.error('OpenAI test failed:', error);
    
    if (error.message?.includes('billing')) {
      return res.status(429).json({
        status: 'billing_error',
        message: 'OpenAI billing limit reached',
        error: error.message
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'OpenAI test failed',
      error: error.message
    });
  }
});

export default TestRouter;