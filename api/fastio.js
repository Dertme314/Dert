import { kv } from "@vercel/kv";

export default async function handler(req, res) {
    const workspaceId = process.env.FAST_IO_WORKSPACE_ID;
    const apiKey = process.env.FAST_IO_API_KEY;

    const fetchFastIo = async (endpoint, options = {}) => {
        const url = `https://api.fast.io/v1/workspaces/${workspaceId}${endpoint}`;
        console.log("Calling Fast.io URL:", url);
        return fetch(url, {
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
            const resp = await fetchFastIo(`/nodes/${node_id}`, { method: 'DELETE' });
            if (!resp.ok) return res.status(resp.status).json({ error: "Delete failed" });

            await kv.del(`file:${node_id}`);

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
                const resp = await fetchFastIo('/nodes');
                if (!resp.ok) return res.status(resp.status).json({ error: "Failed to list files from Fast.io." });
                return res.status(200).json(await resp.json());
            }

            else if (action === "init") {
                const { filename, size } = req.body;
                const resp = await fetchFastIo('/uploads/chunked/init', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: filename, size: size })
                });
                if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
                const data = await resp.json();
                return res.status(200).json({ upload_id: data.upload_id });
            }

            else if (action === "chunk") {
                const { upload_id, part_number, fileData, startByte, endByte, totalSize } = req.body;
                const buffer = Buffer.from(fileData, 'base64');
                const resp = await fetchFastIo(`/uploads/chunked/${upload_id}/parts`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/octet-stream",
                        "Content-Range": `bytes ${startByte}-${endByte}/${totalSize}`,
                        "X-Part-Number": part_number.toString()
                    },
                    body: buffer
                });
                if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
                return res.status(200).json({ success: true });
            }

            else if (action === "complete") {
                const { upload_id, filename, description, size } = req.body;

                const resp = await fetchFastIo(`/uploads/chunked/${upload_id}/complete`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({})
                });
                if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
                const completeData = await resp.json();

                const fileId = completeData.id || Math.random().toString(36).substring(2, 10);
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

