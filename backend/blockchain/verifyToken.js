//Middleware to verify token from Auth Service
const axios = require('axios'); // Keeping axios if needed for other things, but removing usage here
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config();
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3005";

// Load Public Key
const publicKeyPath = path.join(__dirname, 'keys', 'public.pem');
let publicKey;
try {
    publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
    console.error("Error loading public key:", error);
    process.exit(1);
}

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Token manquant');
    }

    const token = authHeader.split('Bearer ')[1];
    console.log("Token reçu:", token);
    try {
        console.log("Vérification du token localement...");
        // Verify token using Public Key
        const decodedToken = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Erreur lors de la vérification du token:", error.message);
        res.status(401).send('Token invalide ou expiré');
    }
};

module.exports = verifyToken;