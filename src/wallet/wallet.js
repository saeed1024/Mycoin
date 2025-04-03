/**
 * MyCoin Wallet Implementation
 * 
 * This module provides wallet functionality for MyCoin including:
 * - Key generation and management
 * - Address creation
 * - Transaction creation and signing
 * - Balance tracking and history
 * - Mnemonic seed phrase support
 */

const crypto = require('crypto');
const Transaction = require('../core/transaction');

class Wallet {
    /**
     * Initialize a new wallet
     * 
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.accounts = new Map(); // Map of addresses to account info
        this.mnemonicEnabled = options.mnemonicEnabled || true;
        this.currentAccount = null;
        this.networkProvider = options.networkProvider || null;
    }

    /**
     * Create a new account in the wallet
     * 
     * @param {string} name - Name for the account
     * @param {string} passphrase - Optional passphrase for encryption
     * @returns {Object} - The created account info
     */
    createAccount(name, passphrase = '') {
        // Generate key pair
        const { privateKey, publicKey } = this.generateKeyPair();
        
        // Derive address from public key
        const address = this.deriveAddress(publicKey);
        
        // Create account object
        const account = {
            name,
            address,
            publicKey,
            privateKey: passphrase ? this.encryptPrivateKey(privateKey, passphrase) : privateKey,
            isEncrypted: passphrase ? true : false,
            created: Date.now(),
            balance: 0,
            transactions: []
        };
        
        // Store account
        this.accounts.set(address, account);
        
        // Set as current if first account
        if (!this.currentAccount) {
            this.currentAccount = address;
        }
        
        return {
            name: account.name,
            address: account.address,
            publicKey: account.publicKey,
            created: account.created
        };
    }

    /**
     * Generate a cryptographic key pair
     * 
     * @returns {Object} - Public and private keys
     */
    generateKeyPair() {
        // In a real implementation, this would use elliptic curve cryptography
        // For demonstration, we'll use a simple RSA key pair
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
        
        return { privateKey, publicKey };
    }

    /**
     * Derive a blockchain address from a public key
     * 
     * @param {string} publicKey - Public key to derive from
     * @returns {string} - Blockchain address
     */
    deriveAddress(publicKey) {
        // Create a hash of the public key (simplified)
        const hash = crypto
            .createHash('sha256')
            .update(publicKey)
            .digest('hex');
            
        // Take first 40 chars as the address (similar to Ethereum)
        return hash.substring(0, 40);
    }

