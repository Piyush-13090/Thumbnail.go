import OpenAI from 'openai';
import 'dotenv/config';

if (!process.env.OPENAI_API_KEY) {
  console.warn("Warning: OPENAI_API_KEY is not set in environment variables.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default openai;