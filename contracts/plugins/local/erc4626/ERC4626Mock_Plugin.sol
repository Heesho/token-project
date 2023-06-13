// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import '@openzeppelin/contracts/interfaces/IERC4626.sol';
import 'contracts/Plugin.sol';

interface IERC4626Mock_Plugin {} {
    function price() external view returns (uint256);
}

contract ERC4626Mock_Plugin is Plugin {

    /*----------  STATE VARIABLES  --------------------------------------*/
    
    IERC4626 private immutable vault;

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
        vault = IERC4626(_underlying);
    }

    function depositFor(address account, uint256 amount) 
        external 
        override 
    {
        super.depositFor(account, amount);
        underlying.approve(address(vault), 0);
        underlying.approve(address(vault), amount);
        vault.deposit(amount, address(this));
    }

    function withdrawTo(address account, uint256 amount) 
        external 
        override 
    {
        vault.withdraw(amount, address(this));
        super.withdrawTo(account, amount);
    }

    function claimAndDistribute() 
        external 
        override 
    {
        super.claimAndDistribute();

        uint256 shares = vault.balanceOf(address(this));
        uint256 assets = vault.convertToAssets(shares);
        uint256 yield = assets - _totalSupply;
        address treasury = IVoter(voter).treasury();

        uint256 fee = yield * FEE / DIVISOR;
        IERC20(vault).safeTransfer(treasury, fee);
        IERC20(vault).safeApprove(bribe, 0);
        IERC20(vault).safeApprove(bribe, yield - fee);
        IBribe(bribe).notifyRewardAmount(vault, yield - fee);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getUnderlyingName() external view override returns (string memory) {
        return underlying.name() + " in " + vault.name();
    }

    function getUnderlyingSymbol() external view override returns (string memory) {
        return underlying.symbol() + " in " + vault.symbol();
    }

    function getPrice() external view override returns (uint256) {
        return IERC4626Mock_Plugin(address(vault)).price();
    }

    function getVault() external view override returns (address) {
        return address(vault);
    }
    
}