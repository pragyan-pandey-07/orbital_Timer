import { kv } from '@vercel/kv';

export default async (req) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { id, lat, lon, heartbeat, capsule } = body;

        if (!id || lat === undefined || lon === undefined) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const payload = { lat, lon, time: Date.now() };
        if (heartbeat) payload.heartbeat = heartbeat;
        if (capsule) payload.capsule = capsule;

        await kv.hset('activeLocations', {
            [id]: payload
        });

        // Cleanup old locations
        const allLocations = await kv.hgetall('activeLocations');
        if (allLocations) {
            const now = Date.now();
            for (const [userId, data] of Object.entries(allLocations)) {
                if (now - data.time > 10 * 60 * 1000) {
                    await kv.hdel('activeLocations', userId);
                }
            }
        }

        return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error("Error updating location:", error);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const config = {
    path: "/api/location"
};
