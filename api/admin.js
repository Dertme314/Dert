import { kv } from "@vercel/kv";
import { UTApi } from "uploadthing/server";

const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

export default async function handler(req, res) {

    if (req.method === "DELETE") {
        const { node_id, password } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(200).json({ success: false, error: "Unauthorized: Incorrect password." });
        }
        try {
            // node_id is the internal fileId
            const raw = await kv.get(`file:${node_id}`);
            if (raw) {
                const metadata = typeof raw === "string" ? JSON.parse(raw) : raw;
                if (metadata.uploadthing_key) {
                    await utapi.deleteFiles(metadata.uploadthing_key);
                }
            }
            await kv.del(`file:${node_id}`);
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === "POST") {
        const { action, password } = req.body;

        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(200).json({ success: false, error: "Unauthorized: Incorrect password." });
        }

        try {
            if (action === "auth") {
                // If the user made it past the password check, they are authorized.
                return res.status(200).json({ success: true, message: "Credentials verified." });
            }
            else if (action === "list") {
                // Fetch all keys matching 'file:*' from Vercel KV
                const keys = await kv.keys('file:*');
                if (!keys || keys.length === 0) return res.status(200).json([]);

                // Pre-pend keys for a multi-get operation if supported, or fetch individually
                const results = [];
                for (const key of keys) {
                    const data = await kv.get(key);
                    if (data) results.push({ id: key.replace('file:', ''), ...data });
                }

                const files = results.map(meta => {
                    return {
                        id: meta.id,
                        name: meta.filename
                    };
                });

                return res.status(200).json(files);
            }
            else {
                return res.status(400).json({ error: "Unknown action parameter" });
            }
        } catch (e) {
            console.error(e);
            return res.status(500).json({ error: "Internal Server Error: " + e.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
