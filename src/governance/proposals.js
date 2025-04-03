/**
 * MyCoin Governance System
 * 
 * This module implements the on-chain governance functionality for MyCoin,
 * allowing stakeholders to propose and vote on protocol changes and
 * improvements in a decentralized manner.
 */

class GovernanceSystem {
    /**
     * Initialize the governance system
     * 
     * @param {Object} options - Configuration options
     */
    constructor(options = {}) {
        this.proposals = [];
        this.votingPeriod = options.votingPeriod || 7 * 24 * 60 * 60 * 1000; // Default: 7 days in ms
        this.implementationDelay = options.implementationDelay || 2 * 24 * 60 * 60 * 1000; // 48 hours
        this.minimumQuorum = options.minimumQuorum || 0.1; // 10% of total stake
        this.superMajority = options.superMajority || 0.67; // 67% approval required
        this.proposalDeposit = options.proposalDeposit || 5000; // Required stake to create proposal
        this.totalStake = 0; // Will be updated based on blockchain state
    }

    /**
     * Create a new governance proposal
     * 
     * @param {string} proposer - Address of the proposal creator
     * @param {string} title - Short title of the proposal
     * @param {string} description - Detailed description of the proposal
     * @param {Object} changes - Technical specification of the changes
     * @param {number} deposit - Amount staked for the proposal
     * @returns {Object} - The created proposal
     */
    createProposal(proposer, title, description, changes, deposit) {
        // Validate proposal requirements
        if (deposit < this.proposalDeposit) {
            throw new Error(`Insufficient deposit. Minimum required: ${this.proposalDeposit}`);
        }
        
        // Create proposal object
        const proposal = {
            id: this.generateProposalId(),
            proposer,
            title,
            description,
            changes,
            deposit,
            dateCreated: Date.now(),
            votingEnds: Date.now() + this.votingPeriod,
            implementationDate: Date.now() + this.votingPeriod + this.implementationDelay,
            status: 'ACTIVE',
            votes: {
                yes: 0,
                no: 0,
                abstain: 0
            },
            voterRegistry: {}, // Track who has voted
            outcome: null
        };
        
        this.proposals.push(proposal);
        return proposal;
    }

    /**
     * Generate a unique proposal ID
     * 
     * @returns {string} - Unique proposal identifier
     */
    generateProposalId() {
        // Simple implementation - in production would be more robust
        const crypto = require('crypto');
        return crypto.randomBytes(16).toString('hex');
    }

    /**
     * Cast a vote on a governance proposal
     * 
     * @param {string} proposalId - ID of the proposal
     * @param {string} voter - Address of the voter
     * @param {string} vote - Vote type (yes/no/abstain)
     * @param {number} stakeWeight - Voting power based on stake
     * @returns {boolean} - Success status
     */
    castVote(proposalId, voter, vote, stakeWeight) {
        const proposal = this.getProposal(proposalId);
        
        // Validate proposal status
        if (!proposal || proposal.status !== 'ACTIVE') {
            throw new Error('Proposal is not active');
        }
        
        // Check if voting period has ended
        if (Date.now() > proposal.votingEnds) {
            throw new Error('Voting period has ended');
        }
        
        // Check if voter has already voted
        if (proposal.voterRegistry[voter]) {
            throw new Error('Voter has already voted on this proposal');
        }
        
        // Record the vote
        if (vote === 'yes' || vote === 'no' || vote === 'abstain') {
            proposal.votes[vote] += stakeWeight;
            proposal.voterRegistry[voter] = vote;
            return true;
        }
        
        throw new Error('Invalid vote type. Must be "yes", "no", or "abstain"');
    }

    /**
     * Get a proposal by ID
     * 
     * @param {string} proposalId - ID of the proposal to retrieve
     * @returns {Object|null} - The proposal or null if not found
     */
    getProposal(proposalId) {
        return this.proposals.find(p => p.id === proposalId) || null;
    }

    /**
     * Get all proposals, optionally filtered by status
     * 
     * @param {string} status - Optional status filter
     * @returns {Array} - List of proposals
     */
    getProposals(status) {
        if (status) {
            return this.proposals.filter(p => p.status === status);
        }
        return [...this.proposals];
    }

    /**
     * Update the status of all active proposals
     * Should be called regularly (e.g., every new block)
     */
    updateProposalStatuses() {
        const now = Date.now();
        
        for (const proposal of this.proposals) {
            // Skip proposals that have already been finalized
            if (proposal.status !== 'ACTIVE') {
                continue;
            }
            
            // Check if voting period has ended
            if (now > proposal.votingEnds) {
                this.finalizeProposal(proposal);
            }
        }
    }

