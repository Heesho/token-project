// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IVoter {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function distribute(address _gauge) external;
    function emitDeposit(address account, uint amount) external;
    function emitWithdraw(address account, uint amount) external;
    function notifyRewardAmount(uint amount) external;
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
    function plugins(uint256 index) external view returns (address);
    function getPlugins() external view returns (address[] memory);
    function gauges(address pool) external view returns (address);
    function bribes(address pool) external view returns (address);
    function isAlive(address gauge) external view returns (bool);
    function usedWeights(address account) external view returns (uint256);
    function weights(address pool) external view returns (uint256);
    function totalWeight() external view returns (uint256);
    function votes(address account, address pool) external view returns (uint256);
    function treasury() external view returns (address);
}