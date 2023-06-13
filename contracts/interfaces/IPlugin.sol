// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IPlugin {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function claimAndDistribute() external;
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    function setGauge(address gauge) external;
    function setBribe(address bribe) external;
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getUnderlyingName() external view returns (string memory);
    function getUnderlyingSymbol() external view returns (string memory);
    function getUnderlyingAddress() external view returns (address);
    function getProtocol() external view returns (string memory);
    function getTokensInUnderlying() external view returns (address[] memory);
    function getBribeTokens() external view returns (address[] memory);
    function getUnderlyingPrice() external view returns (uint256);
    function getUnderlyingDecimals() external view returns (uint8);
}


