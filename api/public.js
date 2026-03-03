async function handleExploits(req, res) {
    const response = await fetch("https://weao.xyz/api/status/exploits", {
        headers: { "User-Agent": "WEAO-3PService" },
    });

    if (!response.ok) {
        const text = await response.text().catch(() => "");
        return res.status(response.status).json({ error: `WEAO API returned ${response.status}`, details: text });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(data);
}

async function handlePinned(req, res) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).json({ error: "No GitHub token configured" });

    const query = JSON.stringify({
        query: '{ user(login: "Dertme314") { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name description url primaryLanguage { name } stargazerCount } } } } }'
    });

    const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Authorization": "Bearer " + token,
            "Content-Type": "application/json",
            "User-Agent": "derts-portfolio"
        },
        body: query
    });

    if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    const repos = data.data.user.pinnedItems.nodes.map(repo => ({
        name: repo.name,
        description: repo.description || "",
        url: repo.url,
        language: repo.primaryLanguage ? repo.primaryLanguage.name : "",
        stars: repo.stargazerCount
    }));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    return res.status(200).json(repos);
}

async function handleVisits(req, res) {
    const response = await fetch("https://api.counterapi.dev/v1/derts.vercel.app/visits/up");

    if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.status(200).json(data);
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

    const action = req.query.action;

    try {
        if (action === 'exploits') return await handleExploits(req, res);
        if (action === 'pinned') return await handlePinned(req, res);
        if (action === 'visits') return await handleVisits(req, res);
        return res.status(400).json({ error: "Missing or invalid action parameter" });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
