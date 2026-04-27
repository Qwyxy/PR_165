import { MongoClient, ServerApiVersion } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

const uri = MONGODB_URI;

if (!uri) {
    throw new Error("Missing MONGODB_URI. Define it in my-app/.env.");
}

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

export async function runStableAPIConnect() {
    try {
        await client.connect();
        const result = await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
        return result;
    } finally {
        await client.close();
    }
}

// Persistent connection for reuse across requests
let isConnected = false;

export async function connectDB(dbName = "sensors") {
    if (!isConnected) {
        await client.connect();
        isConnected = true;
        console.log("Connected to MongoDB!");
    }
    return client.db(dbName);
}

export { client };

