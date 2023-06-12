// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import 'contracts/interfaces/IVoter.sol';

/**
 * @title Gauge
 * @author heesho
 * 
 * Gauge contract for distributing rewards to plugins depositors.
 * 
 */
contract Gauge is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant DURATION = 7 days;  // rewards are released over 7 days

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
    address public immutable plugin;                // address of plugin contract
    address public immutable voter;                 // address of voter contract

    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  // user -> reward token -> reward per virtual token paid
    mapping(address => mapping(address => uint256)) public rewards;                 // user -> reward token -> reward amount

    uint256 private _totalSupply;                   // total supply of virtual tokens
    mapping(address => uint256) private _balances;  // user -> virtual token balance

    /*----------  ERRORS ------------------------------------------------*/

    error Gauge__NotAuthorizedPlugin();
    error Gauge__NotAuthorizedVoter();
    error Gauge__NotAuthorizedUser();
    error Gauge__NotRewardToken();
    error Gauge__RewardTokenAlreadyAdded();
    error Gauge__InvalidZeroInput();

    /*----------  EVENTS ------------------------------------------------*/

    event Gauge__RewardAdded(address indexed rewardToken);
    event Gauge__RewardNotified(address indexed rewardToken, uint256 reward);
    event Gauge__Deposited(address indexed user, uint256 amount);
    event Gauge__Withdrawn(address indexed user, uint256 amount);
    event Gauge__RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier updateReward(address account) {
        for (uint i; i < rewardTokens.length; i++) {
            address token = rewardTokens[i];
            rewardData[token].rewardPerTokenStored = rewardPerToken(token);
            rewardData[token].lastUpdateTime = lastTimeRewardApplicable(token);
            if (account != address(0)) {
                rewards[account][token] = earned(account, token);
                userRewardPerTokenPaid[account][token] = rewardData[token].rewardPerTokenStored;
            }
        }
        _;
    }

    modifier onlyPlugin(address _address) {
        if (msg.sender != plugin) {
            revert Gauge__NotAuthorizedPlugin();
        }
        _;
    }

    modifier onlyVoter(address _address) {
        if (msg.sender != voter) {
            revert Gauge__NotAuthorizedVoter();
        }
        _;
    }

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Gauge__InvalidZeroInput();
        _;
    }
    
    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Constructs a new gauge contract
     * @param _voter address of voter contract
     * @param _plugin address of plugin contract
     */
    constructor(address _voter, address _plugin) {
        plugin = _plugin;
        voter = _voter;
    }

    /**
     * @notice Claim rewards accrued for an account. Claimed rewards are sent to the account.
     *         Can only be called by account or voter contract.
     * @param account The account to claim rewards for.
     */
    function getReward(address account) 
        external 
        nonReentrant 
        updateReward(account) 
    {
        if (msg.sender != account || msg.sender != voter) revert Gauge__NotAuthorizedUser();
        IVoter(voter).distribute(address(this));
        for (uint i; i < rewardTokens.length; i++) {
            address _rewardsToken = rewardTokens[i];
            uint256 reward = rewards[account][_rewardsToken];
            if (reward > 0) {
                rewards[account][_rewardsToken] = 0;
                emit Gauge__RewardPaid(account, _rewardsToken, reward);
                
                IERC20(_rewardsToken).safeTransfer(account, reward);
            }
        }
    }

    /**
     * @notice Begin reward distribution to accounts with non-zero balances. Transfers tokens from msg.sender
     *         to this contract and begins accounting for distribution with new reward token rates. Only 
     *         the voter contract can call this function on existing reward tokens.
     * @param _rewardsToken the reward token to begin distribution for
     * @param reward the amount of reward tokens to distribute
     */
    function notifyRewardAmount(address _rewardsToken, uint256 reward) 
        external
        nonReentrant
        onlyVoter(msg.sender)
        updateReward(address(0))
    {
        if (!isRewardToken[_rewardsToken]) revert Gauge__NotRewardToken();

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
        emit Gauge__RewardNotified(_rewardsToken, reward);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /**
     * @notice Deposits a virtual amount of tokens for account. No tokens are actually being deposited,
     *         this is reward accounting for plugin balances. Only plugin contract can call this function.
     * @param amount the amount of virtual tokens to deposit
     * @param account the account to deposit virtual tokens for
     */
    function _deposit(address account, uint256 amount) 
        external 
        onlyPlugin(msg.sender)
        nonZeroInput(amount)
        updateReward(account)
    {
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit Gauge__Deposited(account, amount);
        IVoter(voter).emitDeposit(account, amount);
    }

    /**
     * @notice Withdraws a virtual amount of tokens for account. No tokens are actually being withdrawn,
     *         this is reward accounting for plugin balances. Only plugin contract can call this function.
     * @param amount the amount of virtual tokens to withdraw
     * @param account the account to withdraw virtual tokens for
     */
    function _withdraw(address account, uint256 amount) 
        external 
        onlyPlugin(msg.sender)
        nonZeroInput(amount)
        updateReward(account) 
    {
        _totalSupply = _totalSupply - amount;
        _balances[account] = _balances[account] - amount;
        emit Gauge__Withdrawn(account, amount);
        IVoter(voter).emitWithdraw(account, amount);
    }

    /**
     * @notice Adds a reward token for distribution. Only voter contract can call this function.
     * @param _rewardsToken the reward token to add
     */
    function addReward(address _rewardsToken) 
        external 
        onlyVoter(msg.sender)
    {
        if (isRewardToken[_rewardsToken]) revert Gauge__RewardTokenAlreadyAdded();
        rewardTokens.push(_rewardsToken);
        isRewardToken[_rewardsToken] = true;
        emit RewardAdded(_rewardsToken);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function left(address rewardToken) external view returns (uint256) {
        if (block.timestamp >= rewardData[rewardToken].periodFinish) return 0;
        uint256 remaining = rewardData[rewardToken].periodFinish - block.timestamp;
        return remaining * rewardData[rewardToken].rewardRate;
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

}


contract GaugeFactory {
    address public voter;
    address public last_gauge;

    event VoterSet(address indexed account);

    constructor(address _voter) {
        voter = _voter;
    }

    function setVoter(address _voter) external {
        require (msg.sender == voter, "!Voter");
        require(_voter != address(0), "!Valid");
        voter = _voter;
        emit VoterSet(_voter);
    }

    function createGauge(address _voter, address _token) external returns (address) {
        require(msg.sender == voter, "unauthorized");
        Gauge lastGauge = new Gauge(_voter, _token);
        last_gauge = address(lastGauge);
        return last_gauge;
    }
}