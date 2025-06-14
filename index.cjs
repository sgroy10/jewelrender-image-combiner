const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createCanvas, loadImage, registerFont } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Original endpoint for overlay (keep this for backwards compatibility)
app.post('/api/combine-images', async (req, res) => {
  try {
    const { sketchUrl, referenceUrl } = req.body;

    if (!sketchUrl || !referenceUrl) {
      return res.status(400).json({ success: false, error: 'Missing URLs' });
    }

    const sketchImage = await loadImage(sketchUrl);
    const referenceImage = await loadImage(referenceUrl);

    const width = sketchImage.width;
    const height = sketchImage.height;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw sketch image
    ctx.drawImage(sketchImage, 0, 0, width, height);

    // Overlay reference image at 50% opacity
    ctx.globalAlpha = 0.5;
    ctx.drawImage(referenceImage, 0, 0, width, height);
    ctx.globalAlpha = 1.0;

    const combinedImageBuffer = canvas.toBuffer('image/jpeg');

    const base64Image = `data:image/jpeg;base64,${combinedImageBuffer.toString('base64')}`;

    res.status(200).json({
      success: true,
      combinedImage: base64Image
    });

  } catch (err) {
    console.error('Error processing image:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// NEW endpoint for side-by-side stitching with labels
app.post('/api/stitch-images', async (req, res) => {
  try {
    const { sketchUrl, referenceUrl, labels } = req.body;
    
    if (!sketchUrl || !referenceUrl) {
      return res.status(400).json({ 
        success: false, 
        error: 'Both sketchUrl and referenceUrl are required' 
      });
    }

    console.log('Loading images...');
    
    // Load both images
    const sketchImage = await loadImage(sketchUrl);
    const referenceImage = await loadImage(referenceUrl);

    // Resize images to same height (600px) while maintaining aspect ratio
    const targetHeight = 600;
    const sketchWidth = Math.round((sketchImage.width / sketchImage.height) * targetHeight);
    const referenceWidth = Math.round((referenceImage.width / referenceImage.height) * targetHeight);

    // Create canvas for combined image
    const gap = 20;
    const labelHeight = 40;
    const totalWidth = sketchWidth + referenceWidth + gap;
    const totalHeight = targetHeight + labelHeight;
    
    const canvas = createCanvas(totalWidth, totalHeight);
    const ctx = canvas.getContext('2d');

    // Fill white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Draw images side by side
    ctx.drawImage(sketchImage, 0, labelHeight, sketchWidth, targetHeight);
    ctx.drawImage(referenceImage, sketchWidth + gap, labelHeight, referenceWidth, targetHeight);

    // Add text labels
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    
    // Label for sketch
    ctx.fillText(
      labels?.sketch || 'Sketch to render', 
      sketchWidth / 2, 
      25
    );
    
    // Label for reference
    ctx.fillText(
      labels?.reference || 'Use rose-cut diamonds like these', 
      sketchWidth + gap + (referenceWidth / 2), 
      25
    );

    // Draw a separator line
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sketchWidth + (gap / 2), labelHeight);
    ctx.lineTo(sketchWidth + (gap / 2), totalHeight);
    ctx.stroke();

    // Convert to base64
    const combinedImageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    const base64Image = `data:image/jpeg;base64,${combinedImageBuffer.toString('base64')}`;

    console.log('Stitching complete!');

    res.status(200).json({
      success: true,
      stitchedImage: base64Image
    });

  } catch (err) {
    console.error('Stitching error:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Image combiner API is running',
    endpoints: ['/api/combine-images', '/api/stitch-images']
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'JewelRender Image Combiner API',
    endpoints: ['/api/combine-images', '/api/stitch-images']
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});