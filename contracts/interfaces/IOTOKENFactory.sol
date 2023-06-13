// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IOTOKENFactory {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function createOToken(address _treasury) external returns (address);
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}