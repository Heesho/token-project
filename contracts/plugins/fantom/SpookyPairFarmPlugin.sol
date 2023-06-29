// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

// Spooky
// ETH-FTM LP
// USDC-FTM LP
// BTC-FTM LP
// BTC-ETH LP

import 'contracts/Plugin.sol';

interface ISpookyPairToken {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

interface ISpookyMasterChef {
    function lpToken(uint256 _pid) external view returns (address);
    function deposit(uint256 _pid, uint256 _amount) external;
    function withdraw(uint256 _pid, uint256 _amount) external;
    function harvestAll() external;
}

contract SpookyPairFarmPlugin is Plugin {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    address public constant ROUTER = 0xF491e7B69E4244ad4002BC14e878a34207E38c29;
    address public constant MASTER_CHEF = 0x18b4f774fdC7BF685daeeF66c2990b1dDd9ea6aD;
    address public constant BOO = 0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE;

    /*----------  STATE VARIABLES  --------------------------------------*/

    uint256 public immutable masterChefPID;

    /*----------  ERRORS ------------------------------------------------*/

    error Plugin__NotPair();
    error Plugin__InvalidFarm();

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying, 
        address _OTOKEN, 
        address _voter, 
        address[] memory _tokensInUnderlying, 
        address[] memory _bribeTokens,
        string memory _protocol,
        uint256 _pid
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
        if (ISpookyMasterChef(MASTER_CHEF).lpToken(_pid) != _underlying) revert Plugin__InvalidFarm();
        masterChefPID = _pid;
    }

    function depositFor(address account, uint256 amount) 
        public 
        override 
    {
        super.depositFor(account, amount);
        IERC20(getUnderlyingAddress()).approve(MASTER_CHEF, 0);
        IERC20(getUnderlyingAddress()).approve(MASTER_CHEF, amount);
        ISpookyMasterChef(MASTER_CHEF).deposit(masterChefPID, amount); 
    }

    function withdrawTo(address account, uint256 amount) 
        public 
        override 
    {
        ISpookyMasterChef(MASTER_CHEF).withdraw(masterChefPID, amount); 
        super.withdrawTo(account, amount);
    }

    function claimAndDistribute() 
        public 
        override 
    {
        super.claimAndDistribute();
        ISpookyMasterChef(MASTER_CHEF).harvestAll();
        address treasury = IVoter(getVoter()).treasury();
        uint256 balance = IERC20(BOO).balanceOf(address(this));
        if (balance > 0) {
            uint256 fee = balance * getFee() / getDivisor();
            IERC20(BOO).safeTransfer(treasury, fee);
            IERC20(BOO).safeApprove(getBribe(), 0);
            IERC20(BOO).safeApprove(getBribe(), balance - fee);
            IBribe(getBribe()).notifyRewardAmount(BOO, balance - fee);
        }
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

}