// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface ITOKEN {
    function getMarketPrice() external view returns (uint256);
}

contract Multicall {

    /*----------  CONSTANTS  --------------------------------------------*/

    uint256 public constant FEE = 30;
    uint256 public constant DIVISOR = 10000;

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

        uint256 accountNative;          // C11
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
        address underlyingDecimals;         // G3

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
        uint8[] rewardDecimals;         // B7
        uint256[] rewardsPerToken;      // B8
        uint256[] accountRewardsEarned; // B9

        uint256 voteWeight;             // B10
        uint266 votePercent;            // B11

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

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function swapCardData() external view returns (SwapCard memory swapCard) {
        swapCard.frBASE = ITOKEN(TOKEN).frBASE();
        swapCard.mrvBASE = ITOKEN(TOKEN).mrvBASE();
        swapCard.mrrBASE = ITOKEN(TOKEN).mrrBASE();
        swapCard.mrrTOKEN = ITOKEN(TOKEN).mrrTOKEN();
        swapCard.marketMaxTOKEN = ITOKEN(TOKEN).marketMaxTOKEN();

        return swapCard;
    }

    function bondingCurveData(address account) external view returns (BondingCurve memory bondingCurve) {
        bondingCurve.priceBASE = priceBASE;
        bondingCurve.priceTOKEN = ITOKEN(TOKEN).currentPrice() * bondingCurve.priceBASE / 1e18;
        bondingCurve.priceOTOKEN = ITOKEN(TOKEN).OTOKENPrice() * bondingCurve.priceBASE / 1e18;
        bondingCurve.maxMarketSell = ITOKEN(TOKEN).sellMax();

        bondingCurve.tvl = ITOKEN(TOKEN).tvl() * bondingCurve.priceBASE / 1e18;
        bondingCurve.supplyTOKEN = ITOKEN(TOKEN).totalSupply();
        bondingCurve.supplyVTOKEN = IVTOKEN(VTOKEN).totalSupply();
        bondingCurve.apr = ((IRewarder(rewarder).rewardPerToken(BASE) * bondingCurve.priceBASE / 1e18) +  (IRewarder(rewarder).rewardPerToken(TOKEN) * bondingCurve.priceTOKEN / 1e18) + 
                           (IRewarder(rewarder).rewardPerToken(OTOKEN) * bondingCurve.priceOTOKEN / 1e18)) * 365 * 100 * 1e18 / (7 * bondingCurve.priceTOKEN);
        bondingCurve.ltv = 100 * ITOKEN(TOKEN).floorPrice() * 1e18 / ITOKEN(TOKEN).currentPrice();
        bondingCurve.ratio = ITOKEN(TOKEN).currentPrice() * 1e18 / ITOKEN(TOKEN).floorPrice();

        bondingCurve.accountNATIVE = (account == address(0) ? 0 : account.balance);
        bondingCurve.accountBASE = (account == address(0) ? 0 : IERC20(BASE).balanceOf(account));
        bondingCurve.accountTOKEN = (account == address(0) ? 0 : IERC20(TOKEN).balanceOf(account));
        bondingCurve.accountOTOKEN = (account == address(0) ? 0 : IERC20(OTOKEN).balanceOf(account));

        bondingCurve.accountEarnedBASE = (account == address(0) ? 0 : IRewarder(rewarder).earned(account, BASE));
        bondingCurve.accountEarnedTOKEN = (account == address(0) ? 0 : IRewarder(rewarder).earned(account, TOKEN));
        bondingCurve.accountEarnedOTOKEN = (account == address(0) ? 0 : IRewarder(rewarder).earned(account, OTOKEN));

        bondingCurve.accountVTOKEN = (account == address(0) ? 0 : IVTOKEN(VTOKEN).balanceOfTOKEN(account));
        bondingCurve.accountVotingPower = (account == address(0) ? 0 : IVTOKEN(VTOKEN).balanceOf(account));
        bondingCurve.accountUsedWeights = (account == address(0) ? 0 : IVoter(voter).usedWeights(account));

        bondingCurve.accountBorrowCredit = (account == address(0) ? 0 : ITOKEN(TOKEN).borrowCreditBASE(account));
        bondingCurve.accountBorrowDebt = (account == address(0) ? 0 : ITOKEN(TOKEN).debt(account));
        bondingCurve.accountMaxWithdraw = (account == address(0) ? 0 : (IVoter(voter).usedWeights(account) > 0 ? 0 : bondingCurve.accountVTOKEN - bondingCurve.accountBorrowDebt));

        return bondingCurve;
    }




}