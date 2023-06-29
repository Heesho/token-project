// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

// Equalizer
// USDC-FTM vLP
// DAI-FTM vLP
// DAI-USDC sLP
// fUSDT-USDC sLP

import 'contracts/Plugin.sol';

interface IEqualizerVoter {
    function gauges(address _equalPair) external view returns (address);
    function isAlive(address _gauge) external view returns (bool);
}

interface IEqualizerRouter {
    function isPair(address _pair) external view returns (bool);
}

interface IEqualizerPairToken {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

interface IEqualizerGauge {
    function deposit(uint256 _amount) external;
    function withdraw(uint256 _amount) external;
    function getReward() external;
}

contract EqualizerPairGaugePlugin is Plugin {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    address public constant ROUTER = 0x2aa07920E4ecb4ea8C801D9DFEce63875623B285;
    address public constant EQUAL_VOTER = 0xE3D1A117dF7DCaC2eB0AC8219341bAd92f18dAC1;
    address public constant EQUAL = 0x3Fd3A0c85B70754eFc07aC9Ac0cbBDCe664865A6;

    /*----------  STATE VARIABLES  --------------------------------------*/

    IEqualizerGauge public immutable gauge;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__NotPair();
    error Plugin__NotGauge();
    error Plugin__GaugeNotAlive();

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying, 
        address _OTOKEN, 
        address _voter, 
        address[] memory _tokensInUnderlying, 
        address[] memory _bribeTokens,
        string memory _protocol
    )
        Plugin(
            _underlying, 
            _OTOKEN, 
            _voter, 
            _tokensInUnderlying, 
            _bribeTokens,
            _protocol
        )
    {
        if (IEqualizerRouter(ROUTER).isPair(_underlying) == false) revert Plugin__NotPair();
        gauge = IEqualizerGauge(IEqualizerVoter(EQUAL_VOTER).gauges(_underlying));
        if (address(gauge) == address(0)) revert Plugin__NotGauge();
        if (IEqualizerVoter(EQUAL_VOTER).isAlive(address(gauge)) == false) revert Plugin__GaugeNotAlive();
    }

    function depositFor(address account, uint256 amount) 
        public 
        override 
    {
        super.depositFor(account, amount);
        IERC20(getUnderlyingAddress()).approve(address(gauge), 0);
        IERC20(getUnderlyingAddress()).approve(address(gauge), amount);
        gauge.deposit(amount);
    }

    function withdrawTo(address account, uint256 amount) 
        public 
        override 
    {
        gauge.withdraw(amount);
        super.withdrawTo(account, amount);
    }

    function claimAndDistribute() 
        public 
        override 
    {
        super.claimAndDistribute();
        gauge.getReward();
        address treasury = IVoter(getVoter()).treasury();
        uint256 balance = IERC20(EQUAL).balanceOf(address(this));
        if (balance > 0) {
            uint256 fee = balance * getFee() / getDivisor();
            IERC20(EQUAL).safeTransfer(treasury, fee);
            IERC20(EQUAL).safeApprove(getBribe(), 0);
            IERC20(EQUAL).safeApprove(getBribe(), balance - fee);
            IBribe(getBribe()).notifyRewardAmount(EQUAL, balance - fee);
        }
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

}