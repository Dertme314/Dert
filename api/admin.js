import IORedis from "ioredis";
import { UTApi } from "uploadthing/server";

let redis;
function getRedis() {
    if (!redis) {
        redis = new IORedis(process.env.KV_URL || process.env.KV_REST_API_URL, {
            tls: { rejectUnauthorized: false },
            connectTimeout: 10000,
            enableOfflineQueue: false,
        });
    }
    return redis;
}

const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();

    const kv = getRedis();

    if (req.method === "DELETE") {
        const { node_id, password } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ success: false, error: "Unauthorized: Incorrect password." });
        }
        try {
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
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        try {
            if (action === "auth") return res.status(200).json({ success: true, message: "Credentials verified." });

            if (action === "list") {
                const [cursor, keys] = await kv.scan('0', 'MATCH', 'file:*', 'COUNT', 100);

                if (!keys || keys.length === 0) {
                    return res.status(200).json([]);
                }

                const results = await kv.mget(...keys);
                const files = results
                    .filter(Boolean)
                    .map((raw, index) => {
                        const meta = typeof raw === "string" ? JSON.parse(raw) : raw;
                        return { id: keys[index].replace('file:', ''), name: meta.filename || "Unnamed File" };
                    });

                return res.status(200).json(files);
            }
        } catch (e) {
            console.error("Admin Error:", e);
            return res.status(500).json({ error: "Database connection failed" });
        }
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
