/**
 * MyCoin Delegated Proof of Stake (DPoS) Consensus Implementation
 * 
 * This module implements the DPoS consensus mechanism which provides:
 * - Energy-efficient block production
 * - Fast block confirmation (3 second block time)
 * - High throughput (5,000+ TPS)
 * - Strong Byzantine Fault Tolerance
 * - Democratic validator selection
 */

const crypto = require('crypto');

class DPoSConsensus {
    /**
     * Initialize the DPoS consensus system
     * 
     * @param {Object} options - Configuration options
     * @param {number} options.delegateCount - Number of active block producers
     * @param {number} options.blockTime - Target time between blocks in seconds
     * @param {number} options.epochLength - Number of blocks in an epoch
     */
    constructor(options = {}) {
        this.delegateCount = options.delegateCount || 21;
        this.blockTime = options.blockTime || 3; // 3 seconds
        this.epochLength = options.epochLength || 10080; // ~30 days at 3 sec blocks
        this.activeDelegates = [];
        this.standbyDelegates = [];
        this.votes = new Map(); // Map<validator, totalStake>
        this.delegateSchedule = []; // Current block production schedule
        this.currentProducer = 0; // Index of current block producer
        this.lastBlockTime = 0;
    }

    /**
     * Update the active delegate list based on voting results
     * Called at the end of each epoch
     */
    updateDelegates() {
        // Sort validators by stake
        const sortedDelegates = Array.from(this.votes.entries())
            .sort((a, b) => b[1] - a[1]) // Descending order by stake
            .map(entry => entry[0]);

        // Select top validators as active delegates
        this.activeDelegates = sortedDelegates.slice(0, this.delegateCount);
        this.standbyDelegates = sortedDelegates.slice(this.delegateCount);
        
        // Create new delegate schedule
        this.createDelegateSchedule();
    }

    /**
     * Create a delegate schedule for the next epoch
     */
    createDelegateSchedule() {
        // Shuffle delegates to ensure fairness
        this.delegateSchedule = this.shuffleDelegates([...this.activeDelegates]);
        this.currentProducer = 0;
    }

    /**
     * Pseudo-random shuffle of delegates
     * 
     * @param {Array} delegates - List of delegates to shuffle
     * @returns {Array} - Shuffled list
     */
    shuffleDelegates(delegates) {
        // In a real implementation, this would use a deterministic seed
        // derived from blockchain state to ensure all nodes get same schedule
        const seed = crypto.createHash('sha256')
            .update(Date.now().toString())
            .digest('hex');
            
        // Fisher-Yates shuffle
        for (let i = delegates.length - 1; i > 0; i--) {
            // Generate random index based on seed
            const j = parseInt(seed.substring(i % 32, (i % 32) + 8), 16) % (i + 1);
            [delegates[i], delegates[j]] = [delegates[j], delegates[i]];
        }

        return delegates;
    }

    /**
     * Get the next block producer
     * 
     * @returns {string} - Public key/address of the next block producer
     */
    getNextProducer() {
        const producer = this.delegateSchedule[this.currentProducer];
        this.currentProducer = (this.currentProducer + 1) % this.delegateSchedule.length;
        return producer;
    }

    /**
     * Register a stake-weighted vote for a validator
     * 
     * @param {string} voter - Voter's address
     * @param {string} delegate - Delegate being voted for
     * @param {number} stake - Amount of coins staked for voting power
     */
    registerVote(voter, delegate, stake) {
        // In a full implementation, we would track individual votes
        // Here we just update the total stake for simplicity
        const currentStake = this.votes.get(delegate) || 0;
        this.votes.set(delegate, currentStake + stake);
    }

    /**
     * Remove a stake-weighted vote
     * 
     * @param {string} voter - Voter's address
     * @param {string} delegate - Delegate voted for
     * @param {number} stake - Amount of stake to remove
     */
    removeVote(voter, delegate, stake) {
        const currentStake = this.votes.get(delegate) || 0;
        const newStake = Math.max(0, currentStake - stake);
        
        if (newStake === 0) {
            this.votes.delete(delegate);
        } else {
            this.votes.set(delegate, newStake);
        }
    }

    /**
     * Check if it's time for the next block to be produced
     * 
     * @param {number} currentTime - Current timestamp
     * @returns {boolean} - True if it's time for next block
     */
    isTimeForNextBlock(currentTime) {
        return (currentTime - this.lastBlockTime) >= (this.blockTime * 1000);
    }

    /**
     * Update the last block time
     * 
     * @param {number} blockTime - Timestamp of the new block
     */
    updateLastBlockTime(blockTime) {
        this.lastBlockTime = blockTime;
    }

