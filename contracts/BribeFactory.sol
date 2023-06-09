// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

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

    // user -> reward token -> amount
    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;  // user -> reward token -> reward per virtual token paid
    mapping(address => mapping(address => uint256)) public rewards;                 // user -> reward token -> reward amount

    uint256 private _totalSupply;                   // total supply of virtual tokens
    mapping(address => uint256) private _balances;  // user -> virtual token balance

    /*----------  ERRORS ------------------------------------------------*/

    error Bribe__NotAuthorizedVoter();
    error Bribe__RewardSmallerThanDuration();
    error Bribe__NotRewardToken();
    error Bribe__RewardTokenAlreadyAdded();

    /*----------  EVENTS ------------------------------------------------*/

    event Bribe__RewardAdded(address indexed rewardToken);
    event Bribe__RewardNotified(address indexed rewardToken, uint256 reward);
    event Bribe__Staked(address indexed user, uint256 amount);
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

    modifier onlyVoter(address _address) {
        if (msg.sender != VTOKEN) {
            revert Bribe__NotAuthorizedVoter();
        }
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _voter) {
        voter = _voter;
    }

    function getReward(address account) public nonReentrant updateReward(account) {
        for (uint256 i = 0; i < rewardTokens.length; i++) {
            address _rewardsToken = rewardTokens[i];
            uint256 reward = rewards[account][_rewardsToken];
            if (reward > 0) {
                rewards[account][_rewardsToken] = 0;
                IERC20(_rewardsToken).safeTransfer(account, reward);
                emit RewardPaid(account, _rewardsToken, reward);
            }
        }
    }

    function notifyRewardAmount(address _rewardsToken, uint256 reward) external nonReentrant updateReward(address(0)) {
        require(reward >= DURATION, "Bribe: <DURATION");
        require(isRewardToken[_rewardsToken], "reward token not verified");

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
        emit RewardNotified(_rewardsToken, reward);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function _deposit(uint256 amount, address account) external nonReentrant updateReward(account) {
        require(amount > 0, "Cannot stake 0");
        require(msg.sender == voter, "!Voter");
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit Staked(account, amount);
    }

    function _withdraw(uint256 amount, address account) public nonReentrant updateReward(account) {
        require(amount > 0, "Cannot withdraw 0");
        require(msg.sender == voter, "!Voter");
        _totalSupply = _totalSupply - amount;
        _balances[account] = _balances[account] - amount;
        emit Withdrawn(account, amount);
    }

    function addReward(address _rewardsToken) public {
        require(msg.sender == voter, "addReward: permission is denied!");
        require(!isRewardToken[_rewardsToken], "Reward token already exists");
        isRewardToken[_rewardsToken] = true;
        rewardTokens.push(_rewardsToken);
        emit RewardAdded(_rewardsToken);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function left(address _rewardsToken) external view returns (uint256 leftover) {
        if (block.timestamp >= rewardData[_rewardsToken].periodFinish) {
            leftover = 0;
        } else {
            uint256 remaining = rewardData[_rewardsToken].periodFinish - block.timestamp;
            leftover = remaining * rewardData[_rewardsToken].rewardRate;
        }
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
        if (_totalSupply == 0) {
            return rewardData[_rewardsToken].rewardPerTokenStored;
        }
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


contract BribeFactory {
    address public voter;
    address public last_bribe;

    event VoterSet(address indexed account);

    constructor(address _voter) {
        voter = _voter;
    }

    function setVoter(address _voter) external {
        require(msg.sender == voter, "!Voter");
        require(_voter != address(0), "!Valid");
        voter = _voter;
        emit VoterSet(_voter);
    }

    function createBribe(address _voter) external returns (address) {
        require(msg.sender == voter, "unauthorized");
        Bribe lastBribe = new Bribe(_voter);
        last_bribe = address(lastBribe);
        return last_bribe;
    }
}