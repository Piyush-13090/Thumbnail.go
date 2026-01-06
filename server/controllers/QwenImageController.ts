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

// Function to generate image using Qwen Image Provider
const generateImageWithQwen = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Generating image with Qwen Image...');
    
    // Optimize prompt for Qwen's image generation capabilities
    const optimizedPrompt = `${prompt}. Ultra-high quality, professional digital art, masterpiece, best quality, highly detailed, sharp focus, vibrant colors, perfect composition.`;
    
    console.log('Optimized Qwen prompt:', optimizedPrompt);
    
    // Determine optimal dimensions for Qwen
    let width = 1344, height = 768; // High quality 16:9 (Qwen prefers these dimensions)
    if (aspectRatio === '1:1') {
      width = 1024;
      height = 1024;
    } else if (aspectRatio === '9:16') {
      width = 768;
      height = 1344;
    } else if (aspectRatio === '4:3') {
      width = 1024;
      height = 768;
    }
    
    // Try multiple API configurations for Qwen Image
    const apiConfigurations = [
      // Configuration 1: Alibaba Cloud DashScope style
      {
        url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable'
        },
        body: {
          model: "qwen-vl-plus",
          input: {
            prompt: optimizedPrompt
          },
          parameters: {
            style: "photography",
            size: `${width}*${height}`,
            n: 1,
            seed: Math.floor(Math.random() * 1000000)
          }
        }
      },
      // Configuration 2: Provider API style
      {
        url: 'https://api.provider-4.com/v1/models/qwen-image/generate',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "qwen-image",
          prompt: optimizedPrompt,
          width: width,
          height: height,
          quality: "high",
          style: "realistic",
          response_format: "url"
        }
      },
      // Configuration 3: OpenAI-compatible format
      {
        url: 'https://qwen-api.provider-4.com/v1/images/generations',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          model: "qwen-image",
          prompt: optimizedPrompt,
          n: 1,
          size: `${width}x${height}`,
          quality: "hd",
          response_format: "url"
        }
      },
      // Configuration 4: Direct Qwen provider
      {
        url: 'https://api.qwen.provider-4.com/generate',
        method: 'POST',
        headers: {
          'X-API-Key': process.env.image_api_key,
          'Content-Type': 'application/json'
        },
        body: {
          prompt: optimizedPrompt,
          model: "qwen-image",
          parameters: {
            width: width,
            height: height,
            quality: "premium"
          }
        }
      },
      // Configuration 5: Alternative Alibaba format
      {
        url: 'https://provider-4-qwen.aliyuncs.com/v1/text-to-image',
        method: 'POST',
        headers: {
          'Authorization': `API-Key ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          input: {
            prompt: optimizedPrompt,
            negative_prompt: "low quality, blurry, distorted, ugly, bad anatomy",
            width: width,
            height: height
          },
          parameters: {
            steps: 20,
            guidance_scale: 7.5,
            seed: -1
          }
        }
      },
      // Configuration 6: Generic provider format
      {
        url: 'https://api.provider-4.ai/qwen/image/generate',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.image_api_key}`,
          'Content-Type': 'application/json'
        },
        body: {
          text: optimizedPrompt,
          width: width,
          height: height,
          model: "qwen-image",
          quality: "best"
        }
      }
    ];
    
    // Try each configuration
    for (let i = 0; i < apiConfigurations.length; i++) {
      const config = apiConfigurations[i];
      
      try {
        console.log(`Trying Qwen API configuration ${i + 1}...`);
        console.log(`URL: ${config.url}`);
        
        const response = await axios({
          method: config.method,
          url: config.url,
          headers: config.headers,
          data: config.body,
          timeout: 120000 // 2 minutes for high-quality generation
        });
        
        if (response.status === 200 || response.status === 201) {
          console.log('Qwen API responded successfully!');
          console.log('Response keys:', Object.keys(response.data));
          
          // Try to extract image data from various Qwen response formats
          let imageUrl = null;
          let imageData = null;
          
          // Alibaba DashScope format
          if (response.data.output?.results?.[0]?.url) {
            imageUrl = response.data.output.results[0].url;
          } else if (response.data.output?.url) {
            imageUrl = response.data.output.url;
          }
          
          // Standard API formats
          if (!imageUrl) {
            imageUrl = response.data.data?.[0]?.url || 
                      response.data.url || 
                      response.data.image_url ||
                      response.data.images?.[0]?.url ||
                      response.data.result?.url ||
                      response.data.results?.[0]?.image;
          }
          
          // Base64 formats
          if (!imageUrl) {
            imageData = response.data.data?.[0]?.b64_json || 
                       response.data.image_base64 ||
                       response.data.base64 ||
                       response.data.output?.image_base64;
          }
          
          if (imageUrl) {
            console.log('Found Qwen image URL:', imageUrl);
            
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
              timeout: 60000,
              headers: {
                'User-Agent': 'Thumblify/1.0'
              }
            });
            
            if (imageResponse.status === 200) {
              console.log('Successfully downloaded Qwen image');
              return Buffer.from(imageResponse.data);
            }
          } else if (imageData) {
            console.log('Found Qwen base64 image data');
            return Buffer.from(imageData, 'base64');
          }
          
          console.log('No image data found in Qwen response');
          console.log('Full response sample:', JSON.stringify(response.data, null, 2).substring(0, 500));
        }
      } catch (configError: any) {
        console.log(`Qwen configuration ${i + 1} failed:`, configError.response?.status, configError.message);
        
        if (configError.response?.data) {
          console.log('Error details:', JSON.stringify(configError.response.data, null, 2).substring(0, 300));
        }
        
        continue;
      }
    }
    
    throw new Error('All Qwen Image API configurations failed');
    
  } catch (error: any) {
    console.error('Qwen generation failed:', error);
    throw new Error(`Qwen generation failed: ${error.message}`);
  }
};

