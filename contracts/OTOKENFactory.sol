// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title OTOKEN
 * @author heesho
 * 
 * OTOKEN is a call option on TOKEN that has no expiry
 * and a strike price of 1 BASE (the floor price of TOKEN).
 */
contract OTOKEN is ERC20, ERC20Burnable {

    /*----------  STATE VARIABLES  --------------------------------------*/

    address public minter; // address with minting rights

    /*----------  ERRORS ------------------------------------------------*/

    error OTOKEN__InvalidZeroAddress();
    error OTOKEN__UnauthorisedMinter();

    /*----------  EVENTS ------------------------------------------------*/

    event OTOKEN__Minted(address indexed to, uint256 amount);
    event OTOKEN__MinterSet(address indexed account);

    /*----------  MODIFIERS  --------------------------------------------*/

    modifier onlyMinter(address account) {
        if (account != minter) {
            revert OTOKEN__UnauthorisedMinter();
        }
        _;
    }

    modifier invalidZeroAddress(address account) {
        if (account == address(0)) {
            revert OTOKEN__InvalidZeroAddress();
        }
        _;
    }

    /*----------  FUNCTIONS  --------------------------------------------*/

    /**
     * @notice constructs a new OTOKEN token
     * @param treasury address of the treasurywhich receives the initial supply and minting rights
     */
    constructor(address treasury) ERC20("OTOKEN", "OTOKEN") {
        _mint(treasury, 10 * 1e6 * 1e18);
        minter = treasury;
    }

    /*----------  RESTRICTED FUNCTIONS  ---------------------------------*/

    /**
     * @notice sets the minter address, can only be set by current minter
     * @param _minter address of the minter
     */
    function setMinter(address _minter) 
        external 
        invalidZeroAddress(_minter)
        onlyMinter(msg.sender)
    {
        minter = _minter;
        emit OTOKEN__MinterSet(_minter);
    }

    /**
     * @notice mints amount of OTOKEN to the specified address
     * @param to address to receive the minted OTOKEN
     * @param amount amount of OTOKEN to mint
     * @return true if successful
     */
    function mint(address to, uint256 amount) 
        external
        onlyMinter(msg.sender)
        returns (bool) 
    {
        _mint(to, amount);
        emit OTOKEN__Minted(to, amount);
        return true;
    }

}


contract OTOKENFactory {

    event OTOKENFactory__OTOKENCreated(address indexed OTOKEN);

    constructor() {}

    function createOToken(address _treasury) external returns (address) {
        OTOKEN oToken = new OTOKEN(_treasury);
        emit OTOKENFactory__OTOKENCreated(address(oToken));
        return address(oToken);
    }
}