export const config = {
    api: { bodyParser: false }
};

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const clientPwd = req.headers['x-admin-password'];
    if (clientPwd !== process.env.UPLOAD_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const rawBody = await getRawBody(req);
    const url = "http://40.233.88.173:3001/api/upload";

    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['x-admin-password'];
    headers['x-api-key'] = process.env.API_KEY || 'longsecurekey';

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: rawBody
        });

        const data = await response.text();
        // Proxy exact response back to client
        res.status(response.status).send(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
}
