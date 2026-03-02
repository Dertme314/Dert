import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    const workspaceId = process.env.FAST_IO_WORKSPACE_ID;
    const apiKey = process.env.FAST_IO_API_KEY;

    const fetchFastIo = async (endpoint, options = {}) => {
        return fetch(`https://api.fast.io/v1/workspaces/${workspaceId}${endpoint}`, {
            ...options,
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                ...options.headers
            }
        });
    };

    if (req.method === "DELETE") {
        const { node_id, password } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
        try {
            const resp = await fetchFastIo(`/storage/node/${node_id}`, { method: 'DELETE' });
            if (!resp.ok) return res.status(resp.status).json({ error: "Delete failed" });
            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === "POST") {
        const { action, password } = req.body;

        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ success: false, error: "Unauthorized: Incorrect password." });
        }

        try {
            if (action === "auth") {
                return res.status(200).json({ success: true });
            }

            else if (action === "list") {
                const resp = await fetchFastIo('/files');
                if (!resp.ok) return res.status(resp.status).json({ error: "Failed to list files from Fast.io." });
                return res.status(200).json(await resp.json());
            }

            else if (action === "init") {
                const { filename } = req.body;
                const resp = await fetchFastIo('/upload', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "create", name: filename })
                });
                if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
                const data = await resp.json();
                return res.status(200).json({ upload_id: data.upload_id });
            }

            else if (action === "chunk") {
                const { upload_id, part_number, fileData } = req.body;
                const buffer = Buffer.from(fileData, 'base64');
                const resp = await fetchFastIo(`/upload/${upload_id}/chunk?order=${part_number}&size=${buffer.length}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/octet-stream" },
                    body: buffer
                });
                if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
                return res.status(200).json({ success: true });
            }

            else if (action === "complete") {
                const { upload_id, filename, description, size } = req.body;

                const resp = await fetchFastIo(`/upload/${upload_id}/complete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "complete" })
                });
                if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });

                const fileId = Math.random().toString(36).substring(2, 10);
                await kv.set(`file:${fileId}`, {
                    filename,
                    description,
                    size,
                    fastio_url: `https://dert.fast.io/${encodeURIComponent(filename)}`
                });

                return res.status(200).json({ success: true, fileId, url: `/download.html?id=${fileId}` });
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

