module.exports = async (req, res) => {
    // 1. Setup Global Permissive Handshake Headers for Tiiny Host
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-hf-api-key');

    // Handle standard browser preflight checks instantly
    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        return res.end();
    }

    if (req.method !== 'POST') {
        res.statusCode = 405;
        return res.end(JSON.stringify({ error: 'Method not allowed.' }));
    }

    try {
        // 2. Parse incoming body data safely
        let bodyStr = '';
        if (typeof req.body === 'object') {
            bodyStr = JSON.stringify(req.body);
        } else {
            bodyStr = req.body || '';
        }

        const parsedData = JSON.parse(bodyStr);
        const base64Image = parsedData.base64Image;
        const userApiKey = req.headers['x-hf-api-key'];

        if (!userApiKey) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Missing token ('x-hf-api-key')." }));
        }
        if (!base64Image) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "Missing image string parameter." }));
        }

        // Clean up the base64 prefix mapping boundary
        const rawBase64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
        const imgBinaryBuffer = Buffer.from(rawBase64Data, 'base64');

        // FIXED: Casting the Node Buffer into a clear Uint8Array so global fetch streams it perfectly
        const standardizedBinaryStream = new Uint8Array(imgBinaryBuffer);

        // 3. Fire the request using Node's native fetch
        const hfEndpoint = 'https://api-inference.huggingface.co/models/ai-forever/real-esrgan';
        
        const hfResponse = await fetch(hfEndpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userApiKey}`,
                'Content-Type': 'application/octet-stream'
            },
            body: standardizedBinaryStream // Native typed arrays stream flawlessly
        });

        // 4. Forward the response back to your website frontend
        if (!hfResponse.ok) {
            const errorTrace = await hfResponse.text();
            res.statusCode = hfResponse.status;
            return res.end(JSON.stringify({ error: `Hugging Face Engine rejected image processing: ${errorTrace}` }));
        }

        const responseArrayBuffer = await hfResponse.arrayBuffer();
        const finalImageBuffer = Buffer.from(responseArrayBuffer);

        res.statusCode = 200;
        res.setHeader('Content-Type', 'image/jpeg');
        return res.end(finalImageBuffer);

    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: `Internal Proxy processing failure: ${error.message}` }));
    }
};
