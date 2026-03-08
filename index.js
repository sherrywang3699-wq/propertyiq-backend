require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const PDFDocument = require('pdfkit');

const app = express();
const PORT = process.env.PORT || 5002;

app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY || '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';
const anthropic = new Anthropic({ apiKey: API_KEY });

console.log('🚀 PropertyIQ Backend Starting...');
console.log('API Key:', API_KEY ? 'OK ✅' : 'MISSING ❌');
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
        content: `Write a concise 800-word business location analysis for: ${query}\n\nInclude: location overview, market assessment, competition, financial outlook, risks, recommendation.`
      }]
    });
    
    const reportText = message.content[0].text;
    console.log('✅ Report generated:', reportText.length, 'chars');
    
    console.log('Creating PDF in memory...');
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log('✅ PDF created');
      console.log('⏱️  Total time:', totalTime + 's\n');
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="PropertyIQ_Report_${Date.now()}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
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
  res.json({ status: 'ok', api_key_present: !!API_KEY });
});

app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}\n`);
});
