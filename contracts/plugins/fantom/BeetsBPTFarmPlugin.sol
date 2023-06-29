// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

// Beets
// A Late Quartet
// Lock, staked and two smoking Fantoms
// Ankr Fantom Liquid Ocean
// Steady Beets, Act IV

import 'contracts/Plugin.sol';

interface IBeetsBPT {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
}

interface IBeetsMasterChef {
    function lpTokens(uint256 _pid) external view returns (address);
    function deposit(uint256 _pid, uint256 _amount, address _to) external;
    function withdrawAndHarvest(uint256 _pid, uint256 _amount, address _to) external;
    function harvest(uint256 _pid, address _to) external;
}

contract BeetsBPTFarmPlugin is Plugin {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    address public constant MASTER_CHEF = 0x8166994d9ebBe5829EC86Bd81258149B87faCfd3;
    address public constant BEETS = 0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e;

    /*----------  STATE VARIABLES  --------------------------------------*/

    uint256 public immutable masterChefPID;

    /*----------  ERRORS ------------------------------------------------*/

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
        if (IBeetsMasterChef(MASTER_CHEF).lpTokens(_pid) != _underlying) revert Plugin__InvalidFarm();
        masterChefPID = _pid;
    }

    function depositFor(address account, uint256 amount) 
        public 
        override 
    {
        super.depositFor(account, amount);
        IERC20(getUnderlyingAddress()).approve(MASTER_CHEF, 0);
        IERC20(getUnderlyingAddress()).approve(MASTER_CHEF, amount);
        IBeetsMasterChef(MASTER_CHEF).deposit(masterChefPID, amount, address(this)); 
    }

    function withdrawTo(address account, uint256 amount) 
        public 
        override 
    {
        IBeetsMasterChef(MASTER_CHEF).withdrawAndHarvest(masterChefPID, amount, address(this)); 
        super.withdrawTo(account, amount);
    }

    function claimAndDistribute() 
        public 
        override 
    {
        super.claimAndDistribute();
        IBeetsMasterChef(MASTER_CHEF).harvest(masterChefPID, address(this));
        address treasury = IVoter(getVoter()).treasury();
        uint256 balance = IERC20(BEETS).balanceOf(address(this));
        if (balance > 0) {
            uint256 fee = balance * getFee() / getDivisor();
            IERC20(BEETS).safeTransfer(treasury, fee);
            IERC20(BEETS).safeApprove(getBribe(), 0);
            IERC20(BEETS).safeApprove(getBribe(), balance - fee);
            IBribe(getBribe()).notifyRewardAmount(BEETS, balance - fee);
        }
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

}