// Enhanced fallback using Pollinations with Qwen-style prompts
const generateImageWithPollinationsFallback = async (prompt: string, aspectRatio: string = '16:9') => {
  try {
    console.log('Using enhanced Pollinations as Qwen fallback...');
    
    // Enhance prompt with Qwen-style quality terms
    const enhancedPrompt = `${prompt}, masterpiece, best quality, ultra detailed, professional photography, award winning, trending on artstation`;
    const encodedPrompt = encodeURIComponent(enhancedPrompt);
    
    let width = 1344, height = 768; // Match Qwen dimensions
    if (aspectRatio === '1:1') {
      width = 1024; height = 1024;
    } else if (aspectRatio === '9:16') {
      width = 768; height = 1344;
    } else if (aspectRatio === '4:3') {
      width = 1024; height = 768;
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
    throw new Error(`Qwen fallback failed: ${error.message}`);
  }
};

export const generateThumbnailWithQwen = async (req: Request, res: Response) => {
  let thumbnail: any = null;
  
  try {
    console.log('=== STARTING QWEN IMAGE THUMBNAIL GENERATION ===');
    
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

    // Build optimized prompt for Qwen Image
    let prompt = `Professional YouTube thumbnail masterpiece: ${stylePrompts[style as keyof typeof stylePrompts]} for "${title}".`;

    if (color_scheme) {
      prompt += ` ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]}.`;
    }
    if (user_prompt) {
      prompt += ` ${user_prompt}.`;
    }

    prompt += ` Aspect ratio ${aspect_ratio || '16:9'}. Ultra-high quality, professional design, click-worthy, viral thumbnail, trending on YouTube, award-winning composition.`;

    console.log('Optimized prompt for Qwen:', prompt);

    let imageBuffer;
    let provider = 'Qwen Image';
    
    try {
      // Try Qwen provider first
      imageBuffer = await generateImageWithQwen(prompt, aspect_ratio);
      console.log(`Qwen generated successfully, size: ${imageBuffer.length} bytes`);
    } catch (qwenError) {
      console.log('Qwen provider failed, using enhanced Pollinations fallback...');
      imageBuffer = await generateImageWithPollinationsFallback(prompt, aspect_ratio);
      provider = 'Enhanced Pollinations (Qwen Fallback)';
      console.log(`Fallback generated successfully, size: ${imageBuffer.length} bytes`);
    }

    // Save and upload process
    const filename = `qwen-thumbnail-${Date.now()}.png`;
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
      message: 'Premium Thumbnail Generated Successfully with Qwen Image', 
      thumbnail,
      provider: provider,
      prompt: prompt,
      model: 'Qwen Image',
      quality: 'Ultra Premium'
    });

    console.log('=== QWEN IMAGE THUMBNAIL GENERATION COMPLETED ===');

  } catch (error: any) {
    console.error('=== QWEN IMAGE THUMBNAIL GENERATION FAILED ===');
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
      message: 'Qwen thumbnail generation failed. Please try again.',
      error: error.message 
    });
  }
};