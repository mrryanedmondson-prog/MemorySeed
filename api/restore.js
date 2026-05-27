const fetch = require('node-fetch');

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-hf-api-key');
        return res.status(200).end();
    }

    try {
        const { base64Image } = req.body;
        const userApiKey = req.headers['x-hf-api-key'];

        if (!userApiKey) return res.status(400).json({ error: "Missing x-hf-api-key header" });
        if (!base64Image) return res.status(400).json({ error: "Missing base64Image payload" });
        
        const buffer = Buffer.from(base64Image.split(',')[1], 'base64');

        const hfResponse = await fetch('https://api-inference.huggingface.co/models/ai-forever/Real-ESRGAN', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userApiKey}`,
                'Content-Type': 'application/octet-stream'
            },
            body: buffer
        });

        if (!hfResponse.ok) {
            const errLog = await hfResponse.text();
            throw new Error(`HF Error: ${errLog}`);
        }

        const imageBuffer = await hfResponse.buffer();
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(imageBuffer);

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
