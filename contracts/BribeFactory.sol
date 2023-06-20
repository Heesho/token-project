// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title Bribe
 * @author heesho
 * 
 * Bribe contract for distributing voting rewards to VTOKEN holders that vote for plugins
 * on the Voter contract. Rewards are distributed over 7 days. Rewards are distributed
 * to VTOKEN holders that vote for plugins on the Voter contract. VTOKEN holders will only
 * earn voting rewards from plugins that they vote for. VTOKEN holders get a deposit a virtual
 * balance in the Bribe contract by voting for its corresponding plugin on the Voter contract.
 * VTOKEN holders can withdraw their bribe balance by resetting their votes to 0.
 * 
 * No VTOKEN is ever stored in the Bribe contract itself, rather a virtual balance is stored
 * when votes are cast. The virtual balance is used to calculate the amount of rewards that
 * each VTOKEN holder is entitled to. 
 * 
 * Each plugin has a unique corresponding Bribe contract.
 * 
 * Bribe balanceOf must be equal to Voter votes for that plugin for all accounts at all times.
 * Bribe totalSupply must be equal to Voter weights at all times.
 */
contract Bribe is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant DURATION = 7 days; // rewards are released over 7 days

    /*----------  STATE VARIABLES  --------------------------------------*/

    // struct to store reward data for each reward token
    struct Reward {
        uint256 periodFinish;           // timestamp when reward period ends
        uint256 rewardRate;             // reward rate per second
        uint256 lastUpdateTime;         // timestamp when reward data was last updated
        uint256 rewardPerTokenStored;   // reward per virtual token stored
    }

    mapping(address => Reward) public rewardData;   // reward token -> reward data
    mapping(address => bool) public isRewardToken;  // reward token -> true if reward token
    address[] public rewardTokens;                  // array of reward tokens
    address public immutable voter;                 // address of voter contract

    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  // user -> reward token -> reward per virtual token paid
    mapping(address => mapping(address => uint256)) public rewards;                 // user -> reward token -> reward amount

    uint256 private _totalSupply;                   // total supply of virtual tokens
    mapping(address => uint256) private _balances;  // user -> virtual token balance

    /*----------  ERRORS ------------------------------------------------*/

    error Bribe__NotAuthorizedVoter();
    error Bribe__RewardSmallerThanDuration();
    error Bribe__NotRewardToken();
    error Bribe__RewardTokenAlreadyAdded();
    error Bribe__InvalidZeroInput();

    /*----------  EVENTS ------------------------------------------------*/

    event Bribe__RewardAdded(address indexed rewardToken);
    event Bribe__RewardNotified(address indexed rewardToken, uint256 reward);
    event Bribe__Deposited(address indexed user, uint256 amount);
    event Bribe__Withdrawn(address indexed user, uint256 amount);
    event Bribe__RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier updateReward(address account) {
        for (uint256 i; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            rewardData[token].rewardPerTokenStored = rewardPerToken(token);
            rewardData[token].lastUpdateTime = lastTimeRewardApplicable(token);
            if (account != address(0)) {
                rewards[account][token] = earned(account, token);
                userRewardPerTokenPaid[account][token] = rewardData[token]
                    .rewardPerTokenStored;
            }
        }
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) {
            revert Bribe__NotAuthorizedVoter();
        }
        _;
    }

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Bribe__InvalidZeroInput();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Constructs a new Bribe contract.
     * @param _voter the address of the voter contract
     */
    constructor(address _voter) {
        voter = _voter;
    }

    /**
     * @notice Claim rewards accrued for an account. Claimed rewards are sent to the account.
     * @param account The address to claim rewards for.
     */
    function getReward(address account) 
        external 
        nonReentrant 
        updateReward(account) 
    {
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address _rewardsToken = rewardTokens[i];
            uint256 reward = rewards[account][_rewardsToken];
            if (reward > 0) {
                rewards[account][_rewardsToken] = 0;
                emit Bribe__RewardPaid(account, _rewardsToken, reward);

                IERC20(_rewardsToken).safeTransfer(account, reward);
            }
        }
    }

    /**
     * @notice Begin reward distribution to accounts with non-zero balances. Transfers tokens from msg.sender
     *         to this contract and begins accounting for distribution with new reward token rates. Anyone 
     *         can call this function on existing reward tokens.
     * @param _rewardsToken the reward token to begin distribution for
     * @param reward the amount of reward tokens to distribute
     */
    function notifyRewardAmount(address _rewardsToken, uint256 reward) 
        external 
        nonReentrant
        updateReward(address(0))
    {
        if (reward < DURATION) revert Bribe__RewardSmallerThanDuration();
        if (!isRewardToken[_rewardsToken]) revert Bribe__NotRewardToken();

        IERC20(_rewardsToken).safeTransferFrom(msg.sender, address(this), reward);
        if (block.timestamp >= rewardData[_rewardsToken].periodFinish) {
            rewardData[_rewardsToken].rewardRate = reward / DURATION;
        } else {
            uint256 remaining = rewardData[_rewardsToken].periodFinish - block.timestamp;
            uint256 leftover = remaining * rewardData[_rewardsToken].rewardRate;
            rewardData[_rewardsToken].rewardRate = (reward + leftover) / DURATION;
        }
        rewardData[_rewardsToken].lastUpdateTime = block.timestamp;
        rewardData[_rewardsToken].periodFinish = block.timestamp + DURATION;
        emit Bribe__RewardNotified(_rewardsToken, reward);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /**
     * @notice Deposits a virtual amount of tokens for account. No tokens are actually being deposited,
     *         this is reward accounting for voting balances. Only voter contract can call this function.
     * @param amount the amount of virtual tokens to deposit
     * @param account the account to deposit virtual tokens for
     */
    function _deposit(uint256 amount, address account) 
        external 
        onlyVoter
        nonZeroInput(amount)
        updateReward(account) 
    {
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit Bribe__Deposited(account, amount);
    }

    /**
     * @notice Withdraws a virtual amount of tokens for account. No tokens are actually being withdrawn,
     *         this is reward accounting for voting balances. Only voter contract can call this function.
     * @param amount the amount of virtual tokens to withdraw
     * @param account the account to withdraw virtual tokens for
     */
    function _withdraw(uint256 amount, address account) 
        external 
        onlyVoter
        nonZeroInput(amount)
        updateReward(account) 
    {
        _totalSupply = _totalSupply - amount;
        _balances[account] = _balances[account] - amount;
        emit Bribe__Withdrawn(account, amount);
    }

    /**
     * @notice Adds a reward token for distribution. Only voter contract can call this function.
     * @param _rewardsToken the reward token to add
     */
    function addReward(address _rewardsToken) 
        external 
        onlyVoter
    {
        if (isRewardToken[_rewardsToken]) revert Bribe__RewardTokenAlreadyAdded();
        isRewardToken[_rewardsToken] = true;
        rewardTokens.push(_rewardsToken);
        emit Bribe__RewardAdded(_rewardsToken);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function left(address _rewardsToken) external view returns (uint256 leftover) {
        if (block.timestamp >= rewardData[_rewardsToken].periodFinish) return 0;
        uint256 remaining = rewardData[_rewardsToken].periodFinish - block.timestamp;
        return remaining * rewardData[_rewardsToken].rewardRate;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function lastTimeRewardApplicable(address _rewardsToken) public view returns (uint256) {
        return Math.min(block.timestamp, rewardData[_rewardsToken].periodFinish);
    }

    function rewardPerToken(address _rewardsToken) public view returns (uint256) {
        if (_totalSupply == 0) return rewardData[_rewardsToken].rewardPerTokenStored;
        return
            rewardData[_rewardsToken].rewardPerTokenStored + ((lastTimeRewardApplicable(_rewardsToken) - rewardData[_rewardsToken].lastUpdateTime) 
            * rewardData[_rewardsToken].rewardRate * 1e18 / _totalSupply);
    }

    function earned(address account, address _rewardsToken) public view returns (uint256) {
        return
            (_balances[account] * (rewardPerToken(_rewardsToken) - userRewardPerTokenPaid[account][_rewardsToken]) / 1e18) 
            + rewards[account][_rewardsToken];
    }

    function getRewardForDuration(address _rewardsToken) external view returns (uint256) {
        return rewardData[_rewardsToken].rewardRate * DURATION;
    }

    function getRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
    }

}


contract BribeFactory {
    address public voter;
    address public last_bribe;

    error BribeFactory__UnathorizedVoter();
    error BribeFactory__InvalidZeroAddress();

    event BribeFactory__VoterSet(address indexed account);
    event BribeFactory__BribeCreated(address indexed bribe);

    modifier onlyVoter() {
        if (msg.sender != voter) revert BribeFactory__UnathorizedVoter();
        _;
    }

    constructor(address _voter) {
        voter = _voter;
    }

    function setVoter(address _voter) external onlyVoter {
        if (_voter == address(0)) revert BribeFactory__InvalidZeroAddress();
        voter = _voter;
        emit BribeFactory__VoterSet(_voter);
    }

    function createBribe(address _voter) external onlyVoter returns (address) {
        Bribe lastBribe = new Bribe(_voter);
        last_bribe = address(lastBribe);
        emit BribeFactory__BribeCreated(last_bribe);
        return last_bribe;
    }
}