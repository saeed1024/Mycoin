/**
 * MyCoin Blockchain Core Implementation
 * 
 * This module defines the primary blockchain data structure and operations
 * for the MyCoin cryptocurrency. It handles the following:
 * - Chain initialization
 * - Block addition and validation
 * - Chain state management
 * - Genesis block creation
 * - Fork handling 
 */

class Blockchain {
    constructor() {
        this.chain = [];
        this.currentTransactions = [];
        this.difficulty = 4; // Initial difficulty setting
        this.blockTime = 3; // Target block time in seconds
        this.maxSupply = 100000000; // 100 million coins
        this.blockReward = 50; // Initial block reward
        this.halvingInterval = 840000; // Blocks until reward halving (approx. 4 years at 3-sec blocks)
        
        // Create the genesis block if chain is empty
        if (this.chain.length === 0) {
            this.createGenesisBlock();
        }
    }

    /**
     * Creates the genesis block with predefined parameters
     */
    createGenesisBlock() {
        const genesisBlock = {
            index: 0,
            timestamp: Date.now(),
            transactions: [],
            previousHash: "0".repeat(64),
            hash: "0".repeat(64),
            validator: "MyCoin Genesis",
            signature: "0".repeat(128),
            difficulty: this.difficulty,
            nonce: 0
        };

        this.chain.push(genesisBlock);
        return genesisBlock;
    }

    /**
     * Gets the latest block in the chain
     */
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    /**
     * Calculates the current mining reward based on the halvings
     */
    getCurrentBlockReward() {
        const currentBlockHeight = this.chain.length;
        const halvings = Math.floor(currentBlockHeight / this.halvingInterval);
        
        // Cap halvings at 64 (when reward effectively becomes 0)
        const cappedHalvings = Math.min(halvings, 64);
        return this.blockReward / Math.pow(2, cappedHalvings);
    }

    /**
     * Adds a new transaction to the pending transaction pool
     */
    addTransaction(transaction) {
        // Validate transaction (simplified for demo)
        if (!transaction.sender || !transaction.recipient || transaction.amount <= 0) {
            throw new Error("Invalid transaction");
        }
        
        this.currentTransactions.push(transaction);
        return this.getLatestBlock().index + 1;
    }

    /**
     * Basic transaction validation
     */
    isValidTransaction(transaction) {
        // Basic validation (simplified for demo)
        return (
            transaction.sender && 
            transaction.recipient && 
            transaction.amount > 0
        );
    }

    /**
     * Adds a new block to the chain after validation
     */
    addBlock(block, validator, signature) {
        const previousBlock = this.getLatestBlock();
        
        // Set the correct block index
        block.index = this.chain.length;
        
        // Ensure the block points to the correct previous hash
        if (block.previousHash !== previousBlock.hash) {
            console.log(`Invalid previous hash: ${block.previousHash} vs ${previousBlock.hash}`);
            block.previousHash = previousBlock.hash;
        }
        
        // All checks passed, add the block
        this.chain.push(block);
        
        // Clear the transactions that were included in this block
        // We need to be careful here to only remove transactions that were actually included
        const txHashes = block.transactions.map(tx => tx.hash || JSON.stringify(tx));
        this.currentTransactions = this.currentTransactions.filter(tx => 
            !txHashes.includes(tx.hash || JSON.stringify(tx))
        );
        
        // Adjust difficulty if needed
        this.adjustDifficulty();
        
        console.log(`Added block ${block.index} with hash ${block.hash}`);
        return true;
    }

    /**
     * Validates the block structure
     */
    isValidBlockStructure(block) {
        return (
            typeof block.index === 'number' &&
            typeof block.timestamp === 'number' &&
            typeof block.transactions === 'object' &&
            typeof block.previousHash === 'string' &&
            typeof block.hash === 'string' &&
            typeof block.validator === 'string'
        );
    }

    /**
     * Dynamically adjusts the mining difficulty based on block times
     */
    adjustDifficulty() {
        if (this.chain.length <= 1) return; // Not enough blocks to adjust
        
        const lastBlock = this.getLatestBlock();
        const prevBlock = this.chain[this.chain.length - 2];
        
        const timeExpected = this.blockTime * 1000; // Convert to milliseconds
        const timeTaken = lastBlock.timestamp - prevBlock.timestamp;
        
        // If blocks are being mined too quickly, increase difficulty
        if (timeTaken < timeExpected * 0.5) {
            this.difficulty++;
        }
        // If blocks are being mined too slowly, decrease difficulty
        else if (timeTaken > timeExpected * 2) {
            this.difficulty = Math.max(1, this.difficulty - 1);
        }
    }

    /**
     * Validates the entire blockchain
     */
    isChainValid() {
        for (let i = 1; i < this.chain.length; i++) {
            const currentBlock = this.chain[i];
            const previousBlock = this.chain[i - 1];
            
            // Verify block hash
            if (currentBlock.previousHash !== previousBlock.hash) {
                return false;
            }
            
            // Verify block structure
            if (!this.isValidBlockStructure(currentBlock)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Handles chain reorganization when a longer valid chain is discovered
     */
    replaceChain(newChain) {
        // Check if the new chain is longer and valid
        if (newChain.length <= this.chain.length) {
            return false; // New chain is not longer
        }
        
        // Validate the new chain (simplified for now)
        if (!this.isValidChain(newChain)) {
            return false; // New chain is invalid
        }
        
        // Replace the chain
        this.chain = newChain;
        
        // Re-run any transactions that were pending
        this.reprocessPendingTransactions();
        
        return true;
    }
    
    /**
     * Reprocesses pending transactions after chain reorganization
     */
    reprocessPendingTransactions() {
        const currentTransactions = [...this.currentTransactions];
        this.currentTransactions = [];
        
        // Add each transaction back to the pending pool
        // (in a real implementation, we would check if any are already in the new chain)
        for (const transaction of currentTransactions) {
            this.addTransaction(transaction);
        }
    }
    
    /**
     * Validates an external chain
     */
    isValidChain(chain) {
        // Check genesis block
        if (JSON.stringify(chain[0]) !== JSON.stringify(this.chain[0])) {
            return false; // Different genesis block
        }
        
        // Basic validation logic for each block in the chain
        for (let i = 1; i < chain.length; i++) {
            const block = chain[i];
            const previousBlock = chain[i - 1];
            
            if (block.previousHash !== previousBlock.hash) {
                return false;
            }
            
            if (!this.isValidBlockStructure(block)) {
                return false;
            }
        }
        
        return true;
    }
}

module.exports = Blockchain; 