// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface IERC20Mock {
    function mint(address _to, uint256 _amount) external;
}

contract SolidlyLPMock is ERC20 {
    address public token0;
    address public token1;
    
    constructor(string memory name, string memory symbol, address _token0, address _token1)
        ERC20(name, symbol)
    {
        token0 = _token0;
        token1 = _token1;
    }

    function mint(address _to, uint256 _amount) public {
        _mint(_to, _amount * (10**18));
    }

}