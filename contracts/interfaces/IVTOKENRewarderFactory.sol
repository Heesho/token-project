// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IVTOKENRewarderFactory {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function createVTokenRewarder(address _VTOKEN) external returns (address rewarder);
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}