// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "contracts/interfaces/ITOKEN.sol";
import "contracts/interfaces/IVTOKEN.sol";
import "contracts/interfaces/IVTOKENRewarder.sol";
import "contracts/interfaces/IGauge.sol";
import "contracts/interfaces/IBribe.sol";
import "contracts/interfaces/IVoter.sol";
import "contracts/interfaces/IPlugin.sol";

contract Multicall {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant FEE = 30;
    uint256 public constant DIVISOR = 10000;
    uint256 public constant PRECISION = 1e18;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable voter;
    address public immutable BASE;
    address public immutable TOKEN;
    address public immutable OTOKEN;
    address public immutable VTOKEN;
    address public immutable rewarder;

    uint256 public priceBASE;

    struct SwapCard {
        uint256 frBASE;
        uint256 mrvBASE;
        uint256 mrrBASE;
        uint256 mrrTOKEN;
        uint256 marketMaxTOKEN;
    }

    struct BondingCurve {
        uint256 priceBASE;              // C1
        uint256 priceTOKEN;             // C2
        uint256 priceOTOKEN;            // C3
        uint256 maxMarketSell;          // C4

        uint256 tvl;                    // C5
        uint256 supplyTOKEN;            // C6
        uint256 supplyVTOKEN;           // C7
        uint256 apr;                    // C8
        uint256 ltv;                    // C9
        uint256 ratio;                  // C10

        uint256 accountNATIVE;          // C11
        uint256 accountBASE;            // C12
        uint256 accountTOKEN;           // C13
        uint256 accountOTOKEN;          // C14

        uint256 accountEarnedBASE;      // C15
        uint256 accountEarnedTOKEN;     // C16    
        uint256 accountEarnedOTOKEN;    // C17 

        uint256 accountVTOKEN;          // C18
        uint256 accountVotingPower;     // C19
        uint256 accountUsedWeights;     // C20

        uint256 accountBorrowCredit;    // C21
        uint256 accountBorrowDebt;      // C22
        uint256 accountMaxWithdraw;     // C23         
    }

    struct GaugeCard {
        address plugin;                     // G1
        address underlying;                 // G2
        uint8 underlyingDecimals;           // G3

        address gauge;                      // G4
        bool isAlive;                       // G5

        string protocol;                    // G6
        string symbol;                      // G7
        address[] tokensInUnderlying;       // G8

        uint256 priceUnderlying;            // G9
        uint256 priceOTOKEN;                // G10

        uint256 apr;                        // G11
        uint256 tvl;                        // G12
        uint256 votingWeight;               // G13
        uint256 totalSupply;                // G14

        uint256 accountUnderlyingBalance;   // G15
        uint256 accountStakedBalance;       // G16
        uint256 accountEarnedOTOKEN;        // G17
    }

    struct BribeCard {
        address plugin;                 // B1
        address bribe;                  // B2
        bool isAlive;                   // B3

        string protocol;                // B4
        string symbol;                  // B5

        address[] rewardTokens;         // B6
        uint8[] rewardTokenDecimals;    // B7
        uint256[] rewardsPerToken;      // B8
        uint256[] accountRewardsEarned; // B9

        uint256 voteWeight;             // B10
        uint256 votePercent;            // B11

        uint256 accountVotePercent;     // B12
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _voter,
        address _BASE,
        address _TOKEN,
        address _OTOKEN,
        address _VTOKEN,
        address _rewarder
    ) {
        voter = _voter;
        BASE = _BASE;
        TOKEN = _TOKEN;
        OTOKEN = _OTOKEN;
        VTOKEN = _VTOKEN;
        rewarder = _rewarder;
    }

    function setPriceBase(uint256 _priceBASE) external {
        priceBASE = _priceBASE;
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function swapCardData() external view returns (SwapCard memory swapCard) {
        swapCard.frBASE = ITOKEN(TOKEN).frBASE();
        swapCard.mrvBASE = ITOKEN(TOKEN).mrvBASE();
        swapCard.mrrBASE = ITOKEN(TOKEN).mrrBASE();
        swapCard.mrrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        swapCard.marketMaxTOKEN = ITOKEN(TOKEN).mrvBASE();

        return swapCard;
    }

    function bondingCurveData(address account) external view returns (BondingCurve memory bondingCurve) {
        bondingCurve.priceBASE = priceBASE;
        bondingCurve.priceTOKEN = ITOKEN(TOKEN).getMarketPrice() * bondingCurve.priceBASE / 1e18;
        bondingCurve.priceOTOKEN = ITOKEN(TOKEN).getOTokenPrice() * bondingCurve.priceBASE / 1e18;
        bondingCurve.maxMarketSell = ITOKEN(TOKEN).getMaxSell();

        bondingCurve.tvl = ITOKEN(TOKEN).getTotalValueLocked() * bondingCurve.priceBASE / 1e18;
        bondingCurve.supplyTOKEN = IERC20(TOKEN).totalSupply();
        bondingCurve.supplyVTOKEN = IERC20(VTOKEN).totalSupply();
        bondingCurve.apr = ((IVTOKENRewarder(rewarder).rewardPerToken(BASE) * bondingCurve.priceBASE / 1e18) +  (IVTOKENRewarder(rewarder).rewardPerToken(TOKEN) * bondingCurve.priceTOKEN / 1e18) + 
                           (IVTOKENRewarder(rewarder).rewardPerToken(OTOKEN) * bondingCurve.priceOTOKEN / 1e18)) * 365 * 100 * 1e18 / (7 * bondingCurve.priceTOKEN);
        bondingCurve.ltv = 100 * ITOKEN(TOKEN).getFloorPrice() * 1e18 / ITOKEN(TOKEN).getMarketPrice();
        bondingCurve.ratio = ITOKEN(TOKEN).getMarketPrice() * 1e18 / ITOKEN(TOKEN).getFloorPrice();

        bondingCurve.accountNATIVE = (account == address(0) ? 0 : account.balance);
        bondingCurve.accountBASE = (account == address(0) ? 0 : IERC20(BASE).balanceOf(account));
        bondingCurve.accountTOKEN = (account == address(0) ? 0 : IERC20(TOKEN).balanceOf(account));
        bondingCurve.accountOTOKEN = (account == address(0) ? 0 : IERC20(OTOKEN).balanceOf(account));

        bondingCurve.accountEarnedBASE = (account == address(0) ? 0 : IVTOKENRewarder(rewarder).earned(account, BASE));
        bondingCurve.accountEarnedTOKEN = (account == address(0) ? 0 : IVTOKENRewarder(rewarder).earned(account, TOKEN));
        bondingCurve.accountEarnedOTOKEN = (account == address(0) ? 0 : IVTOKENRewarder(rewarder).earned(account, OTOKEN));

        bondingCurve.accountVTOKEN = (account == address(0) ? 0 : IVTOKEN(VTOKEN).balanceOfTOKEN(account));
        bondingCurve.accountVotingPower = (account == address(0) ? 0 : IERC20(VTOKEN).balanceOf(account));
        bondingCurve.accountUsedWeights = (account == address(0) ? 0 : IVoter(voter).usedWeights(account));

        bondingCurve.accountBorrowCredit = (account == address(0) ? 0 : ITOKEN(TOKEN).getAccountCredit(account));
        bondingCurve.accountBorrowDebt = (account == address(0) ? 0 : ITOKEN(TOKEN).debts(account));
        bondingCurve.accountMaxWithdraw = (account == address(0) ? 0 : (IVoter(voter).usedWeights(account) > 0 ? 0 : bondingCurve.accountVTOKEN - bondingCurve.accountBorrowDebt));

        return bondingCurve;
    }

    function gaugeCardData(address plugin, address account) public view returns (GaugeCard memory gaugeCard) {
        gaugeCard.plugin = plugin;
        gaugeCard.underlying = IPlugin(plugin).getUnderlyingAddress();
        gaugeCard.underlyingDecimals = IPlugin(plugin).getUnderlyingDecimals();

        gaugeCard.gauge = IVoter(voter).gauges(plugin);
        gaugeCard.isAlive = IVoter(voter).isAlive(gaugeCard.gauge);
        
        gaugeCard.protocol = IPlugin(plugin).getProtocol();
        gaugeCard.symbol = IPlugin(plugin).getUnderlyingSymbol();
        gaugeCard.tokensInUnderlying = IPlugin(plugin).getTokensInUnderlying();

        gaugeCard.priceUnderlying = IPlugin(plugin).getPrice();
        gaugeCard.priceOTOKEN = ITOKEN(TOKEN).getOTokenPrice() * (priceBASE) / 1e18;
        
        gaugeCard.apr = IGauge(IVoter(voter).gauges(plugin)).rewardPerToken(OTOKEN) * gaugeCard.priceOTOKEN * 365 * 100 / 7 / gaugeCard.priceUnderlying;
        gaugeCard.tvl = IGauge(IVoter(voter).gauges(plugin)).totalSupply() * gaugeCard.priceUnderlying / 1e18;
        gaugeCard.votingWeight = (IVoter(voter).totalWeight() == 0 ? 0 : 100 * IVoter(voter).weights(plugin) * 1e18 / IVoter(voter).totalWeight());
        gaugeCard.totalSupply = IGauge(gaugeCard.gauge).totalSupply();

        gaugeCard.accountUnderlyingBalance = (account == address(0) ? 0 : IERC20(gaugeCard.underlying).balanceOf(account));
        gaugeCard.accountStakedBalance = (account == address(0) ? 0 : IPlugin(plugin).balanceOf(account));
        gaugeCard.accountEarnedOTOKEN = (account == address(0) ? 0 : IGauge(IVoter(voter).gauges(plugin)).earned(account, OTOKEN));

        return gaugeCard;
    }

    function bribeCardData(address plugin, address account) public view returns (BribeCard memory bribeCard) {
        bribeCard.plugin = plugin;
        bribeCard.bribe = IVoter(voter).bribes(plugin);
        bribeCard.isAlive = IVoter(voter).isAlive(IVoter(voter).gauges(plugin));

        bribeCard.protocol = IPlugin(plugin).getProtocol();
        bribeCard.symbol = IPlugin(plugin).getUnderlyingSymbol();
        bribeCard.rewardTokens = IBribe(IVoter(voter).bribes(plugin)).getRewardTokens();

        uint8[] memory _rewardTokenDecimals = new uint8[](bribeCard.rewardTokens.length);
        for (uint i = 0; i < bribeCard.rewardTokens.length; i++) {
            _rewardTokenDecimals[i] = IERC20Metadata(bribeCard.rewardTokens[i]).decimals();
        }
        bribeCard.rewardTokenDecimals = _rewardTokenDecimals;

        uint[] memory _rewardsPerToken = new uint[](bribeCard.rewardTokens.length);
        for (uint i = 0; i < bribeCard.rewardTokens.length; i++) {
            _rewardsPerToken[i] = IBribe(IVoter(voter).bribes(plugin)).rewardPerToken(bribeCard.rewardTokens[i]);
        }
        bribeCard.rewardsPerToken = _rewardsPerToken;

        uint[] memory _accountRewardsEarned = new uint[](bribeCard.rewardTokens.length);
        for (uint i = 0; i < bribeCard.rewardTokens.length; i++) {
            _accountRewardsEarned[i] = (account == address(0) ? 0 : IBribe(IVoter(voter).bribes(plugin)).earned(account, bribeCard.rewardTokens[i]));
        }
        bribeCard.accountRewardsEarned = _accountRewardsEarned;

        bribeCard.voteWeight = IVoter(voter).weights(plugin);
        bribeCard.votePercent = (IVoter(voter).totalWeight() == 0 ? 0 : 100 * IVoter(voter).weights(plugin) * 1e18 / IVoter(voter).totalWeight());

        bribeCard.accountVotePercent = (account == address(0) ? 0 : (IVoter(voter).usedWeights(account) == 0 ? 0 : 100 * IVoter(voter).votes(account, plugin) * 1e18 / IVoter(voter).usedWeights(account)));

        return bribeCard;
    }

    function getGaugeCards(uint256 start, uint256 stop, address account) external view returns (GaugeCard[] memory) {
        GaugeCard[] memory gaugeCards = new GaugeCard[](stop - start);
        for (uint i = start; i < stop; i++) {
            gaugeCards[i] = gaugeCardData(getPlugin(i), account);
        }
        return gaugeCards;
    }

    function getBribeCards(uint256 start, uint256 stop, address account) external view returns (BribeCard[] memory) {
        BribeCard[] memory bribeCards = new BribeCard[](stop - start);
        for (uint i = start; i < stop; i++) {
            bribeCards[i] = bribeCardData(getPlugin(i), account);
        }
        return bribeCards;
    }

    function getPlugins() external view returns (address[] memory) {
        return IVoter(voter).getPlugins();
    }

    function getPlugin(uint256 index) public view returns (address) {
        return IVoter(voter).plugins(index);
    }

    function quoteBuyIn(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput) {
        uint256 feeBASE = input * FEE / DIVISOR;
        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        uint256 newMrBASE = oldMrBASE + input - feeBASE;
        uint256 oldMrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        output = oldMrTOKEN - (oldMrBASE * oldMrTOKEN / newMrBASE);

        return (
            output, 
            100 * (1e18 - (output * 1e18 / ((input - feeBASE) * 1e18 / ITOKEN(TOKEN).getMarketPrice()))), 
            ((input - feeBASE) * 1e18 / ITOKEN(TOKEN).getMarketPrice()) * slippageTolerance / DIVISOR
        );
    }

    function quoteBuyOut(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput) {
        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        output = DIVISOR * ((oldMrBASE * ITOKEN(TOKEN).mrrTOKEN() / (ITOKEN(TOKEN).mrrTOKEN() - input)) - oldMrBASE) / (DIVISOR - FEE);

        return (
            output, 
            100 * (1e18 - (input * 1e18 / ((output - (output * FEE / DIVISOR)) * 1e18 / ITOKEN(TOKEN).getMarketPrice()))), 
            (input - (input * FEE / DIVISOR)) * slippageTolerance / DIVISOR
        );
    }

    function quoteSellIn(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput) {
        uint256 feeTOKEN = input * FEE / DIVISOR;
        uint256 oldMrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        uint256 newMrTOKEN = oldMrTOKEN + input - feeTOKEN;
        if (newMrTOKEN <= ITOKEN(TOKEN).mrvBASE()) {
            return (0, 0, 0);
        }

        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        output = oldMrBASE - (oldMrBASE * oldMrTOKEN / newMrTOKEN);

        return (
            output, 
            100 * (1e18 - (output * 1e18 / ((input - feeTOKEN) * ITOKEN(TOKEN).getMarketPrice() / 1e18))), 
            ((input - feeTOKEN) * ITOKEN(TOKEN).getMarketPrice() / 1e18) * slippageTolerance / DIVISOR
        );
    }

    function quoteSellOut(uint256 input, uint256 slippageTolerance) external view returns (uint256 output, uint256 slippage, uint256 minOutput) {
        if (input <= ITOKEN(TOKEN).mrvBASE()) {
            return (0, 0, 0);
        }

        uint256 oldMrBASE = ITOKEN(TOKEN).mrvBASE() + ITOKEN(TOKEN).mrrBASE();
        output = DIVISOR * ((oldMrBASE * ITOKEN(TOKEN).mrrTOKEN() / (oldMrBASE - input)) - ITOKEN(TOKEN).mrrTOKEN()) / (DIVISOR - FEE);

        return (
            output, 
            100 * (1e18 - (input * 1e18 / ((output - (output * FEE / DIVISOR)) * ITOKEN(TOKEN).getMarketPrice() / 1e18))), 
            (input - input * FEE / DIVISOR) * slippageTolerance / DIVISOR
        );
    }

}