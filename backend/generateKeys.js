const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateKeys() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    const authServiceKeysDir = path.join(__dirname, 'auth-service', 'keys');
    const blockchainKeysDir = path.join(__dirname, 'blockchain', 'keys');

    // Ensure directories exist
    if (!fs.existsSync(authServiceKeysDir)) {
        fs.mkdirSync(authServiceKeysDir, { recursive: true });
    }
    if (!fs.existsSync(blockchainKeysDir)) {
        fs.mkdirSync(blockchainKeysDir, { recursive: true });
    }

    // Write keys
    fs.writeFileSync(path.join(authServiceKeysDir, 'private.pem'), privateKey);
    fs.writeFileSync(path.join(authServiceKeysDir, 'public.pem'), publicKey);
    fs.writeFileSync(path.join(blockchainKeysDir, 'public.pem'), publicKey);

    console.log('Keys generated successfully!');
    console.log(`Private key saved to: ${path.join(authServiceKeysDir, 'private.pem')}`);
    console.log(`Public key saved to: ${path.join(authServiceKeysDir, 'public.pem')}`);
    console.log(`Public key saved to: ${path.join(blockchainKeysDir, 'public.pem')}`);
}

generateKeys();
