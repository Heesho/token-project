// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract ERC4626Mock is ERC4626 {
    uint256 public price;

    constructor(string memory name, string memory symbol, IERC20 _underlying) 
        ERC20(name, symbol)
        ERC4626(_underlying)
    {
        price = 1e18;
    }

    function setPrice(uint256 _price) external {
        price = _price;
    }
}