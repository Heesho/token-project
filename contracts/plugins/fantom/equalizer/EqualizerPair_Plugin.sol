// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import 'contracts/Plugin.sol';

interface IEqualizerRouter {
    function getReserves(address _tokenA, address _tokenB, bool stable) external view returns (uint256, uint256);
}

interface IEqualizerPairToken {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function stable() external view returns (bool);
    function tokens() external view returns (address, address);
    function claimFees() external returns (uint claimed0, uint claimed1);
}

abstract contract EqualizerPair_Plugin is Plugin {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    address public constant ROUTER = 0x2aa07920E4ecb4ea8C801D9DFEce63875623B285;

    /*----------  STATE VARIABLES  --------------------------------------*/

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
    {}

    function claimAndDistribute() 
        public 
        override 
    {
        super.claimAndDistribute();
        IEqualizerPairToken(address(getUnderlyingAddress())).claimFees();
        address treasury = IVoter(getVoter()).treasury();
        for (uint i = 0; i < getBribeTokens().length; i++) {
            address token = getBribeTokens()[i];
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (balance > 0) {
                uint256 fee = balance * getFee() / getDivisor();
                address bribe = getBribe();
                IERC20(token).safeTransfer(treasury, fee);
                IERC20(token).safeApprove(bribe, 0);
                IERC20(token).safeApprove(bribe, balance - fee);
                IBribe(bribe).notifyRewardAmount(token, balance - fee);
            }
        }
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

}