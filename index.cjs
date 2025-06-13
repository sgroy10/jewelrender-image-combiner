const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { createCanvas, loadImage } = require('canvas');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

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

app.get('/', (req, res) => {
  res.send('Image Combiner API is running.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
