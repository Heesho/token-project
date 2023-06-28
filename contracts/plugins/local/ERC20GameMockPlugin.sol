// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import 'contracts/Plugin.sol';

interface IERC20Mock {
    function mint(address _to, uint256 _amount) external;
}

contract ERC20GameMockPlugin is Plugin {
    using SafeERC20 for IERC20;

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
        for (uint256 i = 0; i < getTokensInUnderlying().length; i++) {
            IERC20Mock(getTokensInUnderlying()[i]).mint(address(this), 10);
        }
        address treasury = IVoter(getVoter()).treasury();
        for (uint256 i = 0; i < getBribeTokens().length; i++) {
            address token = getBribeTokens()[i];
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (balance > 0) {
                uint256 fee = balance * getFee() / getDivisor();
                IERC20(token).safeTransfer(treasury, fee);
                IERC20(token).safeApprove(getBribe(), 0);
                IERC20(token).safeApprove(getBribe(), balance - fee);
                IBribe(getBribe()).notifyRewardAmount(token, balance - fee);
            }
        }
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

}