const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function test() {
  console.log('Testing Claude API...');
  console.log('API Key:', process.env.ANTHROPIC_API_KEY?.substring(0, 20) + '...');
  
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{
        role: 'user',
        content: 'Say hello in 5 words'
      }]
    });
    
    console.log('✅ SUCCESS!');
    console.log('Response:', message.content[0].text);
  } catch (error) {
    console.error('❌ FAILED!');
    console.error('Error:', error.message);
  }
}

test();
