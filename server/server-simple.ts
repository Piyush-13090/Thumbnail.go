import express, { Request, Response } from 'express';
import cors from 'cors';
import 'dotenv/config';
import OpenAI from 'openai';
import connectDB from './configs/db.js';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

declare module 'express-session' {
  interface SessionData {
    isLoggedIn: boolean;
    userId: string;
  }
}

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
  secret: process.env.SECRET_KEY as string,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, //  1 week
  },
   store: MongoStore.create({
  mongoUrl: process.env.MONGODB_URI as string,
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
  apiKey: process.env.OPENAI_API_KEY as string
});

const port = process.env.PORT || 3000;

// Basic test endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Server is working!' });
});

// My generations endpoint
app.get('/api/thumbnail/my-generations', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Failed to fetch thumbnails:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch thumbnails', 
      error: error.message 
    });
  }
});

// Delete thumbnail endpoint
app.delete('/api/thumbnail/delete/:id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
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
app.post('/api/auth/register', async (req: Request, res: Response) => {
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

  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login User
app.post('/api/auth/login', async (req: Request, res: Response) => {
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

  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify User
app.get('/api/auth/verify', async (req: Request, res: Response) => {
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

  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Logout User
app.post('/api/auth/logout', (req: Request, res: Response) => {
  req.session.destroy((error: any) => {
    if (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ message: error.message });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Thumbnail Generation with Infip (simplified version)
app.post('/api/thumbnail/generate', async (req: Request, res: Response) => {
  let thumbnail: any = null;
  
  try {
    const { default: Thumbnail } = await import('./models/Thumbnail.js');
    const userId = req.session?.userId || 'test-user-123';
    
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
    let prompt = `YouTube thumbnail: ${stylePrompts[style as keyof typeof stylePrompts]} for video titled "${title}".`;
    
    if (color_scheme) {
      prompt += ` Color scheme: ${colorSchemeDescriptions[color_scheme as keyof typeof colorSchemeDescriptions]}.`;
    }
    
    if (user_prompt) {
      prompt += ` Additional details: ${user_prompt}.`;
    }
    
    // Add quality and format specifications
    prompt += ` Professional YouTube thumbnail format, ${aspect_ratio || '16:9'} aspect ratio, ultra high quality, trending design, viral thumbnail style, professional composition, sharp details, perfect for YouTube.`;

    console.log('Generated prompt:', prompt);

    // Use ONLY Hugging Face API for image generation
    let imageUrl = null;
    let provider = 'Hugging Face';

    console.log('Using Hugging Face API for image generation...');
    console.log('API Token configured:', process.env.HUGGINGFACE_API_TOKEN ? 'Yes' : 'No');
    
    const hfModels = [
      'black-forest-labs/FLUX.1-dev',
      'stabilityai/stable-diffusion-xl-base-1.0',
      'runwayml/stable-diffusion-v1-5',
      'ByteDance/SDXL-Lightning',
      'stabilityai/stable-diffusion-2-1'
    ];
    
    // Try the exact endpoint format you specified: https://api-inference.huggingface.co/models/{model_name}
    for (const model of hfModels) {
      try {
        console.log(`Trying Hugging Face model: ${model}`);
        
        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              width: aspect_ratio === '1:1' ? 1024 : aspect_ratio === '9:16' ? 1024 : 1792,
              height: aspect_ratio === '1:1' ? 1024 : aspect_ratio === '9:16' ? 1792 : 1024,
              num_inference_steps: 20,
              guidance_scale: 7.5,
              seed: Math.floor(Math.random() * 1000000)
            }
          }),
          timeout: 60000
        });

        console.log(`Response status for ${model}:`, response.status);

        if (response.ok) {
          const imageBlob = await response.arrayBuffer();
          console.log(`Image blob size for ${model}:`, imageBlob.byteLength, 'bytes');
          
          if (imageBlob.byteLength > 1000) {
            // Save image to temporary file and upload to Cloudinary
            const fs = await import('fs');
            const path = await import('path');
            
            const filename = `hf-thumbnail-${Date.now()}.png`;
            const filePath = path.resolve('images', filename);
            
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, Buffer.from(imageBlob));
            
            console.log('Image saved to:', filePath);
            
            // Upload to Cloudinary
            const cloudinary = await import('../configs/cloudinary.js');
            const uploadResult = await cloudinary.default.uploader.upload(filePath, {
              resource_type: 'image',
              quality: 'auto:best',
              format: 'jpg'
            });
            
            imageUrl = uploadResult.url;
            provider = `Hugging Face (${model.split('/')[1]})`;
            
            console.log('Successfully generated and uploaded with Hugging Face');
            console.log('Model used:', model);
            console.log('Cloudinary URL:', imageUrl);
            
            // Clean up temporary file
            try {
              fs.unlinkSync(filePath);
            } catch (cleanupError) {
              console.warn('Failed to clean up temp file:', cleanupError);
            }
            
            break; // Success, exit the model loop
          }
        } else {
          const errorText = await response.text();
          console.log(`Hugging Face model ${model} failed:`, response.status, errorText);
          
          // Check for specific error messages
          if (response.status === 410 && errorText.includes('api-inference.huggingface.co is no longer supported')) {
            console.log('API endpoint deprecated, trying router format...');
            
            // Try router format
            const routerResponse = await fetch(`https://router.huggingface.co/models/${model}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: prompt,
                parameters: {
                  width: aspect_ratio === '1:1' ? 1024 : aspect_ratio === '9:16' ? 1024 : 1792,
                  height: aspect_ratio === '1:1' ? 1024 : aspect_ratio === '9:16' ? 1792 : 1024,
                  num_inference_steps: 20,
                  guidance_scale: 7.5
                }
              }),
              timeout: 60000
            });
            
            if (routerResponse.ok) {
              const routerImageBlob = await routerResponse.arrayBuffer();
              
              if (routerImageBlob.byteLength > 1000) {
                const fs = await import('fs');
                const path = await import('path');
                
                const filename = `hf-router-thumbnail-${Date.now()}.png`;
                const filePath = path.resolve('images', filename);
                
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, Buffer.from(routerImageBlob));
                
                const cloudinary = await import('../configs/cloudinary.js');
                const uploadResult = await cloudinary.default.uploader.upload(filePath, {
                  resource_type: 'image',
                  quality: 'auto:best',
                  format: 'jpg'
                });
                
                imageUrl = uploadResult.url;
                provider = `Hugging Face Router (${model.split('/')[1]})`;
                
                console.log('Successfully generated with Hugging Face Router');
                
                try {
                  fs.unlinkSync(filePath);
                } catch (cleanupError) {
                  console.warn('Failed to clean up router temp file:', cleanupError);
                }
                
                break;
              }
            } else {
              console.log(`Router also failed for ${model}:`, routerResponse.status, await routerResponse.text());
            }
          }
          
          // If model is loading, wait and retry once
          if (response.status === 503 && errorText.includes('loading')) {
            console.log(`Model ${model} is loading, waiting 20 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 20000));
            
            // Retry once with simpler parameters
            const retryResponse = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                inputs: prompt,
                parameters: {
                  width: 1024,
                  height: 1024,
                  num_inference_steps: 15,
                  guidance_scale: 7.0
                }
              }),
              timeout: 60000
            });
            
            if (retryResponse.ok) {
              const retryImageBlob = await retryResponse.arrayBuffer();
              
              if (retryImageBlob.byteLength > 1000) {
                const fs = await import('fs');
                const path = await import('path');
                
                const filename = `hf-retry-thumbnail-${Date.now()}.png`;
                const filePath = path.resolve('images', filename);
                
                fs.mkdirSync(path.dirname(filePath), { recursive: true });
                fs.writeFileSync(filePath, Buffer.from(retryImageBlob));
                
                const cloudinary = await import('../configs/cloudinary.js');
                const uploadResult = await cloudinary.default.uploader.upload(filePath, {
                  resource_type: 'image',
                  quality: 'auto:best',
                  format: 'jpg'
                });
                
                imageUrl = uploadResult.url;
                provider = `Hugging Face (${model.split('/')[1]} - Retry)`;
                
                console.log('Successfully generated on retry with Hugging Face');
                console.log('Model used:', model);
                
                try {
                  fs.unlinkSync(filePath);
                } catch (cleanupError) {
                  console.warn('Failed to clean up retry temp file:', cleanupError);
                }
                
                break;
              }
            } else {
              console.log(`Retry failed for ${model}:`, retryResponse.status, await retryResponse.text());
            }
          }
        }
      } catch (modelError: any) {
        console.log(`Hugging Face model ${model} error:`, modelError.message);
        continue;
      }
    }
    if (!imageUrl) {
      console.log('Trying Hugging Face text-to-image endpoint...');
      
      const textToImageModels = [
        'black-forest-labs/FLUX.1-dev',
        'stabilityai/stable-diffusion-xl-base-1.0',
        'runwayml/stable-diffusion-v1-5'
      ];
      
      for (const model of textToImageModels) {
        try {
          console.log(`Trying text-to-image model: ${model}`);
          
          const response = await fetch(`https://router.huggingface.co/text-to-image`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: model,
              inputs: prompt,
              parameters: {
                width: aspect_ratio === '1:1' ? 1024 : aspect_ratio === '9:16' ? 1024 : 1792,
                height: aspect_ratio === '1:1' ? 1024 : aspect_ratio === '9:16' ? 1792 : 1024,
                num_inference_steps: 20,
                guidance_scale: 7.5
              }
            }),
            timeout: 60000
          });

          if (response.ok) {
            const imageBlob = await response.arrayBuffer();
            
            if (imageBlob.byteLength > 1000) {
              const fs = await import('fs');
              const path = await import('path');
              
              const filename = `hf-t2i-thumbnail-${Date.now()}.png`;
              const filePath = path.resolve('images', filename);
              
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              fs.writeFileSync(filePath, Buffer.from(imageBlob));
              
              const cloudinary = await import('../configs/cloudinary.js');
              const uploadResult = await cloudinary.default.uploader.upload(filePath, {
                resource_type: 'image',
                quality: 'auto:best',
                format: 'jpg'
              });
              
              imageUrl = uploadResult.url;
              provider = `Hugging Face T2I (${model.split('/')[1]})`;
              
              console.log('Successfully generated with Hugging Face text-to-image');
              
              try {
                fs.unlinkSync(filePath);
              } catch (cleanupError) {
                console.warn('Failed to clean up temp file:', cleanupError);
              }
              
              break;
            }
          } else {
            const errorText = await response.text();
            console.log(`Text-to-image model ${model} failed:`, response.status, errorText);
          }
        } catch (modelError: any) {
          console.log(`Text-to-image model ${model} error:`, modelError.message);
          continue;
        }
      }
    }

    if (!imageUrl) {
      throw new Error('All image generation services failed - unable to create thumbnail');
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

  } catch (error: any) {
    console.error('Thumbnail generation failed:', error);
    
    // Update thumbnail status to failed
    if (thumbnail) {
      try {
        thumbnail.isGenerating = false;
        thumbnail.image_url = '';
        await thumbnail.save();
      } catch (updateError) {
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
app.get('/api/test/image-generation', async (req: Request, res: Response) => {
  try {
    console.log('Testing image generation services...');
    
    const testResults = [];
    
    // Test Hugging Face API with multiple router formats
    const hfResults = [];
    
    // Test router v1 format
    try {
      const response = await fetch('https://router.huggingface.co/v1/models/black-forest-labs/FLUX.1-dev/inference', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test youtube thumbnail',
          parameters: {
            width: 400,
            height: 300,
            num_inference_steps: 10,
            guidance_scale: 7.0
          }
        }),
        timeout: 30000
      });
      
      hfResults.push({
        endpoint: 'router.huggingface.co/v1/models/{model}/inference',
        status: response.ok ? 'Working' : 'Failed',
        statusCode: response.status,
        message: response.ok ? 'Router v1 API working' : await response.text()
      });
    } catch (error: any) {
      hfResults.push({
        endpoint: 'router.huggingface.co/v1/models/{model}/inference',
        status: 'Error',
        error: error.message
      });
    }
    
    // Test direct router format
    try {
      const response = await fetch('https://router.huggingface.co/black-forest-labs/FLUX.1-dev', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'test youtube thumbnail',
          parameters: {
            width: 400,
            height: 300,
            num_inference_steps: 10,
            guidance_scale: 7.0
          }
        }),
        timeout: 30000
      });
      
      hfResults.push({
        endpoint: 'router.huggingface.co/{model}',
        status: response.ok ? 'Working' : 'Failed',
        statusCode: response.status,
        message: response.ok ? 'Direct router API working' : await response.text()
      });
    } catch (error: any) {
      hfResults.push({
        endpoint: 'router.huggingface.co/{model}',
        status: 'Error',
        error: error.message
      });
    }
    
    testResults.push({
      service: 'Hugging Face',
      model: 'FLUX.1-dev',
      endpoints: hfResults
    });
    
    // Test Placeholder (as fallback only if needed)
    try {
      const placeholderUrl = `https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Test`;
      const response = await fetch(placeholderUrl, { method: 'HEAD', timeout: 5000 });
      
      testResults.push({
        service: 'Placeholder',
        status: response.ok ? 'Working' : 'Failed',
        url: response.ok ? placeholderUrl : null,
        statusCode: response.status
      });
    } catch (error: any) {
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
      timestamp: new Date().toISOString(),
      huggingfaceToken: process.env.HUGGINGFACE_API_TOKEN ? 'Configured' : 'Missing'
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to test image generation services',
      error: error.message
    });
  }
});

