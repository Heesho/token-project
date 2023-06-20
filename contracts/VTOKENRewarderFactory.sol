// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title VTOKENRewarder
 * @author heesho
 * 
 * VTOKENRewarder distributes rewards to VTOKEN stakers. The VTOKEN contract will deposit/withdraw virtual balances
 * to this contract based on when users deposit/withdraw/burn in the VTOKEN contract. The user balance in this contract
 * should always be equal to the users voting power in the VTOKEN contract. 
 * 
 * The VTOKENRewarder balanceOf must always be equal to VTOKEN balanceOf for all accounts at all times.
 * The VTOKENRewarder totalSupply must always be equal to VTOKEN totalSupply at all times.
 */
contract VTOKENRewarder is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant DURATION = 7 days; // rewards are released over 7 days

    /*----------  STATE VARIABLES  --------------------------------------*/

    // struct to hold reward data for each reward token
    struct Reward {
        uint256 periodFinish;           // timestamp when reward period ends
        uint256 rewardRate;             // reward rate per second
        uint256 lastUpdateTime;         // timestamp when reward was last updated
        uint256 rewardPerTokenStored;   // reward per virtual token 
    }

    mapping(address => Reward) public rewardData;   // reward token -> Reward struct
    mapping(address => bool) public isRewardToken;  // reward token -> true if is reward token
    address[] public rewardTokens;                  // array of reward tokens
    address public immutable VTOKEN;                // VTOKEN address

    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  // user -> reward token -> reward per virtual token paid
    mapping(address => mapping(address => uint256)) public rewards;                 // user -> reward token -> reward amount

    uint256 private _totalSupply;                   // total virtual token supply
    mapping(address => uint256) private _balances;  // user -> virtual token balance

    /*----------  ERRORS ------------------------------------------------*/

    error VTOKENRewarder__NotAuthorizedVTOKEN();
    error VTOKENRewarder__RewardSmallerThanDuration();
    error VTOKENRewarder__NotRewardToken();
    error VTOKENRewarder__RewardTokenAlreadyAdded();

    /*----------  EVENTS ------------------------------------------------*/

    event VTOKENRewarder__RewardAdded(address indexed rewardToken);
    event VTOKENRewarder__RewardNotified(address indexed rewardToken, uint256 reward);
    event VTOKENRewarder__Deposited(address indexed user, uint256 amount);
    event VTOKENRewarder__Withdrawn(address indexed user, uint256 amount);
    event VTOKENRewarder__RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier updateReward(address account) {
        for (uint256 i; i < rewardTokens.length; i++) {
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

    modifier onlyVTOKEN {
        if (msg.sender != VTOKEN) {
            revert VTOKENRewarder__NotAuthorizedVTOKEN();
        }
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Constructs a new VTOKENRewarder contract.
     * @param _VTOKEN the address of the VTOKEN contract.
     */
    constructor(address _VTOKEN) {
        VTOKEN = _VTOKEN;
    }

    /**
     * @notice Claim rewards accrued for an account. Claimed rewards are sent to the account.
     * @param account the account to claim rewards for
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
                emit VTOKENRewarder__RewardPaid(account, _rewardsToken, reward);

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
        if (reward < DURATION) revert VTOKENRewarder__RewardSmallerThanDuration();
        if (!isRewardToken[_rewardsToken]) revert VTOKENRewarder__NotRewardToken();

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
        emit VTOKENRewarder__RewardNotified(_rewardsToken, reward);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /**
     * @notice Deposits a virtual amount of tokens for account. No tokens are actually being deposited,
     *         this is reward accounting for VTOKEN balances. Only VTOKEN contract can call this function.
     * @param amount the amount of virtual tokens to deposit
     * @param account the account to deposit virtual tokens for
     */
    function _deposit(uint256 amount, address account) 
        external
        updateReward(account)
        onlyVTOKEN
    {
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit VTOKENRewarder__Deposited(account, amount);
    }

    /**
     * @notice Withdraws a virtual amount of tokens for account. No tokens are actually being withdrawn,
     *         this is reward accounting for VTOKEN balances. Only VTOKEN contract can call this function.
     * @param amount the amount of virtual tokens to withdraw
     * @param account the account to withdraw virtual tokens for
     */
    function _withdraw(uint256 amount, address account) 
        external  
        updateReward(account)
        onlyVTOKEN
    {
        _totalSupply = _totalSupply - amount;
        _balances[account] = _balances[account] - amount;
        emit VTOKENRewarder__Withdrawn(account, amount);
    }

    /**
     * @notice Adds a reward token for distribution. Only VTOKEN contract can call this function.
     * @param _rewardsToken the reward token to add
     */
    function addReward(address _rewardsToken) 
        external
        onlyVTOKEN
     {
        if (isRewardToken[_rewardsToken]) revert VTOKENRewarder__RewardTokenAlreadyAdded();
        isRewardToken[_rewardsToken] = true;
        rewardTokens.push(_rewardsToken);
        emit VTOKENRewarder__RewardAdded(_rewardsToken);
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

    function getRewardTokens() external view returns (address[] memory) {
        return rewardTokens;
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


contract VTOKENRewarderFactory {

    event VTOKENRewarderFactory__VTOKENRewarderCreated(address indexed rewarder);

    constructor() {}

    function createVTokenRewarder(address _VTOKEN) external returns (address rewarder) {
        rewarder = address(new VTOKENRewarder(_VTOKEN));
        emit VTOKENRewarderFactory__VTOKENRewarderCreated(rewarder);
    }
}
