const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

dotenv.config();

// firebase initialization
const { initializeApp } = require("firebase/app");
const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = require("firebase/auth");
const PORT = process.env.PORT || 3005;

const firebaseConfig = require('./appInit.json');
initializeApp(firebaseConfig);
const auth = getAuth();

const app = express();
app.use(cors());
app.use(express.json());

// --- CONFIGURATION ---

// 1. Initialiser le SDK Admin (Pour gérer les utilisateurs)
const serviceAccount = require('./serviceAccount.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Load Keys
const privateKeyPath = path.join(__dirname, 'keys', 'private.pem');
const publicKeyPath = path.join(__dirname, 'keys', 'public.pem');

let privateKey, publicKey;

try {
  privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  publicKey = fs.readFileSync(publicKeyPath, 'utf8');
} catch (error) {
  console.error("Error loading keys:", error);
  process.exit(1);
}

// Function to generate Access Token
const generateAccessToken = (user) => {
  const payload = {
    uid: user.uid,
    email: user.email,
    admin: user.admin || false
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1h' });
};

// --- ROUTES PUBLIQUES (Utilisateurs Lambda) ---

// 1. INSCRIPTION (Création de compte)
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userCredentials = await createUserWithEmailAndPassword(auth, email, password)
    // const token = await userCredentials.user.getIdToken(); // Old Firebase Token

    // Generate Custom JWT
    const token = generateAccessToken({ uid: userCredentials.user.uid, email: userCredentials.user.email });

    res.status(201).json({ uid: userCredentials.user.uid, email: userCredentials.user.email, token: token });
    console.log('Utilisateur créé avec succès :', userCredentials.user.uid, userCredentials.user.email);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
})

// 2. CONNEXION (Login)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // On appelle l'API REST de Firebase pour vérifier le mot de passe
    const userCredentials = await signInWithEmailAndPassword(auth, email, password)
    console.log('Utilisateur connecté avec succès :', userCredentials.user.uid, userCredentials.user.email);

    // Check if user is admin (fetch custom claims if needed, or just default to false for now, 
    // but better to fetch from admin SDK if we want to include it in token)
    // For simplicity, we'll just generate the token. If we need admin claim, we should fetch it.
    let isAdmin = false;
    try {
      const userRecord = await admin.auth().getUser(userCredentials.user.uid);
      isAdmin = userRecord.customClaims && userRecord.customClaims.admin === true;
    } catch (e) {
      console.error("Error fetching user record for admin check:", e);
    }
    console.log("isAdmin:", isAdmin);

    const token = generateAccessToken({
      uid: userCredentials.user.uid,
      email: userCredentials.user.email,
      admin: isAdmin
    });

    res.json({ uid: userCredentials.user.uid, email: userCredentials.user.email, token: token });

  } catch (error) {
    // Gestion des erreurs (mauvais mot de passe, etc.)
    console.error("Login error:", error);
    res.status(401).json({ error: "Email ou mot de passe invalide" });
  }
});

// --- MIDDLEWARE DE SÉCURITÉ ---

// Vérifie si le token envoyé est valide
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('Token manquant');
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    // Verify using Public Key
    const decodedToken = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    req.user = decodedToken; // On attache l'utilisateur à la requête
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    res.status(401).send('Token invalide ou expiré');
  }
};

app.get('/verifyToken', verifyToken, (req, res) => {
  try {
    res.json({ uid: req.user.uid, email: req.user.email, isAdmin: req.user.admin === true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. LISTER LES UTILISATEURS (Admin seulement)
app.get('/admin/users', verifyToken, async (req, res) => {
  // Vérification supplémentaire : est-ce un admin ?
  if (req.user.admin !== true) {
    return res.status(403).json({ error: "Accès refusé : réservé aux administrateurs" });
  }

  try {
    const listUsersResult = await admin.auth().listUsers(1000);
    const users = listUsersResult.users.map(user => ({
      uid: user.uid,
      email: user.email,
      lastSignIn: user.metadata.lastSignInTime
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour devenir admin (à utiliser avec précaution)
app.post('/admin/make-admin', async (req, res) => {
  // Vérification supplémentaire : est-ce un admin ?
  const { uid } = req.body;
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    res.json({ message: `L'utilisateur ${uid} est maintenant un administrateur.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Service Auth complet démarré sur le port ${PORT}`);
});