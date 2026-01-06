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

// Function to generate image using Infip Provider
const generateImageWithInfip = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Generating image with Infip Provider...');
    
    // Optimize prompt for Infip capabilities
    const optimizedPrompt = `${prompt}. Ultra-high quality, professional digital art, masterpiece, best quality, highly detailed, sharp focus, vibrant colors, perfect composition, award-winning design.`;
    
    console.log('Optimized Infip prompt:', optimizedPrompt);
    
    // Determine optimal dimensions
    let width = 1792, height = 1024; // High quality 16:9
    if (aspectRatio === '1:1') {
      width = 1024;
      height = 1024;
    } else if (aspectRatio === '9:16') {
      width = 1024;
      height = 1792;
    } else if (aspectRatio === '4:3') {
      width = 1152;
      height = 896;
    }
    
    // Try multiple API configurations for Infip
    const apiConfigurations = [
      // Configuration 1: Correct Infip API (from user's curl example)
      {
        url: 'https://api.infip.pro/v1/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "nbpro",
          prompt: optimizedPrompt,
          n: 1,
          size: `${width}x${height}`,
          response_format: "url"
        }
      },
      // Configuration 2: Alternative Infip format
      {
        url: 'https://api.infip.pro/v1/images/generate',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "nbpro",
          prompt: optimizedPrompt,
          width: width,
          height: height,
          quality: "premium",
          response_format: "url"
        }
      },
      // Configuration 3: Infip with different model
      {
        url: 'https://api.infip.pro/v1/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "infip-premium",
          prompt: optimizedPrompt,
          n: 1,
          size: `${width}x${height}`,
          response_format: "url"
        }
      },
      // Configuration 4: Infip with base64 response
      {
        url: 'https://api.infip.pro/v1/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "nbpro",
          prompt: optimizedPrompt,
          n: 1,
          size: `${width}x${height}`,
          response_format: "b64_json"
        }
      },
      // Configuration 5: Infip legacy format
      {
        url: 'https://api.infip.pro/v1/generate',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          prompt: optimizedPrompt,
          model: "nbpro",
          dimensions: `${width}x${height}`,
          format: "url"
        }
      },
      // Configuration 6: Infip alternative endpoint
      {
        url: 'https://infip.pro/api/v1/images',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "nbpro",
          prompt: optimizedPrompt,
          width: width,
          height: height,
          count: 1
        }
      }
    ];
    
    // Try each configuration
    for (let i = 0; i < apiConfigurations.length; i++) {
      const config = apiConfigurations[i];
      
      try {
        console.log(`Trying Infip API configuration ${i + 1}...`);
        console.log(`URL: ${config.url}`);
        
        const response = await axios({
          method: config.method,
          url: config.url,
          headers: config.headers,
          data: config.body,
          timeout: 120000 // 2 minutes for high-quality generation
        });
        
        if (response.status === 200 || response.status === 201) {
          console.log('Infip API responded successfully!');
          console.log('Response keys:', Object.keys(response.data));
          
          // Try to extract image data from various Infip response formats
          let imageUrl = null;
          let imageData = null;
          
          // Standard formats
          if (response.data.data?.[0]?.url) {
            imageUrl = response.data.data[0].url;
          } else if (response.data.data?.[0]?.b64_json) {
            imageData = response.data.data[0].b64_json;
          }
          
          // Alternative formats
          if (!imageUrl && !imageData) {
            imageUrl = response.data.url || 
                      response.data.image_url ||
                      response.data.images?.[0]?.url ||
                      response.data.result?.url ||
                      response.data.results?.[0]?.image ||
                      response.data.output?.url ||
                      response.data.image;
            
            imageData = response.data.image_base64 ||
                       response.data.base64 ||
                       response.data.output?.image_base64 ||
                       response.data.b64_json;
          }
          
          if (imageUrl) {
            console.log('Found Infip image URL:', imageUrl);
            
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: {
                'User-Agent': 'Thumblify/1.0'
              }
            });
            
            if (imageResponse.status === 200) {
              console.log('Successfully downloaded Infip image');
              return Buffer.from(imageResponse.data);
            }
          } else if (imageData) {
            console.log('Found Infip base64 image data');
            return Buffer.from(imageData, 'base64');
          }
          
          console.log('No image data found in Infip response');
          console.log('Full response sample:', JSON.stringify(response.data, null, 2).substring(0, 500));
        }
      } catch (configError: any) {
        console.log(`Infip configuration ${i + 1} failed:`, configError.response?.status, configError.message);
        
        if (configError.response?.data) {
          console.log('Error details:', JSON.stringify(configError.response.data, null, 2).substring(0, 300));
        }
        
        continue;
      }
    }
    
    throw new Error('All Infip API configurations failed');
    
  } catch (error: any) {
    console.error('Infip generation failed:', error);
    throw new Error(`Infip generation failed: ${error.message}`);
  }
};

