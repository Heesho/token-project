// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "contracts/interfaces/IVoter.sol";
import "contracts/interfaces/ITOKEN.sol";
import "contracts/interfaces/IOTOKEN.sol";
import "contracts/interfaces/IVTOKENRewarder.sol";
import "contracts/interfaces/IVTOKENRewarderFactory.sol";

/**
 * @title VTOKEN
 * @author heesho
 * VTOKEN is a staking contract for TOKEN. VTOKEN is minted when TOKEN is deposited and burned when TOKEN is withdrawn.
 * VTOKEN holders govern the system and have voting power on gauges where they can earn voting rewards.
 * VTOKEN holders also earn a share of fees collected from the bonding curve from the Rewarder contract.
 * VTOKEN can also be used as collateral to borrow BASE from the bonding curve.
 * VTOKEN is non-transferable. And is locked until users reset their voting weight to 0 and pay back their loans.
 * 1 VTOKEN = 1 Voting Power
 */
contract VTOKEN is ERC20, ERC20Permit, ERC20Votes, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable rewarder;  // rewarder address to distribute fees to VTOKEN stakers
    IERC20 public immutable TOKEN;      // TOKEN address
    IERC20 public immutable OTOKEN;     // OTOKEN address
    address public voter;               // voter address where voting power is used

    uint256 private _totalSupplyTOKEN;                   // total supply of TOKEN deposited
    mapping(address => uint256) private _balancesTOKEN;  // balances of TOKEN deposited
    
    /*----------  ERRORS ------------------------------------------------*/

    error VTOKEN__InvalidZeroInput();
    error VTOKEN__InvalidZeroAddress();
    error VTOKEN__VotingWeightActive();
    error VTOKEN__CollateralActive();
    error VTOKEN__NonTransferable();

    /*----------  EVENTS ------------------------------------------------*/

    event VTOKEN__Deposited(address indexed account, uint256 amount);
    event VTOKEN__Withdrawn(address indexed account, uint256 amount);
    event VTOKEN__BurnedFor(address indexed burner, address indexed account, uint256 amount);
    event VTOKEN__VoterSet(address indexed account);
    event VTOKEN__RewardAdded(address indexed reward);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier nonZeroInput(uint256 _amount) {
        if (_amount == 0) revert VTOKEN__InvalidZeroInput();
        _;
    }

    modifier nonZeroAddress(address _account) {
        if (_account == address(0)) revert VTOKEN__InvalidZeroAddress();
        _;
    }

    modifier zeroVotingWeight(address _account) {
        if (IVoter(voter).usedWeights(_account) > 0) revert VTOKEN__VotingWeightActive();
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice constructs a new VTOKEN contract
     * @param _TOKEN address of TOKEN contract
     * @param _OTOKEN address of OTOKEN contract
     */
    constructor(address _TOKEN, address _OTOKEN, address _VTOKENRewarderFactory) 
        ERC20("VTOKEN", "VTOKEN")
        ERC20Permit("VTOKEN")
    {
        TOKEN = IERC20(_TOKEN);
        OTOKEN = IERC20(_OTOKEN);
        rewarder = IVTOKENRewarderFactory(_VTOKENRewarderFactory).createVTokenRewarder(address(this));
    }

    /**
     * @notice deposits TOKEN to mint VTOKEN
     * @param amount amount of TOKEN to deposit
     */
    function deposit(uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
    {
        address account = msg.sender;
        _totalSupplyTOKEN += amount;
        _balancesTOKEN[account] += amount;
        _mint(account, amount);
        emit VTOKEN__Deposited(account, amount);

        TOKEN.safeTransferFrom(account, address(this), amount);
        IVTOKENRewarder(rewarder)._deposit(amount, account);
    }

    /**
     * @notice withdraws TOKEN by burning VTOKEN. VotingWeight must be 0. Locked collateral cannot be withdrawn
     *         till the loan is repaid.
     * @param amount amount of TOKEN to withdraw
     */
    function withdraw(uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
        zeroVotingWeight(msg.sender)
    {
        address account = msg.sender;
        _totalSupplyTOKEN -= amount;
        _balancesTOKEN[account] -= amount;
        if (_balancesTOKEN[account] < ITOKEN(address(TOKEN)).debts(account)) revert VTOKEN__CollateralActive();
        _burn(account, amount);
        emit VTOKEN__Withdrawn(account, amount);
        
        IVTOKENRewarder(rewarder)._withdraw(amount, account);
        TOKEN.safeTransfer(account, amount);
    }

    /**
     * @notice Burns VTOKEN to mint TOKEN for account. Voting Power is increased but VTOKEN balance doesnt change.
     *         This is a permamenent action and cannot be undone. Voting Power can never be withdrawn, but provides
     *         a Voting Power which earns bonding curve fees and voting rewards. However voting power can not be used
     *         as collateral.
     * @param account account to give voting power to from burn OTOKEN
     * @param amount amount of OTOKEN to burn
     */
    function burnFor(address account, uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
        nonZeroAddress(account)
    {
        _mint(account, amount);
        emit VTOKEN__BurnedFor(msg.sender, account, amount);

        IOTOKEN(address(OTOKEN)).burnFrom(msg.sender, amount);
        IVTOKENRewarder(rewarder)._deposit(amount, account);
    }

    /*----------  FUNCTION OVERRIDES  -----------------------------------*/

    function _afterTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._afterTokenTransfer(from, to, amount);
    }

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20)
    {
        super._beforeTokenTransfer(from, to, amount);
        if (from != address(0) && to != address(0)) {
            require(false, "Non-transferrable");
        }
    }

    function _mint(address to, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        override(ERC20, ERC20Votes)
    {
        super._burn(account, amount);
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    function setVoter(address _voter) 
        external 
        onlyOwner 
        nonZeroAddress(_voter)
    {
        voter = _voter;
        emit VTOKEN__VoterSet(_voter);
    }

    function addReward(address _rewardToken) 
        external 
        onlyOwner
        nonZeroAddress(_rewardToken)
    {
        IVTOKENRewarder(rewarder).addReward(_rewardToken);
        emit VTOKEN__RewardAdded(_rewardToken);
    }

    /*----------  VIEW FUNCTIONS  ---------------------------------------*/

    function totalSupplyTOKEN() external view returns (uint256) {
        return _totalSupplyTOKEN;
    }

    function balanceOfTOKEN(address account) external view returns (uint256) {
        return _balancesTOKEN[account];
    }

    function totalSupplyOTOKEN() external view returns (uint256) {
        return totalSupply() - _totalSupplyTOKEN;
    }

    function balanceOfOTOKEN(address account) external view returns (uint256) {
        return balanceOf(account) - _balancesTOKEN[account];
    }

    function withdrawAvailable(address account) external view returns (uint256) {
        if (IVoter(voter).usedWeights(account) == 0) {
            return _balancesTOKEN[account] - ITOKEN(address(TOKEN)).debts(account);
        } else {
            return 0;
        }
    }

}


contract VTOKENFactory {

    event VTOKENFactory__VTokenCreated(address indexed vToken);

    constructor() {}

    function createVToken(address _TOKEN, address _OTOKEN, address _VTOKENRewarderFactory, address _treasury) external returns (address, address) {
        address vToken = address(new VTOKEN(_TOKEN, _OTOKEN, _VTOKENRewarderFactory));
        VTOKEN(vToken).transferOwnership(_treasury);
        emit VTOKENFactory__VTokenCreated(vToken);
        return (vToken, VTOKEN(vToken).rewarder());
    }

}