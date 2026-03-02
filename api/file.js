import { Redis } from "@upstash/redis";

export default async function handler(req, res) {
    let kv;
    try {
        kv = Redis.fromEnv();
    } catch (err) {
        console.error("Redis init failed:", err.message);
        return res.status(500).json({ error: "Database configuration missing" });
    }
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing ID" });

    try {
        const metadata = await kv.get(`file:${id}`);
        if (!metadata) {
            return res.status(404).json({ error: "File not found" });
        }

        return res.status(200).json(metadata);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
