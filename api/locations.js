import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const allLocations = await kv.hgetall('activeLocations');
        
        // Return the locations or an empty object if none exist yet
        return res.status(200).json(allLocations || {});
    } catch (error) {
        console.error("Error fetching locations:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
