import { createRouteHandler, createUploadthing } from "uploadthing/server";
import { kv } from "@vercel/kv";

const f = createUploadthing();

// UploadThing file router definition
export const uploadRouter = {
    // 'blob' allows any file type. You can restrict to 'image', 'video', etc.
    secretUploader: f({ blob: { maxFileSize: "1GB", maxFileCount: 1 } })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                const fileId = Math.random().toString(36).substring(2, 10);

                // Save to Redis KV
                await kv.set(`file:${fileId}`, {
                    filename: file.name,
                    size: file.size,
                    fastio_url: file.url, // Reusing existing variable name for frontend compatibility
                    uploadthing_key: file.key,
                });

                console.log(`Successfully stored metadata for ${file.name}`);
            } catch (err) {
                console.error("KV Error during webhook:", err);
            }
        }),
};

const handler = createRouteHandler({
    router: uploadRouter,
    config: {
        token: process.env.UPLOADTHING_TOKEN // V7 Token 
    }
});

export default async function (req, res) {
    // Create standard Web Request from Vercel Node req
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `${protocol}://${host}`);

    const fetchOptions = {
        method: req.method,
        headers: req.headers,
    };

    // Vercel parses application/json automatically into req.body. Convert it back to a string payload.
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const request = new Request(url, fetchOptions);

    try {
        let response;
        if (req.method === "GET") {
            response = await handler.GET(request);
        } else if (req.method === "POST") {
            response = await handler.POST(request);
        } else {
            return res.status(405).json({ error: "Method Not Allowed" });
        }

        const responseBody = await response.text();

        response.headers.forEach((value, key) => {
            res.setHeader(key, value);
        });

        res.status(response.status).send(responseBody);
    } catch (e) {
        console.error("UploadThing Error:", e);
        res.status(500).json({ error: e.message });
    }
}

export const config = {
    api: {
        bodyParser: false,
    },
};