    /**
     * Encrypt a private key with a passphrase
     * 
     * @param {string} privateKey - Private key to encrypt
     * @param {string} passphrase - Passphrase for encryption
     * @returns {string} - Encrypted private key
     */
    encryptPrivateKey(privateKey, passphrase) {
        // In a real implementation, this would use a more robust algorithm
        // For demonstration, using a simple AES encryption
        const cipher = crypto.createCipher('aes-256-cbc', passphrase);
        let encrypted = cipher.update(privateKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return encrypted;
    }

    /**
     * Decrypt a private key with a passphrase
     * 
     * @param {string} encryptedKey - Encrypted private key
     * @param {string} passphrase - Passphrase for decryption
     * @returns {string} - Decrypted private key
     */
    decryptPrivateKey(encryptedKey, passphrase) {
        try {
            const decipher = crypto.createDecipher('aes-256-cbc', passphrase);
            let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (error) {
            throw new Error('Invalid passphrase');
        }
    }

    /**
     * Get account information
     * 
     * @param {string} address - Address of the account
     * @returns {Object} - Account information
     */
    getAccount(address = null) {
        const accountAddress = address || this.currentAccount;
        
        if (!accountAddress || !this.accounts.has(accountAddress)) {
            throw new Error('Account not found');
        }
        
        const account = this.accounts.get(accountAddress);
        
        // Return public account info only
        return {
            name: account.name,
            address: account.address,
            publicKey: account.publicKey,
            balance: account.balance,
            created: account.created,
            isEncrypted: account.isEncrypted,
            transactionCount: account.transactions.length
        };
    }

    /**
     * Set the current active account
     * 
     * @param {string} address - Address of the account to activate
     * @returns {boolean} - Success status
     */
    setCurrentAccount(address) {
        if (!this.accounts.has(address)) {
            throw new Error('Account not found');
        }
        
        this.currentAccount = address;
        return true;
    }

    /**
     * Get a list of all accounts in the wallet
     * 
     * @returns {Array} - Array of account summaries
     */
    getAllAccounts() {
        return Array.from(this.accounts.values()).map(account => ({
            name: account.name,
            address: account.address,
            balance: account.balance,
            isEncrypted: account.isEncrypted,
            isCurrent: account.address === this.currentAccount
        }));
    }

    /**
     * Create a new transaction
     * 
     * @param {string} recipientAddress - Recipient's address
     * @param {number} amount - Amount to send
     * @param {Object} options - Additional options
     * @param {string} passphrase - Passphrase if account is encrypted
     * @returns {Object} - The created transaction
     */
    createTransaction(recipientAddress, amount, options = {}, passphrase = '') {
        const {
            fee = 0.0001,
            data = {},
            fromAddress = this.currentAccount
        } = options;
        
        if (!fromAddress || !this.accounts.has(fromAddress)) {
            throw new Error('Sender account not found');
        }
        
        const account = this.accounts.get(fromAddress);
        
        // Check if account has sufficient balance
        if (account.balance < amount + fee) {
            throw new Error('Insufficient balance');
        }
        
        // Get the private key, decrypting if necessary
        let privateKey = account.privateKey;
        if (account.isEncrypted) {
            if (!passphrase) {
                throw new Error('Passphrase required for encrypted account');
            }
            privateKey = this.decryptPrivateKey(privateKey, passphrase);
        }
        
        // Create the transaction
        const tx = new Transaction(
            account.address,
            recipientAddress,
            amount,
            fee,
            data
        );
        
        // Sign the transaction
        tx.sign(privateKey);
        
        // Store in account history
        account.transactions.push({
            hash: tx.hash,
            type: 'sent',
            to: recipientAddress,
            amount,
            fee,
            timestamp: tx.timestamp
        });
        
        // Update balance (optimistic update - will be overwritten by actual blockchain state)
        account.balance -= (amount + fee);
        
        return tx;
    }

    /**
     * Send a transaction to the network
     * 
     * @param {Object} transaction - Transaction to send
     * @returns {Promise} - Network response
     */
    async sendTransaction(transaction) {
        if (!this.networkProvider) {
            throw new Error('Network provider not configured');
        }
        
        // Send to network via the provider
        return this.networkProvider.broadcastTransaction(transaction);
    }

    /**
     * Update account balance from the network
     * 
     * @param {string} address - Address to update
     * @returns {Promise} - Updated balance
     */
    async updateBalance(address = null) {
        if (!this.networkProvider) {
            throw new Error('Network provider not configured');
        }
        
        const accountAddress = address || this.currentAccount;
        
        if (!accountAddress || !this.accounts.has(accountAddress)) {
            throw new Error('Account not found');
        }
        
        const balance = await this.networkProvider.getBalance(accountAddress);
        this.accounts.get(accountAddress).balance = balance;
        
        return balance;
    }

    /**
     * Generate a mnemonic seed phrase for wallet backup
     * 
     * @returns {string} - Mnemonic seed phrase
     */
    generateMnemonic() {
        // In a real implementation, this would use BIP39
        // For demonstration, we'll create a simple word-based backup
        
        // Create entropy
        const entropy = crypto.randomBytes(16);
        
        // Simplified word list (in a real implementation, this would be BIP39 wordlist)
        const wordlist = [
            'apple', 'banana', 'orange', 'grape', 'lemon', 'cherry', 'peach',
            'water', 'ocean', 'river', 'mountain', 'forest', 'desert', 'canyon',
            'earth', 'moon', 'sun', 'star', 'galaxy', 'universe', 'planet', 'comet',
            'music', 'art', 'dance', 'song', 'poetry', 'novel', 'story', 'book',
            'time', 'space', 'energy', 'matter', 'light', 'dark', 'color', 'sound'
        ];
        
        // Convert entropy to word indices
        const indices = [];
        for (let i = 0; i < entropy.length; i++) {
            indices.push(entropy[i] % wordlist.length);
        }
        
        // Create the mnemonic phrase
        return indices.map(index => wordlist[index]).join(' ');
    }

    /**
     * Restore wallet from mnemonic phrase
     * 
     * @param {string} mnemonic - Mnemonic seed phrase
     * @param {string} passphrase - Optional passphrase for encryption
     * @returns {boolean} - Success status
     */
    restoreFromMnemonic(mnemonic, passphrase = '') {
        // In a real implementation, this would use BIP39/BIP44
        // For demonstration, we'll use a simplified approach
        
        // Use the mnemonic as a seed to generate a deterministic private key
        const seed = crypto
            .createHash('sha256')
            .update(mnemonic)
            .digest('hex');
            
        // Generate a deterministic key pair (simplified)
        const privateKey = crypto
            .createHash('sha256')
            .update(seed + '0') // Account index 0
            .digest('hex');
            
        const publicKey = crypto
            .createHash('sha256')
            .update(privateKey + 'pub')
            .digest('hex');
            
        // Derive address
        const address = this.deriveAddress(publicKey);
        
        // Create account
        const account = {
            name: 'Restored Account',
            address,
            publicKey,
            privateKey: passphrase ? this.encryptPrivateKey(privateKey, passphrase) : privateKey,
            isEncrypted: passphrase ? true : false,
            created: Date.now(),
            balance: 0,
            transactions: []
        };
        
        // Store account
        this.accounts.set(address, account);
        this.currentAccount = address;
        
        return true;
    }

    /**
     * Export account private key (for backup)
     * 
     * @param {string} address - Address of account to export
     * @param {string} passphrase - Passphrase if account is encrypted
     * @returns {string} - Private key
     */
    exportPrivateKey(address = null, passphrase = '') {
        const accountAddress = address || this.currentAccount;
        
        if (!accountAddress || !this.accounts.has(accountAddress)) {
            throw new Error('Account not found');
        }
        
        const account = this.accounts.get(accountAddress);
        
        // Decrypt if necessary
        let privateKey = account.privateKey;
        if (account.isEncrypted) {
            if (!passphrase) {
                throw new Error('Passphrase required for encrypted account');
            }
            privateKey = this.decryptPrivateKey(privateKey, passphrase);
        }
        
        return privateKey;
    }
    
    /**
     * Import account from private key
     * 
     * @param {string} privateKey - Private key to import
     * @param {string} name - Name for the account
     * @param {string} passphrase - Optional passphrase for encryption
     * @returns {Object} - The imported account info
     */
    importPrivateKey(privateKey, name, passphrase = '') {
        // Derive public key (simplified)
        const publicKey = crypto
            .createHash('sha256')
            .update(privateKey + 'pub')
            .digest('hex');
            
        // Derive address
        const address = this.deriveAddress(publicKey);
        
        // Check if account already exists
        if (this.accounts.has(address)) {
            throw new Error('Account already exists in wallet');
        }
        
        // Create account object
        const account = {
            name,
            address,
            publicKey,
            privateKey: passphrase ? this.encryptPrivateKey(privateKey, passphrase) : privateKey,
            isEncrypted: passphrase ? true : false,
            created: Date.now(),
            balance: 0,
            transactions: []
        };
        
        // Store account
        this.accounts.set(address, account);
        
        return {
            name: account.name,
            address: account.address,
            publicKey: account.publicKey,
            created: account.created
        };
    }
}

module.exports = Wallet; 