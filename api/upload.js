import { kv } from "@vercel/kv";

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { filename, fileData, description, password } = req.body;

    if (password !== process.env.UPLOAD_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized: Incorrect password" });
    }

    try {
        const base64Data = fileData.split(',')[1] || fileData;
        const buffer = Buffer.from(base64Data, "base64");
        const mimeType = fileData.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";

        const workspaceId = process.env.FAST_IO_WORKSPACE_ID;
        const apiKey = process.env.FAST_IO_API_KEY;

        // Send to Fast.io Workspace Files endpoint
        const uploadUrl = `https://api.fast.io/v1/workspaces/${workspaceId}/files`;

        const blob = new Blob([buffer], { type: mimeType });
        const formData = new FormData();
        formData.append("file", blob, filename);

        const fastIoResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`
            },
            body: formData
        });

        if (!fastIoResponse.ok) {
            const errText = await fastIoResponse.text();
            return res.status(fastIoResponse.status).json({ error: "Fast.io Error: " + errText });
        }

        const fastIoData = await fastIoResponse.json();

        // Generate an ID for our metadata link
        const fileId = Math.random().toString(36).substring(2, 10);

        // Store metadata in Vercel KV
        await kv.set(`file:${fileId}`, {
            filename,
            description,
            size: buffer.length,
            fastio_url: `https://dert.fast.io/${encodeURIComponent(filename)}`
        });

        return res.status(200).json({ success: true, fileId, url: `/download.html?id=${fileId}` });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
