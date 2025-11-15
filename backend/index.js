const Blockchain = require("./Blockchain");
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectDB } = require("./db");

dotenv.config();

const app = express();
const port = process.env.PORT ||3000;
app.use(bodyParser.json());
app.use(cors());

const votingBlockchain = new Blockchain();

app.post("/startVote", (req, res) => {
    const { subject, options } = req.body;
    try {
        if (votingBlockchain.pendingTransactions.length > 0 &&
            votingBlockchain.pendingTransactions[0].type === "startVote") {
            throw new Error("Un vote est déjà en cours.");
        }
        votingBlockchain.addTransaction({ subject: subject, options: options, type: "startVote", startTime: Date.now() });
        res.send({ message: "Vote démarré avec succès." });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.post("/vote", (req, res) => {
    const { voterId, choice } = req.body;
    try {
        if (votingBlockchain.pendingTransactions.length === 0 ||
            votingBlockchain.pendingTransactions[0].type !== "startVote") {
            throw new Error("Aucun vote en cours.");
        }
        if (!votingBlockchain.pendingTransactions[0].options.includes(choice)) {
            throw new Error("Option de vote invalide.");
        }
        votingBlockchain.addTransaction({ voterId: voterId, choice: choice });
        res.send({ message: "Vote enregistré avec succès." });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.post("/endVote", (req, res) => {
    try {
        const results = {};
        if (votingBlockchain.pendingTransactions.length === 0 ||
            votingBlockchain.pendingTransactions[0].type !== "startVote" ||
            votingBlockchain.pendingTransactions.some(tx => tx.type === "endVote")) {
            throw new Error("Aucun vote en cours à terminer.");
        }
        votingBlockchain.pendingTransactions.forEach(tx => {
            if (tx.type !== "startVote" && tx.type !== "endVote") {
                results[tx.choice] = (results[tx.choice] || 0) + 1;
            }
        });
        votingBlockchain.addTransaction({ type: "endVote", endTime: Date.now(), results: results });
        votingBlockchain.minePendingTransactions();
        res.send({ message: "Vote terminé et bloc miné avec succès." });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.get("/results", (req, res) => {
    try {
        const latestBlock = votingBlockchain.getLatestBlock();
        const endVoteTransaction = latestBlock.data.find(tx => tx.type === "endVote");
        if (endVoteTransaction) {
            res.send({ results: endVoteTransaction.results });
        } else {
            res.send({ message: "Le vote n'est pas encore terminé." });
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