// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IMinter {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function update_period() external returns (uint256);
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}