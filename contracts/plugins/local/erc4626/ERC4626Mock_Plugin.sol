// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import '@openzeppelin/contracts/interfaces/IERC4626.sol';
import 'contracts/Plugin.sol';

interface IERC4626Mock {
    function price() external view returns (uint256);
}

contract ERC4626Mock_Plugin is Plugin {
    using SafeERC20 for IERC20;

    /*----------  STATE VARIABLES  --------------------------------------*/
    
    IERC4626 private immutable vault;

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying, 
        address _vault,
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
        vault = IERC4626(_vault);
    }

    function depositFor(address account, uint256 amount) 
        public 
        override 
    {
        super.depositFor(account, amount);
        IERC20(getUnderlyingAddress()).approve(address(vault), 0);
        IERC20(getUnderlyingAddress()).approve(address(vault), amount);
        vault.deposit(amount, address(this));
    }

    function withdrawTo(address account, uint256 amount) 
        public 
        override 
    {
        vault.withdraw(amount, address(this), address(this));
        super.withdrawTo(account, amount);
    }

    function claimAndDistribute() 
        public 
        override 
    {
        super.claimAndDistribute();

        uint256 shares = vault.balanceOf(address(this));
        uint256 assets = vault.convertToAssets(shares);
        uint256 yield = assets - totalSupply();
        address treasury = IVoter(getVoter()).treasury();

        uint256 fee = yield * getFee() / getDivisor();
        IERC20(address(vault)).safeTransfer(treasury, fee);
        IERC20(address(vault)).safeApprove(getBribe(), 0);
        IERC20(address(vault)).safeApprove(getBribe(), yield - fee);
        IBribe(getBribe()).notifyRewardAmount(address(vault), yield - fee);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function appendString(string memory _a, string memory _b, string memory _c) internal pure returns (string memory)  {
        return string(abi.encodePacked(_a, _b, _c));
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getUnderlyingName() public view override returns (string memory) {
        return appendString(IERC20Metadata(getUnderlyingAddress()).name(), " in ", vault.name());
    }

    function getUnderlyingSymbol() public view override returns (string memory) {
        return appendString(IERC20Metadata(getUnderlyingAddress()).symbol(), " in ", vault.symbol());
    }

    function getPrice() public view override returns (uint256) {
        return IERC4626Mock(address(vault)).price();
    }

    function getVault() public view returns (address) {
        return address(vault);
    }
    
}