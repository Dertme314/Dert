export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const origin = req.headers.origin || '';
    const allowed = ['https://dert.qzz.io', 'https://dertjustwhy.ca', 'https://derts.vercel.app'];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    if (req.method === "OPTIONS") return res.status(200).end();

    const apiKey = process.env.API_KEY || "longsecurekey";
    
    if (req.method === "DELETE") {
        const { node_id, password } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        try {
            const response = await fetch(`http://40.233.88.173:3001/api/files/${encodeURIComponent(node_id)}`, {
                method: "DELETE",
                headers: { "x-api-key": apiKey }
            });

            if (response.ok) {
                return res.status(200).json({ success: true });
            } else {
                return res.status(response.status).json({ error: "Failed to delete" });
            }
        } catch(e) {
            return res.status(500).json({ error: e.message });
        }
    }

    if (req.method === "POST") {
        const { action, password } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }

        if (action === "auth") return res.status(200).json({ success: true });

        if (action === "list") {
            try {
                const fetchRes = await fetch("http://40.233.88.173:3001/api/files", {
                    headers: { "x-api-key": apiKey }
                });
                
                if (!fetchRes.ok) throw new Error("Server error");
                
                const files = await fetchRes.json();
                const uiData = files.map(f => ({ id: f.name, name: f.name })).reverse();
                return res.status(200).json(uiData);
            } catch (e) {
                return res.status(500).json({ error: e.message });
            }
        }
    }
    
    return res.status(405).json({ error: "Method not allowed" });
}
