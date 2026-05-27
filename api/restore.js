const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();

// 1. Allow your Tiiny Host domain to access this backend safely
app.use(cors({ origin: 'https://memoryseed.tiiny.site' }));
app.use(express.json({ limit: '50mb' }));

app.post('/api/restore', async (req, res) => {
    try {
        const { base64Image } = req.body;
        
        // 2. Extract the Hugging Face API key passed from the frontend request headers
        const userApiKey = req.headers['x-hf-api-key'];

        if (!userApiKey) {
            return res.status(400).json({ error: "Missing Hugging Face API token in request headers ('x-hf-api-key')." });
        }

        if (!base64Image) {
            return res.status(400).json({ error: "Missing payload string 'base64Image' in request body." });
        }
        
        // Convert Base64 string from browser into a binary buffer
        const buffer = Buffer.from(base64Image.split(',')[1], 'base64');

        // 3. Forward the buffer to Hugging Face using the dynamically provided token
        const hfResponse = await fetch('https://api-inference.huggingface.co/models/ai-forever/Real-ESRGAN', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userApiKey}`,
                'Content-Type': 'application/octet-stream'
            },
            body: buffer
        });

        if (!hfResponse.ok) {
            const errorTrace = await hfResponse.text();
            throw new Error(`Hugging Face API Error (${hfResponse.status}): ${errorTrace}`);
        }

        const imageBuffer = await hfResponse.buffer();
        
        // Send the restored image binary back to the browser cleanly
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(imageBuffer);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running securely on port ${PORT}`));
