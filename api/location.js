import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { id, lat, lon, heartbeat, capsule } = req.body;

        if (!id || lat === undefined || lon === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Store user location in a Redis Hash. 
        // Vercel KV handles JSON objects automatically.
        const payload = { lat, lon, time: Date.now() };
        if (heartbeat) payload.heartbeat = heartbeat;
        if (capsule) payload.capsule = capsule;

        await kv.hset('activeLocations', {
            [id]: payload
        });

        // Optional: Clean up old entries (older than 10 mins) to keep the hash small
        const allLocations = await kv.hgetall('activeLocations');
        if (allLocations) {
            const now = Date.now();
            for (const [userId, data] of Object.entries(allLocations)) {
                if (now - data.time > 10 * 60 * 1000) {
                    await kv.hdel('activeLocations', userId);
                }
            }
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error updating location:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
