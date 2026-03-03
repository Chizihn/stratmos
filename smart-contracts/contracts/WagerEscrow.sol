// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WagerEscrow
 * @dev Manages 1v1 wagers between AI agents with instant settlement on Monad
 * @notice Part of the Stratmos gaming platform
 */
contract WagerEscrow is ReentrancyGuard, Ownable {
    struct Match {
        address agent1;
        address agent2;
        uint256 wager;
        bytes32 gameType;
        uint256 createdAt;
        bool settled;
        address winner;
        MatchStatus status;
    }

    enum MatchStatus {
        Created,
        Active,
        Completed,
        Draw,
        Cancelled
    }

    // Platform fee: 2% (200 basis points)
    uint256 public constant PLATFORM_FEE_BPS = 200;
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Match timeout: 30 minutes
    uint256 public constant MATCH_TIMEOUT = 30 minutes;

    // Storage
    mapping(bytes32 => Match) public matches;
    mapping(address => uint256) public agentBalances;
    uint256 public treasuryBalance;
    address public gameOracle;

    // Match counter for unique IDs
    uint256 public matchCounter;

    // Events
    event MatchCreated(
        bytes32 indexed matchId,
        address indexed agent1,
        address indexed agent2,
        uint256 wager,
        bytes32 gameType
    );
    event MatchSettled(bytes32 indexed matchId, address winner, uint256 payout);
    event MatchDraw(bytes32 indexed matchId);
    event MatchCancelled(bytes32 indexed matchId, string reason);
    event Deposited(address indexed agent, uint256 amount);
    event Withdrawn(address indexed agent, uint256 amount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    constructor(address _gameOracle) Ownable(msg.sender) {
        gameOracle = _gameOracle;
        emit OracleUpdated(address(0), _gameOracle);
    }

    modifier onlyOracle() {
        require(msg.sender == gameOracle, "WagerEscrow: Only oracle can call");
        _;
    }

    /**
     * @dev Deposit MON for wagering
     */
    function deposit() external payable {
        require(msg.value > 0, "WagerEscrow: Must deposit positive amount");
        agentBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev Create a new match with escrowed funds
     * @param _agent1 First agent address
     * @param _agent2 Second agent address
     * @param _wager Amount each agent wagers
     * @param _gameType Type of game (e.g., "RPS", "POKER", "BLOTTO")
     */
    function createMatch(
        address _agent1,
        address _agent2,
        uint256 _wager,
        bytes32 _gameType
    ) external returns (bytes32 matchId) {
        require(_agent1 != _agent2, "WagerEscrow: Cannot play against self");
        require(_wager > 0, "WagerEscrow: Wager must be positive");
        require(
            agentBalances[_agent1] >= _wager,
            "WagerEscrow: Insufficient balance agent1"
        );
        require(
            agentBalances[_agent2] >= _wager,
            "WagerEscrow: Insufficient balance agent2"
        );

        matchId = keccak256(
            abi.encodePacked(_agent1, _agent2, _gameType, block.timestamp, matchCounter++)
        );

        // Escrow the wagers
        agentBalances[_agent1] -= _wager;
        agentBalances[_agent2] -= _wager;

        matches[matchId] = Match({
            agent1: _agent1,
            agent2: _agent2,
            wager: _wager,
            gameType: _gameType,
            createdAt: block.timestamp,
            settled: false,
            winner: address(0),
            status: MatchStatus.Active
        });

        emit MatchCreated(matchId, _agent1, _agent2, _wager, _gameType);
        return matchId;
    }

    /**
     * @dev Settle match and distribute winnings
     * @param _matchId Match identifier
     * @param _winner Address of the winning agent
     */
    function settleMatch(
        bytes32 _matchId,
        address _winner
    ) external onlyOracle nonReentrant {
        Match storage matchData = matches[_matchId];
        require(
            matchData.status == MatchStatus.Active,
            "WagerEscrow: Match not active"
        );
        require(!matchData.settled, "WagerEscrow: Already settled");
        require(
            _winner == matchData.agent1 || _winner == matchData.agent2,
            "WagerEscrow: Invalid winner"
        );

        matchData.settled = true;
        matchData.winner = _winner;
        matchData.status = MatchStatus.Completed;

        uint256 totalPot = matchData.wager * 2;
        uint256 platformFee = (totalPot * PLATFORM_FEE_BPS) / BPS_DENOMINATOR;
        uint256 winnerPayout = totalPot - platformFee;

        treasuryBalance += platformFee;
        agentBalances[_winner] += winnerPayout;

        emit MatchSettled(_matchId, _winner, winnerPayout);
    }

    /**
     * @dev Handle draw - return wagers minus small fee
     * @param _matchId Match identifier
     */
    function settleDraw(bytes32 _matchId) external onlyOracle nonReentrant {
        Match storage matchData = matches[_matchId];
        require(
            matchData.status == MatchStatus.Active,
            "WagerEscrow: Match not active"
        );
        require(!matchData.settled, "WagerEscrow: Already settled");

        matchData.settled = true;
        matchData.status = MatchStatus.Draw;

        // Return wagers to both agents
        agentBalances[matchData.agent1] += matchData.wager;
        agentBalances[matchData.agent2] += matchData.wager;

        emit MatchDraw(_matchId);
    }

    /**
     * @dev Cancel timed-out match - anyone can call
     * @param _matchId Match identifier
     */
    function cancelTimedOutMatch(bytes32 _matchId) external nonReentrant {
        Match storage matchData = matches[_matchId];
        require(
            matchData.status == MatchStatus.Active,
            "WagerEscrow: Match not active"
        );
        require(
            block.timestamp >= matchData.createdAt + MATCH_TIMEOUT,
            "WagerEscrow: Not timed out yet"
        );

        matchData.status = MatchStatus.Cancelled;
        matchData.settled = true;

        // Return wagers
        agentBalances[matchData.agent1] += matchData.wager;
        agentBalances[matchData.agent2] += matchData.wager;

        emit MatchCancelled(_matchId, "Timeout");
    }

    /**
     * @dev Withdraw available balance
     * @param _amount Amount to withdraw
     */
    function withdraw(uint256 _amount) external nonReentrant {
        require(
            agentBalances[msg.sender] >= _amount,
            "WagerEscrow: Insufficient balance"
        );
        agentBalances[msg.sender] -= _amount;

        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "WagerEscrow: Transfer failed");

        emit Withdrawn(msg.sender, _amount);
    }

    /**
     * @dev Withdraw treasury (owner only)
     * @param _amount Amount to withdraw
     */
    function withdrawTreasury(uint256 _amount) external onlyOwner nonReentrant {
        require(treasuryBalance >= _amount, "WagerEscrow: Insufficient treasury");
        treasuryBalance -= _amount;

        (bool success, ) = owner().call{value: _amount}("");
        require(success, "WagerEscrow: Transfer failed");
    }

    /**
     * @dev Update game oracle
     * @param _newOracle New oracle address
     */
    function setGameOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "WagerEscrow: Invalid oracle");
        address oldOracle = gameOracle;
        gameOracle = _newOracle;
        emit OracleUpdated(oldOracle, _newOracle);
    }

    /**
     * @dev Get match details
     * @param _matchId Match identifier
     */
    function getMatch(bytes32 _matchId) external view returns (Match memory) {
        return matches[_matchId];
    }

    /**
     * @dev Get agent balance
     * @param _agent Agent address
     */
    function getBalance(address _agent) external view returns (uint256) {
        return agentBalances[_agent];
    }

    /**
     * @dev Check if match is active
     * @param _matchId Match identifier
     */
    function isMatchActive(bytes32 _matchId) external view returns (bool) {
        return matches[_matchId].status == MatchStatus.Active;
    }

    // Allow contract to receive MON directly
    receive() external payable {
        agentBalances[msg.sender] += msg.value;
        emit Deposited(msg.sender, msg.value);
    }
}
