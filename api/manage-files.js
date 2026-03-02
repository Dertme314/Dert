export default async function handler(req, res) {
    const workspaceId = process.env.FAST_IO_WORKSPACE_ID;
    const apiKey = process.env.FAST_IO_API_KEY;

    if (req.method === "GET") {
        // List all files
        try {
            const resp = await fetch(`https://api.fast.io/v1/workspaces/${workspaceId}/files`, {
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            if (!resp.ok) return res.status(resp.status).json({ error: "Failed to list files from Fast.io" });
            const data = await resp.json();
            return res.status(200).json(data);
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === "DELETE") {
        const { password, node_id } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        try {
            const resp = await fetch(`https://api.fast.io/v1/workspaces/${workspaceId}/storage/node/${node_id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${apiKey}` }
            });
            if (!resp.ok) return res.status(resp.status).json({ error: "Failed to delete from Fast.io" });

            return res.status(200).json({ success: true });
        } catch (e) {
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
