import Thumbnail from "../models/Thumbnail.js";
import Anthropic from '@anthropic-ai/sdk';
import path from "path";
import fs from "fs";
import cloudinary from "../configs/cloudinary.js";
import axios from "axios";
// Initialize Anthropic Claude
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});
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
// Function to enhance prompt using Claude
const enhancePromptWithClaude = async (title, style, colorScheme, userPrompt) => {
    try {
        console.log('Enhancing prompt with Claude Haiku...');
        const systemPrompt = `You are an expert YouTube thumbnail designer. Your job is to create detailed, specific prompts for AI image generation that will result in high-performing, click-worthy thumbnails.

Key principles for great thumbnails:
- Bold, eye-catching visuals that stand out in search results
- Clear focal points and composition
- Emotional expressions that create curiosity
- High contrast and vibrant colors
- Professional quality that builds trust
- Elements that hint at the video content without giving everything away

Generate a detailed, specific prompt for an AI image generator that will create a thumbnail for the given video title, style, and color scheme.`;
        const userMessage = `Create a detailed AI image generation prompt for a YouTube thumbnail with these specifications:

Title: "${title}"
Style: ${style} (${stylePrompts[style]})
Color Scheme: ${colorScheme} (${colorSchemeDescriptions[colorScheme]})
${userPrompt ? `Additional requirements: ${userPrompt}` : ''}

Generate a comprehensive, detailed prompt that will result in a professional, click-worthy thumbnail. Include specific details about composition, lighting, colors, expressions, and visual elements.`;
        const response = await anthropic.messages.create({
            model: "claude-3-haiku-20240307",
            max_tokens: 500,
            system: systemPrompt,
            messages: [
                {
                    role: "user",
                    content: userMessage
                }
            ]
        });
        const enhancedPrompt = response.content[0].type === 'text' ? response.content[0].text : '';
        console.log('Claude enhanced prompt:', enhancedPrompt);
        return enhancedPrompt;
    }
    catch (error) {
        console.error('Claude enhancement failed:', error);
        // Fallback to basic prompt if Claude fails
        return `Create a ${stylePrompts[style]} for "${title}" with ${colorSchemeDescriptions[colorScheme]} color scheme. Make it professional and click-worthy.`;
    }
};
// Function to generate image using Pollinations AI (free)
const generateImageWithPollinations = async (prompt, aspectRatio = '16:9') => {
    try {
        console.log('Generating image with Pollinations AI...');
        // Encode the prompt for URL
        const encodedPrompt = encodeURIComponent(prompt);
        // Determine dimensions based on aspect ratio
        let width = 1024, height = 576; // Default 16:9
        if (aspectRatio === '1:1') {
            width = 1024;
            height = 1024;
        }
        else if (aspectRatio === '9:16') {
            width = 576;
            height = 1024;
        }
        else if (aspectRatio === '4:3') {
            width = 1024;
            height = 768;
        }
        // Pollinations AI URL with enhanced model
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=flux&enhance=true&nologo=true`;
        console.log('Pollinations URL:', imageUrl);
        // Download the image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000 // 30 second timeout
        });
        if (response.status !== 200) {
            throw new Error(`Failed to generate image: ${response.status}`);
        }
        console.log('Image downloaded successfully from Pollinations');
        return Buffer.from(response.data);
    }
    catch (error) {
        console.error('Pollinations generation failed:', error);
        throw new Error(`Image generation failed: ${error.message}`);
    }
};
export const generateThumbnailWithClaude = async (req, res) => {
    let thumbnail = null;
    try {
        console.log('=== STARTING CLAUDE-ENHANCED THUMBNAIL GENERATION ===');
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
        // Step 1: Enhance prompt with Claude
        const enhancedPrompt = await enhancePromptWithClaude(title, style, color_scheme || 'vibrant', user_prompt);
        // Step 2: Generate image with Pollinations AI using Claude's enhanced prompt
        const imageBuffer = await generateImageWithPollinations(enhancedPrompt, aspect_ratio);
        console.log(`Image generated successfully, size: ${imageBuffer.length} bytes`);
        // Step 3: Save image to temporary file
        const filename = `claude-thumbnail-${Date.now()}.png`;
        const filePath = path.resolve('images', filename);
        // Create images directory
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        // Write image to file
        fs.writeFileSync(filePath, imageBuffer);
        console.log('Image saved to:', filePath);
        // Step 4: Upload to Cloudinary
        console.log('Uploading to Cloudinary...');
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: 'image'
        });
        console.log('Cloudinary upload successful:', uploadResult.url);
        // Step 5: Update thumbnail record
        thumbnail.image_url = uploadResult.url;
        thumbnail.prompt_used = enhancedPrompt; // Store the Claude-enhanced prompt
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
            message: 'Thumbnail Generated Successfully with Claude Enhancement',
            thumbnail,
            provider: 'Claude Haiku + Pollinations AI',
            enhancedPrompt: enhancedPrompt
        });
        console.log('=== CLAUDE-ENHANCED THUMBNAIL GENERATION COMPLETED ===');
    }
    catch (error) {
        console.error('=== CLAUDE-ENHANCED THUMBNAIL GENERATION FAILED ===');
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
        if (error.message?.includes('Claude') || error.message?.includes('Anthropic')) {
            return res.status(500).json({
                message: 'Failed to enhance prompt with Claude. Please try again.',
                error: 'CLAUDE_ENHANCEMENT_FAILED'
            });
        }
        if (error.message?.includes('Image generation')) {
            return res.status(500).json({
                message: 'Failed to generate image. Please try again.',
                error: 'IMAGE_GENERATION_FAILED'
            });
        }
        // Generic error
        res.status(500).json({
            message: 'Thumbnail generation failed. Please try again.',
            error: error.message
        });
    }
};
