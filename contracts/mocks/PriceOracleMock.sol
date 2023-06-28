// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract PriceOracleMock {
    mapping (address => uint256) public prices;

    constructor() {}

    function setPrice(address _token, uint256 _price) external {
        prices[_token] = _price;
    }

    function getPrice(address _token) external view returns (uint256) {
        if (prices[_token] == 0) return 1e18;
        return prices[_token];
    }
}