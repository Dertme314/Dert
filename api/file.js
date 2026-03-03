import IORedis from "ioredis";

let redis;
function getRedis() {
    if (!redis) {
        redis = new IORedis(process.env.KV_URL || process.env.KV_REST_API_URL, {
            tls: { rejectUnauthorized: false },
            connectTimeout: 10000,
        });
    }
    return redis;
}

export default async function handler(req, res) {
    const kv = getRedis();
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing ID" });

    try {
        const raw = await kv.get(`file:${id}`);
        if (!raw) return res.status(404).json({ error: "File not found" });

        const metadata = typeof raw === "string" ? JSON.parse(raw) : raw;
        return res.status(200).json(metadata);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
