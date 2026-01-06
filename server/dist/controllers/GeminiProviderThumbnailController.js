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
// Function to generate image using Gemini Provider API
const generateImageWithGeminiProvider = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Generating image with Gemini Provider API...');
        // Determine aspect ratio for Gemini
        let geminiAspectRatio = '16:9';
        if (aspectRatio === '1:1') {
            geminiAspectRatio = '1:1';
        }
        else if (aspectRatio === '9:16') {
            geminiAspectRatio = '9:16';
        }
        else if (aspectRatio === '4:3') {
            geminiAspectRatio = '4:3';
        }
        // This is a generic API call structure - you may need to adjust based on the actual provider API
        const requestBody = {
            model: "gemini-2.5-flash-image-preview-edit",
            prompt: prompt,
            aspect_ratio: geminiAspectRatio,
            quality: "high",
            response_format: "url"
        };
        console.log('Calling Gemini Provider API with:', requestBody);
        // Make API call to the provider service
        // Note: You'll need to provide the actual API endpoint URL for your provider
        const response = await axios.post('https://api.your-provider.com/v1/images/generate', requestBody, {
            headers: {
                'Authorization': `Bearer ${process.env.GEMINI_PROVIDER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000 // 60 second timeout
        });
        if (response.status !== 200) {
            throw new Error(`Provider API failed: ${response.status}`);
        }
        const imageUrl = response.data.data?.[0]?.url || response.data.url;
        if (!imageUrl) {
            throw new Error('No image URL received from provider');
        }
        console.log('Gemini Provider generated image URL:', imageUrl);
        // Download the image
        const imageResponse = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        });
        if (imageResponse.status !== 200) {
            throw new Error(`Failed to download image: ${imageResponse.status}`);
        }
        console.log('Image downloaded successfully from Gemini Provider');
        return Buffer.from(imageResponse.data);
    }
    catch (error) {
        console.error('Gemini Provider generation failed:', error);
        // If the provider API fails, fall back to a direct Gemini API call
        console.log('Falling back to direct Gemini API...');
        return await generateImageWithDirectGemini(prompt, aspectRatio);
    }
};
// Fallback function using direct Gemini API
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
                    imageSize: '1024'
                }
            }
        });
        const response = await result.response;
        const parts = response.candidates?.[0]?.content?.parts;
        if (!parts) {
            throw new Error('No image data received from Gemini');
        }
        for (const part of parts) {
            if (part.inlineData) {
                console.log('Found image data from Gemini fallback');
                return Buffer.from(part.inlineData.data, 'base64');
            }
        }
        throw new Error('No image data found in Gemini response');
    }
    catch (error) {
        console.error('Direct Gemini API also failed:', error);
        throw new Error(`All image generation methods failed: ${error.message}`);
    }
};
export const generateThumbnailWithGeminiProvider = async (req, res) => {
    let thumbnail = null;
    try {
        console.log('=== STARTING GEMINI PROVIDER THUMBNAIL GENERATION ===');
        // Handle userId for testing (no authentication)
        const userId = req.session?.userId || 'test-user-123';
        console.log('Using userId:', userId);
        const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay, } = req.body;
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
        let prompt = `Create a ${stylePrompts[style]} for: "${title}"`;
        if (color_scheme) {
            prompt += ` Use a ${colorSchemeDescriptions[color_scheme]} color scheme.`;
        }
        if (user_prompt) {
            prompt += ` Additional details: ${user_prompt}.`;
        }
        prompt += ` The thumbnail should be ${aspect_ratio}, visually stunning, and designed to maximize click-through rate. Make it bold, professional, and impossible to ignore.`;
        console.log('Generated prompt:', prompt);
        // Generate image with Gemini Provider
        const imageBuffer = await generateImageWithGeminiProvider(prompt, aspect_ratio);
        console.log(`Image generated successfully, size: ${imageBuffer.length} bytes`);
        // Save image to temporary file
        const filename = `gemini-provider-thumbnail-${Date.now()}.png`;
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
        thumbnail.prompt_used = prompt;
        thumbnail.isGenerating = false;
        await thumbnail.save();
        console.log('Thumbnail saved to database successfully');
        // Clean up temporary file
        try {
            fs.unlinkSync(filePath);
            console.log('Temporary file cleaned up');
        }
        catch (cleanupError) {
            console.warn('Failed to clean up temporary file:', cleanupError);
        }
        // Send success response
        res.json({
            message: 'Thumbnail Generated Successfully with Gemini Provider',
            thumbnail,
            provider: 'Gemini 2.5 Flash Image Preview (Provider)',
            prompt: prompt
        });
        console.log('=== GEMINI PROVIDER THUMBNAIL GENERATION COMPLETED ===');
    }
    catch (error) {
        console.error('=== GEMINI PROVIDER THUMBNAIL GENERATION FAILED ===');
        console.error('Error:', error);
        // Update thumbnail status on error
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
        // Handle specific errors
        if (error.message?.includes('Provider API failed') || error.message?.includes('provider')) {
            return res.status(500).json({
                message: 'Gemini Provider API failed. Please try again.',
                error: 'PROVIDER_API_FAILED'
            });
        }
        if (error.message?.includes('quota') || error.message?.includes('429')) {
            return res.status(429).json({
                message: 'API quota exceeded. Please try again later.',
                error: 'QUOTA_EXCEEDED'
            });
        }
        // Generic error
        res.status(500).json({
            message: 'Thumbnail generation failed. Please try again.',
            error: error.message
        });
    }
};
