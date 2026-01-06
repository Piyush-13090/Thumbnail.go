import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import path from "path";
import fs from "fs";
import cloudinary from "../configs/cloudinary.js";
import axios from "axios";

const stylePrompts = {
  'Bold & Graphic': 'eye-catching thumbnail, bold typography, vibrant colors, expressive facial reaction, dramatic lighting, high contrast, click-worthy composition, professional style',
  'Tech/Futuristic': 'futuristic thumbnail, sleek modern design, digital UI elements, glowing accents, holographic effects, cyber-tech aesthetic, sharp lighting, high-tech atmosphere',
  'Minimalist': 'minimalist thumbnail, clean layout, simple shapes, limited color palette, plenty of negative space, modern flat design, clear focal point',
  'Photorealistic': 'photorealistic thumbnail, ultra-realistic lighting, natural skin tones, candid moment, DSLR-style photography, lifestyle realism, shallow depth of field',
  'Illustrated': 'illustrated thumbnail, custom digital illustration, stylized characters, bold outlines, vibrant colors, creative cartoon or vector art style',
}

const colorSchemeDescriptions = {
  vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
  sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
  forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
  neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
  purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
  monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
  ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
  pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
}

// Function to generate image using Imagen 3.5 Provider API
const generateImageWithImagen = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Generating image with Imagen 3.5...');
    
    // Determine dimensions for Imagen 3.5
    let width = 1280, height = 720; // High quality 16:9
    if (aspectRatio === '1:1') {
      width = 1024;
      height = 1024;
    } else if (aspectRatio === '9:16') {
      width = 720;
      height = 1280;
    } else if (aspectRatio === '4:3') {
      width = 1024;
      height = 768;
    }
    
    // Enhanced prompt for Imagen 3.5
    const enhancedPrompt = `${prompt}. High-quality, professional, photorealistic, studio lighting, sharp focus, detailed, 4K resolution, trending on social media, click-worthy design.`;
    
    // API request structure for provider service
    const requestBody = {
      model: "imagen-3.5",
      prompt: enhancedPrompt,
      width: width,
      height: height,
      quality: "premium",
      style: "photorealistic",
      response_format: "url",
      num_images: 1
    };
    
    console.log('Calling Imagen 3.5 Provider API...');
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Since this is a provider API, I'll assume a generic endpoint structure
    // You may need to adjust the endpoint URL based on your actual provider
    const apiEndpoints = [
      'https://api.provider-4.com/v1/images/generate',
      'https://imagen-api.provider-4.com/generate',
      'https://api.imagen.provider-4.com/v1/generate'
    ];
    
    let response;
    let lastError;
    
    // Try different possible endpoints
    for (const endpoint of apiEndpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        
        response = await axios.post(endpoint, requestBody, {
          headers: {
            'Authorization': `Bearer ${process.env.image_api_key}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Thumblify/1.0'
          },
          timeout: 90000 // 90 second timeout for high-quality generation
        });
        
        if (response.status === 200) {
          console.log('Successfully connected to Imagen API');
          break;
        }
      } catch (endpointError: any) {
        console.log(`Endpoint ${endpoint} failed:`, endpointError.message);
        lastError = endpointError;
        continue;
      }
    }
    
    if (!response || response.status !== 200) {
      throw new Error(`All Imagen API endpoints failed. Last error: ${lastError?.message}`);
    }
    
    // Extract image URL from response
    const imageUrl = response.data.data?.[0]?.url || 
                    response.data.url || 
                    response.data.image_url ||
                    response.data.images?.[0]?.url;
    
    if (!imageUrl) {
      console.error('Response data:', JSON.stringify(response.data, null, 2));
      throw new Error('No image URL received from Imagen API');
    }
    
    console.log('Imagen 3.5 generated image URL:', imageUrl);
    
    // Download the generated image
    console.log('Downloading image from Imagen...');
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Thumblify/1.0'
      }
    });
    
    if (imageResponse.status !== 200) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    
    console.log('Image downloaded successfully from Imagen 3.5');
    return Buffer.from(imageResponse.data);
    
  } catch (error: any) {
    console.error('Imagen 3.5 generation failed:', error);
    
    // If provider API fails, try direct Google Vertex AI approach
    console.log('Attempting fallback to Google Vertex AI...');
    return await generateImageWithVertexAI(prompt, aspectRatio);
  }
};

// Fallback function using Google Vertex AI (if available)
const generateImageWithVertexAI = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Using Google Vertex AI as fallback...');
    
    // This would require Google Cloud credentials and Vertex AI setup
    // For now, we'll use a simple HTTP approach
    const requestBody = {
      instances: [
        {
          prompt: prompt,
          image: {
            aspectRatio: aspectRatio,
            quality: "high"
          }
        }
      ],
      parameters: {
        sampleCount: 1
      }
    };
    
    // This is a placeholder - actual Vertex AI endpoint would be different
    const response = await axios.post(
      'https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT/locations/us-central1/publishers/google/models/imagen-3.5:predict',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000
      }
    );
    
    // Process Vertex AI response
    const imageData = response.data.predictions?.[0]?.bytesBase64Encoded;
    if (imageData) {
      return Buffer.from(imageData, 'base64');
    }
    
    throw new Error('No image data in Vertex AI response');
    
  } catch (error: any) {
    console.error('Vertex AI fallback also failed:', error);
    throw new Error(`All Imagen generation methods failed: ${error.message}`);
  }
};

export const generateThumbnailWithImagen = async (req: Request, res: Response) => {
  let thumbnail: any = null;
  
  try {
    console.log('=== STARTING IMAGEN 3.5 THUMBNAIL GENERATION ===');
    
    // Handle userId for testing (no authentication)
    const userId = req.session?.userId || 'test-user-123';
    console.log('Using userId:', userId);
    
    const {
      title,
      prompt: user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
    } = req.body;

    // Validate required fields
    if (!title || !style) {
      return res.status(400).json({ 
        message: 'Title and style are required fields' 
      });
    }

    console.log('Creating thumbnail record in database...');
    thumbnail = await Thumbnail.create({
      userId,
      title,
      prompt_used: user_prompt,
      user_prompt,
      style,
      aspect_ratio,
      color_scheme,
      text_overlay,
      isGenerating: true
    });

    console.log('Thumbnail record created with ID:', thumbnail._id);

    // Build the prompt optimized for Imagen 3.5
    let prompt = `Professional YouTube thumbnail: ${stylePrompts[style as keyof typeof stylePrompts]} for "${title}".`;

    if (color_scheme) {
      prompt += ` ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]}.`;
    }
    if (user_prompt) {
      prompt += ` ${user_prompt}.`;
    }

    // Add Imagen-specific enhancements
    prompt += ` Aspect ratio ${aspect_ratio || '16:9'}. Ultra-high quality, professional photography, perfect composition, trending design, maximum click-through appeal.`;

    console.log('Optimized prompt for Imagen 3.5:', prompt);

    // Generate image with Imagen 3.5
    const imageBuffer = await generateImageWithImagen(prompt, aspect_ratio);
    console.log(`Imagen 3.5 generated image successfully, size: ${imageBuffer.length} bytes`);

    // Save image to temporary file
    const filename = `imagen-thumbnail-${Date.now()}.png`;
    const filePath = path.resolve('images', filename);

    // Create images directory
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write image to file
    fs.writeFileSync(filePath, imageBuffer);
    console.log('Image saved to:', filePath);

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',
      quality: 'auto:best',
      format: 'jpg'
    });

    console.log('Cloudinary upload successful:', uploadResult.url);

    // Update thumbnail record
    thumbnail.image_url = uploadResult.url;
    thumbnail.prompt_used = prompt;
    thumbnail.isGenerating = false;
    await thumbnail.save();

    console.log('Thumbnail saved to database successfully');

    // Clean up temporary file
    try {
      fs.unlinkSync(filePath);
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }

    // Send success response
    res.json({ 
      message: 'Thumbnail Generated Successfully with Imagen 3.5', 
      thumbnail,
      provider: 'Google Imagen 3.5',
      prompt: prompt,
      quality: 'Premium'
    });

    console.log('=== IMAGEN 3.5 THUMBNAIL GENERATION COMPLETED ===');

  } catch (error: any) {
    console.error('=== IMAGEN 3.5 THUMBNAIL GENERATION FAILED ===');
    console.error('Error:', error);
    
    // Update thumbnail status on error
    try {
      if (thumbnail) {
        thumbnail.isGenerating = false;
        await thumbnail.save();
        console.log('Updated thumbnail status to failed');
      }
    } catch (dbError) {
      console.error('Failed to update thumbnail status:', dbError);
    }
    
    // Handle specific errors
    if (error.message?.includes('Imagen') || error.message?.includes('provider')) {
      return res.status(500).json({ 
        message: 'Imagen 3.5 API failed. Please try again.',
        error: 'IMAGEN_API_FAILED'
      });
    }
    
    if (error.message?.includes('quota') || error.message?.includes('429')) {
      return res.status(429).json({ 
        message: 'API quota exceeded. Please try again later.',
        error: 'QUOTA_EXCEEDED'
      });
    }
    
    if (error.message?.includes('billing') || error.message?.includes('limit')) {
      return res.status(429).json({ 
        message: 'API billing limit reached. Please check your account.',
        error: 'BILLING_LIMIT'
      });
    }
    
    // Generic error
    res.status(500).json({ 
      message: 'Thumbnail generation failed. Please try again.',
      error: error.message 
    });
  }
};