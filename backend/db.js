const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
dotenv.config();

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/blockchain";
const client = new MongoClient(mongoUrl);

let db;

async function connectDB() {
    await client.connect();
    db = client.db("blockchain");
    console.log("✅ Connecté à la base de données MongoDB");
}

function getDb() {
    if (!db) {
        throw new Error("La base de données n'est pas connectée. Appelez d'abord connectDB().");
    }
    return db;
}

module.exports = { connectDB, getDb };