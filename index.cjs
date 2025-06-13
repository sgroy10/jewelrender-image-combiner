const express = require('express');
const cors = require('cors');
const { createCanvas, loadImage } = require('canvas');
const fetch = require('node-fetch');

const app = express();

// Enable CORS
app.use(cors({
  origin: ['https://jewelrender.in', 'http://localhost:3000', 'http://localhost:5173', 'https://jewelrender.netlify.app'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'JewelRender Image Combiner API',
    endpoint: '/api/combine-images'
  });
});

// Combine images endpoint
app.post('/api/combine-images', async (req, res) => {
  try {
    const { sketchUrl, referenceUrl } = req.body;
    
    if (!sketchUrl || !referenceUrl) {
      return res.status(400).json({ 
        error: 'Both sketchUrl and referenceUrl are required' 
      });
    }

    console.log('Combining images...');

    // Fetch both images
    const [sketchResponse, referenceResponse] = await Promise.all([
      fetch(sketchUrl),
      fetch(referenceUrl)
    ]);

    const [sketchBuffer, referenceBuffer] = await Promise.all([
      sketchResponse.buffer(),
      referenceResponse.buffer()
    ]);

    // Load images
    const [sketchImg, referenceImg] = await Promise.all([
      loadImage(sketchBuffer),
      loadImage(referenceBuffer)
    ]);

    // Create canvas
    const canvasWidth = sketchImg.width + referenceImg.width + 60;
    const canvasHeight = Math.max(sketchImg.height, referenceImg.height) + 60;
    
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');

    // Draw white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add labels
    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px Arial';
    ctx.fillText('Jewelry Design', 20, 35);
    ctx.fillText('Rose Cut Diamond Reference', sketchImg.width + 80, 35);

    // Draw images
    ctx.drawImage(sketchImg, 0, 50);
    ctx.drawImage(referenceImg, sketchImg.width + 60, 50);

    // Convert to base64
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    res.json({ 
      success: true, 
      combinedImageUrl: dataUrl
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to combine images', 
      message: error.message 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});