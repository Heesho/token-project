// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import 'contracts/interfaces/ITOKEN.sol';
import 'contracts/interfaces/IVTOKEN.sol';
import 'contracts/interfaces/IRewarder.sol';
import 'contracts/interfaces/IOTOKEN.sol';

/** @title TOKEN Bonding Curve
 *  @author Heesho
 *  Bonding Curve Mints/Burns TOKEN algorithmically from the floor reserves and market reserves
 *  TOKEN is backed by a reserve of BASE
 *  The floor reserves are the amount of BASE that is always available to be redeemed for TOKEN at the constant floor price
 *  The market reserves are the amount of BASE and TOKEN that is available to be bought and sold at the market price using a virutal xy=k invariant
 *   _____________________
 *  |           |        /|
 *  |           |       / |
 *  |           |      /  |
 *  |           |     /   |
 *  |           |    /    |
 *  |           |   /     |              
 *  |           |  /      |            
 *  |           | /       |         
 *  |___________|/        |
 *  | FLOOR     | MARKET  |         
 *  | RESERVE   | RESERVE |   
 *  |___________|_________| 
 *  |<----Cf--->|<---Cm-->|
 */ 

contract TOKEN is ERC20, ReentrancyGuard, Ownable {
    using safeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant PROTOCOL_FEE = 20;     // Swap and borrow fee: buy, sell, borrow
    uint256 public constant PROVIDER_FEE = 2000;   // Fee for the UI hosting provider
    uint256 public constant DIVISOR = 10000;       // Divisor for fee calculation
    uint256 public constant FLOOR_PRICE = 1e18;    // Floor price of TOKEN in BASE
    uint256 public constant PRECISION = 1e18;      // Precision

    /*----------  STATE VARIABLES  --------------------------------------*/

    // Address state variables
    IERC20 public immutable BASE;       // ERC20 token that backs TOKEN with liquidity in Bonding Curve. Must be 18 decimals
    IOTOKEN public immutable OTOKEN;    // Call option on TOKEN that can be exercised at the floor price of the bonding curve
    IVTOKEN public immutable VTOKEN;    // Staking contract for TOKEN to earn fees, rewards, voting power, and collateral for loans
    address public immutable FEES;      // Fees contract collects fees swaps and loans to distribute through rewarder
    address public treasury;            // Treasury for protocol revenue

    // Bonding Curve state variables
    uint256 public frBASE;              // floor reserve BASE
    uint256 public immutable mrvBASE;   // market reserve virtual BASE, also is the max amount of TOKEN allowed in the market reserve
    uint256 public mrrBASE;             // market reserve real BASE
    uint256 public mrrTOKEN;            // market reserve real TOKEN

    // Lending state variables
    uint256 public debtTotal;                               // total debt in BASE owed to the bonding curve
    mapping(address account => uint256 debt) public debts;  // debt in BASE owed to the bonding curve per account

    /*----------  ERRORS ------------------------------------------------*/

    error TOKEN__InvalidZeroInput();
    error TOKEN__SwapExpired();
    error TOKEN__ExceedsSwapSlippageTolerance();
    error TOKEN__ExceedsSwapMarketReserves();
    error TOKEN__ExceedsBorrowCreditLimit();
    error TOKEN__InvalidZeroAddress();

    /*----------  EVENTS ------------------------------------------------*/

    event Buy(address indexed account, address indexed to, uint256 amount);
    event Sell(address indexed account, address indexed to, uint256 amount);
    event Exercise(address indexed account, address indexed to, uint256 amount);
    event Redeem(address indexed account, address indexed to, uint256 amount);
    event Borrow(address indexed account, uint256 amount);
    event Repay(address indexed account, uint256 amount);
    event TreasurySet(address indexed account);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert TOKEN__InvalidZeroInput();
        _;
    }

    modifier nonExpiredSwap(uint256 expireTimestamp) {
        if (expireTimestamp < block.timestamp) revert TOKEN__SwapExpired();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(address _BASE, address _OTOKEN, address _treasury, uint256 _supplyTOKEN) 
        ERC20('TOKEN', 'TOKEN')     
    {
        BASE = IERC20(_BASE);
        OTOKEN = IOTOKEN(_OTOKEN);
        VTOKEN = IVTOKEN(_VTOKEN);
        treasury = _treasury;
        mrvBASE = _supplyTOKEN;
        mrrTOKEN = _supplyTOKEN;
        FEES = address(new TOKENFees(address(this), _BASE, _OTOKEN));
        _mint(address(this), _supplyTOKEN);
    }

    /**
     * @notice Buy TOKEN from the bonding curve market reserves with BASE
     * @param amountBase Amount of BASE to spend
     * @param minToken Minimum amount of TOKEN to receive, reverts when outTOKEN < minToken
     * @param expireTimestamp Expiration timestamp of the swap, reverts when block.timestamp > expireTimestamp
     * @param toAccount Account address to receive TOKEN
     * @param provider Account address (UI provider) to receive provider fee, address(0) does not take a fee
     * @return bool true=success, otherwise false
     */
    function buy(uint256 amountBase, uint256 minToken, uint256 expireTimestamp, address toAccount, address provider) 
        external
        nonReentrant
        nonZeroInput(amountBase)
        nonExpiredSwap(expireTimestamp)
        returns (bool)
    {
        address account = msg.sender;

        uint256 feeBASE = amountBase * PROTOCOL_FEE / DIVISOR;
        uint256 oldMrBASE = mrvBASE + mrrBASE;
        uint256 newMrBASE = oldMrBASE + amountBase - feeBASE;
        uint256 newMrTOKEN = oldMrBASE * mrrTOKEN / newMrBASE;
        uint256 outTOKEN = mrrTOKEN - newMrTOKEN;

        if (outTOKEN < minToken) revert TOKEN__ExceedsSwapSlippageTolerance();

        mrrBASE = newMrBASE - mrvBASE;
        mrrTOKEN = newMrTOKEN;

        emit Buy(account, toAccount, amountBase);

        transfer(toAccount, outTOKEN);
        if (provider != address(0)) {
            uint256 providerFee = feeBASE * PROVIDER / DIVISOR;
            BASE.safeTransferFrom(account, provider, providerFee);
            BASE.safeTransferFrom(account, FEES, feeBASE - providerFee);
        } else {
            BASE.safeTransferFrom(account, FEES, feeBASE);
        }
        IERC20(BASE).safeTransferFrom(account, address(this), amountBase - feeBASE);
        return true;
    }

    /**
     * @notice Sell TOKEN to the bonding curve market reserves for BASE
     * @param amountToken Amount of TOKEN to spend
     * @param minBase Minimum amount of BASE to receive, reverts when outBase < minBase
     * @param expireTimestamp Expiration timestamp of the swap, reverts when block.timestamp > expireTimestamp
     * @param toAccount Account address to receive BASE
     * @param provider Account address (UI provider) to receive provider fee, address(0) does not take a fee
     * @return bool true=success, otherwise false
     */
    function sell(uint256 amountToken, uint256 minBase, uint256 expireTimestamp, address toAccount, address provider) 
        external
        nonReentrant
        nonZeroInput(amountToken)
        nonExpiredSwap(expireTimestamp)
        returns (bool)
    {
        address account = msg.sender;

        uint256 feeTOKEN = amountToken * PROTOCOL_FEE / DIVISOR;
        uint256 oldMrTOKEN = mrrTOKEN;
        uint256 newMrTOKEN = mrrTOKEN + amountToken - feeTOKEN;
        if (newMrTOKEN > mrvBASE) revert TOKEN__ExceedsSwapMarketReserves();

        uint256 oldMrBASE = mrvBASE + mrrBASE;
        uint256 newMrBASE = oldMrBASE * oldMrTOKEN / newMrTOKEN;
        uint256 outBASE = oldMrBASE - newMrBASE;

        if (outBASE < minBase) revert TOKEN__ExceedsSwapSlippageTolerance();

        mrrBASE = newMrBASE - mrvBASE;
        mrrTOKEN = newMrTOKEN;

        emit Sell(account, toAccount, amountToken);

        if (_provider != address(0)) {
            uint256 providerFee = feeTOKEN * PROVIDER / DIVISOR;
            transferFrom(account, provider, providerFee);
            transferFrom(account, FEES, feeTOKEN - providerFee);
        } else {
            transferFrom(account, FEES, feeTOKEN);
        }
        transferFrom(account, address(this), amountTOKEN - feeTOKEN);
        BASE.safeTransfer(toAccount, outBASE);
        return true;
    }

    /**
     * @notice Exercise equal amounts of OTOKEN with BASE to receive and an equal amount of TOKEN. 
     *         OTOKEN is a call option with no expiry that can be exercised to purchase TOKEN 
     *         with BASE at the constant floor price from the floor reserves.
     * @param amountOToken Amount of OTOKEN to exercise, an equal amount of BASE will be required
     * @param toAccount Account address to receive TOKEN
     * @return bool true=success, otherwise false
     */
    function exercise(uint256 amountOToken, address toAccount) 
        external
        nonReentrant
        nonZeroInput(amountOToken)
        returns (bool)
    {
        address account = msg.sender;
        frBASE += amountOToken;
        _mint(toAccount, amountOToken);
        emit Exercise(account, toAccount, amountOToken);
        OTOKEN.burnFrom(account, amountOToken);
        BASE.safeTransferFrom(account, address(this), amountOToken);
        return true;
    }

    /**
     * @notice Redeem TOKEN for an equal amount of BASE from the floor reserves at the constant floor price
     * @param amountToken Amount of TOKEN to redeem, an equal amount of BASE will be received
     * @param toAccount Account address to receive BASE
     * @return bool true=success, otherwise false
     */
    function redeem(uint256 amountToken, address toAccount)
        external
        nonReentrant
        nonZeroInput(amountToken)
        returns (bool)
    {
        address account = msg.sender;
        frBASE -= _amountTOKEN;
        _burn(account, _amountTOKEN);
        emit Redeem(account, toAccount, _amountTOKEN);
        BASE.safeTransfer(_to, _amountTOKEN);
        return true;
    }

    function borrow(uint256 amountBase)
        external
        nonReentrant
        nonZeroInput(amountBase)
        returns (bool)
    {
        address account = msg.sender;

    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert Treasury__ZeroAddress();
        treasury = newTreasury;
        emit TreasurySet(newTreasury);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getFloorPrice() public view returns (uint256) {
        return FLOOR_PRICE;
    }

    function getMarketPrice() public view returns (uint256) {
        return ((mrvBASE + mrrBASE) * PRECISION) / mrrTOKEN;
    }

    function getOTokenPrice() public view returns (uint256) {
        return getMarketPrice() - getFloorPrice();
    }

    function getMaxSell() public view returns (uint256) {
        return (mrrTOKEN * mrrBASE / mrvBASE) * DIVISOR / (DIVISOR - PROTOCOL_FEE);
    }

    function getTotalValueLocked() public view returns (uint256) {
        return frBASE + mrrBASE + (mrrTOKEN * getMarketPrice() / PRECISION);
    }

    function getAccountCredit(address account) public view returns (uint256) {
        return VTOKEN.balanceOfTOKEN(account) - debt[account];
    }

}