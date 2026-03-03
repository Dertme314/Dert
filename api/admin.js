import { createClient } from "@supabase/supabase-js";
import { UTApi } from "uploadthing/server";

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const utapi = new UTApi({ token: process.env.UPLOADTHING_TOKEN });

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === "OPTIONS") return res.status(200).end();

    if (req.method === "DELETE") {
        const { node_id, password } = req.body;

        if (password !== process.env.UPLOAD_PASSWORD) {
            return res.status(401).json({ success: false, error: "Unauthorized: Incorrect password." });
        }

        try {
            // Fetch metadata from Supabase to get the UploadThing key
            const { data: fileRecord, error: fetchError } = await supabase
                .from('files')
                .select('uploadthing_key')
                .eq('id', node_id)
                .single();

            if (fileRecord && fileRecord.uploadthing_key) {
                // Delete the physical file from UploadThing bucket
                await utapi.deleteFiles(fileRecord.uploadthing_key);
            }

            // Delete the metadata record from Supabase table
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
            if (action === "auth") return res.status(200).json({ success: true, message: "Credentials verified." });

            if (action === "list") {
                // Fetch all file records from Supabase Postgres
                const { data: filesData, error } = await supabase
                    .from('files')
                    .select('id, filename')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                if (!filesData || filesData.length === 0) return res.status(200).json([]);

                // Map format for frontend UI compatibility
                const files = filesData.map(record => ({
                    id: record.id,
                    name: record.filename || "Unnamed File"
                }));

                return res.status(200).json(files);
            }
        } catch (e) {
            console.error("Admin Error:", e);
            return res.status(500).json({ error: "Database connection failed" });
        }
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
