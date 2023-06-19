// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IBribe {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function getReward(address account) external;
    function notifyRewardAmount(address token, uint amount) external;
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    function _deposit(uint amount, address account) external;
    function _withdraw(uint amount, address account) external;
    function addReward(address rewardToken) external;
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function rewardPerToken(address reward) external view returns (uint);
    function getRewardForDuration(address reward) external view returns (uint);
    function earned(address account, address reward) external view returns (uint);
    function getRewardTokens() external view returns (address[] memory);
}