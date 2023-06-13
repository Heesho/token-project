// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "contracts/interfaces/ITOKEN.sol";
import "contracts/interfaces/IVTOKENRewarder.sol";

/**
 * @title TOKENFees
 * @author heesho
 * 
 * TOKENFees collects fees from bonding curve (TOKEN contract) and distributed 
 * them to VTOKEN stakers (Rewarder) and treasury.
 */
contract TOKENFees {
    using SafeERC20 for IERC20;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable rewarder;    // rewarder address to distribute fees to VTOKEN stakers
    IERC20 public immutable TOKEN;          // TOKEN address
    IERC20 public immutable BASE;           // BASE address
    IERC20 public immutable OTOKEN;         // OTOKEN address

    /*----------  EVENTS ------------------------------------------------*/

    event TOKENFees__DistributedTOKEN(uint256 amount);
    event TOKENFees__DistributedBASE(uint256 amount);
    event TOKENFees__DistributedOTOKEN(uint256 amount);

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice constructs a new TOKENFees contract
     * @param _rewarder address of the rewarder contract
     * @param _TOKEN address of TOKEN contract
     * @param _BASE address of BASE contract
     * @param _OTOKEN address of OTOKEN contract
     */
    constructor(address _rewarder, address _TOKEN, address _BASE, address _OTOKEN) {
        rewarder = _rewarder;
        TOKEN = IERC20(_TOKEN);
        BASE = IERC20(_BASE);
        OTOKEN = IERC20(_OTOKEN);
    }

    /**
     * @notice distributes all fees to VTOKEN stakers and treasury
     */
    function distribute() external {
        distributeBASE();
        distributeTOKEN();
        distributeOTOKEN();
    }

    /**
     * @notice distributes BASE to treasury and VTOKEN stakers
     */
    function distributeBASE() public {
        address treasury = ITOKEN(address(TOKEN)).treasury();
        uint256 balanceBASE = BASE.balanceOf(address(this));
        uint256 amountDistro = balanceBASE / 2;
        emit TOKENFees__DistributedBASE(amountDistro);

        BASE.approve(rewarder, amountDistro);
        IVTOKENRewarder(rewarder).notifyRewardAmount(address(BASE), amountDistro);
        BASE.safeTransfer(treasury, amountDistro);
    }

    /**
     * @notice distributes TOKEN to treasury and VTOKEN stakers
     */
    function distributeTOKEN() public {
        address treasury = ITOKEN(address(TOKEN)).treasury();
        uint256 balanceTOKEN = TOKEN.balanceOf(address(this));
        uint256 amountDistro = balanceTOKEN / 2;
        emit TOKENFees__DistributedTOKEN(amountDistro);

        TOKEN.approve(rewarder, amountDistro);
        IVTOKENRewarder(rewarder).notifyRewardAmount(address(TOKEN), amountDistro);
        TOKEN.safeTransfer(treasury, amountDistro);
    }

    /**
     * @notice distributes OTOKEN to VTOKEN stakers
     */
    function distributeOTOKEN() public {
        uint256 balanceOTOKEN = OTOKEN.balanceOf(address(this));
        emit TOKENFees__DistributedOTOKEN(balanceOTOKEN);

        OTOKEN.approve(rewarder, balanceOTOKEN);
        IVTOKENRewarder(rewarder).notifyRewardAmount(address(OTOKEN), balanceOTOKEN);
    }

}


contract TOKENFeesFactory {

    event TOKENFeesFactory__TokenFeesCreated(address indexed tokenFees);

    constructor() {}

    function createTokenFees(address _rewarder, address _TOKEN, address _BASE, address _OTOKEN) external returns (address) {
        TOKENFees tokenFees = new TOKENFees(_rewarder, _TOKEN, _BASE, _OTOKEN);
        emit TOKENFeesFactory__TokenFeesCreated(address(tokenFees));
        return address(tokenFees);
    }
}