import { createRouteHandler, createUploadthing } from "uploadthing/server";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const f = createUploadthing();

// UploadThing file router definition
export const uploadRouter = {
    // 'blob' allows any file type. You can restrict to 'image', 'video', etc.
    secretUploader: f({ blob: { maxFileSize: "1GB", maxFileCount: 1 } })
        .onUploadComplete(async ({ metadata, file }) => {
            try {
                // Save to Supabase Postgres Table
                const { error } = await supabase
                    .from('files')
                    .insert({
                        filename: file.name,
                        size: file.size,
                        fastio_url: file.url, // Reusing existing variable name for frontend compatibility
                        uploadthing_key: file.key
                    });

                if (error) throw error;

                console.log(`Successfully stored metadata for ${file.name}`);
            } catch (err) {
                console.error("Supabase Error during webhook:", err);
            }
        }),
};

// createRouteHandler in v7 returns a single unified handler function
const handler = createRouteHandler({
    router: uploadRouter,
    config: {
        token: process.env.UPLOADTHING_TOKEN
    }
});

export default async function (req, res) {
    // Build a standard Web Request from Vercel's Node.js req object
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host || 'localhost';
    const url = new URL(req.url, `${protocol}://${host}`);

    const fetchOptions = {
        method: req.method,
        headers: req.headers,
    };

    // Vercel auto-parses JSON into req.body. Convert it back for UploadThing.
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        fetchOptions.body = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body;
    }

    const request = new Request(url, fetchOptions);

    try {
        // Call the unified handler directly — it routes GET/POST internally
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
    api: {
        bodyParser: false,
    },
};
