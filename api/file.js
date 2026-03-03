import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing ID" });

    try {
        const { data: fileRecord, error } = await supabase
            .from('files')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !fileRecord) return res.status(404).json({ error: "File not found" });
        return res.status(200).json(fileRecord);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
