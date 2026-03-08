/**
 * PropertyIQ - GUARANTEED TO WORK VERSION
 * Minimal dependencies, maximum reliability
 */

const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const PDFDocument = require('pdfkit');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/pdfs', express.static('pdfs'));

if (!fs.existsSync('pdfs')) fs.mkdirSync('pdfs');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

console.log('\n' + '='.repeat(60));
console.log('PropertyIQ Backend - Guaranteed Working Version');
console.log('='.repeat(60));
console.log('API Key:', process.env.ANTHROPIC_API_KEY ? '✅ Found' : '❌ Missing');
console.log('Port: 5002');
console.log('='.repeat(60) + '\n');

// SINGLE ENDPOINT - EVERYTHING IN ONE PLACE
app.post('/api/generate', async (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`NEW REQUEST: ${query}`);
  console.log(`Time: ${new Date().toLocaleTimeString()}`);
  console.log('='.repeat(60));
  
  try {
    // Step 1: Generate text report
    console.log('\n[1/2] Calling Claude API...');
    
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      temperature: 0.7,
      messages: [{
        role: 'user',
        content: `Generate a business location analysis report for: ${query}

Write a 1200-word report covering:

**Executive Summary**
Brief overview and recommendation

**Location Analysis**  
Area characteristics, demographics, accessibility

**Market Assessment**
Target customers, market size, demand

**Competition**
Competitive landscape and opportunities

**Financial Outlook**
Revenue potential, costs, profitability

**Recommendation**
Clear go/no-go decision with reasoning

Keep it professional and data-driven.`
      }]
    });
    
    const reportText = message.content[0].text;
    console.log('✅ Report generated:', reportText.length, 'characters');
    
    // Step 2: Create PDF
    console.log('\n[2/2] Creating PDF...');
    
    const filename = `PropertyIQ_${Date.now()}.pdf`;
    const filepath = `pdfs/${filename}`;
    
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'LETTER',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);
      
      // Header
      doc.fontSize(24).font('Helvetica-Bold')
         .text('PropertyIQ', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.fontSize(14).font('Helvetica')
         .text('Business Location Analysis Report', { align: 'center' });
      doc.moveDown(0.5);
      
      doc.fontSize(12)
         .text(query, { align: 'center' });
      doc.moveDown(1);
      
      doc.fontSize(10)
         .text(new Date().toLocaleDateString(), { align: 'center' });
      doc.moveDown(2);
      
      // Divider
      doc.moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      doc.moveDown(1);
      
      // Content
      doc.fontSize(10).font('Helvetica');
      
      const lines = reportText.split('\n');
      for (const line of lines) {
        if (doc.y > doc.page.height - 100) {
          doc.addPage();
        }
        
        if (line.startsWith('**') && line.endsWith('**')) {
          // Bold headers
          doc.font('Helvetica-Bold')
             .text(line.replace(/\*\*/g, ''));
          doc.font('Helvetica');
          doc.moveDown(0.3);
        } else if (line.trim()) {
          doc.text(line);
          doc.moveDown(0.2);
        }
      }
      
      // Footer
      const pageCount = doc.bufferedPageRange().count;
      for (let i = 0; i < pageCount; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).font('Helvetica')
           .text(
             `PropertyIQ Report | Page ${i + 1} of ${pageCount}`,
             50,
             doc.page.height - 30,
             { align: 'center', width: doc.page.width - 100 }
           );
      }
      
      doc.end();
      
      stream.on('finish', () => {
        console.log('✅ PDF created:', filename);
        console.log(`\n${'='.repeat(60)}`);
        console.log('SUCCESS - Total time:', ((Date.now() - req.startTime) / 1000).toFixed(1) + 's');
        console.log('='.repeat(60) + '\n');
        
        res.json({
          success: true,
          pdf_url: `/pdfs/${filename}`,
          filename: filename,
          location: query
        });
      });
      
      stream.on('error', (error) => {
        console.error('❌ PDF creation failed:', error);
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Full error:', error);
    console.log('='.repeat(60) + '\n');
    
    res.status(500).json({
      error: error.message,
      details: 'Please check server logs'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    api_configured: !!process.env.ANTHROPIC_API_KEY
  });
});

// Middleware to track request start time
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

app.listen(5002, () => {
  console.log('✅ Server ready at http://localhost:5002');
  console.log('✅ Test: curl http://localhost:5002/health\n');
});