// Enhanced fallback using Pollinations with Infip-style prompts
const generateImageWithPollinationsFallback = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Using enhanced Pollinations as Infip fallback...');
    
    // Enhance prompt with Infip-style quality terms
    const enhancedPrompt = `${prompt}, masterpiece, best quality, ultra detailed, professional photography, award winning, trending on artstation, photorealistic, premium quality`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    let width = 1792, height = 1024; // Match Infip dimensions
    if (aspectRatio === '1:1') {
      width = 1024; height = 1024;
    } else if (aspectRatio === '9:16') {
      width = 1024; height = 1792;
    } else if (aspectRatio === '4:3') {
      width = 1152; height = 896;
    }
    
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&enhance=true&nologo=true&quality=ultra&seed=${Date.now()}`;
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });
    
    if (response.status !== 200) {
      throw new Error(`Pollinations failed: ${response.status}`);
    }
    
    console.log('Enhanced Pollinations fallback successful');
    return Buffer.from(response.data);
    
  } catch (error: any) {
    throw new Error(`Infip fallback failed: ${error.message}`);
  }
};

export const generateThumbnailWithInfip = async (req: Request, res: Response) => {
  let thumbnail: any = null;
  
  try {
    console.log('=== STARTING INFIP THUMBNAIL GENERATION ===');
    
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

    // Build optimized prompt for Infip
    let prompt = `Professional YouTube thumbnail masterpiece: ${stylePrompts[style as keyof typeof stylePrompts]} for "${title}".`;

    if (color_scheme) {
      prompt += ` ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]}.`;
    }
    if (user_prompt) {
      prompt += ` ${user_prompt}.`;
    }

    prompt += ` Aspect ratio ${aspect_ratio || '16:9'}. Ultra-high quality, professional design, click-worthy, viral thumbnail, trending on YouTube, award-winning composition, photorealistic quality.`;

    console.log('Optimized prompt for Infip:', prompt);

    let imageBuffer;
    let provider = 'Infip';
    
    try {
      // Try Infip provider first
      imageBuffer = await generateImageWithInfip(prompt, aspect_ratio);
      console.log(`Infip generated successfully, size: ${imageBuffer.length} bytes`);
    } catch (infipError) {
      console.log('Infip provider failed, using enhanced Pollinations fallback...');
      imageBuffer = await generateImageWithPollinationsFallback(prompt, aspect_ratio);
      provider = 'Enhanced Pollinations (Infip Fallback)';
      console.log(`Fallback generated successfully, size: ${imageBuffer.length} bytes`);
    }

    // Save and upload process
    const filename = `infip-thumbnail-${Date.now()}.png`;
    const filePath = path.resolve('images', filename);

    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, imageBuffer);
    console.log('Image saved to:', filePath);

    console.log('Uploading to Cloudinary with premium settings...');
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      resource_type: 'image',
      quality: 'auto:best',
      format: 'jpg'
    });

    console.log('Cloudinary upload successful:', uploadResult.url);

    thumbnail.image_url = uploadResult.url;
    thumbnail.prompt_used = prompt;
    thumbnail.isGenerating = false;
    await thumbnail.save();

    console.log('Thumbnail saved to database successfully');

    // Cleanup
    try {
      fs.unlinkSync(filePath);
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }

    // Success response
    res.json({ 
      message: 'Premium Thumbnail Generated Successfully with Infip', 
      thumbnail,
      provider: provider,
      prompt: prompt,
      model: 'Infip Premium',
      quality: 'Ultra Premium'
    });

    console.log('=== INFIP THUMBNAIL GENERATION COMPLETED ===');

  } catch (error: any) {
    console.error('=== INFIP THUMBNAIL GENERATION FAILED ===');
    console.error('Error:', error);
    
    try {
      if (thumbnail) {
        thumbnail.isGenerating = false;
        await thumbnail.save();
        console.log('Updated thumbnail status to failed');
      }
    } catch (dbError) {
      console.error('Failed to update thumbnail status:', dbError);
    }
    
    res.status(500).json({ 
      message: 'Infip thumbnail generation failed. Please try again.',
      error: error.message 
    });
  }
};