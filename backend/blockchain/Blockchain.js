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
            console.log("📌 Aucun bloc trouvé. La blockchain est vide.");
            this.chain = [];
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

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    // Nouvelle méthode pour vérifier si un utilisateur a déjà voté pour un vote spécifique
    hasUserVoted(voteId, hashedVoterId) {
        // 1. Vérifier dans les transactions en attente
        const inPending = this.pendingTransactions.some(
            tx => tx.voteId === voteId && tx.hashedVoterId === hashedVoterId
        );
        if (inPending) return true;

        return false;
    }

    // Nouvelle méthode pour récupérer les infos d'un vote (sujet, options)
    getVoteStartTransaction(voteId) {
        // Chercher dans les transactions en attente
        let startTx = this.pendingTransactions.find(tx => tx.type === "startVote" && tx.voteId === voteId);
        return startTx;
    }

    addTransaction(transaction) {
        if (transaction.voterId && transaction.voteId) {

            // Hasher l'identité pour l'anonymiser
            const hashedId = this.hashVoterId(transaction.voterId);

            // Les votes ont différent id, vérifier si l'utilisateur a déjà voté pour un vote unique*
            const alreadyVoted = this.hasUserVoted(transaction.voteId, hashedId);

            if (alreadyVoted) {
                throw new Error("Cet utilisateur a déjà voté pour ce scrutin.");
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

    async minePendingTransactions(voteId) {
        // Filtrer les transactions pour ce vote spécifique
        const transactionsToMine = this.pendingTransactions.filter(tx => tx.voteId === voteId);

        if (transactionsToMine.length === 0) {
            console.log("Aucune transaction à miner pour ce vote.");
            return;
        }

        const previousHash = this.chain.length > 0 ? this.getLatestBlock().hash : "0";
        const newBlock = new Block(
            this.chain.length,
            Date.now(),
            transactionsToMine,
            previousHash
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

        // Retirer uniquement les transactions minées de la liste d'attente
        this.pendingTransactions = this.pendingTransactions.filter(tx => tx.voteId !== voteId);

        return newBlock;
    }

    async addBlock(newBlock) {
        const latestBlock = this.getLatestBlock();

        if (this.chain.length > 0) {
            // Validation simple du bloc
            if (newBlock.previousHash !== latestBlock.hash) {
                console.log("❌ Bloc rejeté : Hash précédent invalide");
                return false;
            }

            if (newBlock.index !== latestBlock.index + 1) {
                console.log("❌ Bloc rejeté : Index invalide");
                return false;
            }
        } else {
            if (newBlock.index !== 0) {
                console.log("❌ Bloc rejeté : Index invalide (attendu 0)");
                return false;
            }
        }

        // On pourrait ajouter une validation du hash ici

        this.chain.push(newBlock);

        // Sauvegarder dans la DB
        await saveBlockToDB(newBlock);

        // Retirer les transactions du bloc de nos transactions en attente
        // On suppose que newBlock.data contient les transactions
        if (Array.isArray(newBlock.data)) {
            const txIds = new Set(newBlock.data.map(tx => JSON.stringify(tx))); // Identification simple
            this.pendingTransactions = this.pendingTransactions.filter(tx => !txIds.has(JSON.stringify(tx)));
        }

        console.log("✅ Nouveau bloc ajouté depuis un pair !");
        return true;
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