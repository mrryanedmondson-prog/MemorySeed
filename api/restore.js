const https = require('https');

module.exports = async (req, res) => {
    // Force Global Permissive Handshake Headers
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

        const rawBase64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
        const imgBinaryBuffer = Buffer.from(rawBase64Data, 'base64');

        // FIXED: Pointing to the unified api.huggingface.co infrastructure
        const hfOptions = {
            hostname: 'api.huggingface.co',
            port: 443,
            path: '/models/ai-forever/Real-ESRGAN',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userApiKey}`,
                'Content-Type': 'application/octet-stream',
                'Content-Length': imgBinaryBuffer.length
            }
        };

        const hfRequest = https.request(hfOptions, (hfResponse) => {
            let dataChunks = [];

            hfResponse.on('data', (chunk) => dataChunks.push(chunk));
            hfResponse.on('end', () => {
                const completeResponseBuffer = Buffer.concat(dataChunks);

                if (hfResponse.statusCode !== 200) {
                    res.statusCode = hfResponse.statusCode;
                    res.setHeader('Content-Type', 'application/json');
                    return res.end(JSON.stringify({ error: `HF Engine returned error context: ${completeResponseBuffer.toString()}` }));
                }

                res.statusCode = 200;
                res.setHeader('Content-Type', 'image/jpeg');
                return res.end(completeResponseBuffer);
            });
        });

        hfRequest.on('error', (err) => {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: err.message }));
        });

        hfRequest.write(imgBinaryBuffer);
        hfRequest.end();

    } catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: `Internal Proxy processing failure: ${error.message}` }));
    }
};
