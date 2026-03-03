// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AgentRegistry
 * @dev Track agent stats, ELO ratings, and achievements for Stratmos
 * @notice Manages the reputation and ranking system for AI agents
 */
contract AgentRegistry is Ownable {
    struct Agent {
        address wallet;
        string moltbookId;
        uint256 eloRating;
        uint256 totalMatches;
        uint256 wins;
        uint256 losses;
        uint256 draws;
        uint256 totalWagered;
        uint256 totalWinnings;
        uint256 registeredAt;
        bool active;
    }

    struct GameTypeStats {
        uint256 matches;
        uint256 wins;
    }

    // ELO Constants
    uint256 public constant INITIAL_ELO = 1500;
    uint256 public constant K_FACTOR = 32;
    uint256 public constant ELO_SCALE = 1000; // For fixed-point math

    // Achievement IDs
    bytes32 public constant FIRST_BLOOD = keccak256("FIRST_BLOOD");
    bytes32 public constant VETERAN = keccak256("VETERAN");
    bytes32 public constant CHAMPION = keccak256("CHAMPION");
    bytes32 public constant LEGEND = keccak256("LEGEND");
    bytes32 public constant HIGH_ROLLER = keccak256("HIGH_ROLLER");
    bytes32 public constant UNDEFEATED_5 = keccak256("UNDEFEATED_5");
    bytes32 public constant GIANT_SLAYER = keccak256("GIANT_SLAYER");

    // Storage
    mapping(address => Agent) public agents;
    mapping(address => mapping(bytes32 => GameTypeStats)) public gameStats;
    mapping(address => mapping(bytes32 => bool)) public achievements;
    mapping(address => uint256) public currentWinStreak;
    mapping(address => bool) public authorizedOracles;

    address[] public allAgents;

    // Events
    event AgentRegistered(
        address indexed wallet,
        string moltbookId,
        uint256 initialElo
    );
    event StatsUpdated(
        address indexed agent,
        uint256 newElo,
        uint256 wins,
        uint256 losses
    );
    event AchievementUnlocked(address indexed agent, bytes32 achievement);
    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);

    constructor() Ownable(msg.sender) {}

    modifier onlyOracle() {
        require(
            authorizedOracles[msg.sender],
            "AgentRegistry: Not authorized oracle"
        );
        _;
    }

    /**
     * @dev Register new agent
     * @param _moltbookId Moltbook social ID for the agent
     */
    function registerAgent(string calldata _moltbookId) external {
        require(
            agents[msg.sender].wallet == address(0),
            "AgentRegistry: Already registered"
        );

        agents[msg.sender] = Agent({
            wallet: msg.sender,
            moltbookId: _moltbookId,
            eloRating: INITIAL_ELO,
            totalMatches: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            totalWagered: 0,
            totalWinnings: 0,
            registeredAt: block.timestamp,
            active: true
        });

        allAgents.push(msg.sender);

        emit AgentRegistered(msg.sender, _moltbookId, INITIAL_ELO);
    }

    /**
     * @dev Record match result and update stats
     * @param _agent Agent address
     * @param _won Whether the agent won
     * @param _draw Whether it was a draw
     * @param _wagerAmount Amount wagered
     * @param _winnings Amount won (0 if lost/draw)
     * @param _gameType Type of game played
     */
    function recordMatch(
        address _agent,
        bool _won,
        bool _draw,
        uint256 _wagerAmount,
        uint256 _winnings,
        bytes32 _gameType
    ) external onlyOracle {
        require(agents[_agent].active, "AgentRegistry: Agent not active");

        Agent storage agent = agents[_agent];
        agent.totalMatches++;
        agent.totalWagered += _wagerAmount;

        if (_draw) {
            agent.draws++;
            currentWinStreak[_agent] = 0;
        } else if (_won) {
            agent.wins++;
            agent.totalWinnings += _winnings;
            currentWinStreak[_agent]++;

            // Update game-specific stats
            gameStats[_agent][_gameType].wins++;
        } else {
            agent.losses++;
            currentWinStreak[_agent] = 0;
        }

        gameStats[_agent][_gameType].matches++;

        // Check for achievements
        _checkAchievements(_agent);

        emit StatsUpdated(_agent, agent.eloRating, agent.wins, agent.losses);
    }

    /**
     * @dev Update ELO ratings for both players after a match
     * @param _agent1 First agent
     * @param _agent2 Second agent
     * @param _agent1Won Whether agent1 won
     * @param _draw Whether it was a draw
     */
    function updateElo(
        address _agent1,
        address _agent2,
        bool _agent1Won,
        bool _draw
    ) external onlyOracle {
        Agent storage agent1 = agents[_agent1];
        Agent storage agent2 = agents[_agent2];

        require(agent1.active && agent2.active, "AgentRegistry: Agents must be active");

        uint256 rating1 = agent1.eloRating;
        uint256 rating2 = agent2.eloRating;

        // Calculate expected scores (scaled by ELO_SCALE for precision)
        // E1 = 1 / (1 + 10^((R2-R1)/400))
        int256 ratingDiff = int256(rating2) - int256(rating1);
        
        // Simplified ELO calculation
        uint256 expected1;
        uint256 expected2;
        
        if (ratingDiff > 0) {
            // Agent 2 is stronger
            uint256 diffAbs = uint256(ratingDiff);
            expected1 = ELO_SCALE / (1 + (diffAbs / 100)); // Simplified
            expected2 = ELO_SCALE - expected1;
        } else {
            // Agent 1 is stronger or equal
            uint256 diffAbs = uint256(-ratingDiff);
            expected2 = ELO_SCALE / (1 + (diffAbs / 100)); // Simplified
            expected1 = ELO_SCALE - expected2;
        }

        // Calculate actual scores
        uint256 actual1;
        uint256 actual2;

        if (_draw) {
            actual1 = ELO_SCALE / 2; // 0.5
            actual2 = ELO_SCALE / 2;
        } else if (_agent1Won) {
            actual1 = ELO_SCALE; // 1.0
            actual2 = 0;
            
            // Check for Giant Slayer achievement
            if (rating2 > rating1 + 100 && !achievements[_agent1][GIANT_SLAYER]) {
                achievements[_agent1][GIANT_SLAYER] = true;
                emit AchievementUnlocked(_agent1, GIANT_SLAYER);
            }
        } else {
            actual1 = 0;
            actual2 = ELO_SCALE; // 1.0
            
            // Check for Giant Slayer achievement
            if (rating1 > rating2 + 100 && !achievements[_agent2][GIANT_SLAYER]) {
                achievements[_agent2][GIANT_SLAYER] = true;
                emit AchievementUnlocked(_agent2, GIANT_SLAYER);
            }
        }

        // Calculate new ratings
        int256 change1 = (int256(K_FACTOR) * (int256(actual1) - int256(expected1))) / int256(ELO_SCALE);
        int256 change2 = (int256(K_FACTOR) * (int256(actual2) - int256(expected2))) / int256(ELO_SCALE);

        // Apply changes (ensure ELO doesn't go below 100)
        if (int256(rating1) + change1 > 100) {
            agent1.eloRating = uint256(int256(rating1) + change1);
        } else {
            agent1.eloRating = 100;
        }

        if (int256(rating2) + change2 > 100) {
            agent2.eloRating = uint256(int256(rating2) + change2);
        } else {
            agent2.eloRating = 100;
        }
    }

    /**
     * @dev Check and unlock achievements
     * @param _agent Agent address
     */
    function _checkAchievements(address _agent) internal {
        Agent storage agent = agents[_agent];

        // First Blood - First win
        if (agent.wins == 1 && !achievements[_agent][FIRST_BLOOD]) {
            achievements[_agent][FIRST_BLOOD] = true;
            emit AchievementUnlocked(_agent, FIRST_BLOOD);
        }

        // Veteran - 10 wins
        if (agent.wins == 10 && !achievements[_agent][VETERAN]) {
            achievements[_agent][VETERAN] = true;
            emit AchievementUnlocked(_agent, VETERAN);
        }

        // Champion - 50 wins
        if (agent.wins == 50 && !achievements[_agent][CHAMPION]) {
            achievements[_agent][CHAMPION] = true;
            emit AchievementUnlocked(_agent, CHAMPION);
        }

        // Legend - 100 wins
        if (agent.wins == 100 && !achievements[_agent][LEGEND]) {
            achievements[_agent][LEGEND] = true;
            emit AchievementUnlocked(_agent, LEGEND);
        }

        // High Roller - 100 MON wagered
        if (agent.totalWagered >= 100 ether && !achievements[_agent][HIGH_ROLLER]) {
            achievements[_agent][HIGH_ROLLER] = true;
            emit AchievementUnlocked(_agent, HIGH_ROLLER);
        }

        // Undefeated 5 - 5 win streak
        if (currentWinStreak[_agent] >= 5 && !achievements[_agent][UNDEFEATED_5]) {
            achievements[_agent][UNDEFEATED_5] = true;
            emit AchievementUnlocked(_agent, UNDEFEATED_5);
        }
    }

    /**
     * @dev Get agent stats
     * @param _wallet Agent wallet address
     */
    function getAgent(address _wallet) external view returns (Agent memory) {
        return agents[_wallet];
    }

    /**
     * @dev Get game-specific stats
     * @param _agent Agent address
     * @param _gameType Game type
     */
    function getGameStats(
        address _agent,
        bytes32 _gameType
    ) external view returns (GameTypeStats memory) {
        return gameStats[_agent][_gameType];
    }

    /**
     * @dev Check if agent has achievement
     * @param _agent Agent address
     * @param _achievement Achievement ID
     */
    function hasAchievement(
        address _agent,
        bytes32 _achievement
    ) external view returns (bool) {
        return achievements[_agent][_achievement];
    }

    /**
     * @dev Get total number of registered agents
     */
    function getAgentCount() external view returns (uint256) {
        return allAgents.length;
    }

    /**
     * @dev Get leaderboard (top N by ELO)
     * @param _count Number of agents to return
     */
    function getLeaderboard(uint256 _count) external view returns (address[] memory) {
        uint256 count = _count > allAgents.length ? allAgents.length : _count;
        address[] memory leaderboard = new address[](count);

        // Create temp array for sorting
        address[] memory tempAgents = new address[](allAgents.length);
        for (uint256 i = 0; i < allAgents.length; i++) {
            tempAgents[i] = allAgents[i];
        }

        // Simple selection sort for top N
        for (uint256 i = 0; i < count; i++) {
            uint256 highestElo = 0;
            uint256 highestIdx = i;

            for (uint256 j = i; j < tempAgents.length; j++) {
                if (agents[tempAgents[j]].eloRating > highestElo) {
                    highestElo = agents[tempAgents[j]].eloRating;
                    highestIdx = j;
                }
            }

            // Swap
            address temp = tempAgents[i];
            tempAgents[i] = tempAgents[highestIdx];
            tempAgents[highestIdx] = temp;

            leaderboard[i] = tempAgents[i];
        }

        return leaderboard;
    }

    /**
     * @dev Add authorized oracle
     * @param _oracle Oracle address
     */
    function addOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "AgentRegistry: Invalid oracle");
        authorizedOracles[_oracle] = true;
        emit OracleAdded(_oracle);
    }

    /**
     * @dev Remove oracle
     * @param _oracle Oracle address
     */
    function removeOracle(address _oracle) external onlyOwner {
        authorizedOracles[_oracle] = false;
        emit OracleRemoved(_oracle);
    }

    /**
     * @dev Deactivate agent (owner only - for bad actors)
     * @param _agent Agent address
     */
    function deactivateAgent(address _agent) external onlyOwner {
        agents[_agent].active = false;
    }

    /**
     * @dev Reactivate agent
     * @param _agent Agent address
     */
    function reactivateAgent(address _agent) external onlyOwner {
        agents[_agent].active = true;
    }
}
