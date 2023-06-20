// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "contracts/interfaces/IVTOKEN.sol";
import "contracts/interfaces/IPlugin.sol";
import "contracts/interfaces/IGauge.sol";
import "contracts/interfaces/IBribe.sol";
import "contracts/interfaces/IMinter.sol";
import "contracts/interfaces/IGaugeFactory.sol";
import "contracts/interfaces/IBribeFactory.sol";

/**
 * @title Voter
 * @author heesho
 * 
 * Voter contract is used to vote on plugins. When a Plugin is added a Gauge and Bribe are deployed for that Plugin.
 * VTOKEN holders can cast votes on Plugins in the Voter contract. The Voter will distribute OTOKEN to those Plugin's
 * gauges based every week based on the votes cast. When an account casts a vote on a plugin, its corresponding Bribe
 * balance will be updated to reflect that account's votes for them to receive voting rewards from that plugin.
 * 
 * Voter votes must be equal to Bribe balanceOf for that plugin for all accounts at all times.
 * Voter weights must be equal to Bribe totalSupply at all times.
 */
contract Voter is ReentrancyGuard, Ownable {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint internal constant DURATION = 7 days; // duration of each voting epoch

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable VTOKEN;        // the voting token that governs these contracts
    address internal immutable OTOKEN;      // the token that is distributed to gauges for rewards
    address public immutable gaugefactory;  // the gauge factory that creates gauges  
    address public immutable bribefactory;  // the bribe factory that creates bribes
    address public minter;                  // the minter that mints OTOKENs to Voter contract for distribution
    address public treasury;                // the treasury that receives a portion of voting rewards from plugin revenue
    address public team;                    // the team that can step in to remove/add gauges in case of emergency. Can also add bribe rewards.


    uint public totalWeight;                                        // total voting weight
    address[] public plugins;                                       // all plugins viable for incentives
    mapping(address => address) public gauges;                      // plugin => gauge
    mapping(address => address) public pluginForGauge;              // gauge => plugin
    mapping(address => address) public bribes;                      // plugin => bribe
    mapping(address => uint256) public weights;                     // plugin => weight
    mapping(address => mapping(address => uint256)) public votes;   // account => plugin => votes
    mapping(address => address[]) public pluginVote;                // account => plugins
    mapping(address => uint) public usedWeights;                    // account => total voting weight of user
    mapping(address => uint) public lastVoted;                      // account => timestamp of last vote, to ensure one vote per epoch
    mapping(address => bool) public isGauge;                        // gauge => true if is gauge
    mapping(address => bool) public isAlive;                        // gauge => true if is alive

    uint internal index;                            // index of current voting epoch
    mapping(address => uint) internal supplyIndex;  // plugin => index of supply at last reward distribution
    mapping(address => uint) public claimable;      // plugin => claimable rewards

    /*----------  ERRORS ------------------------------------------------*/

    error Voter__AlreadyVotedThisEpoch();
    error Voter__NotAuthorizedGovernance();
    error Voter__PluginLengthNotEqualToWeightLength();
    error Voter__NotAuthorizedMinter();
    error Voter__InvalidZeroAddress();
    error Voter__NotMinter();
    error Voter__GaugeExists();
    error Voter__GaugeIsDead();
    error Voter__GaugeIsAlive();
    error Voter__NotGauge();

    /*----------  EVENTS ------------------------------------------------*/

    event Voter__GaugeCreated(address creator, address indexed plugin, address indexed gauge,  address bribe);
    event Voter__GaugeKilled(address indexed gauge);
    event Voter__GaugeRevived(address indexed gauge);
    event Voter__Voted(address indexed voter, uint256 weight);
    event Voter__Abstained(address account, uint256 weight);
    event Voter__Deposit(address indexed plugin, address indexed gauge, address account, uint amount);
    event Voter__Withdraw(address indexed plugin, address indexed gauge, address account, uint amount);
    event Voter__NotifyReward(address indexed sender, address indexed reward, uint amount);
    event Voter__DistributeReward(address indexed sender, address indexed gauge, uint amount);
    event Voter__BribeRewardAdded(address indexed bribe, address indexed reward);
    event Voter__TreasurySet(address indexed account);
    event Voter__TeamSet(address indexed account);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier onlyNewEpoch(address account) {
        if ((block.timestamp / DURATION) * DURATION < lastVoted[account]) revert Voter__AlreadyVotedThisEpoch();
        _;
    }

    modifier onlyGov {
        if (msg.sender != owner() && msg.sender != team) revert Voter__NotAuthorizedGovernance();
        _;
    }

    modifier nonZeroAddress(address _account) {
        if (_account == address(0)) revert Voter__InvalidZeroAddress();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice construct a voter contract 
     * @param _VTOKEN VTOKEN address which is used to get voting power
     * @param _OTOKEN OTOKEN address which is distributed to gauges for rewards
     * @param _gaugefactory GaugeFactory address which is used to create gauges
     * @param _bribefactory BribeFactory address which is used to create bribes
     */
    constructor(address _VTOKEN, address _OTOKEN, address _gaugefactory, address _bribefactory) {
        VTOKEN = _VTOKEN;
        OTOKEN = _OTOKEN;
        gaugefactory = _gaugefactory;
        bribefactory = _bribefactory;
        minter = msg.sender;
        treasury = msg.sender;
        team = msg.sender;
    }

    /**
     * @notice Resets msg.sender's votes to zero on all plugins. Can only be called once per epoch.
     *         This is necessary for the user to withdraw staked VTOKENs by setting users voting weight to 0.
     */
    function reset() 
        external 
        onlyNewEpoch(msg.sender) 
    {
        address account = msg.sender;
        lastVoted[account] = block.timestamp;
        _reset(account);
    }

    /**
     * @notice Allocates voting power for msg.sender to input plugins based on input weights. Will update bribe balances
     *         to track voting rewards. Makes users voting weight nonzero. Can only be called once per epoch. 
     * @param _plugins list of plugins to vote on
     * @param _weights list of weights corresponding to plugins
     */
    function vote(address[] calldata _plugins, uint256[] calldata _weights) 
        external 
        onlyNewEpoch(msg.sender) 
    {
        if (_plugins.length != _weights.length) revert Voter__PluginLengthNotEqualToWeightLength();
        lastVoted[msg.sender] = block.timestamp;
        _vote(msg.sender, _plugins, _weights);
    }

    /**
     * @notice Claims rewards for msg.sender from list of gauges.
     * @param _gauges list of gauges to claim rewards from
     */
    function claimRewards(address[] memory _gauges) external {
        for (uint i = 0; i < _gauges.length; i++) {
            IGauge(_gauges[i]).getReward(msg.sender);
        }
    }

    /**
     * @notice Claims rewards for msg.sender from list of bribes.
     * @param _bribes list of bribes to claim rewards from
     */
    function claimBribes(address[] memory _bribes) external {
        for (uint i = 0; i < _bribes.length; i++) {
            IBribe(_bribes[i]).getReward(msg.sender);
        }
    }

    /**
     * @notice Claims voting rewards for each plugin and distributes it to corresponding bribe contracts
     * @param _plugins list of plugins to claim rewards and distribute from
     */
    function distributeToBribes(address[] memory _plugins) external {
        for (uint i = 0; i < _plugins.length; i++) {
            IPlugin(_plugins[i]).claimAndDistribute();
        }
    }

    /**
     * @notice Distributes OTOKEN to _gauge, notifies gauge contract to start distributing OTOKEN to plugin depositors.
     * @param _gauge gauge to distribute OTOKEN to
     */
    function distribute(address _gauge) public nonReentrant {
        IMinter(minter).update_period();
        _updateFor(_gauge); // should set claimable to 0 if killed
        uint _claimable = claimable[_gauge];
        if (_claimable > IGauge(_gauge).left(OTOKEN) && _claimable / DURATION > 0) {
            claimable[_gauge] = 0;
            IGauge(_gauge).notifyRewardAmount(OTOKEN, _claimable);
            emit Voter__DistributeReward(msg.sender, _gauge, _claimable);
        }
    }

    /**
     * @notice Distributes OTOKEN to gauges from start to finish
     * @param start starting index of gauges to distribute to
     * @param finish ending index of gauges to distribute to
     */
    function distribute(uint start, uint finish) public {
        for (uint x = start; x < finish; x++) {
            distribute(gauges[plugins[x]]);
        }
    }

    /**
     * @notice Distributes OTOKEN to all gauges
     */
    function distro() external {
        distribute(0, plugins.length);
    }

    /**
     * @notice For the minter to notify the voter contract of the amount of OTOKEN to distribute
     * @param amount amount of OTOKEN to distribute
     */
    function notifyRewardAmount(uint amount) external {
        _safeTransferFrom(OTOKEN, msg.sender, address(this), amount); // transfer the distro in
        uint256 _ratio = amount * 1e18 / totalWeight; // 1e18 adjustment is removed during claim
        if (_ratio > 0) {
            index += _ratio;
        }
        emit Voter__NotifyReward(msg.sender, OTOKEN, amount);
    }

    function updateFor(address[] memory _gauges) external {
        for (uint i = 0; i < _gauges.length; i++) {
            _updateFor(_gauges[i]);
        }
    }

    function updateForRange(uint start, uint end) public {
        for (uint i = start; i < end; i++) {
            _updateFor(gauges[plugins[i]]);
        }
    }

    function updateAll() external {
        updateForRange(0, plugins.length);
    }

    function updateGauge(address _gauge) external {
        _updateFor(_gauge);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function initialize(address _minter) 
        external 
    {
        if (msg.sender != minter) revert Voter__NotMinter();
        minter = _minter;
    }

    function addPlugin(address _plugin) 
        external 
        onlyGov 
        returns (address) 
    {
        if (gauges[_plugin] != address(0)) revert Voter__GaugeExists();

        address _gauge = IGaugeFactory(gaugefactory).createGauge(address(this), _plugin);
        IGauge(_gauge).addReward(OTOKEN);
        IPlugin(_plugin).setGauge(_gauge);
        IERC20(OTOKEN).approve(_gauge, type(uint).max);

        address _bribe = IBribeFactory(bribefactory).createBribe(address(this));
        address[] memory _bribeTokens = IPlugin(_plugin).getBribeTokens();
        for (uint256 i = 0; i < _bribeTokens.length; i++) {
            IBribe(_bribe).addReward(_bribeTokens[i]);
        }
        IPlugin(_plugin).setBribe(_bribe);

        gauges[_plugin] = _gauge;
        bribes[_plugin] = _bribe;
        pluginForGauge[_gauge] = _plugin;
        isGauge[_gauge] = true;
        isAlive[_gauge] = true;
        _updateFor(_gauge);
        plugins.push(_plugin);
        emit Voter__GaugeCreated(msg.sender, _plugin, _gauge, _bribe); 
        return _gauge;
    }

    function killGauge(address _gauge) 
        external 
        onlyGov 
    {
        if (!isAlive[_gauge]) revert Voter__GaugeIsDead();
        isAlive[_gauge] = false;
        claimable[_gauge] = 0;
        emit Voter__GaugeKilled(_gauge);
    }

    function reviveGauge(address _gauge) 
        external 
        onlyGov 
    {
        if (isAlive[_gauge]) revert Voter__GaugeIsAlive();
        isAlive[_gauge] = true;
        emit Voter__GaugeRevived(_gauge);
    }

    function setTreasury(address _treasury) 
        external 
        onlyOwner 
        nonZeroAddress(_treasury)
    {
        treasury = _treasury;
        emit Voter__TreasurySet(_treasury);
    }

    function setTeam(address _team) 
        external 
        onlyOwner 
        nonZeroAddress(_team)
    {
        team = _team;
        emit Voter__TeamSet(_team);
    }

    function addBribeReward(address _bribe, address _rewardToken) 
        external 
        onlyGov 
        nonZeroAddress(_rewardToken)
    {
        IBribe(_bribe).addReward(_rewardToken);
        emit Voter__BribeRewardAdded(_bribe, _rewardToken);
    }

    function emitDeposit(address account, uint amount) 
        external 
    {
        if (!isGauge[msg.sender]) revert Voter__NotGauge();
        if (!isAlive[msg.sender]) revert Voter__GaugeIsDead();
        emit Voter__Deposit(pluginForGauge[msg.sender], msg.sender, account, amount);
    }

    function emitWithdraw(address account, uint amount) external {
        if (!isGauge[msg.sender]) revert Voter__NotGauge();
        emit Voter__Withdraw(pluginForGauge[msg.sender], msg.sender, account, amount);
    }

    function _reset(address account) internal {
        address[] storage _pluginVote = pluginVote[account];
        uint _pluginVoteCnt = _pluginVote.length;
        uint256 _totalWeight = 0;

        for (uint i = 0; i < _pluginVoteCnt; i ++) {
            address _plugin = _pluginVote[i];
            uint256 _votes = votes[account][_plugin];

            if (_votes > 0) {
                _updateFor(gauges[_plugin]);
                weights[_plugin] -= _votes;
                votes[account][_plugin] -= _votes;
                IBribe(bribes[_plugin])._withdraw(IBribe(bribes[_plugin]).balanceOf(account), account);
                _totalWeight += _votes;
                emit Voter__Abstained(account, _votes);
            }
        }
        totalWeight -= uint256(_totalWeight);
        usedWeights[account] = 0;
        delete pluginVote[account];
    }

    function _vote(address account, address[] memory _pluginVote, uint256[] memory _weights) internal {
        _reset(account);
        uint _pluginCnt = _pluginVote.length;
        uint256 _weight = IVTOKEN(VTOKEN).balanceOf(account);
        uint256 _totalVoteWeight = 0;
        uint256 _totalWeight = 0;
        uint256 _usedWeight = 0;

        for (uint i = 0; i < _pluginCnt; i++) {
            address _plugin = _pluginVote[i];
            address _gauge = gauges[_plugin];
            if (isGauge[_gauge] && isAlive[_gauge]) { 
                _totalVoteWeight += _weights[i];
            }
        }

        for (uint i = 0; i < _pluginCnt; i++) {
            address _plugin = _pluginVote[i];
            address _gauge = gauges[_plugin];

            if (isGauge[_gauge] && isAlive[_gauge]) { 
                uint256 _pluginWeight = _weights[i] * _weight / _totalVoteWeight;
                require(votes[account][_plugin] == 0);
                require(_pluginWeight != 0);
                _updateFor(_gauge);

                pluginVote[account].push(_plugin);

                weights[_plugin] += _pluginWeight;
                votes[account][_plugin] += _pluginWeight;
                IBribe(bribes[_plugin])._deposit(uint256(_pluginWeight), account); 
                _usedWeight += _pluginWeight;
                _totalWeight += _pluginWeight;
                emit Voter__Voted(account, _pluginWeight);
            }
        }

        totalWeight += uint256(_totalWeight);
        usedWeights[account] = uint256(_usedWeight);
    }

    function _updateFor(address _gauge) internal {
        address _plugin = pluginForGauge[_gauge];
        uint256 _supplied = weights[_plugin];
        if (_supplied > 0) {
            uint _supplyIndex = supplyIndex[_gauge];
            uint _index = index; // get global index0 for accumulated distro
            supplyIndex[_gauge] = _index; // update _gauge current position to global position
            uint _delta = _index - _supplyIndex; // see if there is any difference that need to be accrued
            if (_delta > 0) {
                uint _share = uint(_supplied) * _delta / 1e18; // add accrued difference for each supplied token
                if (isAlive[_gauge]) {
                    claimable[_gauge] += _share;
                }
            }
        } else {
            supplyIndex[_gauge] = index; // new users are set to the default global state
        }
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        require(token.code.length > 0);
        (bool success, bytes memory data) =
        token.call(abi.encodeWithSelector(IERC20.transferFrom.selector, from, to, value));
        require(success && (data.length == 0 || abi.decode(data, (bool))));
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getPlugins() external view returns (address[] memory) {
        return plugins;
    }

    function length() external view returns (uint) {
        return plugins.length;
    }

}