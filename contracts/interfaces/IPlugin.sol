// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface IPlugin {
    /*----------  FUNCTIONS  --------------------------------------------*/
    function depositFor(address account, uint256 amount) external returns (bool);
    function withdrawTo(address account, uint256 amount) external returns (bool);
    function claimAndDistribute() external;
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    function setGauge(address _gauge) external;
    function setBribe(address _bribe) external;
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getUnderlyingName() external view returns (string memory);
    function getUnderlyingSymbol() external view returns (string memory);
    function getUnderlyingAddress() external view returns (address);
    function getProtocol() external view returns (string memory);
    function getVoter() external view returns (address);
    function getBribe() external view returns (address);
    function getGauge() external view returns (address);
    function getTokensInUnderlying() external view returns (address[] memory);
    function getBribeTokens() external view returns (address[] memory);
    function getPrice() external view returns (uint256);
}


