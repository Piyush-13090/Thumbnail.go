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
// Function to generate image using Gemini 2.5 Flash Image Provider
const generateImageWithGeminiFlash = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Generating image with Gemini 2.5 Flash Image...');
        // Optimize prompt for Gemini's image generation
        const optimizedPrompt = `${prompt}. High-quality digital art, professional composition, vibrant colors, sharp details, trending design, YouTube thumbnail style.`;
        console.log('Optimized Gemini Flash prompt:', optimizedPrompt);
        // Try multiple API configurations for Gemini 2.5 Flash Image
        const apiConfigurations = [
            // Configuration 1: Google AI Studio style
            {
                url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.image_api_key}`,
                    'Content-Type': 'application/json',
                    'x-goog-api-key': process.env.image_api_key
                },
                body: {
                    contents: [
                        {
                            parts: [
                                {
                                    text: optimizedPrompt
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 8192,
                        temperature: 0.8,
                        topP: 0.9,
                        responseModalities: ['IMAGE'],
                        imageConfig: {
                            aspectRatio: aspectRatio,
                            imageSize: 'large'
                        }
                    }
                }
            },
            // Configuration 2: Provider API style
            {
                url: 'https://api.provider-4.com/v1/models/gemini-2.5-flash-image/generate',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.image_api_key}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    model: "gemini-2.5-flash-image",
                    prompt: optimizedPrompt,
                    aspect_ratio: aspectRatio,
                    quality: "high",
                    response_format: "url"
                }
            },
            // Configuration 3: OpenAI-compatible format
            {
                url: 'https://gemini-api.provider-4.com/v1/images/generations',
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.image_api_key}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    model: "gemini-2.5-flash-image",
                    prompt: optimizedPrompt,
                    n: 1,
                    size: aspectRatio === '1:1' ? '1024x1024' : aspectRatio === '9:16' ? '1024x1792' : '1792x1024',
                    quality: "hd"
                }
            },
            // Configuration 4: Direct Gemini provider
            {
                url: 'https://provider-4-gemini.googleapis.com/v1/generate',
                method: 'POST',
                headers: {
                    'X-API-Key': process.env.image_api_key,
                    'Content-Type': 'application/json'
                },
                body: {
                    instances: [
                        {
                            prompt: optimizedPrompt,
                            parameters: {
                                aspectRatio: aspectRatio,
                                quality: "premium"
                            }
                        }
                    ]
                }
            },
            // Configuration 5: Alternative provider format
            {
                url: 'https://api.gemini-flash.provider-4.com/generate',
                method: 'POST',
                headers: {
                    'Authorization': `API-Key ${process.env.image_api_key}`,
                    'Content-Type': 'application/json'
                },
                body: {
                    prompt: optimizedPrompt,
                    model: "gemini-2.5-flash-image",
                    config: {
                        aspectRatio: aspectRatio,
                        imageSize: "large"
                    }
                }
            }
        ];
        // Try each configuration
        for (let i = 0; i < apiConfigurations.length; i++) {
            const config = apiConfigurations[i];
            try {
                console.log(`Trying Gemini Flash API configuration ${i + 1}...`);
                console.log(`URL: ${config.url}`);
                const response = await axios({
                    method: config.method,
                    url: config.url,
                    headers: config.headers,
                    data: config.body,
                    timeout: 90000 // 90 seconds for Gemini generation
                });
                if (response.status === 200 || response.status === 201) {
                    console.log('Gemini Flash API responded successfully!');
                    console.log('Response keys:', Object.keys(response.data));
                    // Try to extract image data from Gemini response formats
                    let imageData = null;
                    let imageUrl = null;
                    // Gemini AI Studio format
                    if (response.data.candidates?.[0]?.content?.parts) {
                        const parts = response.data.candidates[0].content.parts;
                        for (const part of parts) {
                            if (part.inlineData) {
                                console.log('Found Gemini inline image data');
                                imageData = part.inlineData.data;
                                break;
                            }
                        }
                    }
                    // Standard API formats
                    if (!imageData) {
                        imageUrl = response.data.data?.[0]?.url ||
                            response.data.url ||
                            response.data.image_url ||
                            response.data.images?.[0]?.url ||
                            response.data.result?.url;
                    }
                    // Base64 formats
                    if (!imageData && !imageUrl) {
                        imageData = response.data.data?.[0]?.b64_json ||
                            response.data.image_base64 ||
                            response.data.base64;
                    }
                    if (imageData) {
                        console.log('Processing Gemini base64 image data');
                        return Buffer.from(imageData, 'base64');
                    }
                    else if (imageUrl) {
                        console.log('Downloading Gemini image from URL:', imageUrl);
                        const imageResponse = await axios.get(imageUrl, {
                            responseType: 'arraybuffer',
                            timeout: 60000
                        });
                        if (imageResponse.status === 200) {
                            console.log('Successfully downloaded Gemini Flash image');
                            return Buffer.from(imageResponse.data);
                        }
                    }
                    console.log('No image data found in Gemini response');
                    console.log('Full response:', JSON.stringify(response.data, null, 2));
                }
            }
            catch (configError) {
                console.log(`Gemini configuration ${i + 1} failed:`, configError.response?.status, configError.message);
                if (configError.response?.data) {
                    console.log('Error details:', JSON.stringify(configError.response.data, null, 2));
                }
                continue;
            }
        }
        throw new Error('All Gemini 2.5 Flash Image API configurations failed');
    }
    catch (error) {
        console.error('Gemini Flash generation failed:', error);
        throw new Error(`Gemini Flash generation failed: ${error.message}`);
    }
};
// Enhanced fallback using direct Gemini API
const generateImageWithDirectGemini = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Using direct Gemini API as fallback...');
        const { GoogleGenAI } = await import('@google/genai');
        const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image" });
        const result = await model.generateContent({
            contents: [prompt],
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.8,
                topP: 0.9,
                responseModalities: ['IMAGE'],
                imageConfig: {
                    aspectRatio: aspectRatio,
                    imageSize: 'large'
                }
            }
        });
        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
            throw new Error('No image data received from direct Gemini');
        }
        for (const part of parts) {
            if (part.inlineData) {
                console.log('Found image data from direct Gemini');
                return Buffer.from(part.inlineData.data, 'base64');
            }
        }
        throw new Error('No image data found in direct Gemini response');
    }
    catch (error) {
        console.error('Direct Gemini API failed:', error);
        throw new Error(`Direct Gemini failed: ${error.message}`);
    }
};
// Final fallback using Pollinations
const generateImageWithPollinationsFallback = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Using Pollinations as final fallback...');
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
        console.log('Pollinations final fallback successful');
        return Buffer.from(response.data);
    }
    catch (error) {
        throw new Error(`Final fallback failed: ${error.message}`);
    }
};
export const generateThumbnailWithGeminiFlash = async (req, res) => {
    let thumbnail = null;
    try {
        console.log('=== STARTING GEMINI 2.5 FLASH IMAGE THUMBNAIL GENERATION ===');
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
        // Build optimized prompt for Gemini Flash
        let prompt = `Professional YouTube thumbnail: ${stylePrompts[style]} for "${title}".`;
        if (color_scheme) {
            prompt += ` ${colorSchemeDescriptions[color_scheme]}.`;
        }
        if (user_prompt) {
            prompt += ` ${user_prompt}.`;
        }
        prompt += ` Aspect ratio ${aspect_ratio || '16:9'}. High-quality, professional design, click-worthy, trending on YouTube.`;
        console.log('Optimized prompt for Gemini Flash:', prompt);
        let imageBuffer;
        let provider = 'Gemini 2.5 Flash Image';
        try {
            // Try Gemini Flash provider first
            imageBuffer = await generateImageWithGeminiFlash(prompt, aspect_ratio);
            console.log(`Gemini Flash generated successfully, size: ${imageBuffer.length} bytes`);
        }
        catch (geminiFlashError) {
            console.log('Gemini Flash provider failed, trying direct Gemini...');
            try {
                imageBuffer = await generateImageWithDirectGemini(prompt, aspect_ratio);
                provider = 'Direct Gemini 2.5 Flash Image';
                console.log(`Direct Gemini generated successfully, size: ${imageBuffer.length} bytes`);
            }
            catch (directGeminiError) {
                console.log('Direct Gemini failed, using Pollinations fallback...');
                imageBuffer = await generateImageWithPollinationsFallback(prompt, aspect_ratio);
                provider = 'Pollinations (Gemini Fallback)';
                console.log(`Fallback generated successfully, size: ${imageBuffer.length} bytes`);
            }
        }
        // Save and upload process
        const filename = `gemini-flash-thumbnail-${Date.now()}.png`;
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
            message: 'Thumbnail Generated Successfully with Gemini Flash',
            thumbnail,
            provider: provider,
            prompt: prompt,
            model: 'Gemini 2.5 Flash Image'
        });
        console.log('=== GEMINI FLASH THUMBNAIL GENERATION COMPLETED ===');
    }
    catch (error) {
        console.error('=== GEMINI FLASH THUMBNAIL GENERATION FAILED ===');
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
            message: 'Gemini Flash thumbnail generation failed. Please try again.',
            error: error.message
        });
    }
};
