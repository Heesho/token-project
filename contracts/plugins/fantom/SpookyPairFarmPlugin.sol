// // SPDX-License-Identifier: MIT
// pragma solidity 0.8.19;

// // Spooky
// // ETH-FTM LP
// // USDC-FTM LP
// // BTC-FTM LP
// // BTC-ETH LP

// import 'contracts/Plugin.sol';

// interface ISpookyRouter {
//     function getReserves(address _tokenA, address _tokenB, bool stable) external view returns (uint256, uint256);
//     function isPair(address _pair) external view returns (bool);
// }

// interface ISpookyPairToken {
//     function name() external view returns (string memory);
//     function symbol() external view returns (string memory);
// }

// interface ISpookyMasterChef {
//     function deposit(uint256 _amount, uint256 tokenId) external;
//     function withdraw(uint256 _amount) external;
//     function getReward(address _account, address[] memory _tokens) external;
// }

// abstract contract SpookyPairFarmPlugin is Plugin {
//     using SafeERC20 for IERC20;

//     /*----------  CONSTANTS  --------------------------------------------*/

//     address public constant ROUTER = 0x2aa07920E4ecb4ea8C801D9DFEce63875623B285; // update address
//     address public constant MASTER_CHEF = 0x4bebEB8188aEF8287f9a7d1E4f01d76cBE060d5b; // update address
//     address public constant BOO = 0x3Fd3A0c85B70754eFc07aC9Ac0cbBDCe664865A6; // update address

//     /*----------  STATE VARIABLES  --------------------------------------*/

//     uint256 public masterChefPID;
//     /*----------  ERRORS ------------------------------------------------*/

//     error Plugin__NotPair();
//     error Plugin__InvalidFarm();
//     error Plugin__InvalidBribeTokens();

//     /*----------  FUNCTIONS  --------------------------------------------*/

//     constructor(
//         address _underlying, 
//         address _OTOKEN, 
//         address _voter, 
//         address[] memory _tokensInUnderlying, 
//         address[] memory _bribeTokens,
//         string memory _protocol,
//         uint256 _pid
//     )
//         Plugin(
//             _underlying, 
//             _OTOKEN, 
//             _voter, 
//             _tokensInUnderlying, 
//             _bribeTokens,
//             _protocol
//         )
//     {
//         if (_bribeTokens[0] != BOO || _bribeTokens.length > 1) revert Plugin__InvalidBribeTokens();  
//         if (ISpookyRouter(ROUTER).isPair(_underlying) == false) revert Plugin__NotPair();
//         masterChefPID = _pid;
//         // if pool token of PID does not match underlying revert Plugin__InvalidFarm()
//     }

//     function depositFor(address account, uint256 amount) 
//         public 
//         override 
//     {
//         super.depositFor(account, amount);
//         IERC20(getUnderlyingAddress()).approve(MASTER_CHEF, 0);
//         IERC20(getUnderlyingAddress()).approve(MASTER_CHEF, amount);
//         ISpookyMasterChef(MASTER_CHEF).deposit(amount, 0); // deposit will change
//     }

//     function withdrawTo(address account, uint256 amount) 
//         public 
//         override 
//     {
//         ISpookyMasterChef(MASTER_CHEF).withdraw(amount); // withdraw will change
//         super.withdrawTo(account, amount);
//     }

//     function claimAndDistribute() 
//         public 
//         override 
//     {
//         super.claimAndDistribute();
//         gauge.getReward(address(this), getBribeTokens());
//         address treasury = IVoter(getVoter()).treasury();
//         uint256 balance = IERC20(EQUAL).balanceOf(address(this));
//         if (balance > 0) {
//             uint256 fee = balance * getFee() / getDivisor();
//             IERC20(EQUAL).safeTransfer(treasury, fee);
//             IERC20(EQUAL).safeApprove(getBribe(), 0);
//             IERC20(EQUAL).safeApprove(getBribe(), balance - fee);
//             IBribe(getBribe()).notifyRewardAmount(EQUAL, balance - fee);
//         }
//     }

//     /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

//     /*----------  VIEW FUNCTIONS  ---------------------------------------*/

// }