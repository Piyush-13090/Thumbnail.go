// Simple test script for Hugging Face API integration
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/thumbnail';

async function testHuggingFaceAPI() {
  console.log('🧪 Testing Hugging Face API Integration...\n');

  try {
    // Test 1: Check API connection and token
    console.log('1. Testing Hugging Face API connection...');
    const connectionTest = await axios.get(`${BASE_URL}/test-huggingface`);
    console.log('✅ Connection test:', connectionTest.data.message);
    console.log('   Token valid:', connectionTest.data.token_valid);
  } catch (error) {
    console.log('❌ Connection test failed:', error.response?.data?.message || error.message);
    if (error.response?.data?.token_valid === false) {
      console.log('   ⚠️  Check your HUGGINGFACE_API_TOKEN in .env file');
    }
  }

  try {
    // Test 2: Get available models
    console.log('\n2. Getting available Hugging Face models...');
    const modelsResponse = await axios.get(`${BASE_URL}/huggingface-models`);
    console.log('✅ Available models:', modelsResponse.data.models.length);
    modelsResponse.data.models.forEach(model => {
      console.log(`   - ${model.displayName} (${model.id})`);
    });
  } catch (error) {
    console.log('❌ Models test failed:', error.response?.data?.message || error.message);
  }

  try {
    // Test 3: Generate a simple image using Hugging Face API
    console.log('\n3. Generating test image with Hugging Face API...');
    const generateResponse = await axios.post(`${BASE_URL}/generate-huggingface`, {
      prompt: 'A beautiful sunset over mountains, digital art style',
      model: 'flux-schnell'
    });
    
    if (generateResponse.data.success) {
      console.log('✅ Image generated successfully with Hugging Face API!');
      console.log('   - Provider:', generateResponse.data.provider);
      console.log('   - Model:', generateResponse.data.model);
      console.log('   - Thumbnail ID:', generateResponse.data.thumbnailId);
      console.log('   - Image URL length:', generateResponse.data.imageUrl.length, 'characters');
    }
  } catch (error) {
    console.log('❌ Image generation failed:', error.response?.data?.message || error.message);
    if (error.response?.status === 503) {
      console.log('   ⚠️  Model might be loading, try again in a few moments');
    }
  }

  console.log('\n🎉 Hugging Face API integration test completed!');
  console.log('\n📝 Usage:');
  console.log('POST /api/thumbnail/generate-huggingface');
  console.log('Body: { "prompt": "your prompt here", "model": "flux-schnell" }');
}

// Run the test
testHuggingFaceAPI().catch(console.error);