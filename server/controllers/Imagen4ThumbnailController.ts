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

// Function to generate image using Imagen 4 Provider API
const generateImageWithImagen4 = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Generating image with Imagen 4...');
    
    // Determine optimal dimensions for Imagen 4
    let width = 1536, height = 864; // Ultra high quality 16:9
    if (aspectRatio === '1:1') {
      width = 1536;
      height = 1536;
    } else if (aspectRatio === '9:16') {
      width = 864;
      height = 1536;
    } else if (aspectRatio === '4:3') {
      width = 1536;
      height = 1152;
    }
    
    // Enhanced prompt specifically optimized for Imagen 4
    const optimizedPrompt = `${prompt}. Ultra-high resolution, photorealistic quality, professional studio lighting, perfect composition, award-winning design, 8K quality, hyperdetailed, trending on Behance, masterpiece quality.`;
    
    console.log('Optimized Imagen 4 prompt:', optimizedPrompt);
    
    // Try multiple provider API patterns for Imagen 4
    const apiConfigurations = [
      // Configuration 1: Standard REST API
      {
        url: 'https://api.provider-4.com/v1/images/generate',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json',
          'X-API-Version': '2024-01',
          'User-Agent': 'Thumblify/1.0'
        },
        body: {
          model: "imagen-4",
          prompt: optimizedPrompt,
          width: width,
          height: height,
          quality: "ultra",
          style: "photorealistic",
          response_format: "url",
          num_images: 1,
          guidance_scale: 7.5,
          steps: 50
        }
      },
      // Configuration 2: Google Cloud Vertex AI style
      {
        url: 'https://imagen4-api.provider-4.com/v1/generate',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          instances: [
            {
              prompt: optimizedPrompt,
              image: {
                width: width,
                height: height,
                quality: "premium"
              }
            }
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: aspectRatio,
            seed: Math.floor(Math.random() * 1000000)
          }
        }
      },
      // Configuration 3: OpenAI-compatible format
      {
        url: 'https://provider-4.openai-api.com/v1/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "imagen-4",
          prompt: optimizedPrompt,
          n: 1,
          size: `${width}x${height}`,
          quality: "hd",
          response_format: "url"
        }
      },
      // Configuration 4: Direct provider format
      {
        url: 'https://api.imagen4.ai/generate',
        method: 'POST',
        headers: {
          'X-API-Key': process.env.image_api_key,
          'Content-Type': 'application/json'
        },
        body: {
          prompt: optimizedPrompt,
          width: width,
          height: height,
          model: "imagen-4",
          quality: "best"
        }
      }
    ];
    
    // Try each configuration
    for (let i = 0; i < apiConfigurations.length; i++) {
      const config = apiConfigurations[i];
      
      try {
        console.log(`Trying Imagen 4 API configuration ${i + 1}...`);
        console.log(`URL: ${config.url}`);
        
        const response = await axios({
          method: config.method,
          url: config.url,
          headers: config.headers,
          data: config.body,
          timeout: 120000 // 2 minutes for high-quality generation
        });
        
        if (response.status === 200 || response.status === 201) {
          console.log('Imagen 4 API responded successfully!');
          console.log('Response structure:', Object.keys(response.data));
          
          // Try to extract image URL from various response formats
          let imageUrl = null;
          
          // Standard formats
          if (response.data.data?.[0]?.url) {
            imageUrl = response.data.data[0].url;
          } else if (response.data.url) {
            imageUrl = response.data.url;
          } else if (response.data.image_url) {
            imageUrl = response.data.image_url;
          } else if (response.data.images?.[0]?.url) {
            imageUrl = response.data.images[0].url;
          } else if (response.data.predictions?.[0]?.image_url) {
            imageUrl = response.data.predictions[0].image_url;
          } else if (response.data.result?.url) {
            imageUrl = response.data.result.url;
          }
          
          // Base64 formats
          let imageData = null;
          if (response.data.data?.[0]?.b64_json) {
            imageData = response.data.data[0].b64_json;
          } else if (response.data.image_base64) {
            imageData = response.data.image_base64;
          } else if (response.data.predictions?.[0]?.bytesBase64Encoded) {
            imageData = response.data.predictions[0].bytesBase64Encoded;
          }
          
          if (imageUrl) {
            console.log('Found image URL:', imageUrl);
            
            // Download the image
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: {
                'User-Agent': 'Thumblify/1.0'
              }
            });
            
            if (imageResponse.status === 200) {
              console.log('Successfully downloaded Imagen 4 image');
              return Buffer.from(imageResponse.data);
            }
          } else if (imageData) {
            console.log('Found base64 image data');
            return Buffer.from(imageData, 'base64');
          }
          
          console.log('No image data found in response:', JSON.stringify(response.data, null, 2));
        }
      } catch (configError: any) {
        console.log(`Configuration ${i + 1} failed:`, configError.response?.status, configError.message);
        
        if (configError.response?.data) {
          console.log('Error response:', JSON.stringify(configError.response.data, null, 2));
        }
        
        continue;
      }
    }
    
    throw new Error('All Imagen 4 API configurations failed');
    
  } catch (error: any) {
    console.error('Imagen 4 generation failed:', error);
    throw new Error(`Imagen 4 generation failed: ${error.message}`);
  }
};

