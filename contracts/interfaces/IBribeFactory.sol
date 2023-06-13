// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IBribeFactory {
    /*----------  FUNCTIONS  --------------------------------------------*/
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    function createBribe(address voter) external returns (address);
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}