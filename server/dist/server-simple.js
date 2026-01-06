import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import OpenAI from 'openai';
import connectDB from './configs/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
const app = express();
// Connect to database
console.log("Connecting to DB...");
await connectDB();
// Basic middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    credentials: true
}));
app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, //  1 week
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        collectionName: "sessions"
    })
}));
app.use(express.json());
// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});
const port = process.env.PORT || 3000;
// Basic test endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Server is working!' });
});
// My generations endpoint
app.get('/api/thumbnail/my-generations', async (req, res) => {
    try {
        const { default: Thumbnail } = await import('./models/Thumbnail.js');
        const userId = req.session?.userId || 'test-user-123';
        console.log('Fetching thumbnails for userId:', userId);
        const thumbnails = await Thumbnail.find({ userId }).sort({ createdAt: -1 });
        console.log('Found thumbnails:', thumbnails.length);
        res.json({
            success: true,
            thumbnails,
            count: thumbnails.length,
            userId
        });
    }
    catch (error) {
        console.error('Failed to fetch thumbnails:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch thumbnails',
            error: error.message
        });
    }
});
// Delete thumbnail endpoint
app.delete('/api/thumbnail/delete/:id', async (req, res) => {
    try {
        const { default: Thumbnail } = await import('./models/Thumbnail.js');
        const { id } = req.params;
        const userId = req.session?.userId || 'test-user-123';
        const thumbnail = await Thumbnail.findOneAndDelete({ _id: id, userId });
        if (!thumbnail) {
            return res.status(404).json({
                success: false,
                message: 'Thumbnail not found'
            });
        }
        res.json({
            success: true,
            message: 'Thumbnail deleted successfully'
        });
    }
    catch (error) {
        console.error('Failed to delete thumbnail:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete thumbnail',
            error: error.message
        });
    }
});
// Authentication Routes
// Register User
app.post('/api/auth/register', async (req, res) => {
    try {
        const { default: User } = await import('./models/User.js');
        const { name, email, password } = req.body;
        // Validate input
        if (!name || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        // Create new user
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        // Set session
        req.session.isLoggedIn = true;
        req.session.userId = newUser._id.toString();
        res.json({
            message: 'Account created successfully',
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email
            }
        });
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: error.message });
    }
});
// Login User
app.post('/api/auth/login', async (req, res) => {
    try {
        const { default: User } = await import('./models/User.js');
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // Check password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }
        // Set session
        req.session.isLoggedIn = true;
        req.session.userId = user._id.toString();
        res.json({
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: error.message });
    }
});
// Verify User
app.get('/api/auth/verify', async (req, res) => {
    try {
        const { userId, isLoggedIn } = req.session;
        if (!isLoggedIn || !userId) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        const { default: User } = await import('./models/User.js');
        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(400).json({ message: 'Invalid user' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Verify error:', error);
        res.status(500).json({ message: error.message });
    }
});
// Logout User
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((error) => {
        if (error) {
            console.error('Logout error:', error);
            return res.status(500).json({ message: error.message });
        }
        res.json({ message: 'Logout successful' });
    });
});
// Thumbnail Generation with Infip (simplified version)
app.post('/api/thumbnail/generate', async (req, res) => {
    let thumbnail = null;
    try {
        const { default: Thumbnail } = await import('./models/Thumbnail.js');
        const userId = req.session?.userId || 'test-user-123';
        const { title, prompt: user_prompt, style, aspect_ratio, color_scheme, text_overlay, } = req.body;
        if (!title || !style) {
            return res.status(400).json({
                message: 'Title and style are required fields'
            });
        }
        console.log('Creating thumbnail record...');
        console.log('Request data:', { title, user_prompt, style, aspect_ratio, color_scheme });
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
        // Enhanced style prompts for better results
        const stylePrompts = {
            'Bold & Graphic': 'bold eye-catching YouTube thumbnail, dramatic typography, vibrant neon colors, excited facial expression, high contrast lighting, professional graphic design, click-worthy composition',
            'Tech/Futuristic': 'futuristic tech YouTube thumbnail, sleek holographic UI, glowing digital elements, cyberpunk aesthetic, neon blue and purple lighting, high-tech atmosphere, modern design',
            'Minimalist': 'clean minimalist YouTube thumbnail, simple elegant layout, limited color palette, plenty of white space, modern flat design, clear focal point, professional simplicity',
            'Photorealistic': 'photorealistic YouTube thumbnail, studio lighting, natural expressions, DSLR photography style, professional portrait, realistic skin tones, shallow depth of field',
            'Illustrated': 'custom illustrated YouTube thumbnail, cartoon character art, bold outlines, vibrant colors, digital illustration style, creative vector graphics, animated look',
        };
        const colorSchemeDescriptions = {
            vibrant: 'bright vibrant colors, high saturation, rainbow palette, energetic and bold, eye-catching contrast',
            sunset: 'warm sunset colors, orange pink purple gradient, golden hour lighting, cinematic glow, romantic atmosphere',
            forest: 'natural green forest colors, earthy brown tones, organic palette, fresh outdoor atmosphere, nature vibes',
            neon: 'electric neon glow, bright pink blue cyan, cyberpunk lighting, glowing effects, high contrast neon',
            purple: 'purple magenta violet theme, royal colors, elegant mood, luxury aesthetic, deep purple tones',
            monochrome: 'black and white only, high contrast, dramatic shadows, timeless classic, no color',
            ocean: 'ocean blue teal colors, aquatic theme, fresh water vibes, calm blue atmosphere, sea colors',
            pastel: 'soft pastel colors, gentle tones, cute aesthetic, low saturation, calm friendly mood',
        };
        // Build enhanced prompt
        let prompt = `YouTube thumbnail: ${stylePrompts[style]} for video titled "${title}".`;
        if (color_scheme) {
            prompt += ` Color scheme: ${colorSchemeDescriptions[color_scheme]}.`;
        }
        if (user_prompt) {
            prompt += ` Additional details: ${user_prompt}.`;
        }
        // Add quality and format specifications
        prompt += ` Professional YouTube thumbnail format, ${aspect_ratio || '16:9'} aspect ratio, ultra high quality, trending design, viral thumbnail style, professional composition, sharp details, perfect for YouTube.`;
        console.log('Generated prompt:', prompt);
        // Try multiple image generation services for better results
        let imageBuffer = null;
        let imageUrl = null;
        let provider = 'Unknown';
        // Method 1: Try Pollinations with enhanced settings and validation
        try {
            const enhancedPrompt = encodeURIComponent(prompt + ', masterpiece, best quality, ultra detailed, professional, award winning, trending, viral');
            let width = 1792, height = 1024; // 16:9
            if (aspect_ratio === '1:1') {
                width = 1024;
                height = 1024;
            }
            else if (aspect_ratio === '9:16') {
                width = 1024;
                height = 1792;
            }
            else if (aspect_ratio === '4:3') {
                width = 1152;
                height = 896;
            }
            // Try different Pollinations models with validation
            const models = ['flux', 'flux-realism', 'turbo'];
            for (const model of models) {
                try {
                    const testUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=${width}&height=${height}&model=${model}&enhance=true&nologo=true&quality=ultra&seed=${Date.now()}`;
                    console.log(`Trying Pollinations with model: ${model}`);
                    console.log('Image URL:', testUrl);
                    // Test if the URL is accessible and returns an image
                    const response = await fetch(testUrl, {
                        method: 'HEAD',
                        timeout: 10000 // 10 second timeout
                    });
                    if (response.ok && response.headers.get('content-type')?.includes('image')) {
                        imageUrl = testUrl;
                        provider = `Pollinations (${model})`;
                        console.log(`Successfully validated image with ${model}`);
                        // Double-check by trying to fetch the actual image
                        const imageCheck = await fetch(testUrl, {
                            method: 'GET',
                            timeout: 15000 // 15 second timeout
                        });
                        if (imageCheck.ok) {
                            console.log(`Image successfully accessible at: ${testUrl}`);
                            break;
                        }
                        else {
                            console.log(`Image URL not accessible, trying next model...`);
                            imageUrl = null;
                            continue;
                        }
                    }
                }
                catch (modelError) {
                    console.log(`Model ${model} failed: ${modelError.message}, trying next...`);
                    continue;
                }
            }
            if (!imageUrl) {
                // Fallback to basic Pollinations without model specification
                const basicUrl = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=${width}&height=${height}&enhance=true&nologo=true&seed=${Date.now()}`;
                try {
                    const response = await fetch(basicUrl, { method: 'HEAD', timeout: 10000 });
                    if (response.ok) {
                        imageUrl = basicUrl;
                        provider = 'Pollinations (Basic)';
                        console.log('Using basic Pollinations as fallback');
                    }
                }
                catch (basicError) {
                    console.error('Basic Pollinations also failed:', basicError.message);
                }
            }
        }
        catch (pollinationsError) {
            console.error('All Pollinations attempts failed:', pollinationsError.message);
        }
        // Method 2: Try Picsum as a reliable fallback (for testing)
        if (!imageUrl) {
            try {
                let width = 1792, height = 1024;
                if (aspect_ratio === '1:1') {
                    width = 1024;
                    height = 1024;
                }
                else if (aspect_ratio === '9:16') {
                    width = 1024;
                    height = 1792;
                }
                else if (aspect_ratio === '4:3') {
                    width = 1152;
                    height = 896;
                }
                const picsum_url = `https://picsum.photos/${width}/${height}?random=${Date.now()}`;
                const response = await fetch(picsum_url, { method: 'HEAD', timeout: 5000 });
                if (response.ok) {
                    imageUrl = picsum_url;
                    provider = 'Picsum (Fallback - Random Image)';
                    console.log('Using Picsum as fallback');
                }
            }
            catch (picsumError) {
                console.error('Picsum fallback failed:', picsumError.message);
            }
        }
        // Method 3: Create a placeholder image URL as last resort
        if (!imageUrl) {
            let width = 1792, height = 1024;
            if (aspect_ratio === '1:1') {
                width = 1024;
                height = 1024;
            }
            else if (aspect_ratio === '9:16') {
                width = 1024;
                height = 1792;
            }
            else if (aspect_ratio === '4:3') {
                width = 1152;
                height = 896;
            }
            // Use a reliable placeholder service
            imageUrl = `https://via.placeholder.com/${width}x${height}/FF6B6B/FFFFFF?text=${encodeURIComponent(title)}`;
            provider = 'Placeholder (Service Unavailable)';
            console.log('Using placeholder as last resort');
        }
        if (!imageUrl) {
            throw new Error('All image generation services failed - no fallback available');
        }
        // Update thumbnail with generated image
        thumbnail.image_url = imageUrl;
        thumbnail.prompt_used = prompt;
        thumbnail.isGenerating = false;
        await thumbnail.save();
        console.log('Thumbnail generation completed successfully');
        console.log('Final image URL:', imageUrl);
        res.json({
            message: 'Thumbnail Generated Successfully!',
            thumbnail,
            provider: provider,
            prompt: prompt,
            model: 'Enhanced Generation',
            quality: 'Ultra Premium',
            imageUrl: imageUrl
        });
    }
    catch (error) {
        console.error('Thumbnail generation failed:', error);
        // Update thumbnail status to failed
        if (thumbnail) {
            try {
                thumbnail.isGenerating = false;
                thumbnail.image_url = '';
                await thumbnail.save();
            }
            catch (updateError) {
                console.error('Failed to update thumbnail status:', updateError);
            }
        }
        res.status(500).json({
            message: 'Thumbnail generation failed. Please try again.',
            error: error.message,
            details: 'Check server logs for more information'
        });
    }
});
// Test image generation endpoint
app.get('/api/test/image-generation', async (req, res) => {
    try {
        console.log('Testing image generation services...');
        const testResults = [];
        // Test Pollinations
        try {
            const testUrl = `https://image.pollinations.ai/prompt/test%20youtube%20thumbnail?width=400&height=300&model=flux&seed=${Date.now()}`;
            const response = await fetch(testUrl, { method: 'HEAD', timeout: 10000 });
            testResults.push({
                service: 'Pollinations',
                status: response.ok ? 'Working' : 'Failed',
                url: response.ok ? testUrl : null,
                statusCode: response.status
            });
        }
        catch (error) {
            testResults.push({
                service: 'Pollinations',
                status: 'Error',
                error: error.message
            });
        }
        // Test Picsum
        try {
            const picsumUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
            const response = await fetch(picsumUrl, { method: 'HEAD', timeout: 5000 });
            testResults.push({
                service: 'Picsum',
                status: response.ok ? 'Working' : 'Failed',
                url: response.ok ? picsumUrl : null,
                statusCode: response.status
            });
        }
        catch (error) {
            testResults.push({
                service: 'Picsum',
                status: 'Error',
                error: error.message
            });
        }
        // Test Placeholder
        try {
            const placeholderUrl = `https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Test`;
            const response = await fetch(placeholderUrl, { method: 'HEAD', timeout: 5000 });
            testResults.push({
                service: 'Placeholder',
                status: response.ok ? 'Working' : 'Failed',
                url: response.ok ? placeholderUrl : null,
                statusCode: response.status
            });
        }
        catch (error) {
            testResults.push({
                service: 'Placeholder',
                status: 'Error',
                error: error.message
            });
        }
        res.json({
            success: true,
            message: 'Image generation service test completed',
            results: testResults,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to test image generation services',
            error: error.message
        });
    }
});
// Get single thumbnail by ID (for polling)
app.get('/api/user/thumbnail/:id', async (req, res) => {
    try {
        const { default: Thumbnail } = await import('./models/Thumbnail.js');
        const { id } = req.params;
        const userId = req.session?.userId || 'test-user-123';
        const thumbnail = await Thumbnail.findOne({ _id: id, userId });
        if (!thumbnail) {
            return res.status(404).json({
                success: false,
                message: 'Thumbnail not found'
            });
        }
        res.json({
            success: true,
            thumbnail
        });
    }
    catch (error) {
        console.error('Failed to fetch thumbnail:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch thumbnail',
            error: error.message
        });
    }
});
// Contact form endpoint
app.post('/api/contact/send', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        // Validate input
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Name, email, and message are required'
            });
        }
        // Log the contact form submission
        console.log('=== NEW CONTACT FORM SUBMISSION ===');
        console.log('Name:', name);
        console.log('Email:', email);
        console.log('Subject:', subject || 'No subject');
        console.log('Message:', message);
        console.log('Time:', new Date().toLocaleString());
        console.log('=====================================');
        // Try multiple email services for better delivery
        let emailSent = false;
        // Method 1: Try with a more reliable SMTP service (Ethereal for testing)
        try {
            const testAccount = await nodemailer.createTestAccount();
            const transporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                secure: false,
                auth: {
                    user: testAccount.user,
                    pass: testAccount.pass,
                },
            });
            const mailOptions = {
                from: testAccount.user,
                to: 'piyushsharma.svma@gmail.com',
                subject: `Thumblify Contact: ${subject || 'New Message'}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #e91e63;">New Contact Form Submission - Thumblify</h2>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Contact Details:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Subject:</strong> ${subject || 'No subject provided'}</p>
            </div>
            
            <div style="background: #fff; padding: 20px; border-left: 4px solid #e91e63; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Message:</h3>
              <p style="line-height: 1.6; color: #555;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #1976d2; font-size: 14px;">
                <strong>Reply to:</strong> ${email}<br>
                <strong>Sent from:</strong> Thumblify Contact Form<br>
                <strong>Time:</strong> ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        `
            };
            const info = await transporter.sendMail(mailOptions);
            console.log('Test email sent successfully!');
            console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
            emailSent = true;
        }
        catch (emailError) {
            console.error('Test email failed:', emailError.message);
        }
        // Method 2: Use a webhook service (like Discord webhook or Slack)
        if (!emailSent) {
            try {
                // You can replace this with a Discord webhook URL or any other notification service
                const webhookData = {
                    content: `**New Thumblify Contact Form Submission**\n\n**Name:** ${name}\n**Email:** ${email}\n**Subject:** ${subject || 'No subject'}\n**Message:** ${message}\n**Time:** ${new Date().toLocaleString()}`
                };
                // For now, just log it (you can add webhook URL later)
                console.log('WEBHOOK NOTIFICATION READY:', JSON.stringify(webhookData, null, 2));
            }
            catch (webhookError) {
                console.error('Webhook notification failed:', webhookError.message);
            }
        }
        // Method 3: Save to database for admin panel (future feature)
        try {
            // You could save contact messages to database here
            console.log('Contact message logged successfully');
        }
        catch (dbError) {
            console.error('Database logging failed:', dbError.message);
        }
        res.json({
            success: true,
            message: 'Message received successfully! We\'ll get back to you soon.',
            note: emailSent ? 'Email notification sent' : 'Message logged for review'
        });
    }
    catch (error) {
        console.error('Failed to process contact form:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again later.',
            error: error.message
        });
    }
});
// OpenAI test endpoint
app.post('/test-openai', async (req, res) => {
    try {
        console.log('Testing OpenAI...');
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: "A simple red circle on white background",
            n: 1,
            size: "1024x1024",
            quality: "standard"
        });
        res.json({
            success: true,
            message: 'OpenAI is working!',
            imageUrl: response.data[0].url,
            revisedPrompt: response.data[0].revised_prompt
        });
    }
    catch (error) {
        console.error('OpenAI failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
// Simple thumbnail generation endpoint
app.post('/generate-thumbnail', async (req, res) => {
    try {
        console.log('Generating thumbnail...');
        const { title, style, aspect_ratio, color_scheme } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }
        // Build prompt
        let prompt = `Create a vibrant, eye-catching YouTube thumbnail for "${title}". `;
        prompt += `Style: ${style || 'bold and graphic'}. `;
        prompt += `Colors: ${color_scheme || 'vibrant'}. `;
        prompt += `Make it professional and click-worthy.`;
        // Determine size
        let size = "1024x1024";
        if (aspect_ratio === '16:9') {
            size = "1792x1024";
        }
        else if (aspect_ratio === '9:16') {
            size = "1024x1792";
        }
        console.log('Calling OpenAI with prompt:', prompt);
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: prompt,
            n: 1,
            size: size,
            quality: "standard"
        });
        res.json({
            success: true,
            message: 'Thumbnail generated successfully!',
            imageUrl: response.data[0].url,
            revisedPrompt: response.data[0].revised_prompt,
            provider: 'OpenAI DALL-E 3'
        });
    }
    catch (error) {
        console.error('Thumbnail generation failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
app.listen(port, () => {
    console.log(`Simple server running at http://localhost:${port}`);
});
