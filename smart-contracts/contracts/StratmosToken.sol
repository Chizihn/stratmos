// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StratmosToken
 * @dev $STRM governance and revenue sharing token for Stratmos platform
 * @notice Stake STRM to earn revenue share from platform fees
 */
contract StratmosToken is ERC20, ERC20Burnable, Ownable, ReentrancyGuard {
    // Staking info per user
    struct StakeInfo {
        uint256 stakedAmount;
        uint256 rewardsDebt;
        uint256 lastClaimTime;
    }

    // Revenue distribution constants
    uint256 public constant STAKER_SHARE_BPS = 3000; // 30% to stakers
    uint256 public constant BPS_DENOMINATOR = 10000;

    // Staking state
    mapping(address => StakeInfo) public stakers;
    uint256 public totalStaked;
    uint256 public accRewardsPerShare; // Accumulated rewards per share (scaled by 1e18)
    uint256 public totalRewardsDistributed;

    // Minimum stake duration: 24 hours
    uint256 public constant MIN_STAKE_DURATION = 24 hours;

    // Platform addresses that can deposit revenue
    mapping(address => bool) public revenueDepositors;

    // Events
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event RevenueDeposited(address indexed from, uint256 amount);
    event DepositorAdded(address indexed depositor);
    event DepositorRemoved(address indexed depositor);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _initialSupply,
        address _treasury
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        // Mint initial supply to treasury
        _mint(_treasury, _initialSupply);
    }

    modifier onlyDepositor() {
        require(
            revenueDepositors[msg.sender] || msg.sender == owner(),
            "StratmosToken: Not authorized depositor"
        );
        _;
    }

    /**
     * @dev Stake STRM tokens
     * @param _amount Amount to stake
     */
    function stake(uint256 _amount) external nonReentrant {
        require(_amount > 0, "StratmosToken: Cannot stake 0");
        require(
            balanceOf(msg.sender) >= _amount,
            "StratmosToken: Insufficient balance"
        );

        StakeInfo storage staker = stakers[msg.sender];

        // Claim pending rewards before updating stake
        if (staker.stakedAmount > 0) {
            uint256 pending = _pendingRewards(msg.sender);
            if (pending > 0) {
                _safeRewardTransfer(msg.sender, pending);
                emit RewardsClaimed(msg.sender, pending);
            }
        }

        // Transfer tokens to contract
        _transfer(msg.sender, address(this), _amount);

        // Update staking info
        staker.stakedAmount += _amount;
        staker.rewardsDebt = (staker.stakedAmount * accRewardsPerShare) / 1e18;
        staker.lastClaimTime = block.timestamp;
        totalStaked += _amount;

        emit Staked(msg.sender, _amount);
    }

    /**
     * @dev Unstake STRM tokens
     * @param _amount Amount to unstake
     */
    function unstake(uint256 _amount) external nonReentrant {
        StakeInfo storage staker = stakers[msg.sender];
        require(staker.stakedAmount >= _amount, "StratmosToken: Insufficient stake");
        require(
            block.timestamp >= staker.lastClaimTime + MIN_STAKE_DURATION,
            "StratmosToken: Stake locked for 24h"
        );

        // Claim pending rewards
        uint256 pending = _pendingRewards(msg.sender);
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit RewardsClaimed(msg.sender, pending);
        }

        // Update staking info
        staker.stakedAmount -= _amount;
        staker.rewardsDebt = (staker.stakedAmount * accRewardsPerShare) / 1e18;
        totalStaked -= _amount;

        // Transfer tokens back
        _transfer(address(this), msg.sender, _amount);

        emit Unstaked(msg.sender, _amount);
    }

    /**
     * @dev Claim pending staking rewards
     */
    function claimRewards() external nonReentrant {
        uint256 pending = _pendingRewards(msg.sender);
        require(pending > 0, "StratmosToken: No rewards to claim");

        StakeInfo storage staker = stakers[msg.sender];
        staker.rewardsDebt = (staker.stakedAmount * accRewardsPerShare) / 1e18;
        staker.lastClaimTime = block.timestamp;

        _safeRewardTransfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    /**
     * @dev Deposit platform revenue for distribution
     * @notice Called by WagerEscrow or TournamentPool when fees are collected
     */
    function depositRevenue() external payable onlyDepositor {
        require(msg.value > 0, "StratmosToken: No revenue to deposit");

        if (totalStaked > 0) {
            uint256 stakerShare = (msg.value * STAKER_SHARE_BPS) / BPS_DENOMINATOR;
            accRewardsPerShare += (stakerShare * 1e18) / totalStaked;
            totalRewardsDistributed += stakerShare;
        }

        emit RevenueDeposited(msg.sender, msg.value);
    }

    /**
     * @dev Get pending rewards for a staker
     * @param _user Staker address
     */
    function pendingRewards(address _user) external view returns (uint256) {
        return _pendingRewards(_user);
    }

    /**
     * @dev Internal pending rewards calculation
     */
    function _pendingRewards(address _user) internal view returns (uint256) {
        StakeInfo storage staker = stakers[_user];
        if (staker.stakedAmount == 0) return 0;

        uint256 accRewards = (staker.stakedAmount * accRewardsPerShare) / 1e18;
        return accRewards - staker.rewardsDebt;
    }

    /**
     * @dev Safe reward transfer (handles contract balance edge cases)
     */
    function _safeRewardTransfer(address _to, uint256 _amount) internal {
        uint256 balance = address(this).balance;
        uint256 transferAmount = _amount > balance ? balance : _amount;

        if (transferAmount > 0) {
            (bool success, ) = _to.call{value: transferAmount}("");
            require(success, "StratmosToken: Reward transfer failed");
        }
    }

    /**
     * @dev Get staking info for a user
     * @param _user User address
     */
    function getStakeInfo(
        address _user
    ) external view returns (uint256 stakedAmount, uint256 pending, uint256 lastClaim) {
        StakeInfo storage staker = stakers[_user];
        return (staker.stakedAmount, _pendingRewards(_user), staker.lastClaimTime);
    }

    /**
     * @dev Add revenue depositor
     * @param _depositor Depositor address
     */
    function addDepositor(address _depositor) external onlyOwner {
        require(_depositor != address(0), "StratmosToken: Invalid depositor");
        revenueDepositors[_depositor] = true;
        emit DepositorAdded(_depositor);
    }

    /**
     * @dev Remove revenue depositor
     * @param _depositor Depositor address
     */
    function removeDepositor(address _depositor) external onlyOwner {
        revenueDepositors[_depositor] = false;
        emit DepositorRemoved(_depositor);
    }

    /**
     * @dev Mint new tokens (owner only, for special distributions)
     * @param _to Recipient address
     * @param _amount Amount to mint
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    /**
     * @dev Withdraw excess ETH from contract (owner only)
     */
    function withdrawExcessETH() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "StratmosToken: No ETH to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "StratmosToken: Withdrawal failed");
    }

    /**
     * @dev Get APY estimate based on recent rewards
     */
    function getEstimatedAPY() external view returns (uint256) {
        if (totalStaked == 0) return 0;

        // Simple APY estimation: (total rewards / total staked) * 365
        // Returns in basis points (e.g., 1000 = 10%)
        return (totalRewardsDistributed * BPS_DENOMINATOR * 365) / totalStaked;
    }

    // Allow contract to receive ETH
    receive() external payable {
        if (totalStaked > 0) {
            uint256 stakerShare = (msg.value * STAKER_SHARE_BPS) / BPS_DENOMINATOR;
            accRewardsPerShare += (stakerShare * 1e18) / totalStaked;
            totalRewardsDistributed += stakerShare;
        }
        emit RevenueDeposited(msg.sender, msg.value);
    }
}
