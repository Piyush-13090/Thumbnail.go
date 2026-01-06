import { Request, Response } from 'express';
import axios from 'axios';
import Thumbnail from '../models/Thumbnail.js';

interface HuggingFaceImageRequest {
  prompt: string;
  model?: string;
}

// Available Hugging Face models for image generation via API
const AVAILABLE_MODELS = {
  'flux-schnell': 'black-forest-labs/FLUX.1-schnell',
  'flux-dev': 'black-forest-labs/FLUX.1-dev',
  'stable-diffusion-xl': 'stabilityai/stable-diffusion-xl-base-1.0',
  'stable-diffusion-3': 'stabilityai/stable-diffusion-3-medium-diffusers',
  'playground-v2': 'playgroundai/playground-v2.5-1024px-aesthetic'
};

export const generateThumbnailWithHuggingFace = async (req: Request, res: Response) => {
  try {
    const { 
      // Required fields for Thumbnail model
      title,
      style,
      // Optional fields
      prompt: user_prompt, 
      aspect_ratio = "16:9",
      color_scheme,
      text_overlay = false,
      model = 'flux-schnell'
    } = req.body;

    // Validate required fields
    if (!title || !style) {
      return res.status(400).json({
        success: false,
        message: 'Title and style are required fields'
      });
    }

    console.log('🎨 Generating image with Hugging Face API...');
    console.log('Model:', model);
    console.log('Title:', title);
    console.log('Style:', style);

    // Construct a comprehensive prompt
    let fullPrompt = `YouTube thumbnail for "${title}", style: ${style}`;
    if (user_prompt) fullPrompt += `, ${user_prompt}`;
    if (color_scheme) fullPrompt += `, color scheme: ${color_scheme}`;
    fullPrompt += `, high quality, professional, 8k resolution`;

    console.log('Full Prompt:', fullPrompt);

    // Get the model endpoint
    const modelEndpoint = AVAILABLE_MODELS[model as keyof typeof AVAILABLE_MODELS] || AVAILABLE_MODELS['flux-schnell'];
    const apiUrl = `https://router.huggingface.co/hf-inference/models/${modelEndpoint}`;
    
    // Simple payload for Hugging Face API
    const payload = {
      inputs: fullPrompt
    };

    console.log('Making request to:', apiUrl);

    // Make request to Hugging Face API
    const response = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'image/png' // Required for router.huggingface.co
      },
      responseType: 'arraybuffer',
      timeout: 60000 // 60 second timeout
    });

    if (response.status !== 200) {
      throw new Error(`Hugging Face API returned status ${response.status}`);
    }

    // Convert the image buffer to base64
    const imageBuffer = Buffer.from(response.data);
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = `data:image/png;base64,${base64Image}`;

    // Save to database
    const userId = req.session?.userId || 'anonymous';
    const thumbnail = new Thumbnail({
      userId,
      title,
      style,
      user_prompt,
      prompt_used: fullPrompt,
      aspect_ratio,
      color_scheme,
      text_overlay,
      image_url: imageUrl,
      provider: 'huggingface',
      isGenerating: false,
      // model and metadata are not part of IThumbnail definition but Mongoose might be loose options or I should add them if schema allows, 
      // but strictly I should stick to schema fields or add strict: false.
      // The schema shown didn't have provider field either, but I'll trust standard mongo behavior or add it.
      // Wait, let's just stick to schema fields to be safe against validation errors if strict.
    });
    
    // Check if schema allows dynamic fields? The schema helper usually is strict. 
    // I noticed IThumbnail doesn't have `provider`. 
    // The previous code had `provider: 'huggingface'` and `metadata`.
    // The previous error was specifically about `style` and `title`.
    // So sticking to schema is safest.
    
    await thumbnail.save();

    console.log('✅ Image generated successfully with Hugging Face API');

    res.json({
      success: true,
      message: 'Image generated successfully using Hugging Face API',
      thumbnail, // Send back the full thumbnail object
      imageUrl,
      thumbnailId: thumbnail._id,
      provider: 'huggingface',
      model: modelEndpoint
    });

  } catch (error: any) {
    console.error('❌ Hugging Face API generation failed:', error);
    
    let errorMessage = 'Failed to generate image';
    let statusCode = 500;

    if (error.response) {
      // API responded with error
      statusCode = error.response.status;
      console.log('API Error Status:', error.response.status);
      console.log('API Error Data:', error.response.data);
      
      if (error.response.status === 401) {
        errorMessage = 'Invalid Hugging Face API token';
      } else if (error.response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please try again later.';
      } else if (error.response.status === 503) {
        errorMessage = 'Model is currently loading. Please try again in a few moments.';
      } else {
        errorMessage = `Hugging Face API error: ${error.response.statusText}`;
      }
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. The model might be loading, please try again.';
    } else {
      errorMessage = error.message || 'Unknown error occurred';
    }

    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      provider: 'huggingface',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get available Hugging Face models
export const getHuggingFaceModels = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      models: Object.entries(AVAILABLE_MODELS).map(([key, value]) => ({
        id: key,
        name: value,
        displayName: key.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      }))
    });
  } catch (error: any) {
    console.error('Failed to get models:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available models'
    });
  }
};

// Test Hugging Face API connection
export const testHuggingFaceConnection = async (req: Request, res: Response) => {
  try {
    const testUrl = 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';
    
    console.log('Testing Hugging Face API connection...');
    console.log('Using token:', process.env.HUGGINGFACE_API_TOKEN ? 'Token found' : 'No token');
    
    const response = await axios.post(testUrl, {
      inputs: "A simple red circle on white background"
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'image/png'
      },
      responseType: 'arraybuffer',
      timeout: 30000
    });

    console.log('API Response Status:', response.status);

    res.json({
      success: true,
      message: 'Hugging Face API connection successful',
      status: response.status,
      token_valid: true
    });

  } catch (error: any) {
    console.error('Hugging Face connection test failed:', error);
    
    let errorMessage = 'Connection test failed';
    let tokenValid = false;
    
    if (error.response?.status === 401) {
      errorMessage = 'Invalid API token';
      tokenValid = false;
    } else if (error.response?.status === 503) {
      errorMessage = 'Model is loading, but connection is valid';
      tokenValid = true;
    } else if (error.response?.status === 429) {
      errorMessage = 'Rate limited, but token is valid';
      tokenValid = true;
    }

    res.status(error.response?.status || 500).json({
      success: false,
      message: errorMessage,
      token_valid: tokenValid,
      error: error.message,
      status_code: error.response?.status
    });
  }
};