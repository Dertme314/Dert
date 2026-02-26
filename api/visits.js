export default async function handler(req, res) {
    try {
        var response = await fetch("https://api.counterapi.dev/v1/derts.vercel.app/visits/up");

        if (!response.ok) {
            var errorText = await response.text();
            res.status(response.status).json({ error: errorText });
            return;
        }

        var data = await response.json();

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(200).json(data);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch visitor count" });
    }
}
