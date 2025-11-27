const Blockchain = require("./Blockchain");
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./db");
const crypto = require("crypto");
const axios = require("axios");
const verifyToken = require("./verifyToken");

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3005";
app.use(express.json());
app.use(cors());

// Liste des autres noeuds récupérée depuis les variables d'environnement
// Format attendu: "http://node2:3002,http://node3:3003"
const peers = process.env.PEERS ? process.env.PEERS.split(",") : [];

const votingBlockchain = new Blockchain();

// Fonction pour diffuser une transaction
function broadcastTransaction(transaction) {
    peers.forEach(peer => {
        if (!peer.includes(port.toString())) {
            axios.post(`${peer}/transaction/broadcast`, transaction)
                .catch(err => console.log(`⚠️ Erreur broadcast transaction vers ${peer}`));
        }
    });
}

// Fonction pour diffuser un bloc
function broadcastBlock(block) {
    peers.forEach(peer => {
        if (!peer.includes(port.toString())) {
            axios.post(`${peer}/block/broadcast`, block)
                .catch(err => console.log(`⚠️ Erreur broadcast bloc vers ${peer}`));
        }
    });
}

app.post("/transaction/broadcast", (req, res) => {
    const transaction = req.body;
    try {
        // On ajoute la transaction sans la rediffuser
        votingBlockchain.addTransaction(transaction);
        console.log("📥 Transaction reçue d'un pair");
        res.send({ message: "Transaction reçue" });
    } catch (error) {
        console.log("Transaction rejetée:", error.message);
        res.status(400).send({ error: error.message });
    }
});

app.post("/block/broadcast", async (req, res) => {
    const block = req.body;
    try {
        const success = await votingBlockchain.addBlock(block);
        if (success) {
            console.log("📥 Bloc reçu d'un pair et ajouté à la blockchain");
            res.send({ message: "Bloc ajouté" });
        } else {
            res.status(400).send({ message: "Bloc rejeté" });
            console.log("❌ Bloc rejeté par un pair");
        }
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

app.post("/startVote", verifyToken, (req, res) => {
    const { subject, options, votersUid } = req.body;
    const isAdmin = req.user.isAdmin;
    if (!isAdmin) {
        return res.status(403).send({ error: "Accès refusé : réservé aux administrateurs" });
    }
    try {
        const voteId = crypto.randomUUID();
        
        const transaction = { 
            voteId: voteId,
            subject: subject, 
            options: options, 
            votersUid: votersUid,
            type: "startVote", 
            startTime: Date.now() 
        };

        votingBlockchain.addTransaction(transaction);
        broadcastTransaction(transaction);
        console.log(`📥 Nouveau vote démarré: ${subject} (ID: ${voteId})`);
        res.send({ message: "Vote démarré avec succès.", voteId: voteId });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.post("/vote", verifyToken, (req, res) => {
    const { voteId, choice } = req.body;
    const voterId = req.user.uid;
    try {
        if (!voteId) throw new Error("voteId est requis.");
        const startTx = votingBlockchain.getVoteStartTransaction(voteId);

        if (!startTx) {
            throw new Error("Vote introuvable.");
        }
        
        if (!startTx.options.includes(choice)) {
            throw new Error("Option de vote invalide.");
        }

        const transaction = { voteId: voteId, voterId: voterId, choice: choice };
        votingBlockchain.addTransaction(transaction);
        broadcastTransaction(transaction);

        console.log(`📥 Nouveau vote reçu pour le vote ID: ${voteId}`);
        res.send({ message: "Vote enregistré avec succès." });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.post("/endVote", verifyToken, async (req, res) => {
    const { voteId } = req.body;
    const isAdmin = req.user.isAdmin;
    if (!isAdmin) {
        return res.status(403).send({ error: "Accès refusé : réservé aux administrateurs" });
    }
    try {
        if (!voteId) throw new Error("voteId est requis.");

        const results = {};
        
        votingBlockchain.pendingTransactions.forEach(tx => {
            if (tx.voteId === voteId && tx.choice) {
                results[tx.choice] = (results[tx.choice] || 0) + 1;
            }
        });

        const endTransaction = { 
            type: "endVote", 
            voteId: voteId,
            endTime: Date.now(), 
            results: results 
        };

        votingBlockchain.addTransaction(endTransaction);
        broadcastTransaction(endTransaction);

        const newBlock = await votingBlockchain.minePendingTransactions(voteId);
        if (newBlock) {
            broadcastBlock(newBlock);
        }
    
        console.log(`📥 Vote terminé pour le vote ID: ${voteId}`);
        res.send({ message: "Vote terminé et bloc miné avec succès.", results: results });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.get("/results/:voteId", (req, res) => {
    const { voteId } = req.params;
    try {
        // Chercher la transaction de fin dans la blockchain
        let endTx = null;
        
        // Recherche inversée pour trouver le plus récent
        for (let i = votingBlockchain.chain.length - 1; i >= 0; i--) {
            const block = votingBlockchain.chain[i];
            if (Array.isArray(block.data)) {
                endTx = block.data.find(tx => tx.type === "endVote" && tx.voteId === voteId);
                if (endTx) break;
            }
        }

        if (endTx) {
            console.log(`📥 Résultats récupérés pour le vote ID: ${voteId}`);
            res.send({ results: endTx.results });
        } else {
            console.log(`📥 Résultats demandés pour un vote non terminé ou introuvable (ID: ${voteId})`);
            res.send({ message: "Le vote n'est pas encore terminé ou est introuvable." });
        }
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.get("/chain", (req, res) => {
    try {
        res.send(votingBlockchain);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

async function startServer() {
    await connectDB(); // ⬅ Connexion MongoDB

    await votingBlockchain.initialize(); // ⬅ Initialisation de la blockchain depuis la BDD

    app.listen(port, () => {
        console.log(`Serveur démarré sur http://localhost:${port}`);
    });
}

startServer();