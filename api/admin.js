import { createClient } from "@supabase/supabase-js";
import { UTApi } from "uploadthing/server";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

export default async function handler(req, res) {
    const origin = req.headers.origin || '';
    const allowed = ['https://dert.qzz.io', 'https://dertjustwhy.ca', 'https://derts.vercel.app'];
    if (allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "DELETE") {
        const { node_id, password } = req.body;
        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ success: false, error: "Unauthorized" });
        }
        try {
            const { data: fileRecord } = await supabase
                .from('files')
                .select('uploadthing_key')
                .eq('id', node_id)
                .single();

            if (fileRecord && fileRecord.uploadthing_key) {
                await utapi.deleteFiles(fileRecord.uploadthing_key);
            }

            const { error: deleteError } = await supabase
                .from('files')
                .delete()
                .eq('id', node_id);

            if (deleteError) throw deleteError;
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
            if (action === "auth") return res.status(200).json({ success: true });

            if (action === "list") {
                const { data: filesData, error } = await supabase
                    .from('files')
                    .select('id, filename')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (!filesData || filesData.length === 0) return res.status(200).json([]);

                return res.status(200).json(filesData.map(r => ({ id: r.id, name: r.filename || "Unnamed File" })));
            }
        } catch (e) {
            return res.status(500).json({ error: "Database error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
