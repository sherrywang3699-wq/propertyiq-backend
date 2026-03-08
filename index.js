const express = require('express');
const cors = require('cors');
const Stripe = require('stripe');
const Anthropic = require('@anthropic-ai/sdk').default;
require('dotenv').config();

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());

console.log('🚀 PropertyIQ Backend Starting...');
console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY ? 'OK ✅' : 'MISSING ❌');
console.log('Anthropic Key:', process.env.ANTHROPIC_API_KEY ? 'OK ✅' : 'MISSING ❌');

const PRICING = {
  residential: { USD: 999, display: '$9.99' },
  commercial: { USD: 2999, display: '$29.99' }
};

app.post('/api/create-checkout', async (req, res) => {
  try {
    const { type, address, email, promoCode } = req.body;
    
    if (promoCode && (promoCode.toUpperCase() === 'TEST2025' || promoCode.toUpperCase() === 'ADMIN')) {
      return res.json({ 
        url: `https://propertyiq-ai.vercel.app//success?address=...&test=true${encodeURIComponent(address)}&type=${type}&email=${encodeURIComponent(email || '')}`
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { 
            name: `PropertyIQ ${type === 'residential' ? 'Property' : 'Business'} Analysis`, 
            description: address 
          },
          unit_amount: PRICING[type].USD,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `https://propertyiq-ai.vercel.app/?success=true&session_id={CHECKOUT_SESSION_ID}&address=${encodeURIComponent(address)}&type=${type}`,
      cancel_url: `https://propertyiq-ai.vercel.app/`,
      metadata: { address, type }
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { query } = req.body;
    console.log('📝 Generating report for:', query);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Write a concise 800-word business location analysis for: ${query}\n\nInclude: location overview, market assessment, competition, financial outlook, risks, recommendation.`
      }]
    });
    
    const reportText = message.content[0].text;
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PropertyIQ_${Date.now()}.pdf"`);
      res.send(pdfBuffer);
    });
    
    doc.fontSize(20).font('Helvetica-Bold').text('PropertyIQ Analysis', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica').text(query, { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(new Date().toLocaleDateString(), { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica').text(reportText, { align: 'justify' });
    doc.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    api_key_present: !!process.env.ANTHROPIC_API_KEY, 
    stripe_key_present: !!process.env.STRIPE_SECRET_KEY 
  });
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
