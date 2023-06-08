// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

contract VTOKEN is ERC20, ERC20Permit, ERC20Votes, Ownable {
    using SafeERC20 for IERC20;

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public immutable rewarder;
    IERC20 public immutable TOKEN;
    IERC20 public immutable OTOKEN;
    address public voter;

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

    constructor(address _TOKEN, address _OTOKEN) ERC20("VTOKEN", "VTOKEN") ERC20Permit("VTOKEN") {
        TOKEN = IERC20(_TOKEN);
        OTOKEN = IERC20(_OTOKEN);
        rewarder = address(new Rewarder(address(this)));
    }

    function deposit(uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
    {
        address account = msg.sender;
        _totalSupplyTOKEN += amount;
        _balancesTOKEN[account] += amount;
        _mint(account, amount);
        emit Deposited(account, amount);

        TOKEN.safeTransferFrom(account, address(this), amount);
        Rewarder(rewarder)._deposit(amount, account);
    }

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
        emit Withdrawn(account, amount);
        
        Rewarder(rewarder)._withdraw(amount, account);
        TOKEN.safeTransfer(account, amount);
    }

    function burnFor(address account, uint256 amount) 
        external
        nonReentrant
        nonZeroInput(amount)
        nonZeroAddress(account)
    {
        _mint(account, amount);
        emit BurnedFor(msg.sender, account, amount);

        IOTOKEN(address(OTOKEN)).burnFrom(msg.sender, amount);
        Rewarder(rewarder)._deposit(amount, account);
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
        emit VoterSet(_voter);
    }

    function addReward(address _rewardToken) 
        external 
        onlyOwner
        nonZeroAddress(_rewardToken)
    {
        Rewarder(rewarder).addReward(_rewardToken);
        emit RewardAdded(_rewardToken);
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