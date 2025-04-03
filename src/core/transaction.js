/**
 * MyCoin Transaction Implementation
 * 
 * This module defines the transaction structure and operations for MyCoin.
 * It handles creation, validation, and signing of transactions.
 */

const crypto = require('crypto');

class Transaction {
    /**
     * Creates a new transaction
     * 
     * @param {string} sender - Sender's public key or address
     * @param {string} recipient - Recipient's public key or address
     * @param {number} amount - Amount to transfer
     * @param {number} fee - Transaction fee
     * @param {Object} data - Optional data payload for smart contracts
     */
    constructor(sender, recipient, amount, fee = 0.0001, data = {}) {
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount;
        this.fee = fee;
        this.data = data;
        this.timestamp = Date.now();
        this.signature = '';
        this.hash = this.calculateHash();
    }

    /**
     * Calculates the transaction hash
     */
    calculateHash() {
        const transactionData = {
            sender: this.sender,
            recipient: this.recipient,
            amount: this.amount,
            fee: this.fee,
            data: this.data,
            timestamp: this.timestamp
        };

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(transactionData))
            .digest('hex');
    }

    /**
     * Signs the transaction with the provided private key
     * 
     * @param {string} privateKey - Sender's private key or any string for demo
     */
    sign(privateKey) {
        // Simplified signing for demo
        // In a real implementation, this would use proper crypto signing
        this.signature = crypto
            .createHash('sha256')
            .update(this.hash + privateKey)
            .digest('hex');
            
        return this.signature;
    }

    /**
     * Verifies the transaction signature
     * 
     * @returns {boolean} - True if signature is valid
     */
    isValid() {
        // If it's a coinbase transaction (no sender), it's valid
        if (this.sender === "0".repeat(64)) {
            return true;
        }

        // Check if transaction has a signature
        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }

        // Simplified verification for demo
        // In a real implementation, this would verify the signature cryptographically
        return true;
    }

    /**
     * Creates a coinbase transaction (mining reward)
     * 
     * @param {string} recipient - Miner's public key/address
     * @param {number} amount - Reward amount
     * @returns {Transaction} - A new coinbase transaction
     */
    static createCoinbaseTransaction(recipient, amount) {
        const tx = new Transaction("0".repeat(64), recipient, amount, 0);
        tx.signature = "COINBASE";
        return tx;
    }

    /**
     * Creates a contract creation transaction
     * 
     * @param {string} sender - Contract creator's address
     * @param {string} contractCode - The smart contract bytecode
     * @param {number} fee - Transaction fee
     * @returns {Transaction} - A new contract creation transaction
     */
    static createContractTransaction(sender, contractCode, fee) {
        const tx = new Transaction(
            sender,
            "CONTRACT_CREATION",
            0,
            fee,
            { type: "CONTRACT_CREATION", code: contractCode }
        );
        
        return tx;
    }
    
    /**
     * Creates a contract call transaction
     * 
     * @param {string} sender - Caller's address
     * @param {string} contractAddress - The contract's address
     * @param {string} methodName - Name of the method to call
     * @param {Array} parameters - Parameters for the method call
     * @param {number} amount - Value to send with the call
     * @param {number} fee - Transaction fee
     * @returns {Transaction} - A new contract call transaction
     */
    static createContractCallTransaction(sender, contractAddress, methodName, parameters, amount, fee) {
        const tx = new Transaction(
            sender,
            contractAddress,
            amount,
            fee,
            { 
                type: "CONTRACT_CALL", 
                method: methodName, 
                params: parameters 
            }
        );
        
        return tx;
    }
    
    /**
     * Creates a privacy-preserving transaction using zero-knowledge proofs
     * 
     * @param {string} sender - Sender's public key/address (or blinded value)
     * @param {string} recipient - Recipient's public key/address (or blinded value)
     * @param {Object} zkProof - Zero-knowledge proof data
     * @param {number} fee - Transaction fee
     * @returns {Transaction} - A new private transaction
     */
    static createPrivateTransaction(sender, recipient, zkProof, fee) {
        const tx = new Transaction(
            sender,
            recipient,
            0, // Amount is hidden in the proof
            fee,
            { 
                type: "PRIVATE_TRANSFER", 
                proof: zkProof 
            }
        );
        
        return tx;
    }
    
    /**
     * Serialize the transaction to JSON
     */
    toJSON() {
        return {
            sender: this.sender,
            recipient: this.recipient,
            amount: this.amount,
            fee: this.fee,
            data: this.data,
            timestamp: this.timestamp,
            signature: this.signature,
            hash: this.hash
        };
    }
    
    /**
     * Deserialize from JSON
     * 
     * @param {Object} json - Transaction data in JSON format
     * @returns {Transaction} - Reconstructed transaction
     */
    static fromJSON(json) {
        const tx = new Transaction(
            json.sender,
            json.recipient,
            json.amount,
            json.fee,
            json.data
        );
        
        tx.timestamp = json.timestamp;
        tx.signature = json.signature;
        tx.hash = json.hash;
        
        return tx;
    }
}

module.exports = Transaction; 