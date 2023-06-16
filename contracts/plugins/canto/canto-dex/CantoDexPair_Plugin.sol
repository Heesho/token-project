// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import 'contracts/Plugin.sol';

interface ICantoDexRouter {
    function getUnderlyingPrice(address _ctoken) external view returns (uint256);
    function getReserves(address _tokenA, address _tokenB, bool stable) external view returns (uint256, uint256);
}

interface IComptroller {
    function compAccrued(address account) external view returns (uint256);
    function claimComp(address account) external;
}

interface ICToken {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function comptroller() external view returns (address);
}

contract CantoDexPair_Plugin is Plugin {
    using SafeERC20 for IERC20;

    /*----------  CONSTANTS  --------------------------------------------*/

    address public constant ROUTER = 0xa252eEE9BDe830Ca4793F054B506587027825a8e;
    address public constant WCANTO = 0x826551890Dc65655a0Aceca109aB11AbDbD7a07B;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable comptroller;

    /*----------  FUNCTIONS  --------------------------------------------*/

    constructor(
        address _underlying, 
        address _OTOKEN, 
        address _voter, 
        address[] memory _tokensInUnderlying, 
        address[] memory _bribeTokens,
        string memory _protocol
    )
        Plugin(
            _underlying, 
            _OTOKEN, 
            _voter, 
            _tokensInUnderlying, 
            _bribeTokens,
            _protocol
        )
    {
        comptroller = ICToken(address(getUnderlyingAddress())).comptroller();
    }

    function claimAndDistribute() 
        public 
        override 
    {
        super.claimAndDistribute();
        IComptroller(comptroller).claimComp(address(this));
        address treasury = IVoter(getVoter()).treasury();
        for (uint i = 0; i < getBribeTokens().length; i++) {
            address token = getBribeTokens()[i];
            uint256 balance = IERC20(token).balanceOf(address(this));
            if (balance > 0) {
                uint256 fee = balance * getFee() / getDivisor();
                address bribe = getBribe();
                IERC20(token).safeTransfer(treasury, fee);
                IERC20(token).safeApprove(bribe, 0);
                IERC20(token).safeApprove(bribe, balance - fee);
                IBribe(bribe).notifyRewardAmount(token, balance - fee);
            }
        }
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function getPrice() public view override returns (uint256) {
        return ICantoDexRouter(ROUTER).getUnderlyingPrice(getUnderlyingAddress());
    }

}