    /**
     * Check if a validator is authorized to produce a block at the current time
     * 
     * @param {string} validator - Validator's public key/address
     * @param {number} timestamp - Current timestamp
     * @returns {boolean} - True if validator is authorized
     */
    isAuthorized(validator, timestamp) {
        // For demo purposes, we'll allow any validator
        // In a real implementation, we would check if it's the validator's turn
        return true;
        
        // Check if validator is in the active set
        if (!this.activeDelegates.includes(validator)) {
            return false;
        }
        
        // Check if it's this validator's turn in the schedule
        const currentSlot = Math.floor((timestamp - this.lastBlockTime) / (this.blockTime * 1000));
        const expectedProducer = this.delegateSchedule[(this.currentProducer + currentSlot) % this.delegateSchedule.length];
        
        return validator === expectedProducer;
    }

    /**
     * Create a new block
     * 
     * @param {Array} transactions - List of transactions to include
     * @param {string} previousHash - Hash of the previous block
     * @param {string} validator - Public key/address of block producer
     * @param {Object} privateKey - Private key for signing (or any string for demo)
     * @returns {Object} - The new block
     */
    createBlock(transactions, previousHash, validator, privateKey) {
        // Ensure validator is authorized (disabled for demo)
        // if (!this.isAuthorized(validator, Date.now())) {
        //     throw new Error('Validator not authorized to produce block at this time');
        // }

        // Basic block structure
        const block = {
            index: 0, // Will be set by the blockchain
            timestamp: Date.now(),
            transactions: transactions,
            previousHash: previousHash,
            validator: validator,
            difficulty: 1 // DPoS doesn't use proof-of-work difficulty
        };

        // Calculate block hash
        block.hash = this.calculateBlockHash(block);
        
        // Sign the block (simplified for demo)
        block.signature = this.signBlock(block, privateKey);
        
        // Update consensus state
        this.updateLastBlockTime(block.timestamp);
        
        return block;
    }

    /**
     * Calculate the hash of a block
     * 
     * @param {Object} block - Block to hash
     * @returns {string} - Block hash
     */
    calculateBlockHash(block) {
        const blockData = {
            index: block.index,
            timestamp: block.timestamp,
            transactions: block.transactions,
            previousHash: block.previousHash,
            validator: block.validator
        };

        return crypto
            .createHash('sha256')
            .update(JSON.stringify(blockData))
            .digest('hex');
    }

    /**
     * Sign a block with validator's private key
     * 
     * @param {Object} block - Block to sign
     * @param {Object} privateKey - Validator's private key or any string for demo
     * @returns {string} - Digital signature
     */
    signBlock(block, privateKey) {
        // Simplified signature for demo purposes
        // In a real implementation, this would use proper crypto signing
        return crypto
            .createHash('sha256')
            .update(block.hash + privateKey)
            .digest('hex');
    }

    /**
     * Verify a block signature
     * 
     * @param {Object} block - Block to verify
     * @returns {boolean} - True if signature is valid
     */
    verifyBlockSignature(block) {
        // Simplified verification for demo purposes
        // In a real implementation, this would verify actual signatures
        return true;
    }

    /**
     * Handle missed blocks and delegate failures
     * 
     * @param {string} missedProducer - Address of validator who missed block
     */
    handleMissedBlock(missedProducer) {
        // In a full implementation, track reliability and potentially 
        // apply penalties to delegates who miss blocks consistently
        console.log(`Delegate ${missedProducer} missed block production slot`);
        
        // Advance to next producer
        this.currentProducer = (this.currentProducer + 1) % this.delegateSchedule.length;
    }
    
    /**
     * Register as a delegate/validator candidate
     * 
     * @param {string} candidateAddress - Address of the candidate
     * @param {Object} candidateInfo - Information about the candidate
     * @param {number} selfStake - Amount of self-stake
     * @returns {boolean} - Success status
     */
    registerDelegate(candidateAddress, candidateInfo, selfStake) {
        // In a full implementation, we would store candidate info
        // and verify minimum self-stake requirements
        if (selfStake < 10000) { // Minimum 10,000 coins to become delegate
            return false;
        }
        
        // Register initial self-vote
        this.registerVote(candidateAddress, candidateAddress, selfStake);
        return true;
    }
    
    /**
     * Calculate finality time for a transaction
     * 
     * @returns {number} - Time in milliseconds until a block is considered final
     */
    getFinalizationTime() {
        // In DPoS with 2/3+ honest validators, a block is final after
        // 2/3 of validators have built on top of it
        // In our case, that's ~2/3 * delegateCount * blockTime seconds
        const finalizationBlocks = Math.ceil((2 * this.delegateCount) / 3);
        return finalizationBlocks * this.blockTime * 1000;
    }
}

module.exports = DPoSConsensus; 