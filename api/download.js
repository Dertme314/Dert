import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
    // Extract filename from the query (set by vercel.json rewrite)
    const filename = req.query.name;

    if (!filename) {
        return res.status(400).json({ error: "Missing filename" });
    }

    try {
        // Look up the file by its original filename in Supabase
        const { data: fileRecord, error } = await supabase
            .from('files')
            .select('fastio_url, filename')
            .eq('filename', filename)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !fileRecord) {
            return res.status(404).send(`
                <!DOCTYPE html>
                <html><head><title>File Not Found</title></head>
                <body style="background:#111;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;">
                    <div style="text-align:center;">
                        <h1>404</h1>
                        <p>File "<strong>${filename}</strong>" was not found.</p>
                        <a href="/" style="color:#6c63ff;">Go Home</a>
                    </div>
                </body></html>
            `);
        }

        // Redirect to the actual UploadThing file URL
        return res.redirect(302, fileRecord.fastio_url);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
