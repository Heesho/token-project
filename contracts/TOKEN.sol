// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "contracts/interfaces/IOTOKEN.sol";
import "contracts/interfaces/IVTOKEN.sol";
import "contracts/interfaces/IOTOKENFactory.sol";
import "contracts/interfaces/IVTOKENFactory.sol";
import "contracts/interfaces/ITOKENFeesFactory.sol";

/** 
 * @title TOKEN Bonding Curve
 * @author heesho
 * 
 * Bonding Curve Mints/Burns TOKEN algorithmically from the floor reserves and market reserves
 * TOKEN is backed by a reserve of BASE tokens.
 * The floor reserves are the amount of BASE that is always available to be redeemed for TOKEN at 
 * the constant floor price. The market reserves are the amount of BASE and TOKEN that is available
 * to be bought and sold at the market price using a virutal xy=k invariant.
 *  _____________________
 * |           |        /|
 * |           |       / |
 * |           |      /  |
 * |           |     /   |
 * |           |    /    |
 * |           |   /     |              
 * |           |  /      |            
 * |           | /       |         
 * |___________|/        |
 * | FLOOR     | MARKET  |         
 * | RESERVE   | RESERVE |   
 * |___________|_________| 
 * |<----Cf--->|<---Cm-->|
 * ```solidity
/**
 * @title TOKEN Bonding Curve
 * @author heesho
 * 
 * @dev This contract governs the price dynamics of an ERC20 TOKEN via a dual bonding curve mechanism:
 * 1. A fixed-price curve, y = c, where the TOKEN price is invariant at 1 BASE/TOKEN (the floor price). 
 *    TOKENs are minted from floor reserves by exercising OTOKEN call options equivalent to the BASE amount. 
 *    TOKENs can be consistently redeemed from floor reserves at the floor price.
 * 2. A variable-price curve that employs the xy=k formula for TOKEN price discovery. An initial TOKEN supply 
 *    is minted into market reserves, balanced by a corresponding quantity of virtual BASE. TOKEN pricing on the 
 *    market reserves spans a range of 1 BASE/TOKEN (lower bound) to infinity BASE/TOKEN (upper bound). The market 
 *    reserve facilitates the buying and selling of TOKENs.
 * 
 * The integration of these reserves forms the comprehensive bonding curve for the TOKEN.
 *
 * @notice The constructs of floor reserves and market reserves underpin this contract.
 * Floor reserves are BASE pools allowing TOKEN redemption at a static floor price. TOKENs are exclusively minted from floor reserves via exercising OTOKEN call options using BASE.
 * Market reserves incorporate variable amounts of BASE and TOKEN subjected to market-driven pricing derived from a virtual xy=k invariant. An initial TOKEN supply is minted into the market reserves, offset by an equal virtual BASE volume. TOKEN pricing in the market reserves varies from a minimum of 1 BASE/TOKEN to an upper limit of infinity BASE/TOKEN.
 *
 * Provided functionalities include:
 * @notice buy() - Acquire TOKEN from the bonding curve's market reserves using BASE
 * @notice sell() - Dispose of TOKEN to the bonding curve's market reserves for BASE
 * @notice exercise() - Exercise OTOKEN call options using BASE to yield equivalent TOKEN quantities
 * @notice redeem() - Redeem TOKEN for a BASE equivalent from the floor reserves at the unvarying floor price
 * @notice borrow() - Borrow BASE from the bonding curve against collateralized VTOKEN at the TOKEN's floor price
 * @notice repay() - Repay BASE to the bonding curve, reducing the account's borrow credit limit and unlocking VTOKEN collateral
 * @notice setTreasury() - Assign the treasury address, which serves as the protocol's revenue repository
 * 
 * @dev The contract is designed to interact with external contracts including: OTOKEN, VTOKEN, and a FEES contract. It is also equipped to levy protocol and UI hosting provider fees.
 * The TOKEN's initial supply is minted to the bonding curve balanced by an equal amount of virtual BASE. For the bonding curve to operate correctly, BASE must be an 18 decimal ERC20 token.
 * The contract is fortified with various error handling mechanisms and emits events for notable actions.
 */
