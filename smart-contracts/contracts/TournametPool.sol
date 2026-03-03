// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TournamentPool
 * @dev Manage tournaments with automated prize distribution for Stratmos
 * @notice Handles tournament creation, registration, and prize payouts
 */
contract TournamentPool is ReentrancyGuard, Ownable {
    struct Tournament {
        uint256 id;
        string name;
        bytes32 gameType;
        uint256 entryFee;
        uint256 prizePool;
        uint256 startTime;
        uint256 maxParticipants;
        uint256 minParticipants;
        address[] participants;
        TournamentStatus status;
        address[] winners;
        bool prizesDistributed;
    }

    enum TournamentStatus {
        Registration,
        Active,
        Completed,
        Cancelled
    }

    // Platform fee: 10% (1000 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 1000;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Default payout structure (in basis points of prize pool after platform fee)
    // 1st: 50%, 2nd: 30%, 3rd: 20%
    uint256 public constant FIRST_PLACE_BPS = 5000;
    uint256 public constant SECOND_PLACE_BPS = 3000;
    uint256 public constant THIRD_PLACE_BPS = 2000;

    // Storage
    uint256 public tournamentCounter;
    mapping(uint256 => Tournament) public tournaments;
    mapping(uint256 => mapping(address => bool)) public hasRegistered;
    mapping(uint256 => uint256[]) public customPayouts; // Custom payout structure per tournament
    
    uint256 public treasuryBalance;
    address public tournamentOracle;

    // Events
    event TournamentCreated(
        uint256 indexed tournamentId,
        string name,
        bytes32 gameType,
        uint256 entryFee,
        uint256 maxParticipants
    );
    event ParticipantRegistered(
        uint256 indexed tournamentId,
        address indexed participant,
        uint256 participantCount
    );
    event TournamentStarted(
        uint256 indexed tournamentId,
        uint256 participantCount,
        uint256 prizePool
    );
    event TournamentCompleted(
        uint256 indexed tournamentId,
        address[] winners
    );
    event PrizesDistributed(
        uint256 indexed tournamentId,
        address[] winners,
        uint256[] amounts
    );
    event TournamentCancelled(
        uint256 indexed tournamentId,
        string reason
    );

    constructor(address _oracle) Ownable(msg.sender) {
        tournamentOracle = _oracle;
    }

    modifier onlyOracle() {
        require(
            msg.sender == tournamentOracle || msg.sender == owner(),
            "TournamentPool: Not authorized"
        );
        _;
    }

    /**
     * @dev Create new tournament
     * @param _name Tournament name
     * @param _gameType Type of game
     * @param _entryFee Entry fee in MON
     * @param _startTime Unix timestamp for start
     * @param _maxParticipants Maximum participants
     * @param _minParticipants Minimum participants to start
     */
    function createTournament(
        string calldata _name,
        bytes32 _gameType,
        uint256 _entryFee,
        uint256 _startTime,
        uint256 _maxParticipants,
        uint256 _minParticipants
    ) external onlyOwner returns (uint256) {
        require(_startTime > block.timestamp, "TournamentPool: Start must be future");
        require(_maxParticipants >= 2, "TournamentPool: Need at least 2 participants");
        require(_minParticipants >= 2, "TournamentPool: Min participants must be >= 2");
        require(
            _minParticipants <= _maxParticipants,
            "TournamentPool: Min > Max participants"
        );

        uint256 tournamentId = tournamentCounter++;

        tournaments[tournamentId] = Tournament({
            id: tournamentId,
            name: _name,
            gameType: _gameType,
            entryFee: _entryFee,
            prizePool: 0,
            startTime: _startTime,
            maxParticipants: _maxParticipants,
            minParticipants: _minParticipants,
            participants: new address[](0),
            status: TournamentStatus.Registration,
            winners: new address[](0),
            prizesDistributed: false
        });

        // Default payout: 50/30/20
        customPayouts[tournamentId] = new uint256[](3);
        customPayouts[tournamentId][0] = FIRST_PLACE_BPS;
        customPayouts[tournamentId][1] = SECOND_PLACE_BPS;
        customPayouts[tournamentId][2] = THIRD_PLACE_BPS;

        emit TournamentCreated(
            tournamentId,
            _name,
            _gameType,
            _entryFee,
            _maxParticipants
        );

        return tournamentId;
    }

    /**
     * @dev Set custom payout structure
     * @param _tournamentId Tournament ID
     * @param _payouts Array of payout percentages in basis points
     */
    function setPayoutStructure(
        uint256 _tournamentId,
        uint256[] calldata _payouts
    ) external onlyOwner {
        Tournament storage tournament = tournaments[_tournamentId];
        require(
            tournament.status == TournamentStatus.Registration,
            "TournamentPool: Cannot modify after registration"
        );

        // Verify payouts sum to 90% (after 10% platform fee)
        uint256 total = 0;
        for (uint256 i = 0; i < _payouts.length; i++) {
            total += _payouts[i];
        }
        require(
            total == BPS_DENOMINATOR - PLATFORM_FEE_BPS,
            "TournamentPool: Payouts must sum to 90%"
        );

        customPayouts[_tournamentId] = _payouts;
    }

    /**
     * @dev Register for tournament
     * @param _tournamentId Tournament ID
     */
    function registerForTournament(
        uint256 _tournamentId
    ) external payable nonReentrant {
        Tournament storage tournament = tournaments[_tournamentId];

        require(
            tournament.status == TournamentStatus.Registration,
            "TournamentPool: Not in registration"
        );
        require(
            block.timestamp < tournament.startTime,
            "TournamentPool: Registration closed"
        );
        require(
            !hasRegistered[_tournamentId][msg.sender],
            "TournamentPool: Already registered"
        );
        require(
            tournament.participants.length < tournament.maxParticipants,
            "TournamentPool: Tournament full"
        );
        require(
            msg.value == tournament.entryFee,
            "TournamentPool: Incorrect entry fee"
        );

        tournament.participants.push(msg.sender);
        tournament.prizePool += msg.value;
        hasRegistered[_tournamentId][msg.sender] = true;

        emit ParticipantRegistered(
            _tournamentId,
            msg.sender,
            tournament.participants.length
        );
    }

    /**
     * @dev Start tournament (can be called by oracle after start time)
     * @param _tournamentId Tournament ID
     */
    function startTournament(uint256 _tournamentId) external onlyOracle {
        Tournament storage tournament = tournaments[_tournamentId];

        require(
            tournament.status == TournamentStatus.Registration,
            "TournamentPool: Wrong status"
        );
        require(
            block.timestamp >= tournament.startTime,
            "TournamentPool: Too early"
        );
        require(
            tournament.participants.length >= tournament.minParticipants,
            "TournamentPool: Not enough participants"
        );

        tournament.status = TournamentStatus.Active;

        emit TournamentStarted(
            _tournamentId,
            tournament.participants.length,
            tournament.prizePool
        );
    }

    /**
     * @dev Complete tournament and set winners
     * @param _tournamentId Tournament ID
     * @param _winners Ordered array of winners (1st, 2nd, 3rd, etc.)
     */
    function completeTournament(
        uint256 _tournamentId,
        address[] calldata _winners
    ) external onlyOracle {
        Tournament storage tournament = tournaments[_tournamentId];

        require(
            tournament.status == TournamentStatus.Active,
            "TournamentPool: Not active"
        );
        require(_winners.length > 0, "TournamentPool: Need winners");
        require(
            _winners.length <= customPayouts[_tournamentId].length,
            "TournamentPool: Too many winners"
        );

        // Verify all winners are participants
        for (uint256 i = 0; i < _winners.length; i++) {
            require(
                hasRegistered[_tournamentId][_winners[i]],
                "TournamentPool: Winner not a participant"
            );
        }

        tournament.status = TournamentStatus.Completed;
        tournament.winners = _winners;

        emit TournamentCompleted(_tournamentId, _winners);
    }

    /**
     * @dev Distribute prizes to winners
     * @param _tournamentId Tournament ID
     */
    function distributePrizes(
        uint256 _tournamentId
    ) external onlyOracle nonReentrant {
        Tournament storage tournament = tournaments[_tournamentId];

        require(
            tournament.status == TournamentStatus.Completed,
            "TournamentPool: Not completed"
        );
        require(
            !tournament.prizesDistributed,
            "TournamentPool: Already distributed"
        );
        require(tournament.winners.length > 0, "TournamentPool: No winners set");

        tournament.prizesDistributed = true;

        // Calculate platform fee
        uint256 platformFee = (tournament.prizePool * PLATFORM_FEE_BPS) /
            BPS_DENOMINATOR;
        treasuryBalance += platformFee;

        uint256 distributablePool = tournament.prizePool - platformFee;
        uint256[] memory payouts = new uint256[](tournament.winners.length);

        // Distribute to winners based on payout structure
        for (uint256 i = 0; i < tournament.winners.length; i++) {
            uint256 payout = (distributablePool * customPayouts[_tournamentId][i]) /
                (BPS_DENOMINATOR - PLATFORM_FEE_BPS);

            payouts[i] = payout;

            (bool success, ) = tournament.winners[i].call{value: payout}("");
            require(success, "TournamentPool: Transfer failed");
        }

        emit PrizesDistributed(_tournamentId, tournament.winners, payouts);
    }

    /**
     * @dev Cancel tournament and refund participants
     * @param _tournamentId Tournament ID
     * @param _reason Cancellation reason
     */
    function cancelTournament(
        uint256 _tournamentId,
        string calldata _reason
    ) external onlyOwner nonReentrant {
        Tournament storage tournament = tournaments[_tournamentId];

        require(
            tournament.status == TournamentStatus.Registration ||
                tournament.status == TournamentStatus.Active,
            "TournamentPool: Cannot cancel"
        );

        tournament.status = TournamentStatus.Cancelled;

        // Refund all participants
        for (uint256 i = 0; i < tournament.participants.length; i++) {
            address participant = tournament.participants[i];
            (bool success, ) = participant.call{value: tournament.entryFee}("");
            require(success, "TournamentPool: Refund failed");
        }

        emit TournamentCancelled(_tournamentId, _reason);
    }

    /**
     * @dev Get tournament details
     * @param _tournamentId Tournament ID
     */
    function getTournament(
        uint256 _tournamentId
    )
        external
        view
        returns (
            uint256 id,
            string memory name,
            bytes32 gameType,
            uint256 entryFee,
            uint256 prizePool,
            uint256 startTime,
            uint256 participantCount,
            uint256 maxParticipants,
            TournamentStatus status
        )
    {
        Tournament storage tournament = tournaments[_tournamentId];
        return (
            tournament.id,
            tournament.name,
            tournament.gameType,
            tournament.entryFee,
            tournament.prizePool,
            tournament.startTime,
            tournament.participants.length,
            tournament.maxParticipants,
            tournament.status
        );
    }

    /**
     * @dev Get tournament participants
     * @param _tournamentId Tournament ID
     */
    function getParticipants(
        uint256 _tournamentId
    ) external view returns (address[] memory) {
        return tournaments[_tournamentId].participants;
    }

    /**
     * @dev Get tournament winners
     * @param _tournamentId Tournament ID
     */
    function getWinners(
        uint256 _tournamentId
    ) external view returns (address[] memory) {
        return tournaments[_tournamentId].winners;
    }

    /**
     * @dev Withdraw treasury (owner only)
     * @param _amount Amount to withdraw
     */
    function withdrawTreasury(uint256 _amount) external onlyOwner nonReentrant {
        require(treasuryBalance >= _amount, "TournamentPool: Insufficient treasury");
        treasuryBalance -= _amount;

        (bool success, ) = owner().call{value: _amount}("");
        require(success, "TournamentPool: Transfer failed");
    }

    /**
     * @dev Update tournament oracle
     * @param _newOracle New oracle address
     */
    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "TournamentPool: Invalid oracle");
        tournamentOracle = _newOracle;
    }

    /**
     * @dev Get upcoming tournaments count
     */
    function getUpcomingTournamentsCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < tournamentCounter; i++) {
            if (
                tournaments[i].status == TournamentStatus.Registration &&
                block.timestamp < tournaments[i].startTime
            ) {
                count++;
            }
        }
        return count;
    }
}
