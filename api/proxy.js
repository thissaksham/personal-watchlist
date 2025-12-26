export default async function handler(request, response) {
    const { path } = request.query;
    const apiKey = process.env.VITE_TMDB_API_KEY;

    if (!apiKey) {
        return response.status(500).json({ error: 'Server Missing API Key' });
    }

    if (!path) {
        return response.status(400).json({ error: 'Missing path' });
    }

    // Construct target URL
    // path comes in as the captured group (e.g., "trending/movie/week")
    // We need to re-attach query params from the original request if any, excluding 'path'
    const queryParams = new URLSearchParams(request.query);
    queryParams.delete('path');
    queryParams.append('api_key', apiKey);

    const targetUrl = `https://api.themoviedb.org/3/${path}?${queryParams.toString()}`;

    try {
        const res = await fetch(targetUrl);
        const data = await res.json();
        return response.status(res.status).json(data);
    } catch (error) {
        console.error('Proxy Error:', error);
        return response.status(500).json({ error: 'Proxy Request Failed' });
    }
}
