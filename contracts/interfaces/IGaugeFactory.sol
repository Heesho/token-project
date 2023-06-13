// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IGaugeFactory {
    /*----------  FUNCTIONS  --------------------------------------------*/
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    function createGauge(address voter, address token) external returns (address);
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
}