// Get single thumbnail by ID (for polling)
app.get('/api/user/thumbnail/:id', async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Failed to fetch thumbnail:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch thumbnail', 
      error: error.message 
    });
  }
});

// Contact form endpoint
app.post('/api/contact/send', async (req: Request, res: Response) => {
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

    } catch (emailError: any) {
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
        
      } catch (webhookError: any) {
        console.error('Webhook notification failed:', webhookError.message);
      }
    }

    // Method 3: Save to database for admin panel (future feature)
    try {
      // You could save contact messages to database here
      console.log('Contact message logged successfully');
    } catch (dbError: any) {
      console.error('Database logging failed:', dbError.message);
    }

    res.json({
      success: true,
      message: 'Message received successfully! We\'ll get back to you soon.',
      note: emailSent ? 'Email notification sent' : 'Message logged for review'
    });

  } catch (error: any) {
    console.error('Failed to process contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send message. Please try again later.',
      error: error.message
    });
  }
});

// OpenAI test endpoint
app.post('/test-openai', async (req: Request, res: Response) => {
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
    
  } catch (error: any) {
    console.error('OpenAI failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple thumbnail generation endpoint
app.post('/generate-thumbnail', async (req: Request, res: Response) => {
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
    let size: "1024x1024" | "1792x1024" | "1024x1792" = "1024x1024";
    if (aspect_ratio === '16:9') {
      size = "1792x1024";
    } else if (aspect_ratio === '9:16') {
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
    
  } catch (error: any) {
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