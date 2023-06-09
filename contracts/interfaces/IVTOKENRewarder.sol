// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IVTOKENRewarder {
    function DURATION() external view returns (uint256);
    function rewardData(address)
}