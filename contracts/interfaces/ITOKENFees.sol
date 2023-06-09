// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

interface TOKENFees {
    function rewarder() external view returns (address);
    function TOKEN() external view returns (address);
    function BASE() external view returns (address);
    function OTOKEN() external view returns (address);
    function distribute() external;
    function distributeBASE() external;
    function distributeTOKEN() external;
    function distributeOTOKEN() external;
}