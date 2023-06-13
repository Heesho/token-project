// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IVTOKENRewarder {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function createVTokenRewarder(address _VTOKEN) external returns (address rewarder);
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}