    /**
     * Finalize a proposal after voting ends
     * 
     * @param {Object} proposal - Proposal to finalize
     */
    finalizeProposal(proposal) {
        // Calculate total votes
        const totalVotes = proposal.votes.yes + proposal.votes.no + proposal.votes.abstain;
        
        // Check if quorum was reached
        const quorumReached = totalVotes >= (this.totalStake * this.minimumQuorum);
        
        // Check if proposal passed
        const approvalRate = proposal.votes.yes / (proposal.votes.yes + proposal.votes.no);
        const passed = quorumReached && approvalRate >= this.superMajority;
        
        // Update proposal status
        proposal.status = passed ? 'APPROVED' : 'REJECTED';
        proposal.outcome = {
            quorumReached,
            approvalRate,
            totalVotes,
            finalized: Date.now()
        };
        
        // Handle deposit refund logic
        // In a production system, this would trigger an actual transaction
        if (passed || proposal.votes.yes > (this.totalStake * 0.25)) {
            // Refund deposit if proposal passed or got significant support
            console.log(`Refunding deposit of ${proposal.deposit} to ${proposal.proposer}`);
        } else {
            // Deposit is burned or distributed to all stakers
            console.log(`Deposit of ${proposal.deposit} from ${proposal.proposer} is forfeited`);
        }
    }

    /**
     * Get proposals that are ready for implementation
     * 
     * @returns {Array} - List of proposals ready to implement
     */
    getProposalsReadyForImplementation() {
        const now = Date.now();
        return this.proposals.filter(p => 
            p.status === 'APPROVED' && 
            now >= p.implementationDate &&
            !p.implemented
        );
    }

    /**
     * Mark a proposal as implemented
     * 
     * @param {string} proposalId - ID of the implemented proposal
     */
    markProposalImplemented(proposalId) {
        const proposal = this.getProposal(proposalId);
        if (proposal && proposal.status === 'APPROVED') {
            proposal.status = 'IMPLEMENTED';
            proposal.implemented = true;
            proposal.implementationDate = Date.now();
        }
    }

    /**
     * Update the total stake value
     * This should be called regularly to reflect the current blockchain state
     * 
     * @param {number} newTotalStake - Updated total stake in the system
     */
    updateTotalStake(newTotalStake) {
        this.totalStake = newTotalStake;
    }
    
    /**
     * Create a proposal for changing network parameters
     * 
     * @param {string} proposer - Address of the proposal creator
     * @param {string} paramName - Name of the parameter to change
     * @param {any} currentValue - Current value of the parameter
     * @param {any} proposedValue - Proposed new value
     * @param {string} rationale - Explanation for the change
     * @param {number} deposit - Proposal deposit amount
     * @returns {Object} - The created proposal
     */
    createParameterChangeProposal(proposer, paramName, currentValue, proposedValue, rationale, deposit) {
        const title = `Parameter Change: ${paramName}`;
        const description = `Change ${paramName} from ${currentValue} to ${proposedValue}. Rationale: ${rationale}`;
        const changes = {
            type: 'PARAMETER_CHANGE',
            parameter: paramName,
            currentValue,
            proposedValue
        };
        
        return this.createProposal(proposer, title, description, changes, deposit);
    }
    
    /**
     * Create a proposal for upgrading the network protocol
     * 
     * @param {string} proposer - Address of the proposal creator
     * @param {string} version - New version identifier
     * @param {string} description - Description of the upgrade
     * @param {Object} features - List of new features or changes
     * @param {string} codeHash - Hash of the code implementation
     * @param {number} deposit - Proposal deposit amount
     * @returns {Object} - The created proposal
     */
    createProtocolUpgradeProposal(proposer, version, description, features, codeHash, deposit) {
        const title = `Protocol Upgrade to v${version}`;
        const changes = {
            type: 'PROTOCOL_UPGRADE',
            version,
            features,
            codeHash
        };
        
        return this.createProposal(proposer, title, description, changes, deposit);
    }
    
    /**
     * Create a proposal for treasury fund allocation
     * 
     * @param {string} proposer - Address of the proposal creator
     * @param {string} recipient - Recipient of the funds
     * @param {number} amount - Amount to allocate
     * @param {string} purpose - Purpose of the funding
     * @param {string} milestones - Milestone deliverables
     * @param {number} deposit - Proposal deposit amount
     * @returns {Object} - The created proposal
     */
    createTreasuryProposal(proposer, recipient, amount, purpose, milestones, deposit) {
        const title = `Treasury Allocation: ${purpose}`;
        const description = `Allocate ${amount} coins to ${recipient} for: ${purpose}. Milestones: ${milestones}`;
        const changes = {
            type: 'TREASURY_ALLOCATION',
            recipient,
            amount,
            purpose,
            milestones
        };
        
        return this.createProposal(proposer, title, description, changes, deposit);
    }
}

module.exports = GovernanceSystem; 