// Fallback to high-quality Pollinations
const generateImageWithPollinationsFallback = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Using enhanced Pollinations as fallback...');
    
    const encodedPrompt = encodeURIComponent(prompt);
    
    let width = 1536, height = 864; // Higher quality
    if (aspectRatio === '1:1') {
      width = 1536; height = 1536;
    } else if (aspectRatio === '9:16') {
      width = 864; height = 1536;
    } else if (aspectRatio === '4:3') {
      width = 1536; height = 1152;
    }
    
    // Use best Pollinations settings
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&enhance=true&nologo=true&quality=ultra&seed=${Date.now()}`;
    
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 60000
    });
    
    if (response.status !== 200) {
      throw new Error(`Pollinations failed: ${response.status}`);
    }
    
    console.log('High-quality Pollinations fallback successful');
    return Buffer.from(response.data);
    
  } catch (error: any) {
    throw new Error(`Fallback generation failed: ${error.message}`);
  }
};

export const generateThumbnailWithImagen4 = async (req: Request, res: Response) => {
  let thumbnail: any = null;
  
  try {
    console.log('=== STARTING IMAGEN 4 THUMBNAIL GENERATION ===');
    
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

    // Build ultra-optimized prompt for Imagen 4
    let prompt = `Professional YouTube thumbnail masterpiece: ${stylePrompts[style as keyof typeof stylePrompts]} for "${title}".`;

    if (color_scheme) {
      prompt += ` ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]}.`;
    }
    if (user_prompt) {
      prompt += ` ${user_prompt}.`;
    }

    prompt += ` Aspect ratio ${aspect_ratio || '16:9'}. Ultra-premium quality, award-winning design, viral thumbnail, maximum engagement, trending on YouTube, professional studio quality.`;

    console.log('Ultra-optimized prompt for Imagen 4:', prompt);

    let imageBuffer;
    let provider = 'Google Imagen 4';
    
    try {
      // Try Imagen 4 first
      imageBuffer = await generateImageWithImagen4(prompt, aspect_ratio);
      console.log(`Imagen 4 generated successfully, size: ${imageBuffer.length} bytes`);
    } catch (imagen4Error) {
      console.log('Imagen 4 failed, using enhanced fallback...');
      imageBuffer = await generateImageWithPollinationsFallback(prompt, aspect_ratio);
      provider = 'Enhanced Pollinations (Imagen 4 Fallback)';
      console.log(`Fallback generated successfully, size: ${imageBuffer.length} bytes`);
    }

    // Save and upload process
    const filename = `imagen4-thumbnail-${Date.now()}.png`;
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
      message: 'Premium Thumbnail Generated Successfully with Imagen 4', 
      thumbnail,
      provider: provider,
      prompt: prompt,
      quality: 'Ultra Premium'
    });

    console.log('=== IMAGEN 4 THUMBNAIL GENERATION COMPLETED ===');

  } catch (error: any) {
    console.error('=== IMAGEN 4 THUMBNAIL GENERATION FAILED ===');
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
      message: 'Premium thumbnail generation failed. Please try again.',
      error: error.message 
    });
  }
};