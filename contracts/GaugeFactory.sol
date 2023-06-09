// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import 'contracts/libraries/SafeERC20.sol';
import 'contracts/libraries/Math.sol';
import 'contracts/utilities/ReentrancyGuard.sol';
import 'contracts/interfaces/IVoter.sol';

contract Gauge is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant DURATION = 7 days;  

    /*----------  STATE VARIABLES  --------------------------------------*/

    struct Reward {
        uint256 periodFinish;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
    }

    mapping(address => Reward) public rewardData;
    mapping(address => bool) public isRewardToken;
    address[] public rewardTokens;
    address public immutable plugin;
    address public immutable voter;

    // user -> reward token -> amount
    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;
    mapping(address => mapping(address => uint256)) public rewards;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /*----------  ERRORS ------------------------------------------------*/

    /*----------  EVENTS ------------------------------------------------*/
    /*----------  MODIFIERS  --------------------------------------------*/
    /*----------  FUNCTIONS  --------------------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    /* ========== CONSTRUCTOR ========== */

    constructor(address _voter, address _plugin) {
        plugin = _plugin;
        voter = _voter;
    }

    function addReward(address _rewardsToken) public {
        require(msg.sender == voter, "addReward: permission is denied!");
        require(!isRewardToken[_rewardsToken], "Reward token already exists");
        rewardTokens.push(_rewardsToken);
        isRewardToken[_rewardsToken] = true;
        emit RewardAdded(_rewardsToken);
    }

    /* ========== VIEWS ========== */

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
        if (_totalSupply == 0) {
            return rewardData[_rewardsToken].rewardPerTokenStored;
        }
        return
            rewardData[_rewardsToken].rewardPerTokenStored + ((lastTimeRewardApplicable(_rewardsToken) - rewardData[_rewardsToken].lastUpdateTime) * 
            rewardData[_rewardsToken].rewardRate * 1e18 / _totalSupply);
    }

    function earned(address account, address _rewardsToken) public view returns (uint256) {
        return (_balances[account] * (rewardPerToken(_rewardsToken) - userRewardPerTokenPaid[account][_rewardsToken]) / 1e18) + rewards[account][_rewardsToken];
    }

    function getRewardForDuration(address _rewardsToken) external view returns (uint256) {
        return rewardData[_rewardsToken].rewardRate * DURATION;
    }

    function left(address rewardToken) external view returns (uint256) {
        if (block.timestamp >= rewardData[rewardToken].periodFinish) return 0;
        uint256 _remaining = rewardData[rewardToken].periodFinish - block.timestamp;
        return _remaining * rewardData[rewardToken].rewardRate;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    function _deposit(address account, uint256 amount) external updateReward(account) {
        require(msg.sender == plugin, "!Plugin");
        require(amount > 0, "Cannot stake 0");
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        IVoter(voter).emitDeposit(account, amount);
        emit Deposited(account, amount);
    }

    function _withdraw(address account, uint256 amount) public updateReward(account) {
        require(msg.sender == plugin, "!Plugin");
        require(amount > 0, "Cannot withdraw 0");
        _totalSupply = _totalSupply - amount;
        _balances[account] = _balances[account] - amount;
        IVoter(voter).emitWithdraw(account, amount);
        emit Withdrawn(account, amount);
    }

    function getReward(address account) public nonReentrant updateReward(account) {
        require(msg.sender == account || msg.sender == voter);
        IVoter(voter).distribute(address(this));
        for (uint i; i < rewardTokens.length; i++) {
            address _rewardsToken = rewardTokens[i];
            uint256 reward = rewards[account][_rewardsToken];
            if (reward > 0) {
                rewards[account][_rewardsToken] = 0;
                IERC20(_rewardsToken).safeTransfer(account, reward);
                emit RewardPaid(account, _rewardsToken, reward);
            }
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function notifyRewardAmount(address _rewardsToken, uint256 reward) external updateReward(address(0)) {
        require(msg.sender == voter, "!Voter");
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

    /* ========== MODIFIERS ========== */

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

    /* ========== EVENTS ========== */

    event RewardAdded(address indexed rewardToken);
    event RewardNotified(address indexed rewardToken, uint256 reward);
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);
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