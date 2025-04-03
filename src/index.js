/**
 * MyCoin - Main Application Entry Point
 * 
 * This file initializes all components of the MyCoin blockchain
 * and starts the network node.
 */

const express = require('express');
const bodyParser = require('body-parser');
const Blockchain = require('./core/blockchain');
const DPoSConsensus = require('./consensus/dpos');
const ContractVM = require('./contracts/vm');
const ZKTransactions = require('./privacy/zkTransactions');
const GovernanceSystem = require('./governance/proposals');
const Wallet = require('./wallet/wallet');

// State manager for smart contracts (simplified here)
const StateManager = {
    getContractCode: (address) => {
        // In a full implementation, this would retrieve code from storage
        return null;
    },
    setContractCode: (address, code) => {
        // In a full implementation, this would store code
        console.log(`Contract deployed at ${address}`);
    }
};

// Initialize the blockchain components
const blockchain = new Blockchain();
const consensus = new DPoSConsensus({
    delegateCount: 21,
    blockTime: 3,
    epochLength: 10080
});
const vm = new ContractVM(StateManager);
const privacy = new ZKTransactions();
const governance = new GovernanceSystem();

// Create a wallet
const wallet = new Wallet();

// Initialize API server
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// API endpoints for interacting with the blockchain
app.get('/api/info', (req, res) => {
    res.json({
        height: blockchain.chain.length,
        lastBlock: blockchain.getLatestBlock(),
        activeDelegates: consensus.activeDelegates.length,
        pendingTransactions: blockchain.currentTransactions.length
    });
});

app.get('/api/blocks', (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const blocks = blockchain.chain.slice(-limit).reverse();
    res.json(blocks);
});

app.get('/api/transactions/pending', (req, res) => {
    res.json(blockchain.currentTransactions);
});

app.post('/api/transactions', (req, res) => {
    try {
        const { transaction } = req.body;
        const blockIndex = blockchain.addTransaction(transaction);
        res.json({ 
            success: true, 
            message: `Transaction added to pending pool, will be included in block ${blockIndex}` 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.get('/api/governance/proposals', (req, res) => {
    const status = req.query.status;
    const proposals = governance.getProposals(status);
    res.json(proposals);
});

app.post('/api/governance/proposals', (req, res) => {
    try {
        const { proposer, title, description, changes, deposit } = req.body;
        const proposal = governance.createProposal(proposer, title, description, changes, deposit);
        res.json({ 
            success: true, 
            proposal 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

app.post('/api/governance/vote', (req, res) => {
    try {
        const { proposalId, voter, vote, stakeWeight } = req.body;
        const success = governance.castVote(proposalId, voter, vote, stakeWeight);
        res.json({ 
            success, 
            message: 'Vote recorded successfully' 
        });
    } catch (error) {
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
});

// Start the API server
app.listen(PORT, () => {
    console.log(`MyCoin node running on http://localhost:${PORT}`);
    console.log('Blockchain initialized with genesis block');
    console.log(`Current blockchain height: ${blockchain.chain.length}`);
    
    // In a production environment, we would also:
    // 1. Initialize P2P networking for node communication
    // 2. Start synchronizing with the network
    // 3. Begin validating transactions and producing blocks if a validator
    // 4. Connect to a database for persistent storage
});

// For demonstration purposes, create a simulated block production loop
// In production, this would be integrated with the P2P network
const simulateBlockProduction = async () => {
    // Create a demo account in the wallet
    const account = wallet.createAccount('Demo Validator');
    
    // Register as a validator
    consensus.registerDelegate(account.address, { name: 'Demo Validator' }, 50000);
    
    // Update votes to make this account a validator
    consensus.votes.set(account.address, 1000000);
    
    // Update active delegates
    consensus.updateDelegates();
    
    setInterval(() => {
        if (blockchain.currentTransactions.length > 0 && 
            consensus.isTimeForNextBlock(Date.now())) {
            
            try {
                // Get the latest block for correct previous hash
                const latestBlock = blockchain.getLatestBlock();
                const previousHash = latestBlock.hash;
                
                // Create a new block with the correct previous hash
                const newBlock = consensus.createBlock(
                    blockchain.currentTransactions,
                    previousHash,
                    account.address,
                    'DEMO_PRIVATE_KEY' // This would be the actual private key in production
                );
                
                // Add the block to the chain
                const success = blockchain.addBlock(newBlock, account.address, newBlock.signature);
                
                if (success) {
                    console.log(`New block produced at height ${blockchain.chain.length - 1}`);
                    console.log(`Block hash: ${newBlock.hash}`);
                    console.log(`Transactions included: ${newBlock.transactions.length}`);
                    
                    // Update governance proposals
                    governance.updateProposalStatuses();
                    
                    // Implement approved governance proposals
                    const readyProposals = governance.getProposalsReadyForImplementation();
                    readyProposals.forEach(proposal => {
                        console.log(`Implementing proposal: ${proposal.title}`);
                        governance.markProposalImplemented(proposal.id);
                    });
                } else {
                    console.error('Failed to add block to chain');
                }
                
            } catch (error) {
                console.error('Error producing block:', error.message);
            }
        }
    }, 3000); // Try to produce a block every 3 seconds
};

// Start the simulated block production in development
if (process.env.NODE_ENV !== 'production') {
    simulateBlockProduction().catch(console.error);
    
    // Create some demo transactions
    setInterval(() => {
        if (Math.random() > 0.5) {
            const tx = {
                sender: '0'.repeat(64), // Genesis address
                recipient: `user${Math.floor(Math.random() * 1000)}`,
                amount: Math.random() * 100,
                fee: 0.001,
                signature: 'DEMO_SIGNATURE'
            };
            
            try {
                blockchain.addTransaction(tx);
                console.log('Demo transaction added to pending pool');
            } catch (error) {
                console.error('Error adding demo transaction:', error.message);
            }
        }
    }, 5000); // Add a transaction approximately every 5 seconds
}

module.exports = {
    blockchain,
    consensus,
    vm,
    privacy,
    governance,
    wallet
}; 