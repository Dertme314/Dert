import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(filename) {
    const ext = (filename.split('.').pop() || '').toLowerCase();
    const icons = {
        png: 'fa-image', jpg: 'fa-image', jpeg: 'fa-image', gif: 'fa-image', webp: 'fa-image', svg: 'fa-image',
        mp4: 'fa-video', mkv: 'fa-video', avi: 'fa-video', mov: 'fa-video',
        mp3: 'fa-music', wav: 'fa-music', ogg: 'fa-music', flac: 'fa-music',
        zip: 'fa-file-archive', rar: 'fa-file-archive', '7z': 'fa-file-archive', tar: 'fa-file-archive',
        pdf: 'fa-file-pdf', doc: 'fa-file-word', docx: 'fa-file-word',
        exe: 'fa-cog', msi: 'fa-cog', dll: 'fa-cog',
        js: 'fa-file-code', py: 'fa-file-code', html: 'fa-file-code', css: 'fa-file-code',
        txt: 'fa-file-alt', json: 'fa-file-alt', md: 'fa-file-alt',
    };
    return icons[ext] || 'fa-file';
}

async function handleDownload(req, res) {
    const filename = req.query.name;
    if (!filename) return res.status(400).json({ error: "Missing filename" });

    const { data: fileRecord, error } = await supabase
        .from('files')
        .select('fastio_url')
        .eq('filename', filename)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !fileRecord) {
        const safe = escapeHtml(filename);
        return res.status(404).send(`<!DOCTYPE html><html><head><title>File Not Found</title></head><body style="background:#0a0a0c;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div style="text-align:center;"><h1>404</h1><p>File "<strong>${safe}</strong>" was not found.</p><a href="/" style="color:#6c63ff;">Go Home</a></div></body></html>`);
    }

    return res.redirect(302, fileRecord.fastio_url);
}

async function handleView(req, res) {
    const filename = req.query.name;
    if (!filename) return res.status(400).send('Missing filename');

    const { data: file, error } = await supabase
        .from('files')
        .select('*')
        .eq('filename', filename)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error || !file) {
        const safe = escapeHtml(filename);
        return res.status(404).send(`<!DOCTYPE html><html><head><title>Not Found</title></head><body style="background:#0a0a0c;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;"><div style="text-align:center;"><h1 style="font-size:48px;margin-bottom:8px;">404</h1><p style="color:#888;">File "<strong>${safe}</strong>" was not found.</p><a href="/" style="color:#6c63ff;margin-top:16px;display:inline-block;">Go Home</a></div></body></html>`);
    }

    const safe = escapeHtml(file.filename);
    const size = formatBytes(file.size);
    const icon = getFileIcon(file.filename);
    const ext = (file.filename.split('.').pop() || 'file').toUpperCase();
    const date = new Date(file.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const downloadUrl = file.fastio_url;
    const directLink = `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/download/${encodeURIComponent(file.filename)}`;

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${safe} | Dert File</title>
    <meta name="description" content="Download ${safe} (${size}) from Dert">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#0a0a0c;color:#fff;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
        .card{background:rgba(14,14,18,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:48px 40px;text-align:center;max-width:420px;width:100%;box-shadow:0 12px 48px rgba(0,0,0,0.6);backdrop-filter:blur(16px)}
        .icon-wrap{width:80px;height:80px;border-radius:20px;background:rgba(108,99,255,0.12);border:1px solid rgba(108,99,255,0.25);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;font-size:32px;color:#a29bfe}
        h1{font-size:20px;font-weight:600;margin-bottom:6px;word-break:break-all}
        .meta{display:flex;justify-content:center;gap:16px;color:#888;font-size:13px;margin-bottom:28px}
        .meta span{display:flex;align-items:center;gap:5px}
        .dl-btn{display:inline-flex;align-items:center;gap:10px;background:linear-gradient(135deg,#6c63ff,#5a52e0);color:#fff;padding:14px 32px;border-radius:12px;font-weight:600;font-size:15px;text-decoration:none;transition:all .25s;border:none;cursor:pointer}
        .dl-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(108,99,255,0.35)}
        .copy-row{margin-top:16px;display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:6px 6px 6px 14px}
        .copy-row input{flex:1;background:none;border:none;color:#aaa;font-size:12px;font-family:'Inter',sans-serif;outline:none}
        .copy-btn{background:rgba(108,99,255,0.15);border:1px solid rgba(108,99,255,0.3);color:#a29bfe;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:500;transition:all .2s;white-space:nowrap}
        .copy-btn:hover{background:rgba(108,99,255,0.3);color:#fff}
        .toast{position:fixed;bottom:20px;right:20px;background:#6c63ff;color:#fff;padding:10px 20px;border-radius:8px;font-size:14px;z-index:99;opacity:0;transition:opacity .3s}
        .toast.show{opacity:1}
        .footer{margin-top:24px;color:#555;font-size:12px}
        .footer a{color:#6c63ff;text-decoration:none}
    </style>
</head>
<body>
    <div class="card">
        <div class="icon-wrap"><i class="fas ${icon}"></i></div>
        <h1>${safe}</h1>
        <div class="meta">
            <span><i class="fas fa-weight-hanging"></i> ${size}</span>
            <span><i class="fas fa-tag"></i> ${ext}</span>
            <span><i class="fas fa-calendar"></i> ${date}</span>
        </div>
        <a href="${downloadUrl}" class="dl-btn" download><i class="fas fa-download"></i> Download File</a>
        <div class="copy-row">
            <input type="text" id="link" value="${directLink}" readonly>
            <button class="copy-btn" onclick="copyLink()"><i class="fas fa-copy"></i> Copy</button>
        </div>
        <div class="footer">Hosted on <a href="/">Dert</a></div>
    </div>
    <div class="toast" id="toast">Copied!</div>
    <script>
        function copyLink(){
            var inp=document.getElementById('link');
            inp.select();
            navigator.clipboard.writeText(inp.value);
            var t=document.getElementById('toast');
            t.classList.add('show');
            setTimeout(function(){t.classList.remove('show')},1500);
        }
    </script>
</body>
</html>`);
}

async function handleMeta(req, res) {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "Missing ID" });

    const { data: fileRecord, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !fileRecord) return res.status(404).json({ error: "File not found" });
    return res.status(200).json(fileRecord);
}

export default async function handler(req, res) {
    const action = req.query.action;

    try {
        if (action === 'download') return await handleDownload(req, res);
        if (action === 'view') return await handleView(req, res);
        if (action === 'meta') return await handleMeta(req, res);
        return res.status(400).json({ error: "Missing or invalid action parameter" });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
