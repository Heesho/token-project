// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface ITOKEN {
    /*----------  FUNCTIONS  --------------------------------------------*/
    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/
    /*----------  VIEW FUNCTIONS  ---------------------------------------*/
    function frBASE() external view returns (uint256);
    function mrvBASE() external view returns (uint256);
    function mrrBASE() external view returns (uint256);
    function mrrTOKEN() external view returns (uint256);
    function getFloorPrice() external view returns (uint256);
    function getMaxSell() external view returns (uint256);
    function getMarketPrice() external view returns (uint256);
    function getOTokenPrice() external view returns (uint256);
    function getTotalValueLocked() external view returns (uint256);
    function getAccountCredit(address account) external view returns (uint256) ;
    function debts(address account) external view returns (uint256);
    function treasury() external view returns (address);
    function FEES() external view returns (address);
}

