// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "contracts/interfaces/ITOKEN.sol";
import "contracts/interfaces/IOTOKEN.sol";
import "contracts/interfaces/IVoter.sol";

/**
 * @title Minter
 * @author heesho
 * 
 * Mints OTOKEN and distributes them to the Voter (to diribute to gauges), the team
 * and the growth fund (VTOKEN stakers).
 * 
 * Mints OTOKEN every week starting with {weekly} OTOKENs per week and decreases by 1% every week
 * until it reaches tail emissions, which is a constant emission rate of OTOKENS per week.
 * 
 * Tail emissions are 0.1% emissions of the total TOKEN supply per week.
 */
contract Minter is Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint internal constant WEEK = 86400 * 7;    // allows minting once per week (reset every Thursday 00:00 UTC)
    uint internal constant EMISSION = 990;      // 99% of minted tokens go to the pool
    uint internal constant TAIL_EMISSION = 1;   // Tail emissions are 0.1% of total supply per week
    uint internal constant PRECISION = 1000;    // precision for math
    uint public constant MAX_TEAM_RATE = 50;    // Max of 5% of emissions can go to the team
    uint public constant MAX_GROWTH_RATE = 200; // Max of 20% of emissions can go to growth (VTOKEN stakers)

    /*----------  STATE VARIABLES  --------------------------------------*/

    ITOKEN public immutable TOKEN;  // the primary token
    IERC20 public immutable VTOKEN; // the voting token
    IERC20 public immutable OTOKEN; // the token distruted to gauges as rewards
    IVoter public voter;            // the voting & gauge distribution system

    uint public weekly = 100 * 1e18;    // represents a starting weekly emission of 100,000 OTOKEN (OTOKEN has 18 decimals)
    uint public active_period;          // the current period (week) that is active

    address internal initializer;   // the address that can initialize the contract (owner)
    address public team;            // the address that receives team emissions
    uint public teamRate;           // the rate of emissions that go to the team (bps)
    uint public growth = 100;       // the rate of emissions that go to growth (bps)

    /*----------  ERRORS ------------------------------------------------*/

    error Minter__InvalidZeroAddress();
    error Minter__UnathorizedInitializer();
    error Minter__GrowthRateTooHigh();
    error Minter__TeamRateTooHigh();

    /*----------  EVENTS ------------------------------------------------*/

    event Minter__Mint(address indexed sender, uint weekly, uint total_supply, uint circulating_emission);
    event Minter__TeamSet(address indexed account);
    event Minter__VoterSet(address indexed account);
    event Minter__GrowthSet(uint256 rate);
    event Minter__TeamRateSet(uint256 rate);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroAddress(address _account) {
        if (_account == address(0)) revert Minter__InvalidZeroAddress();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Constructs the Minter contract.
     * @param _voter voter contract address
     * @param _TOKEN token contract address
     * @param _VTOKEN VTOKEN contract address
     * @param _OTOKEN OTOKEN contract address
     */
    constructor(
        address _voter, 
        address _TOKEN,
        address _VTOKEN,
        address _OTOKEN
    ) {
        initializer = msg.sender;
        team = msg.sender;
        teamRate = 30; // 30 bps = 3%
        voter = IVoter(_voter);
        TOKEN = ITOKEN(_TOKEN);
        VTOKEN = IERC20(_VTOKEN);
        OTOKEN = IERC20(_OTOKEN);
        active_period = ((block.timestamp + (2 * WEEK)) / WEEK) * WEEK;
    }

    /**
     * @notice Updates the period and mints new tokens if necessary. Can only be called once per epoch (1 week).
     */
    function update_period() external returns (uint) {
        uint _period = active_period;
        if (block.timestamp >= _period + WEEK && initializer == address(0)) { // only trigger if new week
            _period = (block.timestamp / WEEK) * WEEK;
            active_period = _period;
            weekly = weekly_emission();

            uint _growth = calculate_growth(weekly);
            uint _teamEmissions = (teamRate * (_growth + weekly)) / PRECISION;
            uint _required = _growth + weekly + _teamEmissions;
            uint _balanceOf = OTOKEN.balanceOf(address(this));
            if (_balanceOf < _required) {
                require(IOTOKEN(address(OTOKEN)).mint(address(this), _required - _balanceOf));
            }

            OTOKEN.safeTransfer(team, _teamEmissions);
            OTOKEN.safeTransfer(TOKEN.FEES(), _growth);

            OTOKEN.approve(address(voter), weekly);
            voter.notifyRewardAmount(weekly);

            emit Minter__Mint(msg.sender, weekly, circulating_supply(), circulating_emission());
        }
        return _period;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function initialize() 
        external 
    {
        if (msg.sender != initializer) revert Minter__UnathorizedInitializer();
        initializer = address(0);
        active_period = ((block.timestamp) / WEEK) * WEEK; // allow minter.update_period() to mint new emissions THIS Thursday
    }

    function setTeam(address _team) 
        external
        onlyOwner 
        nonZeroAddress(_team)
    {
        team = _team;
        emit Minter__TeamSet(_team);
    }

    function setVoter(address _voter) 
        external 
        onlyOwner 
        nonZeroAddress(_voter)
    {
        voter = IVoter(_voter);
        emit Minter__VoterSet(_voter);
    }

    function setGrowth(uint256 _growth) 
        external 
        onlyOwner 
    {
        if (_growth > MAX_GROWTH_RATE) revert Minter__GrowthRateTooHigh();
        growth = _growth;
        emit Minter__GrowthSet(_growth);
    }

    function setTeamRate(uint _teamRate) 
        external 
        onlyOwner 
    {
        if (_teamRate > MAX_TEAM_RATE) revert Minter__TeamRateTooHigh();
        teamRate = _teamRate;
        emit Minter__TeamRateSet(_teamRate);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    // calculate circulating supply as total token supply 
    function circulating_supply() public view returns (uint) {
        return TOKEN.totalSupply();
    }

    // emission calculation is 1% of available supply to mint adjusted by circulating / total supply
    function calculate_emission() public view returns (uint) {
        return (weekly * EMISSION) / PRECISION;
    }

    // weekly emission takes the max of calculated (aka target) emission versus circulating tail end emission
    function weekly_emission() public view returns (uint) {
        return Math.max(calculate_emission(), circulating_emission());
    }

    // calculates tail end (infinity) emissions as 0.2% of total supply
    function circulating_emission() public view returns (uint) {
        return (circulating_supply() * TAIL_EMISSION) / PRECISION;
    }

    // calculate inflation and adjust ve balances accordingly
    function calculate_growth(uint _minted) public view returns (uint) {
        return (_minted * growth) / PRECISION;
    }

}