```
 */ 
contract TOKEN is ERC20, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant PROTOCOL_FEE = 30;      // Swap and borrow fee: buy, sell, borrow
    uint256 public constant PROVIDER_FEE = 2000;    // Fee for the UI hosting provider
    uint256 public constant DIVISOR = 10000;        // Divisor for fee calculation
    uint256 public constant FLOOR_PRICE = 1e18;     // Floor price of TOKEN in BASE
    uint256 public constant PRECISION = 1e18;       // Precision
    uint8 public constant DECIMALS = 18;            // Required BASE decimals

    /*----------  STATE VARIABLES  --------------------------------------*/

    // Address state variables
    IERC20 public immutable BASE;       // ERC20 token that backs TOKEN with liquidity in Bonding Curve. Must be 18 decimals
    address public immutable OTOKEN;    // Call option on TOKEN that can be exercised at the floor price of the bonding curve
    address public immutable VTOKEN;    // Staking contract for TOKEN to earn fees, rewards, voting power, and collateral for loans
    address public immutable FEES;      // Fees contract collects fees swaps and loans to distribute through rewarder
    address public treasury;            // Treasury for protocol revenue

    // Bonding Curve state variables
    uint256 public frBASE;              // floor reserve BASE
    uint256 public immutable mrvBASE;   // market reserve virtual BASE, also is the max amount of TOKEN allowed in the market reserve
    uint256 public mrrBASE;             // market reserve real BASE
    uint256 public mrrTOKEN;            // market reserve real TOKEN

    // Lending state variables
    uint256 public debtTotal;                               // total debt in BASE owed to the bonding curve
    mapping(address => uint256) public debts;               // debt in BASE owed to the bonding curve per account

    /*----------  ERRORS ------------------------------------------------*/

    error TOKEN__InvalidDecimals();
    error TOKEN__InvalidZeroInput();
    error TOKEN__SwapExpired();
    error TOKEN__ExceedsSwapSlippageTolerance();
    error TOKEN__ExceedsSwapMarketReserves();
    error TOKEN__ExceedsBorrowCreditLimit();
    error TOKEN__InvalidZeroAddress();

    /*----------  EVENTS ------------------------------------------------*/

    event TOKEN__Buy(address indexed account, address indexed to, uint256 amount);
    event TOKEN__Sell(address indexed account, address indexed to, uint256 amount);
    event TOKEN__Exercise(address indexed account, address indexed to, uint256 amount);
    event TOKEN__Redeem(address indexed account, address indexed to, uint256 amount);
    event TOKEN__Borrow(address indexed account, uint256 amount);
    event TOKEN__Repay(address indexed account, uint256 amount);
    event TOKEN__TreasurySet(address indexed account);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert TOKEN__InvalidZeroInput();
        _;
    }

    modifier nonExpiredSwap(uint256 expireTimestamp) {
        if (expireTimestamp < block.timestamp) revert TOKEN__SwapExpired();
        _;
    }

    modifier nonZeroAddress(address _account) {
        if (_account == address(0)) revert TOKEN__InvalidZeroAddress();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice Construct a new TOKEN Bonding Curve. TOKEN and BASE reserves will be equal.
     *         The initial supply of TOKEN will be minted to the bonding curve with an equal amount of virtual BASE.
     * @dev The BASE must be an 18 decimal ERC20 token, otherwise the bonding curve will not function correctly
     * @param _BASE The ERC20 in the bonding curve reserves
     * @param _supplyTOKEN The initial supply of TOKEN to mint to the bonding curve
     * @param _OTOKENFactory The factory contract to create the OTOKEN
     * @param _VTOKENFactory The factory contract to create the VTOKEN
     * @param _VTOKENRewarderFactory The factory contract to create the VTOKENRewarder
     * @param _TOKENFeesFactory The factory contract to create the TOKENFees
     */
    constructor(
        address _BASE, 
        uint256 _supplyTOKEN, 
        address _OTOKENFactory, 
        address _VTOKENFactory, 
        address _VTOKENRewarderFactory, 
        address _TOKENFeesFactory
    )
        ERC20('TOKEN', 'TOKEN')
        nonZeroAddress(_BASE)
        nonZeroInput(_supplyTOKEN)
    {
        if (IERC20Metadata(_BASE).decimals() != DECIMALS) revert TOKEN__InvalidDecimals();
        BASE = IERC20(_BASE);
        treasury = msg.sender;
        mrvBASE = _supplyTOKEN;
        mrrTOKEN = _supplyTOKEN;
        OTOKEN = IOTOKENFactory(_OTOKENFactory).createOToken(treasury);
        (address vToken, address rewarder) = IVTOKENFactory(_VTOKENFactory).createVToken(address(this), OTOKEN, _VTOKENRewarderFactory, treasury);
        VTOKEN = vToken;
        FEES = ITOKENFeesFactory(_TOKENFeesFactory).createTokenFees(rewarder, address(this), _BASE, OTOKEN);
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
        uint256 feeBASE = amountBase * PROTOCOL_FEE / DIVISOR;
        uint256 newMrBASE = (mrvBASE + mrrBASE) + amountBase - feeBASE;
        uint256 newMrTOKEN = (mrvBASE + mrrBASE) * mrrTOKEN / newMrBASE;
        uint256 outTOKEN = mrrTOKEN - newMrTOKEN;

        if (outTOKEN < minToken) revert TOKEN__ExceedsSwapSlippageTolerance();

        mrrBASE = newMrBASE - mrvBASE;
        mrrTOKEN = newMrTOKEN;

        emit TOKEN__Buy(msg.sender, toAccount, amountBase);

        if (provider != address(0)) {
            uint256 providerFee = feeBASE * PROVIDER_FEE / DIVISOR;
            BASE.safeTransferFrom(msg.sender, provider, providerFee);
            BASE.safeTransferFrom(msg.sender, FEES, feeBASE - providerFee);
        } else {
            BASE.safeTransferFrom(msg.sender, FEES, feeBASE);
        }
        IERC20(BASE).safeTransferFrom(msg.sender, address(this), amountBase - feeBASE);
        IERC20(address(this)).safeTransfer(toAccount, outTOKEN);
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
        if (amountToken > getMaxSell()) revert TOKEN__ExceedsSwapMarketReserves();
        uint256 feeTOKEN = amountToken * PROTOCOL_FEE / DIVISOR;
        uint256 newMrTOKEN = mrrTOKEN + amountToken - feeTOKEN;
        uint256 newMrBASE = (mrvBASE + mrrBASE) * mrrTOKEN / newMrTOKEN;
        uint256 outBASE = (mrvBASE + mrrBASE) - newMrBASE;

        if (outBASE < minBase) revert TOKEN__ExceedsSwapSlippageTolerance();

        mrrBASE = newMrBASE - mrvBASE;
        mrrTOKEN = newMrTOKEN;

        emit TOKEN__Sell(msg.sender, toAccount, amountToken);

        if (provider != address(0)) {
            uint256 providerFee = feeTOKEN * PROVIDER_FEE / DIVISOR;
            IERC20(address(this)).safeTransferFrom(msg.sender, provider, providerFee);
            IERC20(address(this)).safeTransferFrom(msg.sender, FEES, feeTOKEN - providerFee);
        } else {
            IERC20(address(this)).safeTransferFrom(msg.sender, FEES, feeTOKEN);
        }
        IERC20(address(this)).safeTransferFrom(msg.sender, address(this), amountToken - feeTOKEN);
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
        emit TOKEN__Exercise(account, toAccount, amountOToken);
        IOTOKEN(OTOKEN).burnFrom(account, amountOToken);
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
        frBASE -= amountToken;
        _burn(account, amountToken);
        emit TOKEN__Redeem(account, toAccount, amountToken);
        BASE.safeTransfer(toAccount, amountToken);
        return true;
    }

    /**
     * @notice Borrow BASE from the bonding curve against VTOKEN collateral at the floor price of TOKEN.
     *         VTOKEN collateral is locked until the debt is repaid. No bad debt is possible because TOKEN can
     *         never go below the floor price. Therefore, no oracle or liquidation mechanism is required.
     * @param amountBase Amount of BASE to borrow, must be less than the account's borrow credit limit 
     *                   (VTOKEN balance * floor price of TOKEN)
     * @return bool true=success, otherwise false
     */
    function borrow(uint256 amountBase)
        external
        nonReentrant
        nonZeroInput(amountBase)
        returns (bool)
    {
        address account = msg.sender;
        uint256 credit = getAccountCredit(account);
        if (credit < amountBase) revert TOKEN__ExceedsBorrowCreditLimit();
        debts[account] += amountBase;
        debtTotal += amountBase;
        uint256 feeBASE = amountBase * PROTOCOL_FEE / DIVISOR;
        emit TOKEN__Borrow(account, amountBase);
        BASE.safeTransfer(FEES, feeBASE);
        BASE.safeTransfer(account, amountBase - feeBASE);
        return true;
    }

    /**
     * @notice Repay BASE to the bonding curve to reduce the account's borrow credit limit and unlock VTOKEN collateral
     * @param amountBase Amount of BASE to repay, must be less than or equal to the account's debt
     * @return bool true=success, otherwise false
     */
    function repay(uint256 amountBase) 
        external
        nonReentrant
        nonZeroInput(amountBase)
        returns (bool)
    {
        address account = msg.sender;
        debts[account] -= amountBase;
        debtTotal -= amountBase;
        emit TOKEN__Repay(account, amountBase);
        BASE.safeTransferFrom(account, address(this), amountBase);
        return true;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setTreasury(address newTreasury) external onlyOwner {
        if (newTreasury == address(0)) revert TOKEN__InvalidZeroAddress();
        treasury = newTreasury;
        emit TOKEN__TreasurySet(newTreasury);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getFloorPrice() public pure returns (uint256) {
        return FLOOR_PRICE;
    }

    function getMarketPrice() public view returns (uint256) {
        return ((mrvBASE + mrrBASE) * PRECISION) / mrrTOKEN;
    }

    function getOTokenPrice() public view returns (uint256) {
        return getMarketPrice() - getFloorPrice();
    }

    function getMaxSell() public view returns (uint256) {
        return (mrrTOKEN * mrrBASE / mrvBASE);
    }

    function getTotalValueLocked() public view returns (uint256) {
        return frBASE + mrrBASE + (mrrTOKEN * getMarketPrice() / PRECISION);
    }

    function getAccountCredit(address account) public view returns (uint256) {
        return IVTOKEN(VTOKEN).balanceOfTOKEN(account) - debts[account];
    }

}