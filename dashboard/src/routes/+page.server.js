
import { connectDB } from '$lib/server/db';
import { fail } from '@sveltejs/kit';

export const load = async () => {
    const db = await connectDB();
    let items = await db.collection('data').find({}).toArray();

    console.log('Loaded items:', JSON.parse(JSON.stringify(items))); // Log items for debugging
    return {
        items: JSON.parse(JSON.stringify(items)) // serialize ObjectId
    };
}
