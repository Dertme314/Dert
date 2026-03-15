export const config = { runtime: 'edge' };

export default async function handler(req) {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const clientPwd = req.headers.get('x-admin-password');
    if (clientPwd !== process.env.UPLOAD_PASSWORD) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { 
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const url = "http://40.233.88.173:3001/api/upload";
    
    // Clone headers and inject the real secret API key
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('x-admin-password');
    headers.set('x-api-key', process.env.API_KEY || 'longsecurekey');

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: req.body // Edge runtime allows streaming the request body directly
        });

        // Proxy the response back to the client
        return response;
    } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
