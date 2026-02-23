export default async function handler(req, res) {
    var token = process.env.GITHUB_TOKEN;

    if (!token) {
        res.status(500).json({ error: "No GitHub token configured" });
        return;
    }

    var query = JSON.stringify({
        query: '{ user(login: "Dertme314") { pinnedItems(first: 6, types: REPOSITORY) { nodes { ... on Repository { name description url primaryLanguage { name } stargazerCount } } } } }'
    });

    try {
        var response = await fetch("https://api.github.com/graphql", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "User-Agent": "derts-portfolio"
            },
            body: query
        });

        if (!response.ok) {
            var errorText = await response.text();
            res.status(response.status).json({ error: errorText });
            return;
        }

        var data = await response.json();
        var nodes = data.data.user.pinnedItems.nodes;

        var repos = nodes.map(function (repo) {
            return {
                name: repo.name,
                description: repo.description || "",
                url: repo.url,
                language: repo.primaryLanguage ? repo.primaryLanguage.name : "",
                stars: repo.stargazerCount
            };
        });

        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(200).json(repos);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch pinned repos" });
    }
}
