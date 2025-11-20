const Block = require("./Block");
const SHA256 = require("crypto-js/sha256");
const { getDb } = require("./db");
const SECRET_SALT = "voting_app_salt_blockchain_cloud_computing_2025";

async function saveBlockToDB(block) {
    const db = getDb();
    await db.collection("blocks").insertOne(block);
    console.log("✅ Bloc sauvegardé dans la base de données MongoDB");
}

async function loadBlockchainFromDB() {
    const db = getDb();
    const blocks = await db.collection("blocks").find().sort({ index: 1 }).toArray();
    return blocks;
}

class Blockchain {
    constructor() {
        this.chain = [];
        this.difficulty = 3;
        this.pendingTransactions = [];
    }
    async initialize() {
        const blocks = await loadBlockchainFromDB();

        if (blocks.length === 0) {
            console.log("📌 Aucun bloc trouvé → création du genesis block");
            const genesis = this.createGenesisBlock();
            this.chain = [genesis];
        } else {
            console.log("📥 Blockchain chargée depuis MongoDB !");
            this.chain = blocks.map(b => ({
                index: b.index,
                timestamp: b.timestamp,
                data: b.data,
                previousHash: b.previousHash,
                hash: b.hash,
                nonce: b.nonce
            }));
        }
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), "Genesis Block", "0");
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    addTransaction(transaction) {
        if (transaction.voterId) {

            // Hasher l'identité pour l'anonymiser
            const hashedId = this.hashVoterId(transaction.voterId);

            // Vérifier si ce hashedId a déjà voté dans pendingTransactions
            const alreadyVoted = this.pendingTransactions.some(
                tx => tx.hashedVoterId === hashedId
            );

            if (alreadyVoted) {
                throw new Error("Cet utilisateur a déjà voté.");
            }

            // Remplacer l'id par le hash
            transaction.hashedVoterId = hashedId;
            delete transaction.voterId;
        }

        this.pendingTransactions.push(transaction);
    }

    hashVoterId(voterId) {
        return SHA256(voterId + SECRET_SALT).toString();
    }

    async minePendingTransactions() {
        const newBlock = new Block(
            this.chain.length,
            Date.now(),
            this.pendingTransactions,
            this.getLatestBlock().hash
        );

        newBlock.mineBlock(this.difficulty);
        this.chain.push(newBlock);

        // SAUVEGARDE DU BLOC DANS MONGODB
        await saveBlockToDB({
            index: newBlock.index,
            timestamp: newBlock.timestamp,
            data: newBlock.data,
            previousHash: newBlock.previousHash,
            hash: newBlock.hash,
            nonce: newBlock.nonce
        });

        this.pendingTransactions = [];
    }

    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const current = this.chain[i];
            const previous = this.chain[i - 1];

            if (current.hash !== current.calculateHash()) return false;
            if (current.previousHash !== previous.hash) return false;
        }
        return true;
    }
}

module.exports = Blockchain;