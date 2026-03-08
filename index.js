require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY;
const anthropic = new Anthropic({ apiKey: API_KEY });

console.log('🚀 PropertyIQ Backend Starting...');
console.log('API Key:', API_KEY ? 'OK ✅' : 'MISSING ❌');
console.log('Stripe Key:', process.env.STRIPE_SECRET_KEY ? 'OK ✅' : 'MISSING ❌');
console.log('Port:', PORT);

app.post('/api/create-checkout', async (req, res) => {
  try {
    const { reportType, query, amount, promoCode } = req.body;
    
    let finalAmount = amount;
    if (promoCode === 'TEST2025' || promoCode === 'ADMIN') {
      finalAmount = 0;
    }
    
    if (finalAmount === 0) {
      return res.json({ 
        url: `https://propertyiq-ai.vercel.app/generate?query=${encodeURIComponent(query)}&type=${reportType}&test=true`
      });
    }
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: reportType === 'property' ? 'Property Analysis Report' : 'Business Location Analysis',
            description: `AI-powered analysis for: ${query}`
          },
          unit_amount: finalAmount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `https://propertyiq-ai.vercel.app/success?session_id={CHECKOUT_SESSION_ID}&query=${encodeURIComponent(query)}&type=${reportType}`,
      cancel_url: 'https://propertyiq-ai.vercel.app?canceled=true',
      metadata: { query, reportType }
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { query } = req.body;
    console.log('\n📝 New request:', query);
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Write a concise 800-word business location analysis for: ${query}\n\nInclude: location overview, market assessment, competition, financial outlook, risks, recommendation.`
      }]
    });
    
    const reportText = message.content[0].text;
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PropertyIQ_Report_${Date.now()}.pdf"`);
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
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    api_key_present: !!API_KEY, 
    stripe_key_present: !!process.env.STRIPE_SECRET_KEY 
  });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}\n`);
});
