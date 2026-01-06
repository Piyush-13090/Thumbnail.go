import { Request, Response } from "express";
import Thumbnail from "../models/Thumbnail.js";
import OpenAI from 'openai';
import path from "path";
import fs from "fs";
import cloudinary from "../configs/cloudinary.js";
import axios from "axios";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY as string
});

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

export const generateThumbnail = async (req: Request, res: Response) => {
  let thumbnail: any = null;
  
  try {
    console.log('=== STARTING THUMBNAIL GENERATION ===');
    
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

    // Build the prompt
    let prompt = `Create a ${stylePrompts[style as keyof typeof stylePrompts]} for: "${title}"`;

    if (color_scheme) {
      prompt += ` Use a ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]} color scheme.`;
    }
    if (user_prompt) {
      prompt += ` Additional details: ${user_prompt}.`;
    }

    prompt += ` The thumbnail should be ${aspect_ratio}, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore.`;

    console.log('Generated prompt:', prompt);

    // Determine image size based on aspect ratio
    let size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
    
    if (aspect_ratio === '16:9') {
      size = "1792x1024";
    } else if (aspect_ratio === '9:16') {
      size = "1024x1792";
    } else {
      size = "1024x1024";
    }

    console.log('Using OpenAI DALL-E 3 with size:', size);

    // Generate image with OpenAI DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: size,
      quality: "standard",
      response_format: "url"
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error('No image URL received from OpenAI');
    }

    console.log('OpenAI generated image URL:', imageUrl);

    // Download the image
    console.log('Downloading image from OpenAI...');
    const imageResponse = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    if (imageResponse.status !== 200) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = Buffer.from(imageResponse.data);
    console.log(`Image downloaded successfully, size: ${imageBuffer.length} bytes`);

    // Save image to temporary file
    const filename = `thumbnail-${Date.now()}.png`;
    const filePath = path.resolve('images', filename);

    // Create images directory
    fs.mkdirSync(path.dirname(filePath), { recursive: true });

    // Write image to file
    fs.writeFileSync(filePath, imageBuffer);
    console.log('Image saved to:', filePath);

    // Upload to Cloudinary
    console.log('Uploading to Cloudinary...');
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image'
    });

    console.log('Cloudinary upload successful:', uploadResult.url);

    // Update thumbnail record
    thumbnail.image_url = uploadResult.url;
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
      message: 'Thumbnail Generated Successfully', 
      thumbnail,
      provider: 'OpenAI DALL-E 3',
      revised_prompt: response.data[0].revised_prompt
    });

    console.log('=== THUMBNAIL GENERATION COMPLETED ===');

  } catch (error: any) {
    console.error('=== THUMBNAIL GENERATION FAILED ===');
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
    
    // Handle specific OpenAI errors
    if (error.message?.includes('billing') || error.message?.includes('quota')) {
      return res.status(429).json({ 
        message: 'OpenAI API billing limit reached. Please check your OpenAI account and add credits.',
        error: 'OPENAI_BILLING_LIMIT'
      });
    }
    
    if (error.message?.includes('OpenAI') || error.message?.includes('images')) {
      return res.status(500).json({ 
        message: 'Failed to generate image with OpenAI. Please try again.',
        error: 'OPENAI_GENERATION_FAILED'
      });
    }
    
    // Generic error
    res.status(500).json({ 
      message: 'Thumbnail generation failed. Please try again.',
      error: error.message 
    });
  }
};

// Delete thumbnail
export const deleteThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.session;

    await Thumbnail.findByIdAndDelete({ _id: id, userId });

    res.json({ message: 'Thumbnail deleted successfully' });
  } catch (error: any) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};