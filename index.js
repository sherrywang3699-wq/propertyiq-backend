require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5002; // 🔥 使用Railway的PORT

app.use(cors());
app.use(express.json());
app.use('/pdfs', express.static('pdfs'));

if (!fs.existsSync('pdfs')) fs.mkdirSync('pdfs');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('🚀 PropertyIQ Backend Starting...');
console.log('API Key:', process.env.ANTHROPIC_API_KEY ? 'OK ✅' : 'MISSING ❌');
console.log('Port:', PORT);

app.post('/api/generate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query } = req.body;
    console.log('\n📝 New request:', query);
    
    console.log('Calling Claude API...');
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Write a concise 800-word business location analysis for: ${query}

Include: location overview, market assessment, competition, financial outlook, risks, recommendation.`
      }]
    });
    
    const reportText = message.content[0].text;
    console.log('✅ Report generated:', reportText.length, 'chars');
    
    console.log('Creating PDF...');
    const filename = `Report_${Date.now()}.pdf`;
    const filepath = path.join('pdfs', filename);
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    
    doc.pipe(stream);
    
    doc.fontSize(20).font('Helvetica-Bold')
       .text('PropertyIQ Analysis', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(12).font('Helvetica')
       .text(query, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10)
       .text(new Date().toLocaleDateString(), { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(10).font('Helvetica')
       .text(reportText, { align: 'justify' });
    
    doc.end();
    
    await new Promise(resolve => stream.on('finish', resolve));
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('✅ PDF created:', filename);
    console.log('⏱️  Total time:', totalTime + 's\n');
    
    res.json({
      success: true,
      pdf_url: `/pdfs/${filename}`,
      filename: filename,
      generation_time: totalTime + 's'
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', api_key_present: !!process.env.ANTHROPIC_API_KEY });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log('📍 Ready to receive requests\n');
});
