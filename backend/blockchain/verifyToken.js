//Middleware to verify token from Auth Service
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();
const authServiceUrl = process.env.AUTH_SERVICE_URL || "http://localhost:3005";

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Token manquant');
    }

    const token = authHeader.split('Bearer ')[1];
    console.log("Token reçu:", token);
    try {
        console.log("Appel du service d'authentification pour vérifier le token...");
        // Verify token by calling Auth Service
        const response = await axios.get(`${authServiceUrl}/verifyToken`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        req.user = response.data;
        next();
    } catch (error) {
        console.error("Erreur lors de la vérification du token:", error.message);
        res.status(401).send('Token invalide ou expiré');
    }
};

module.exports = verifyToken;