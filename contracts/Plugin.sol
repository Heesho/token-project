// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "contracts/interfaces/IGauge.sol";
import "contracts/interfaces/IBribe.sol";
import "contracts/interfaces/IVoter.sol";

/**
 * @title Plugin
 * @author heesho
 * 
 * Plugins are contracts that can be used to integrate a yield-bearing asset with the Voting system.
 * The idea is that when a yield-bearing asset is added to this system, users can deposit it in a Plugin
 * to earn OTOKEN rewards. The Plugin will strip the yield from the yield-bearing asset and distribute it
 * as a voting reward to VTOKEN holders that voted for the Plugin. The Plugin contract is in charge of 
 * accepting deposits/withdrawals from accounts and updating their balances in the corresponding Gauge contract
 * so that they can receive OTOKEN rewards. The Plugin is also in charge of harvesting yield from the yield-bearing
 * asset (underlying) and distributing that yield to its corresponding Bribe contract.
 * 
 * Plugin balanceOf must be equal to Gauge balanceOf for all users at all times.
 * Plugin totalSupply must be equal to Gauge totalSupply at all times.
 */
abstract contract Plugin is ReentrancyGuard {
    using SafeERC20 for IERC20Metadata;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 private constant FEE = 50;
    uint256 private constant DIVISOR = 1000;

    /*----------  STATE VARIABLES  --------------------------------------*/

    IERC20Metadata private immutable underlying;
    address private immutable OTOKEN;
    address private immutable voter;
    address private gauge;
    address private bribe;
    string private  protocol;
    address[] private tokensInUnderlying;
    address[] private bribeTokens;

    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__InvalidZeroInput();
    error Plugin__NotAuthorizedVoter();

    /*----------  EVENTS ------------------------------------------------*/

    event Plugin__Deposited(address indexed account, uint256 amount);
    event Plugin__Withdrawn(address indexed account, uint256 amount);
    event Plugin__ClaimedAnDistributed();

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert Plugin__InvalidZeroInput();
        _;
    }

    modifier onlyVoter() {
        if (msg.sender != voter) revert Plugin__NotAuthorizedVoter();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying, 
        address _OTOKEN, 
        address _voter, 
        address[] memory _tokensInUnderlying, 
        address[] memory _bribeTokens,
        string memory _protocol
    ) {
        underlying = IERC20Metadata(_underlying);
        OTOKEN = _OTOKEN;
        voter = _voter;
        tokensInUnderlying = _tokensInUnderlying;
        bribeTokens = _bribeTokens;
        protocol = _protocol;
    }

    function depositFor(address account, uint256 amount) 
        public
        virtual
        nonReentrant
        nonZeroInput(amount)
    {
        _totalSupply = _totalSupply + amount;
        _balances[account] = _balances[account] + amount;
        emit Plugin__Deposited(account, amount);
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        IGauge(gauge)._deposit(account, amount);
    }

    function withdrawTo(address account, uint256 amount)
        public
        virtual
        nonReentrant
        nonZeroInput(amount)
    {
        _totalSupply = _totalSupply - amount;
        _balances[msg.sender] = _balances[msg.sender] - amount;
        emit Plugin__Withdrawn(account, amount);
        IGauge(gauge)._withdraw(account, amount);
        underlying.safeTransfer(account, amount);
    }

    function claimAndDistribute() public virtual nonReentrant {
        emit Plugin__ClaimedAnDistributed();
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function balanceOf(address account) public view returns (uint256) {
        return _balances[account];
    }

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function getUnderlyingName() public view virtual returns (string memory) {
        return underlying.name();
    }

    function getUnderlyingSymbol() public view virtual returns (string memory) {
        return underlying.symbol();
    }

    function getUnderlyingAddress() public view virtual returns (address) {
        return address(underlying);
    }

    function getUnderlyingDecimals() public view virtual returns (uint8) {
        return underlying.decimals();
    }

    function getProtocol() public view virtual returns (string memory) {
        return protocol;
    }

    function getVoter() public view returns (address) {
        return voter;
    }

    function getGauge() public view returns (address) {
        return gauge;
    }

    function getBribe() public view returns (address) {
        return bribe;
    }

    function getTokensInUnderlying() public view virtual returns (address[] memory) {
        return tokensInUnderlying;
    }

    function getBribeTokens() public view returns (address[] memory) {
        return bribeTokens;
    }

    function getFee() public pure returns (uint256) {
        return FEE;
    }

    function getDivisor() public pure returns (uint256) {
        return DIVISOR;
    }

}