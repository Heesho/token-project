const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const one = convert("1", 18);
const two = convert("2", 18);
const five = convert("5", 18);
const ten = convert("10", 18);
const twenty = convert("20", 18);
const ninety = convert("90", 18);
const oneHundred = convert("100", 18);
const twoHundred = convert("200", 18);
const fiveHundred = convert("500", 18);
const eightHundred = convert("800", 18);
const oneThousand = convert("1000", 18);

let owner, multisig, treasury, user0, user1, user2;
let VTOKENFactory, OTOKENFactory, feesFactory, rewarderFactory, gaugeFactory, bribeFactory;
let minter, voter, fees, rewarder, governance, multicall, priceOracle;
let TOKEN, VTOKEN, OTOKEN, BASE;
let TEST0, xTEST0, plugin0, gauge0, bribe0;
let TEST1, xTEST1, plugin1, gauge1, bribe1;
let TEST2, LP0, plugin2, gauge2, bribe2;
let TEST3, LP1, plugin3, gauge3, bribe3;


describe("test2", function () {
    before("Initial set up", async function () {
        console.log("Begin Initialization");
  
        // initialize users
        [owner, multisig, treasury, user0, user1, user2] = await ethers.getSigners();
  
        // initialize ERC20Mocks
        const ERC20MockArtifact = await ethers.getContractFactory("ERC20Mock");
        BASE = await ERC20MockArtifact.deploy("BASE", "BASE");
        TEST0 = await ERC20MockArtifact.deploy("TEST0", "TEST0");
        TEST1 = await ERC20MockArtifact.deploy("TEST1", "TEST1");
        TEST2 = await ERC20MockArtifact.deploy("TEST2", "TEST2");
        TEST3 = await ERC20MockArtifact.deploy("TEST3", "TEST3");
        console.log("- ERC20Mocks Initialized");

        // initialize ERC4626Mocks
        const ERC4626MockArtifact = await ethers.getContractFactory("ERC4626Mock");
        xTEST0 = await ERC4626MockArtifact.deploy("xTEST0", "xTEST0", TEST0.address);
        xTEST1 = await ERC4626MockArtifact.deploy("xTEST1", "xTEST1", TEST1.address);
        console.log("- ERC4626Mocks Initialized");

        // initialize SolidlyLPMocks
        const SolidlyLPMockArtifact = await ethers.getContractFactory("SolidlyLPMock");
        LP0 = await SolidlyLPMockArtifact.deploy("vLP-TEST2/BASE", "vLP-TEST2/BASE", TEST2.address, BASE.address);
        LP1 = await SolidlyLPMockArtifact.deploy("sLP-TEST3/BASE", "sLP-TEST3/BASE", TEST3.address, BASE.address);
        console.log("- SolidlyLPMocks Initialized");

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
        TOKEN = await TOKENArtifact.deploy(BASE.address, oneThousand, OTOKENFactory.address, VTOKENFactory.address, rewarderFactory.address, feesFactory.address);
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
        const multicallArtifact = await ethers.getContractFactory("Multicall");
        const multicallContract = await multicallArtifact.deploy(voter.address, BASE.address, TOKEN.address, OTOKEN.address, VTOKEN.address, rewarder.address);
        multicall = await ethers.getContractAt("Multicall", multicallContract.address);
        console.log("- Multicall Initialized");

        // initialize PriceOracle
        const priceOracleArtifact = await ethers.getContractFactory("PriceOracleMock");
        const priceOracleContract = await priceOracleArtifact.deploy();
        priceOracle = await ethers.getContractAt("PriceOracleMock", priceOracleContract.address);
        console.log("- PriceOracle Initialized");

        // System set-up
        await expect(gaugeFactory.connect(user2).setVoter(voter.address)).to.be.revertedWith("GaugeFactory__UnathorizedVoter");
        await expect(gaugeFactory.setVoter(AddressZero)).to.be.revertedWith("GaugeFactory__InvalidZeroAddress");
        await gaugeFactory.setVoter(voter.address);
        await expect(bribeFactory.connect(user2).setVoter(voter.address)).to.be.revertedWith("BribeFactory__UnathorizedVoter");
        await expect(bribeFactory.setVoter(AddressZero)).to.be.revertedWith("BribeFactory__InvalidZeroAddress");
        await bribeFactory.setVoter(voter.address);
        await VTOKEN.connect(owner).addReward(TOKEN.address);
        await VTOKEN.connect(owner).addReward(OTOKEN.address);
        await VTOKEN.connect(owner).addReward(BASE.address);
        await VTOKEN.connect(owner).setVoter(voter.address);
        await OTOKEN.connect(owner).setMinter(minter.address);
        await expect(voter.connect(user2).initialize(minter.address)).to.be.revertedWith("Voter__NotMinter");
        await voter.initialize(minter.address);
        await expect(minter.connect(user2).initialize()).to.be.revertedWith("Minter__UnathorizedInitializer");
        await minter.initialize();
        await multicall.setPriceOracle(priceOracle.address);
        console.log("- System set up");

        // initialize ERC4626Mock_Plugin for TEST0 in xTEST0
        const TEST0_ERC4626Mock_PluginArtifact = await ethers.getContractFactory("ERC4626MockPlugin");
        const TEST0_ERC4626Mock_PluginContract = await TEST0_ERC4626Mock_PluginArtifact.deploy(TEST0.address, xTEST0.address, OTOKEN.address, voter.address, [TEST0.address], [xTEST0.address], "Protocol0");
        plugin0 = await ethers.getContractAt("ERC4626MockPlugin", TEST0_ERC4626Mock_PluginContract.address);
        console.log("- TEST0_ERC4626Mock_Plugin Initialized");

        // initialize ERC4626Mock_Plugin for TEST1 in xTEST1
        const TEST1_ERC4626Mock_PluginArtifact = await ethers.getContractFactory("ERC4626MockPlugin");
        const TEST1_ERC4626Mock_PluginContract = await TEST1_ERC4626Mock_PluginArtifact.deploy(TEST1.address, xTEST1.address, OTOKEN.address, voter.address, [TEST1.address], [xTEST1.address], "Protocol0");
        plugin1 = await ethers.getContractAt("ERC4626MockPlugin", TEST1_ERC4626Mock_PluginContract.address);
        console.log("- TEST1_ERC4626Mock_Plugin Initialized");

        // initialize SolidlyLPMock_Plugin for LP0
        const LP0_SolidlyLPMock_PluginArtifact = await ethers.getContractFactory("SolidlyLPMockPlugin");
        const LP0_SolidlyLPMock_PluginContract = await LP0_SolidlyLPMock_PluginArtifact.deploy(LP0.address, OTOKEN.address, voter.address, [TEST2.address, BASE.address], [TEST2.address, BASE.address], "Protocol1");
        plugin2 = await ethers.getContractAt("SolidlyLPMockPlugin", LP0_SolidlyLPMock_PluginContract.address);
        console.log("- LP0_SolidityLPMock_Plugin Initialized");

        // initialize SolidlyLPMock_Plugin for LP1
        const LP1_SolidlyLPMock_PluginArtifact = await ethers.getContractFactory("SolidlyLPMockPlugin");
        const LP1_SolidlyLPMock_PluginContract = await LP1_SolidlyLPMock_PluginArtifact.deploy(LP1.address, OTOKEN.address, voter.address, [TEST3.address, BASE.address], [TEST3.address, BASE.address], "Protocol1");
        plugin3 = await ethers.getContractAt("SolidlyLPMockPlugin", LP1_SolidlyLPMock_PluginContract.address);
        console.log("- LP1_SolidityLPMock_Plugin Initialized");

        // add TEST0 in xTEST0 Plugin to Voter
        await voter.addPlugin(plugin0.address);
        let Gauge0Address = await voter.gauges(plugin0.address);
        let Bribe0Address = await voter.bribes(plugin0.address);
        gauge0 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", Gauge0Address);
        bribe0 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", Bribe0Address);
        console.log("- TEST0_ERC4626Mock_Plugin Added in Voter");

        // add TEST1 in xTEST1 Plugin to Voter
        await voter.addPlugin(plugin1.address);
        let Gauge1Address = await voter.gauges(plugin1.address);
        let Bribe1Address = await voter.bribes(plugin1.address);
        gauge1 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", Gauge1Address);
        bribe1 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", Bribe1Address);
        console.log("- TEST1_ERC4626Mock_Plugin Added in Voter");

        // add LP0 Plugin to Voter
        await voter.addPlugin(plugin2.address);
        let Gauge2Address = await voter.gauges(plugin2.address);
        let Bribe2Address = await voter.bribes(plugin2.address);
        gauge2 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", Gauge2Address);
        bribe2 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", Bribe2Address);
        console.log("- LP0_SolidlyLPMock_Plugin Added in Voter");

        // add LP1 Plugin to Voter
        await voter.addPlugin(plugin3.address);
        let Gauge3Address = await voter.gauges(plugin3.address);
        let Bribe3Address = await voter.bribes(plugin3.address);
        gauge3 = await ethers.getContractAt("contracts/GaugeFactory.sol:Gauge", Gauge3Address);
        bribe3 = await ethers.getContractAt("contracts/BribeFactory.sol:Bribe", Bribe3Address);
        console.log("- LP1_SolidlyLPMock_Plugin Added in Voter");

        console.log("Initialization Complete");
        console.log();

    });

    it("Mint test tokens to each user", async function () {
        console.log("******************************************************");
        await BASE.mint(user0.address, 1000);
        await BASE.mint(user1.address, 1000);
        await BASE.mint(user2.address, 1000);
        await TEST0.mint(user0.address, 100);
        await TEST0.mint(user1.address, 100);
        await TEST0.mint(user2.address, 100);
        await TEST1.mint(user0.address, 100);
        await TEST1.mint(user1.address, 100);
        await TEST1.mint(user2.address, 100);
        await LP0.mint(user0.address, 100);
        await LP0.mint(user1.address, 100);
        await LP0.mint(user2.address, 100);
        await LP1.mint(user0.address, 100);
        await LP1.mint(user1.address, 100);
        await LP1.mint(user2.address, 100);
    });

    it("Quote Buy In", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).quoteBuyIn(ten, 9800);
        console.log("BASE in", divDec(ten));
        console.log("Slippage Tolerance", "2%");
        console.log();
        console.log("TOKEN out", divDec(res.output));
        console.log("slippage", divDec(res.slippage));
        console.log("min TOKEN out", divDec(res.minOutput));
        console.log("auto min TOKEN out", divDec(res.autoMinOutput));
    });

    it("User0 Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await TOKEN.connect(user0).buy(ten, 1, 1792282187, user0.address, AddressZero);
    });

    it("Quote Sell In", async function () {
        console.log("******************************************************");
        let res = await multicall.quoteSellIn(await TOKEN.balanceOf(user0.address), 9700);
        console.log("TOKEN in", divDec(await TOKEN.balanceOf(user0.address)));
        console.log("Slippage Tolerance", "3%");
        console.log();
        console.log("BASE out", divDec(res.output));
        console.log("slippage", divDec(res.slippage));
        console.log("min BASE out", divDec(res.minOutput));
        console.log("auto min BASE out", divDec(res.autoMinOutput));
    });

    it("User0 Sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1892282187, user0.address, AddressZero);
    });

    it("User0 Buys 10 TOKEN", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).quoteBuyOut(ten, 9700);
        console.log("TOKEN out", divDec(ten));
        console.log("Slippage Tolerance", "3%");
        console.log();
        console.log("BASE in", divDec(res.output));
        console.log("slippage", divDec(res.slippage));
        console.log("min TOKEN out", divDec(res.minOutput));
        console.log("auto min TOKEN out", divDec(res.autoMinOutput));

        await BASE.connect(user0).approve(TOKEN.address, res.output);
        await TOKEN.connect(user0).buy(res.output, res.autoMinOutput, 1792282187, user0.address, AddressZero);
    });

    it("User0 sells TOKEN for 5 BASE", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).quoteSellOut(five, 9950);
        console.log("BASE out", divDec(five));
        console.log("Slippage Tolerance", "0.5%");
        console.log();
        console.log("TOKEN in", divDec(res.output));
        console.log("slippage", divDec(res.slippage));
        console.log("min BASE out", divDec(res.minOutput));
        console.log("auto min BASE out", divDec(res.autoMinOutput));

        await TOKEN.connect(user0).approve(TOKEN.address, res.output);
        await TOKEN.connect(user0).sell(res.output, res.autoMinOutput, 1792282187, user0.address, AddressZero);
    });

});