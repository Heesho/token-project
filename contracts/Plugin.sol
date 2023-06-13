// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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

    function depositFor(address account, uint256 amount) external nonReentrant nonZeroInput(amount) returns (bool) {}

    function withdrawTo(address account, uint256 amount) external nonReentrant nonZeroInput(amount) returns (bool) {}

    function claimAndDistribute() external nonReentrant {}

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setGauge(address _gauge) external onlyVoter {
        gauge = _gauge;
    }

    function setBribe(address _bribe) external onlyVoter {
        bribe = _bribe;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function getUnderlyingName() external view returns (string memory) {
        return underlying.name();
    }

    function getUnderlyingSymbol() external view returns (string memory) {
        return underlying.symbol();
    }

    function getUnderlyingAddress() external view returns (address) {
        return address(underlying);
    }

    function getProtocol() external view virtual returns (string memory) {
        return protocol;
    }

    function getVoter() external view returns (address) {
        return voter;
    }

    function getGauge() external view returns (address) {
        return gauge;
    }

    function getBribe() external view returns (address) {
        return bribe;
    }

    function getTokensInUnderlying() external view returns (address[] memory) {
        return tokensInUnderlying;
    }

    function getBribeTokens() external view returns (address[] memory) {
        return bribeTokens;
    }

    function getPrice() external view virtual returns (uint256)  {}


}