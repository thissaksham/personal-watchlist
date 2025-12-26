export default async function handler(request, response) {
    const { path } = request.query;
    const apiKey = process.env.VITE_RAPIDAPI_KEY;
    const apiHost = 'where-can-i-watch1.p.rapidapi.com';

    if (!apiKey) {
        return response.status(500).json({ error: 'Server Missing RapidAPI Key' });
    }

    if (!path) {
        return response.status(400).json({ error: 'Missing path' });
    }

    const targetUrl = `https://${apiHost}/${path}`;

    try {
        const res = await fetch(targetUrl, {
            headers: {
                'x-rapidapi-key': apiKey,
                'x-rapidapi-host': apiHost
            }
        });
        const data = await res.json();
        return response.status(res.status).json(data);
    } catch (error) {
        console.error('Rapid Proxy Error:', error);
        return response.status(500).json({ error: 'Rapid Proxy Request Failed' });
    }
}
