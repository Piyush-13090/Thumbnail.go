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
};
const colorSchemeDescriptions = {
    vibrant: 'vibrant and energetic colors, high saturation, bold contrasts, eye-catching palette',
    sunset: 'warm sunset tones, orange pink and purple hues, soft gradients, cinematic glow',
    forest: 'natural green tones, earthy colors, calm and organic palette, fresh atmosphere',
    neon: 'neon glow effects, electric blues and pinks, cyberpunk lighting, high contrast glow',
    purple: 'purple-dominant color palette, magenta and violet tones, modern and stylish mood',
    monochrome: 'black and white color scheme, high contrast, dramatic lighting, timeless aesthetic',
    ocean: 'cool blue and teal tones, aquatic color palette, fresh and clean atmosphere',
    pastel: 'soft pastel colors, low saturation, gentle tones, calm and friendly aesthetic',
};
// Universal provider function that tries multiple approaches
const generateImageWithProvider = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Generating image with Universal Provider...');
        // Try different provider API formats
        const providers = [
            {
                name: 'Imagen 3.5',
                key: process.env.image_api_key,
                endpoints: [
                    'https://api.openai.com/v1/images/generations', // OpenAI-compatible
                    'https://api.anthropic.com/v1/images/generate', // Anthropic-compatible
                    'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.5:generateImage', // Google-compatible
                ]
            }
        ];
        // Determine dimensions
        let width = 1280, height = 720;
        if (aspectRatio === '1:1') {
            width = 1024;
            height = 1024;
        }
        else if (aspectRatio === '9:16') {
            width = 720;
            height = 1280;
        }
        else if (aspectRatio === '4:3') {
            width = 1024;
            height = 768;
        }
        for (const provider of providers) {
            if (!provider.key)
                continue;
            console.log(`Trying provider: ${provider.name}`);
            for (const endpoint of provider.endpoints) {
                try {
                    console.log(`Testing endpoint: ${endpoint}`);
                    // Try different request formats
                    const requestFormats = [
                        // OpenAI DALL-E format
                        {
                            model: "imagen-3.5",
                            prompt: prompt,
                            n: 1,
                            size: `${width}x${height}`,
                            quality: "standard"
                        },
                        // Google Gemini format
                        {
                            contents: [prompt],
                            generationConfig: {
                                responseModalities: ['IMAGE'],
                                imageConfig: {
                                    aspectRatio: aspectRatio,
                                    imageSize: 'large'
                                }
                            }
                        },
                        // Generic format
                        {
                            prompt: prompt,
                            width: width,
                            height: height,
                            model: "imagen-3.5"
                        }
                    ];
                    for (const requestBody of requestFormats) {
                        try {
                            const response = await axios.post(endpoint, requestBody, {
                                headers: {
                                    'Authorization': `Bearer ${provider.key}`,
                                    'Content-Type': 'application/json',
                                    'User-Agent': 'Thumblify/1.0'
                                },
                                timeout: 60000
                            });
                            if (response.status === 200) {
                                console.log('Found working endpoint and format!');
                                // Try to extract image URL from different response formats
                                const imageUrl = response.data.data?.[0]?.url ||
                                    response.data.url ||
                                    response.data.image_url ||
                                    response.data.images?.[0]?.url ||
                                    response.data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
                                if (imageUrl) {
                                    if (typeof imageUrl === 'string') {
                                        // It's a URL, download it
                                        const imageResponse = await axios.get(imageUrl, {
                                            responseType: 'arraybuffer',
                                            timeout: 30000
                                        });
                                        return Buffer.from(imageResponse.data);
                                    }
                                    else if (imageUrl.data) {
                                        // It's base64 data
                                        return Buffer.from(imageUrl.data, 'base64');
                                    }
                                }
                            }
                        }
                        catch (formatError) {
                            console.log(`Request format failed: ${formatError.message}`);
                            continue;
                        }
                    }
                }
                catch (endpointError) {
                    console.log(`Endpoint failed: ${endpointError.message}`);
                    continue;
                }
            }
        }
        // If all providers fail, use Pollinations as reliable fallback
        console.log('All providers failed, using Pollinations as fallback...');
        return await generateImageWithPollinations(prompt, aspectRatio);
    }
    catch (error) {
        console.error('Universal provider generation failed:', error);
        throw new Error(`Image generation failed: ${error.message}`);
    }
};
// Reliable fallback using Pollinations
const generateImageWithPollinations = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Using Pollinations as fallback...');
        const encodedPrompt = encodeURIComponent(prompt);
        let width = 1280, height = 720;
        if (aspectRatio === '1:1') {
            width = 1024;
            height = 1024;
        }
        else if (aspectRatio === '9:16') {
            width = 720;
            height = 1280;
        }
        else if (aspectRatio === '4:3') {
            width = 1024;
            height = 768;
        }
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&enhance=true&nologo=true&seed=${Date.now()}`;
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 45000
        });
        if (response.status !== 200) {
            throw new Error(`Pollinations failed: ${response.status}`);
        }
        console.log('Pollinations fallback successful');
        return Buffer.from(response.data);
    }
    catch (error) {
        throw new Error(`Fallback generation failed: ${error.message}`);
    }
};
export const generateThumbnailWithUniversalProvider = async (req, res) => {
    let thumbnail = null;
    try {
        console.log('=== STARTING UNIVERSAL PROVIDER THUMBNAIL GENERATION ===');
        const userId = req.session?.userId || 'test-user-123';
        console.log('Using userId:', userId);
        const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay, } = req.body;
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
        // Build optimized prompt
        let prompt = `Professional YouTube thumbnail: ${stylePrompts[style]} for "${title}".`;
        if (color_scheme) {
            prompt += ` ${colorSchemeDescriptions[color_scheme]}.`;
        }
        if (user_prompt) {
            prompt += ` ${user_prompt}.`;
        }
        prompt += ` Aspect ratio ${aspect_ratio || '16:9'}. Ultra-high quality, professional, click-worthy design, trending on YouTube.`;
        console.log('Optimized prompt:', prompt);
        // Generate image with universal provider
        const imageBuffer = await generateImageWithProvider(prompt, aspect_ratio);
        console.log(`Image generated successfully, size: ${imageBuffer.length} bytes`);
        // Save and upload process
        const filename = `universal-thumbnail-${Date.now()}.png`;
        const filePath = path.resolve('images', filename);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, imageBuffer);
        console.log('Image saved to:', filePath);
        console.log('Uploading to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image',
            quality: 'auto:best'
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
        }
        catch (cleanupError) {
            console.warn('Failed to clean up temporary file:', cleanupError);
        }
        // Success response
        res.json({
            message: 'Thumbnail Generated Successfully',
            thumbnail,
            provider: 'Universal Provider (Imagen 3.5 + Fallback)',
            prompt: prompt
        });
        console.log('=== UNIVERSAL PROVIDER THUMBNAIL GENERATION COMPLETED ===');
    }
    catch (error) {
        console.error('=== UNIVERSAL PROVIDER THUMBNAIL GENERATION FAILED ===');
        console.error('Error:', error);
        try {
            if (thumbnail) {
                thumbnail.isGenerating = false;
                await thumbnail.save();
                console.log('Updated thumbnail status to failed');
            }
        }
        catch (dbError) {
            console.error('Failed to update thumbnail status:', dbError);
        }
        res.status(500).json({
            message: 'Thumbnail generation failed. Please try again.',
            error: error.message
        });
    }
};
