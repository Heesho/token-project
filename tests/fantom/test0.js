const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { config } = require("dotenv");
config();
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");
const axios = require('axios');

const AddressZero = "0x0000000000000000000000000000000000000000";
const one = convert("1", 18);
const two = convert("2", 18);
const five = convert("5", 18);
const nine = convert("9", 18);
const ten = convert("10", 18);
const twenty = convert("20", 18);
const fifty = convert("50", 18);
const ninety = convert("90", 18);
const oneHundred = convert("100", 18);
const twoHundred = convert("200", 18);
const fiveHundred = convert("500", 18);
const eightHundred = convert("800", 18);
const oneThousand = convert("1000", 18);

function timer(t) {
    return new Promise((r) => setTimeout(r, t));
}
  
const provider = new ethers.providers.getDefaultProvider(
    "http://127.0.0.1:8545/"
);

const FTMSCAN_API_KEY = process.env.FTMSCAN_API_KEY || "";

// WFTM
const WFTM_ADDR = '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83'; 
const WFTM_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${WFTM_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// USDC
const USDC_ADDR = '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75';
const USDC_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${USDC_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// EQUAL
const EQUAL_ADDR = '0x3Fd3A0c85B70754eFc07aC9Ac0cbBDCe664865A6';
const EQUAL_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${EQUAL_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// BOO
const BOO_ADDR = '0x841FAD6EAe12c286d1Fd18d1d525DFfA75C7EFFE';
const BOO_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${BOO_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// BEETS
const BEETS_ADDR = '0xF24Bcf4d1e507740041C9cFd2DddB29585aDCe1e';
const BEETS_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${BEETS_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// SpiritRouter
const SPIRIT_ROUTER_ADDR = '0x09855B4ef0b9df961ED097EF50172be3e6F13665';
const SPIRIT_ROUTER_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${SPIRIT_ROUTER_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// SpookyRouter
const SPOOKY_ROUTER_ADDR = '0xF491e7B69E4244ad4002BC14e878a34207E38c29';
const SPOOKY_ROUTER_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${SPOOKY_ROUTER_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// EqualizerRouter
const EQUALIZER_ROUTER_ADDR = '0xd311Fd89e8403c2E90593457543E99cECc70D511';
const EQUALIZER_ROUTER_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${EQUALIZER_ROUTER_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// BeetsRouter
const BEETS_ROUTER_ADDR = '0x20dd72Ed959b6147912C2e529F0a0C651c33c9ce';
const BEETS_ROUTER_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${BEETS_ROUTER_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// LP0 address: vLP-OTOKEN/WFTM Pair SpiritSwapV2
const LP0_ADDR = '0x6082a08E59A85aea650f9bFA59e2259f9435aA6C';
const LP0_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${LP0_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// LP1 address: vLP-USDC/WFTM Gauge Equalizer
const LP1_ADDR = '0x7547d05dFf1DA6B4A2eBB3f0833aFE3C62ABD9a1';
const LP1_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${LP1_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// LP2 address: LP-USDC/WFTM Farm SpookySwap
const LP2_ADDR = '0x2b4C76d0dc16BE1C31D4C1DC53bF9B45987Fc75c';
const LP2_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${LP2_ADDR}&apikey=${FTMSCAN_API_KEY}`;

// LP3 address: BPT-Fantom of the Opera, Act II Farm Beethoven
const LP3_ADDR = '0x56aD84b777ff732de69E85813DAEE1393a9FFE10';
const LP3_URL = `https://api.ftmscan.com/api?module=contract&action=getabi&address=${LP3_ADDR}&apikey=${FTMSCAN_API_KEY}`;

let owner, multisig, treasury, user0, user1, user2;
let VTOKENFactory, OTOKENFactory, feesFactory, rewarderFactory, gaugeFactory, bribeFactory;
let minter, voter, fees, rewarder, governance, multicall, priceOracle;
let TOKEN, VTOKEN, OTOKEN;

let WFTM, USDC, EQUAL, BOO, BEETS;
let spiritRouter, spookyRouter, equalizerRouter, beetsRouter;

let LP0, plugin0, gauge0, bribe0; // vLP-OTOKEN/WFTM Pair SpiritSwapV2
let LP1, plugin1, gauge1, bribe1; // vLP-USDC/WFTM Gauge Equalizer 
let LP2, plugin2, gauge2, bribe2; // LP-USDC/WFTM Farm SpookySwap
let LP3, plugin3, gauge3, bribe3; // BPT-Fantom of the Opera, Act II Farm Beethoven

describe.only("test0", function () {
    before("Initial set up", async function () {
        console.log("Begin Initialization");
  
        // initialize users
        [owner, multisig, treasury, user0, user1, user2] = await ethers.getSigners();

        // WFTM
        response = await axios.get(WFTM_URL);
        const WFTM_ABI = JSON.parse(response.data.result);
        WFTM = new ethers.Contract(WFTM_ADDR, WFTM_ABI, provider);
        console.log("- WFTM Initialized");

        // USDC
        response = await axios.get(USDC_URL);
        const USDC_ABI = JSON.parse(response.data.result);
        USDC = new ethers.Contract(USDC_ADDR, USDC_ABI, provider);
        console.log("- USDC Initialized");

        // EQUAL
        response = await axios.get(EQUAL_URL);
        const EQUAL_ABI = JSON.parse(response.data.result);
        EQUAL = new ethers.Contract(EQUAL_ADDR, EQUAL_ABI, provider);
        console.log("- EQUAL Initialized");

        // BOO
        response = await axios.get(BOO_URL);
        const BOO_ABI = JSON.parse(response.data.result);
        BOO = new ethers.Contract(BOO_ADDR, BOO_ABI, provider);
        await timer(1000);
        console.log("- BOO Initialized");

        // BEETS
        response = await axios.get(BEETS_URL);
        const BEETS_ABI = JSON.parse(response.data.result);
        BEETS = new ethers.Contract(BEETS_ADDR, BEETS_ABI, provider);
        console.log("- BEETS Initialized");

        // SpiritRouter
        response = await axios.get(SPIRIT_ROUTER_URL);
        const SPIRIT_ROUTER_ABI = JSON.parse(response.data.result);
        spiritRouter = new ethers.Contract(SPIRIT_ROUTER_ADDR, SPIRIT_ROUTER_ABI, provider);
        console.log("- SpiritRouter Initialized");

        // SpookyRouter
        response = await axios.get(SPOOKY_ROUTER_URL);
        const SPOOKY_ROUTER_ABI = JSON.parse(response.data.result);
        spookyRouter = new ethers.Contract(SPOOKY_ROUTER_ADDR, SPOOKY_ROUTER_ABI, provider);
        console.log("- SpookyRouter Initialized");

        // EqualizerRouter
        response = await axios.get(EQUALIZER_ROUTER_URL);
        const EQUALIZER_ROUTER_ABI = JSON.parse(response.data.result);
        equalizerRouter = new ethers.Contract(EQUALIZER_ROUTER_ADDR, EQUALIZER_ROUTER_ABI, provider);
        await timer(1000);
        console.log("- EqualizerRouter Initialized");

        // BeetsRouter
        response = await axios.get(BEETS_ROUTER_URL);
        const BEETS_ROUTER_ABI = JSON.parse(response.data.result);
        beetsRouter = new ethers.Contract(BEETS_ROUTER_ADDR, BEETS_ROUTER_ABI, provider);
        console.log("- BeetsRouter Initialized");

        // LP0
        response = await axios.get(LP0_URL);
        const LP0_ABI = JSON.parse(response.data.result);
        LP0 = new ethers.Contract(LP0_ADDR, LP0_ABI, provider);
        console.log("- LP0 Initialized");

        // LP1
        response = await axios.get(LP1_URL);
        const LP1_ABI = JSON.parse(response.data.result);
        LP1 = new ethers.Contract(LP1_ADDR, LP1_ABI, provider);
        console.log("- LP1 Initialized");

        // LP2
        response = await axios.get(LP2_URL);
        const LP2_ABI = JSON.parse(response.data.result);
        LP2 = new ethers.Contract(LP2_ADDR, LP2_ABI, provider);
        await timer(1000);
        console.log("- LP2 Initialized");

        // LP3
        response = await axios.get(LP3_URL);
        const LP3_ABI = JSON.parse(response.data.result);
        LP3 = new ethers.Contract(LP3_ADDR, LP3_ABI, provider);
        console.log("- LP3 Initialized");

        // initialize OTOKENFactory
        const OTOKENFactoryArtifact = await ethers.getContractFactory("OTOKENFactory");
        OTOKENFactory = await OTOKENFactoryArtifact.deploy();
        console.log("- OTOKENFactory Initialized");

        // initialize VTOKENFactory
        const VTOKENFactoryArtifact = await ethers.getContractFactory("VTOKENFactory");
        VTOKENFactory = await VTOKENFactoryArtifact.deploy();
        console.log("- VTOKENFactory Initialized");

        // initialize FeesFactory
        const FeesFactoryArtifact = await ethers.getContractFactory("TOKENFeesFactory");
        feesFactory = await FeesFactoryArtifact.deploy();
        console.log("- FeesFactory Initialized");

        // initialize RewarderFactory
        const RewarderFactoryArtifact = await ethers.getContractFactory("VTOKENRewarderFactory");
        rewarderFactory = await RewarderFactoryArtifact.deploy();
        console.log("- RewarderFactory Initialized");

        // intialize TOKEN
        const TOKENArtifact = await ethers.getContractFactory("TOKEN");
        TOKEN = await TOKENArtifact.deploy(WFTM.address, oneThousand, OTOKENFactory.address, VTOKENFactory.address, rewarderFactory.address, feesFactory.address);
        console.log("- TOKEN Initialized");

        // initialize TOKENFees
        fees = await ethers.getContractAt("contracts/TOKENFeesFactory.sol:TOKENFees", await TOKEN.FEES());
        console.log("- TOKENFees Initialized");

        //initialize OTOKEN
        OTOKEN = await ethers.getContractAt("contracts/OTOKENFactory.sol:OTOKEN", await TOKEN.OTOKEN());
        console.log("- OTOKEN Initialized");

        //initialize VTOKEN
        VTOKEN = await ethers.getContractAt("contracts/VTOKENFactory.sol:VTOKEN", await TOKEN.VTOKEN());
        console.log("- VTOKEN Initialized");

        //initialize VTOKENRewarder
        rewarder = await ethers.getContractAt("contracts/VTOKENRewarderFactory.sol:VTOKENRewarder", await VTOKEN.rewarder());  
        console.log("- VTOKENRewarder Initialized");

        // initialize GaugeFactory
        const gaugeFactoryArtifact = await ethers.getContractFactory("GaugeFactory");
        const gaugeFactoryContract = await gaugeFactoryArtifact.deploy(owner.address);
        gaugeFactory = await ethers.getContractAt("GaugeFactory", gaugeFactoryContract.address);
        console.log("- GaugeFactory Initialized");

        //initialize BribeFactory
        const bribeFactoryArtifact = await ethers.getContractFactory("BribeFactory");
        const bribeFactoryContract = await bribeFactoryArtifact.deploy(owner.address);
        bribeFactory = await ethers.getContractAt("BribeFactory", bribeFactoryContract.address);
        console.log("- BribeFactory Initialized");

        // initialize Voter
        const voterArtifact = await ethers.getContractFactory("Voter");
        const voterContract = await voterArtifact.deploy(VTOKEN.address, OTOKEN.address, gaugeFactory.address, bribeFactory.address);
        voter = await ethers.getContractAt("Voter", voterContract.address);
        console.log("- Voter Initialized");

        // initialize Minter
        const minterArtifact = await ethers.getContractFactory("Minter");
        const minterContract = await minterArtifact.deploy(voter.address, TOKEN.address, VTOKEN.address, OTOKEN.address);
        minter = await ethers.getContractAt("Minter", minterContract.address);
        console.log("- Minter Initialized");

        // initialize governanor
        const governanceArtifact = await ethers.getContractFactory("TOKENGovernor");
        const governanceContract = await governanceArtifact.deploy(VTOKEN.address);
        governance = await ethers.getContractAt("TOKENGovernor", governanceContract.address);
        console.log("- TOKENGovernor Initialized");

        // initialize Multicall
        const multicallArtifact = await ethers.getContractFactory("Multicall_Fantom");
        const multicallContract = await multicallArtifact.deploy(voter.address, TOKEN.address, OTOKEN.address, VTOKEN.address, rewarder.address);
        multicall = await ethers.getContractAt("Multicall_Fantom", multicallContract.address);
        console.log("- Multicall Initialized");

        // System set-up
        await expect(gaugeFactory.connect(user2).setVoter(voter.address)).to.be.revertedWith("GaugeFactory__UnathorizedVoter");
        await expect(gaugeFactory.setVoter(AddressZero)).to.be.revertedWith("GaugeFactory__InvalidZeroAddress");
        await gaugeFactory.setVoter(voter.address);
        await expect(bribeFactory.connect(user2).setVoter(voter.address)).to.be.revertedWith("BribeFactory__UnathorizedVoter");
        await expect(bribeFactory.setVoter(AddressZero)).to.be.revertedWith("BribeFactory__InvalidZeroAddress");
        await bribeFactory.setVoter(voter.address);
        await VTOKEN.connect(owner).addReward(TOKEN.address);
        await VTOKEN.connect(owner).addReward(OTOKEN.address);
        await VTOKEN.connect(owner).addReward(WFTM.address);
        await VTOKEN.connect(owner).setVoter(voter.address);
        await OTOKEN.connect(owner).setMinter(minter.address);
        await expect(voter.connect(user2).initialize(minter.address)).to.be.revertedWith("Voter__NotMinter");
        await voter.initialize(minter.address);
        await expect(minter.connect(user2).initialize()).to.be.revertedWith("Minter__UnathorizedInitializer");
        await minter.initialize();
        console.log("- System set up");

        // initialize plugin0
        const plugin0Artifact = await ethers.getContractFactory("SpiritV2PairPlugin");
        const plugin0Contract = await plugin0Artifact.deploy(LP0.address, OTOKEN.address, voter.address, [OTOKEN.address, WFTM.address], "SpiritSwapV2");
        plugin0 = await ethers.getContractAt("SpiritV2PairPlugin", plugin0Contract.address);
        console.log("- Plugin0 Initialized");

        // initialize plugin1
        const plugin1Artifact = await ethers.getContractFactory("EqualizerPairGaugePlugin");
        const plugin1Contract = await plugin1Artifact.deploy(LP1.address, OTOKEN.address, voter.address, [USDC.address, WFTM.address], [EQUAL.address], "Equalizer");
        plugin1 = await ethers.getContractAt("EqualizerPairGaugePlugin", plugin1Contract.address);
        console.log("- Plugin1 Initialized");

        // initialize plugin2
        const plugin2Artifact = await ethers.getContractFactory("SpookyPairFarmPlugin");
        const plugin2Contract = await plugin2Artifact.deploy(LP2.address, OTOKEN.address, voter.address, [USDC.address, WFTM.address], [BOO.address], "SpookySwap", 10);
        plugin2 = await ethers.getContractAt("SpookyPairFarmPlugin", plugin2Contract.address);
        console.log("- Plugin2 Initialized");

        // initialize plugin3
        const plugin3Artifact = await ethers.getContractFactory("BeetsBPTFarmPlugin");
        const plugin3Contract = await plugin3Artifact.deploy(LP3.address, OTOKEN.address, voter.address, [USDC.address, WFTM.address], [BEETS.address], "Beethoven", 99);
        plugin3 = await ethers.getContractAt("BeetsBPTFarmPlugin", plugin3Contract.address);
        console.log("- Plugin3 Initialized");

        // add plugin0 to voter
        await voter.addPlugin(plugin0.address);
        let gauge0Addr = await plugin0.getGauge();
        let bribe0Addr = await plugin0.getBribe();
        gauge0 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", gauge0Addr);
        bribe0 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", bribe0Addr);
        console.log("- Plugin0 added to Voter");

        // add plugin1 to voter
        await voter.addPlugin(plugin1.address);
        let gauge1Addr = await plugin1.getGauge();
        let bribe1Addr = await plugin1.getBribe();
        gauge1 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", gauge1Addr);
        bribe1 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", bribe1Addr);
        console.log("- Plugin1 added to Voter");

        // add plugin2 to voter
        await voter.addPlugin(plugin2.address);
        let gauge2Addr = await plugin2.getGauge();
        let bribe2Addr = await plugin2.getBribe();
        gauge2 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", gauge2Addr);
        bribe2 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", bribe2Addr);
        console.log("- Plugin2 added to Voter");

        // add plugin3 to voter
        await voter.addPlugin(plugin3.address);
        let gauge3Addr = await plugin3.getGauge();
        let bribe3Addr = await plugin3.getBribe();
        gauge3 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", gauge3Addr);
        bribe3 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", bribe3Addr);
        console.log("- Plugin3 added to Voter");

        console.log("Initialization Complete");
        console.log();

    });

    it("multsig and treasury deposit 9000 FTM to WFTM and transfer WFTM to owner", async function () {
        console.log("******************************************************");
        await WFTM.connect(multisig).deposit({value: ethers.utils.parseEther("9000")});
        await WFTM.connect(treasury).deposit({value: ethers.utils.parseEther("9000")});
        await WFTM.connect(multisig).transfer(owner.address, ethers.utils.parseEther("9000"));
        await WFTM.connect(treasury).transfer(owner.address, ethers.utils.parseEther("9000"));
    });

    it("Owner Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).approve(TOKEN.address, ten);
        await TOKEN.connect(owner).buy(ten, 1, 1792282187, owner.address, AddressZero);
    });

    it("Owner sells max TOKEN", async function () {
        console.log("******************************************************");
        let balance = await TOKEN.getMaxSell();
        console.log("Max market sell: ", divDec(balance));
        await TOKEN.connect(owner).approve(TOKEN.address, balance);
        await TOKEN.connect(owner).sell(balance, 1, 1792282187, owner.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await WFTM.connect(owner).balanceOf(TOKEN.address)), await WFTM.connect(owner).balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.connect(owner).balanceOf(TOKEN.address)), await TOKEN.connect(owner).balanceOf(TOKEN.address));
    });

    it("Owner Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).approve(TOKEN.address, ten);
        await TOKEN.connect(owner).buy(ten, 1, 1792282187, owner.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("Owner stakes 1 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).approve(VTOKEN.address, one);
        await VTOKEN.connect(owner).deposit(one);
    }); 

    it("Owner sells all TOKEN", async function () {
        console.log("******************************************************");
        let balance = await TOKEN.connect(owner).balanceOf(owner.address);
        await TOKEN.connect(owner).approve(TOKEN.address, balance);
        await TOKEN.connect(owner).sell(balance, 1, 1792282187, owner.address, AddressZero);
    });

    it("Owner borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).borrow(await TOKEN.getAccountCredit(owner.address));
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("Owner tries unstakes all VTOKEN", async function () {
        console.log("******************************************************");
        await expect(VTOKEN.connect(owner).withdraw(0)).to.be.revertedWith("VTOKEN__InvalidZeroInput");
        await expect(VTOKEN.connect(owner).withdraw(await VTOKEN.balanceOf(owner.address))).to.be.revertedWith("VTOKEN__CollateralActive");
    });

    it("Owner tries to repay more than owed", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).approve(TOKEN.address, two);
        await expect(TOKEN.connect(owner).repay(0)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(owner).repay(two)).to.be.reverted;;
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("Owner Buys TOKEN with 20 BASE", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).approve(TOKEN.address, twenty);
        await TOKEN.connect(owner).buy(twenty, 1, 1792282187, owner.address, AddressZero);
    });

    it("Owner stakes 9 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).approve(VTOKEN.address, nine);
        await VTOKEN.connect(owner).deposit(nine);
    }); 

    it("Owner sells all TOKEN", async function () {
        console.log("******************************************************");
        let balance = await TOKEN.connect(owner).balanceOf(owner.address);
        await TOKEN.connect(owner).approve(TOKEN.address, balance);
        await TOKEN.connect(owner).sell(balance, 1, 1792282187, owner.address, AddressZero);
    });

    it("Owner tries to borrow more than credit against staked position", async function () {
        console.log("******************************************************");
        await expect(TOKEN.connect(owner).borrow(twenty)).to.be.revertedWith("TOKEN__ExceedsBorrowCreditLimit");
        await expect(TOKEN.connect(owner).borrow(0)).to.be.revertedWith("TOKEN__InvalidZeroInput");
    });

    it("Owner borrows portion of credit limit then borrows max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).borrow(one);
        await TOKEN.connect(owner).borrow(await TOKEN.getAccountCredit(owner.address));
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("Owner tries to repays two then repays max", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).approve(TOKEN.address, two);
        await TOKEN.connect(owner).repay(two);
        let balance = TOKEN.connect(owner).debts(owner.address);
        await WFTM.connect(owner).approve(TOKEN.address, balance);
        await TOKEN.connect(owner).repay(balance);
    });

    it("User0 exercises 10 OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).approve(TOKEN.address, ten);
        await WFTM.connect(owner).approve(TOKEN.address, ten);
        await TOKEN.connect(owner).exercise(ten, owner.address);
    });

    it("User0 exercises 10 OTOKEN without 10 OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(multisig.address, await OTOKEN.balanceOf(owner.address));
        await OTOKEN.connect(owner).approve(TOKEN.address, ten);
        await WFTM.connect(owner).approve(TOKEN.address, ten);
        await expect(TOKEN.connect(owner).exercise(ten, owner.address)).to.be.reverted;
        await OTOKEN.connect(multisig).transfer(owner.address, await OTOKEN.balanceOf(multisig.address));
    });

    it("User0 exercises 10 OTOKEN without WFTM", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).transfer(multisig.address, await WFTM.connect(owner).balanceOf(owner.address));
        await OTOKEN.connect(owner).approve(TOKEN.address, ten);
        await WFTM.connect(owner).approve(TOKEN.address, ten);
        await expect(TOKEN.connect(owner).exercise(ten, owner.address)).to.be.reverted;
        await WFTM.connect(multisig).transfer(owner.address, await WFTM.connect(owner).balanceOf(multisig.address));
    });

    it("User0 exercises 20 OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).approve(TOKEN.address, twenty);
        await WFTM.connect(owner).approve(TOKEN.address, twenty);
        await TOKEN.connect(owner).exercise(twenty, owner.address);
    });

    it("Owner tries sell more TOKEN than what's available", async function () {
        console.log("******************************************************");
        let balance = await TOKEN.connect(owner).balanceOf(owner.address);
        await TOKEN.connect(owner).approve(TOKEN.address, balance);
        await expect(TOKEN.connect(owner).sell(balance, 1, 1792282187, owner.address, AddressZero)).to.be.revertedWith("TOKEN__ExceedsSwapMarketReserves");
    });

    it("Owner sells max TOKEN", async function () {
        console.log("******************************************************");
        let balance = await TOKEN.getMaxSell();
        console.log("Max market sell: ", divDec(balance));
        await TOKEN.connect(owner).approve(TOKEN.address, balance);
        await TOKEN.connect(owner).sell(balance, 1, 1792282187, owner.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("Owner tries unstakes all VTOKEN", async function () {
        console.log("******************************************************");
        await VTOKEN.connect(owner).withdraw(await VTOKEN.balanceOfTOKEN(owner.address));
    });

    it("Owner redeems all TOKEN to BASE", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).approve(TOKEN.address, fifty);
        await expect(TOKEN.connect(owner).redeem(0, owner.address)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(owner).redeem(fifty, owner.address)).to.be.reverted;
        await TOKEN.connect(owner).redeem(await TOKEN.balanceOf(owner.address), owner.address);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("Owner Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await WFTM.connect(owner).approve(TOKEN.address, ten);
        await TOKEN.connect(owner).buy(ten, 1, 1792282187, owner.address, AddressZero);
    });

    it("Owner stakes max TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).approve(VTOKEN.address, await TOKEN.balanceOf(owner.address));
        await VTOKEN.connect(owner).deposit(await TOKEN.balanceOf(owner.address));
    }); 

    it("Owner borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(owner).borrow(await TOKEN.getAccountCredit(owner.address));
    });

    it("Owner burns 10 OTOKEN to increase Voting power", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).approve(VTOKEN.address, ten);
        await expect(VTOKEN.connect(owner).burnFor(owner.address, 0)).to.be.revertedWith("VTOKEN__InvalidZeroInput");
        await expect(VTOKEN.connect(owner).burnFor(AddressZero, ten)).to.be.revertedWith("VTOKEN__InvalidZeroAddress");
        await VTOKEN.connect(owner).burnFor(owner.address, ten);
    });

    it("Owner tries to borrow one more BASE", async function () {
        console.log("******************************************************");
        await expect(TOKEN.connect(owner).borrow(one)).to.be.revertedWith("TOKEN__ExceedsBorrowCreditLimit");
    });

    it("Owner call distributeFees", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(fees.address, ten);
        await fees.distribute();
    });

    it("Forward 7 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("Owner claims rewards", async function () {
        console.log("******************************************************");
        await rewarder.connect(owner).getReward(owner.address);
    });
    
    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        let reserveActBASE = await WFTM.connect(owner).balanceOf(TOKEN.address);
        let reserveActTOKEN = await TOKEN.connect(owner).balanceOf(TOKEN.address);
        console.log("Market Reserve Actual BASE: ", divDec(reserveActBASE), reserveActBASE);
        console.log("Market Reserve Actual TOKEN: ", divDec(reserveActTOKEN), reserveActTOKEN);
        expect(res.mrrBASE).to.equal((reserveActBASE).add(await TOKEN.debtTotal()).sub(res.frBASE));
        expect(res.mrrTOKEN).to.equal(reserveActTOKEN);
    });

    it("BondingCurveData, owner", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(owner.address);
        console.log("GLOBAL DATA");
        console.log("Price BASE: $", divDec(res.priceBASE));
        console.log("Price TOKEN: $", divDec(res.priceTOKEN));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("TOKEN Supply: ", divDec(res.supplyTOKEN));
        console.log("VTOKEN Supply: ", divDec(res.supplyVTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Loan-to-Value: ", divDec(res.ltv), "%");
        console.log("Ratio: ", divDec(res.ratio));
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance NATIVE: ", divDec(res.accountNATIVE));
        console.log("Balance BASE: ", divDec(res.accountBASE));
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance TOKEN: ", divDec(res.accountTOKEN));
        console.log("Earned TOKEN: ", divDec(res.accountEarnedTOKEN));
        console.log("Balance OTOKEN: ", divDec(res.accountOTOKEN));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });


});