import { createRouteHandler, createUploadthing } from "uploadthing/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const f = createUploadthing();

export const uploadRouter = {
    secretUploader: f({ blob: { maxFileSize: "1GB", maxFileCount: 1 } })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                const { error } = await supabase
                    .from('files')
                    .insert({
                        filename: file.name,
                        size: file.size,
                        fastio_url: file.url,
                        uploadthing_key: file.key
                    });
                if (error) throw error;
                console.log(`Stored metadata for ${file.name}`);
            } catch (err) {
                console.error("Supabase webhook error:", err);
            }
        }),
};

const handler = createRouteHandler({
    router: uploadRouter,
    config: { token: process.env.UPLOADTHING_TOKEN }
});

export default async function (req, res) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `${protocol}://${host}`);

    const fetchOptions = {
        method: req.method,
        headers: req.headers,
    };

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const request = new Request(url, fetchOptions);

    try {
        const response = await handler(request);
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
    api: { bodyParser: false }
};
