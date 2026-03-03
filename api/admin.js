import IORedis from "ioredis";
import { UTApi } from "uploadthing/server";

let redis;
function getRedis() {
    if (!redis) {
        redis = new IORedis(process.env.KV_REST_API_URL, {
            tls: { rejectUnauthorized: false },
            maxRetriesPerRequest: 3,
        });
    }
    return redis;
}

const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

export default async function handler(req, res) {
    const kv = getRedis();

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
                // Scan ioredis for keys matching 'file:*'
                let cursor = '0';
                let keys = [];
                do {
                    const [newCursor, foundKeys] = await kv.scan(cursor, 'MATCH', 'file:*', 'COUNT', 100);
                    cursor = newCursor;
                    keys.push(...foundKeys);
                } while (cursor !== '0');

                if (keys.length === 0) return res.status(200).json([]);

                const pipelines = keys.map(k => kv.get(k));
                const results = await Promise.all(pipelines);

                const files = results
                    .filter(raw => raw)
                    .map((raw, index) => {
                        const meta = typeof raw === "string" ? JSON.parse(raw) : raw;
                        // Map internal file data for frontend rendering
                        return {
                            id: keys[index].replace('file:', ''),
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
