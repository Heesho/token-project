// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IVTOKENRewarder {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function balanceOf(address account) external view returns (uint256);
    function notifyRewardAmount(address token, uint amount) external;
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    function _deposit(uint amount, address account) external;
    function _withdraw(uint amount, address account) external;
    function addReward(address rewardToken) external;
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
    function rewardPerToken(address _rewardsToken) external view returns (uint256);
    function getRewardForDuration(address reward) external view returns (uint);
    function earned(address account, address _rewardsToken) external view returns (uint256);
}