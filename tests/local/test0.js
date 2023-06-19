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
let minter, voter, fees, rewarder, governance, multicall;
let TOKEN, VTOKEN, OTOKEN, BASE;
let TEST0, xTEST0, plugin0, gauge0, bribe0;
let TEST1, xTEST1, plugin1, gauge1, bribe1;
let TEST2, LP0, plugin2, gauge2, bribe2;
let TEST3, LP1, plugin3, gauge3, bribe3;


describe("test0", function () {
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

        // System set-up
        await gaugeFactory.setVoter(voter.address);
        await bribeFactory.setVoter(voter.address);
        await VTOKEN.connect(owner).addReward(TOKEN.address);
        await VTOKEN.connect(owner).addReward(OTOKEN.address);
        await VTOKEN.connect(owner).addReward(BASE.address);
        await VTOKEN.connect(owner).setVoter(voter.address);
        await OTOKEN.connect(owner).setMinter(minter.address);
        await voter.initialize(minter.address);
        await minter.initialize();
        await multicall.setPriceBase(one);
        console.log("- System set up");

        // initialize ERC4626Mock_Plugin for TEST0 in xTEST0
        const TEST0_ERC4626Mock_PluginArtifact = await ethers.getContractFactory("ERC4626Mock_Plugin");
        const TEST0_ERC4626Mock_PluginContract = await TEST0_ERC4626Mock_PluginArtifact.deploy(TEST0.address, xTEST0.address, OTOKEN.address, voter.address, [TEST0.address], [xTEST0.address], "Protocol0");
        plugin0 = await ethers.getContractAt("ERC4626Mock_Plugin", TEST0_ERC4626Mock_PluginContract.address);
        console.log("- TEST0_ERC4626Mock_Plugin Initialized");

        // initialize ERC4626Mock_Plugin for TEST1 in xTEST1
        const TEST1_ERC4626Mock_PluginArtifact = await ethers.getContractFactory("ERC4626Mock_Plugin");
        const TEST1_ERC4626Mock_PluginContract = await TEST1_ERC4626Mock_PluginArtifact.deploy(TEST1.address, xTEST1.address, OTOKEN.address, voter.address, [TEST1.address], [xTEST1.address], "Protocol0");
        plugin1 = await ethers.getContractAt("ERC4626Mock_Plugin", TEST1_ERC4626Mock_PluginContract.address);
        console.log("- TEST1_ERC4626Mock_Plugin Initialized");

        // initialize SolidlyLPMock_Plugin for LP0
        const LP0_SolidlyLPMock_PluginArtifact = await ethers.getContractFactory("SolidlyLPMock_Plugin");
        const LP0_SolidlyLPMock_PluginContract = await LP0_SolidlyLPMock_PluginArtifact.deploy(LP0.address, OTOKEN.address, voter.address, [TEST2.address, BASE.address], [TEST2.address, BASE.address], "Protocol1");
        plugin2 = await ethers.getContractAt("SolidlyLPMock_Plugin", LP0_SolidlyLPMock_PluginContract.address);
        console.log("- LP0_SolidityLPMock_Plugin Initialized");

        // initialize SolidlyLPMock_Plugin for LP1
        const LP1_SolidlyLPMock_PluginArtifact = await ethers.getContractFactory("SolidlyLPMock_Plugin");
        const LP1_SolidlyLPMock_PluginContract = await LP1_SolidlyLPMock_PluginArtifact.deploy(LP1.address, OTOKEN.address, voter.address, [TEST3.address, BASE.address], [TEST3.address, BASE.address], "Protocol1");
        plugin3 = await ethers.getContractAt("SolidlyLPMock_Plugin", LP1_SolidlyLPMock_PluginContract.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("BondingCurveData, none", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(AddressZero);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
    });

    it("GaugeCardData, plugin0, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin0.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("BribeCardData, plugin0, user0 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin0.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("GaugeCardData, plugin2, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("BribeCardData, plugin2, user0 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin2.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
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

    it("GaugeCardData, plugin3, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin3.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
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
    });

    it("User0 Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await TOKEN.connect(user0).buy(ten, 1, 1792282187, user0.address, AddressZero);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
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
    });

    it("User0 Sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1692282187, user0.address, AddressZero);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
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

        await BASE.connect(user0).approve(TOKEN.address, res.output);
        await TOKEN.connect(user0).buy(res.output, res.minOutput, 1792282187, user0.address, AddressZero);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 TOKEN for 5 BASE", async function () {
        console.log("******************************************************");
        let res = await multicall.connect(owner).quoteSellOut(five, 9950);
        console.log("BASE out", divDec(five));
        console.log("Slippage Tolerance", "0.5%");
        console.log();
        console.log("TOKEN in", divDec(res.output));
        console.log("slippage", divDec(res.slippage));
        console.log("min BASE out", divDec(res.minOutput));

        await TOKEN.connect(user0).approve(TOKEN.address, res.output);
        await TOKEN.connect(user0).sell(res.output, res.minOutput, 1692282187, user0.address, AddressZero);
    });

    it("User1 stakes 0 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(VTOKEN.address, one);
        await VTOKEN.connect(user0).deposit(one);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User1 Sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.balanceOf(user0.address));
        await TOKEN.connect(user0).sell(await TOKEN.balanceOf(user0.address), 1, 1692282187, user0.address, AddressZero);
    });
  
    it("User0 borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).borrow(await TOKEN.getAccountCredit(user0.address));
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 tries to withdraws staked position", async function () {
        console.log("******************************************************");
        await expect(VTOKEN.connect(user0).withdraw(await VTOKEN.connect(owner).balanceOf(user0.address))).to.be.revertedWith("VTOKEN__CollateralActive");
        await expect(VTOKEN.connect(user0).withdraw(0)).to.be.revertedWith("VTOKEN__InvalidZeroInput");
    });

    it("User0 tries to repay more than what they owe", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, one);
        await expect(TOKEN.connect(user0).repay(two)).to.be.reverted;
    });

    it("User0 Buys TOKEN with 20 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, twenty);
        await TOKEN.connect(user0).buy(twenty, 1, 1792282187, user0.address, AddressZero);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 stakes 9 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(VTOKEN.address, ten.sub(one));
        await VTOKEN.connect(user0).deposit(ten.sub(one));
    }); 

    it("User0 Sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.balanceOf(user0.address));
        await TOKEN.connect(user0).sell(await TOKEN.balanceOf(user0.address), 1, 1692282187, user0.address, AddressZero);
    });
    
    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 tries to borrow more than they can", async function () {
        console.log("******************************************************");
        await expect(TOKEN.connect(user0).borrow(twenty)).to.be.revertedWith("TOKEN__ExceedsBorrowCreditLimit");
        await expect(TOKEN.connect(user0).borrow(0)).to.be.revertedWith("TOKEN__InvalidZeroInput");
    });

    it("User0 borrows some against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).borrow(one);
    });

    it("User0 borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).borrow(await TOKEN.getAccountCredit(user0.address));
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 repays 1 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, one);
        await TOKEN.connect(user0).repay(one);
    });

    it("User0 repays max BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, await TOKEN.debts(user0.address));
        await TOKEN.connect(user0).repay(await TOKEN.debts(user0.address));
    });

    it("User0 borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).borrow(await TOKEN.getAccountCredit(user0.address));
    });

    it("User1 Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, ten);
        await TOKEN.connect(user1).buy(ten, 1, 1692282187, user1.address, AddressZero);
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User1 stakes 5 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user1).approve(VTOKEN.address, five);
        await VTOKEN.connect(user1).deposit(five);
    });

    it("User1 Sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user1).approve(TOKEN.address, await TOKEN.balanceOf(user1.address));
        await TOKEN.connect(user1).sell(await TOKEN.balanceOf(user1.address), 1, 1692282187, user1.address, AddressZero);
    });

    it("User0 exercises 10 OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(user0.address, ten);
        await OTOKEN.connect(user0).approve(TOKEN.address, ten);
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await TOKEN.connect(user0).exercise(ten, user0.address);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 exercises 10 OTOKEN without any OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user0).approve(TOKEN.address, ten);
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await expect(TOKEN.connect(user0).exercise(ten, user0.address)).to.be.reverted;
    });

    it("User0 exercises 10 OTOKEN without any BASE", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(user1.address, ten);
        await BASE.connect(user0).transfer(treasury.address, await BASE.balanceOf(user0.address));
        await OTOKEN.connect(user0).approve(TOKEN.address, ten);
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await expect(TOKEN.connect(user0).exercise(ten, user0.address)).to.be.reverted;
        await BASE.connect(treasury).transfer(user0.address, await BASE.balanceOf(treasury.address));
    });

    it("User0 exercises 10 OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(user0.address, ten);
        await OTOKEN.connect(user0).approve(TOKEN.address, ten);
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await TOKEN.connect(user0).exercise(ten, user0.address);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User0 tries to sell more TOKEN than whats available in bonding curve", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, twenty);
        await expect(TOKEN.connect(user0).sell(twenty, 1, 1792282187, user0.address, AddressZero)).to.be.revertedWith("TOKEN__ExceedsSwapMarketReserves");
    });

    it("User0 sells max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1792282187, user0.address, AddressZero);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User1 Buys TOKEN with 1 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, one);
        await TOKEN.connect(user1).buy(one, 1, 1692282187, user1.address, AddressZero);
    });

    it("User0 sells max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1792282187, user0.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User1 Buys TOKEN with 1 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, one);
        await TOKEN.connect(user1).buy(one, 1, 1692282187, user1.address, AddressZero);
    });

    it("User0 sells max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1792282187, user0.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User1 Buys TOKEN with 1 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, one);
        await TOKEN.connect(user1).buy(one, 1, 1692282187, user1.address, AddressZero);
    });

    it("User0 sells max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1792282187, user0.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User0 exercises 10 OTOKEN", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(user0.address, ten);
        await OTOKEN.connect(user0).approve(TOKEN.address, ten);
        await BASE.connect(user0).approve(TOKEN.address, ten);
        await TOKEN.connect(user0).exercise(ten, user0.address);
    });

    it("User1 Buys TOKEN with 1 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, one);
        await TOKEN.connect(user1).buy(one, 1, 1692282187, user1.address, AddressZero);
    });

    it("User0 sells max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1792282187, user0.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User1 Buys TOKEN with 1 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, one);
        await TOKEN.connect(user1).buy(one, 1, 1692282187, user1.address, AddressZero);
    });

    it("User0 sells max", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.getMaxSell());
        await TOKEN.connect(user0).sell(await TOKEN.getMaxSell(), 1, 1792282187, user0.address, AddressZero);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 redeems all TOKENS for BASE", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.balanceOf(user0.address));
        await TOKEN.connect(user0).redeem(await TOKEN.balanceOf(user0.address), user0.address);
    });

    it("User1 redeems all TOKENS for BASE", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user1).approve(TOKEN.address, await TOKEN.balanceOf(user1.address));
        await TOKEN.connect(user1).redeem(await TOKEN.balanceOf(user1.address), user1.address);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("User0 repays max BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, await TOKEN.debts(user0.address));
        await TOKEN.connect(user0).repay(await TOKEN.debts(user0.address));
    });

    it("User0 unstakes all TOKEN", async function () {
        console.log("******************************************************");
        await VTOKEN.connect(user0).withdraw(await VTOKEN.balanceOf(user0.address));
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User1 unstakes all TOKEN", async function () {
        console.log("******************************************************");
        await VTOKEN.connect(user1).withdraw(await VTOKEN.balanceOf(user1.address));
    });

    it("User0 redeems all TOKENS for BASE", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(TOKEN.address, await TOKEN.balanceOf(user0.address));
        await TOKEN.connect(user0).redeem(await TOKEN.balanceOf(user0.address), user0.address);
    });

    it("User1 redeems all TOKENS for BASE", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user1).approve(TOKEN.address, await TOKEN.balanceOf(user1.address));
        await TOKEN.connect(user1).redeem(await TOKEN.balanceOf(user1.address), user1.address);
    });

    it("SwapCardData", async function () {
        console.log("******************************************************");
        let res = await multicall.swapCardData();
        console.log("Floor Reserve BASE: ", divDec(res.frBASE));
        console.log("Market Reserve Virtual BASE: ", divDec(res.mrvBASE));
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE));
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN));
        console.log("Market Reserve Max TOKEN: ", divDec(res.marketMaxTOKEN));
        console.log()
        console.log("Market Reserve Real BASE: ", divDec(res.mrrBASE) ,res.mrrBASE);
        console.log("Market Reserve Real TOKEN: ", divDec(res.mrrTOKEN), res.mrrTOKEN);
        console.log("Market Reserve Actual BASE: ", divDec(await BASE.balanceOf(TOKEN.address)), await BASE.balanceOf(TOKEN.address));
        console.log("Market Reserve Actual TOKEN: ", divDec(await TOKEN.balanceOf(TOKEN.address)), await TOKEN.balanceOf(TOKEN.address));
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 Buys TOKEN with 20 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, twenty);
        await TOKEN.connect(user0).buy(twenty, 1, 1792282187, user0.address, AddressZero);
    });

    it("User0 stakes 10 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).approve(VTOKEN.address, ten);
        await VTOKEN.connect(user0).deposit(ten);
    }); 

    it("User1 Buys TOKEN with 20 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, twenty);
        await TOKEN.connect(user1).buy(twenty, 1, 1792282187, user1.address, AddressZero);
    });

    it("User1 stakes 5 TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user1).approve(VTOKEN.address, five);
        await VTOKEN.connect(user1).deposit(five);
    }); 

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user0).borrow(await TOKEN.getAccountCredit(user0.address));
    });

    it("User1 borrows max against staked position", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user1).borrow(await TOKEN.getAccountCredit(user1.address));
    });

    it("User2 call distributeFees", async function () {
        console.log("******************************************************");
        await fees.distributeBASE();
        await fees.distributeTOKEN();
    });

    it("Forward 7 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User1 claims rewards", async function () {
        console.log("******************************************************");
        await rewarder.connect(user2).getReward(user1.address);
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User0 claims rewards", async function () {
        console.log("******************************************************");
        await rewarder.connect(user0).getReward(user0.address);
    });

    it("User0 claims rewards", async function () {
        console.log("******************************************************");
        await rewarder.connect(user0).getReward(user0.address);
    });

    it("Owner mints OTOKEN and sends to fee contract", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(fees.address, ten);
    });

    it("User2 Buys TOKEN with 20 ETH", async function () {
        console.log("******************************************************");
        await BASE.connect(user2).approve(TOKEN.address, twenty);
        await TOKEN.connect(user2).buy(twenty, 1, 1692282187, user2.address, AddressZero);
    });

    it("User2 sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user2).approve(TOKEN.address, await TOKEN.balanceOf(user2.address));
        await TOKEN.connect(user2).sell(await TOKEN.balanceOf(user2.address), 1, 1792282187, user2.address, AddressZero);
    });

    it("User2 call distributeFees", async function () {
        console.log("******************************************************");
        await fees.distribute();
    });

    it("Forward 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("User2 Buys TOKEN with 20 ETH", async function () {
        console.log("******************************************************");
        await BASE.connect(user2).approve(TOKEN.address, twenty);
        await TOKEN.connect(user2).buy(twenty, 1, 1692282187, user2.address, AddressZero);
    });

    it("User2 sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user2).approve(TOKEN.address, await TOKEN.balanceOf(user2.address));
        await TOKEN.connect(user2).sell(await TOKEN.balanceOf(user2.address), 1, 1792282187, user2.address, AddressZero);
    });
    
    it("Owner mints OTOKEN and sends to fee contract", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(fees.address, ten);
    });

    it("User2 call distributeFees", async function () {
        console.log("******************************************************");
        await fees.distribute();
    });

    it("user0 votes on plugins a", async function () {
        console.log("******************************************************");
        await voter.connect(user0).vote([plugin0.address, plugin1.address, plugin2.address, plugin3.address],[ten, ten, ten, ten]);
    });

    it("GaugeCardData, plugin0, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("BribeCardData, plugin0, user0 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin0.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("User1 deposits TEST0 in plugin0", async function () {
        console.log("******************************************************");
        await TEST0.connect(user1).approve(plugin0.address, ten);
        await plugin0.connect(user1).depositFor(user1.address, ten);
    });

    it("User1 deposits TEST1 in plugin1", async function () {
        console.log("******************************************************");
        await TEST1.connect(user1).approve(plugin1.address, ten);
        await plugin1.connect(user1).depositFor(user1.address, ten);
    });

    it("User1 deposits LP0 in plugin2", async function () {
        console.log("******************************************************");
        await LP0.connect(user1).approve(plugin2.address, ten);
        await plugin2.connect(user1).depositFor(user1.address, ten);
    });

    it("User1 deposits LP1 in plugin3", async function () {
        console.log("******************************************************");
        await LP1.connect(user1).approve(plugin3.address, ten);
        await plugin3.connect(user1).depositFor(user1.address, ten);
    });

    it("GaugeCardData, plugin0, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user1.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("GaugeCardData, plugin0, user2", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user1.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("user0 votes on plugins b", async function () {
        console.log("******************************************************");
        await expect(voter.connect(user0).reset()).to.be.revertedWith("Voter__AlreadyVotedThisEpoch")
        await expect(voter.connect(user0).vote([plugin0.address],[ten])).to.be.revertedWith("Voter__AlreadyVotedThisEpoch");
    });

    it("User1 withdraws Assets from gauge0", async function () {
        console.log("******************************************************");
        await expect(gauge0.connect(user1)._deposit(user1.address, ten)).to.be.revertedWith("Gauge__NotAuthorizedPlugin");
        await expect(gauge0.connect(user1)._withdraw(user1.address, await gauge0.connect(user1).balanceOf(user1.address))).to.be.revertedWith("Gauge__NotAuthorizedPlugin");
    });

    it("Owner calls distribute", async function () {
        console.log("******************************************************");
        await voter.connect(owner).distro();
    });

    it("GaugeCardData, plugin0, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user1.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("Owner calls distribute", async function () {
        console.log("******************************************************");
        await voter.connect(owner).distro();
    });

    it("Forward time by 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("GaugeCardData, plugin0, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user1.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("Owner calls distribute", async function () {
        console.log("******************************************************");
        await voter.connect(owner).distro();
    });

    it("Forward time by 7 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("user0 resets vote", async function () {
        console.log("******************************************************");
        await voter.connect(user0).reset();
    });

    it("User0 repays max BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user0).approve(TOKEN.address, await TOKEN.debts(user0.address));
        await TOKEN.connect(user0).repay(await TOKEN.debts(user0.address));
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("GaugeCardData, plugin0, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin2.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("User0 unstakes all TOKEN", async function () {
        console.log("******************************************************");
        await VTOKEN.connect(user0).withdraw(await VTOKEN.balanceOf(user0.address));
    });

    it("User0 burns 10 OTOKEN for voting power", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(owner).transfer(user0.address, ten);
        await OTOKEN.connect(user0).approve(VTOKEN.address, await OTOKEN.balanceOf(user0.address));
        await VTOKEN.connect(user0).burnFor(user0.address, await OTOKEN.balanceOf(user0.address));
        await OTOKEN.connect(user0).approve(VTOKEN.address, await OTOKEN.balanceOf(user0.address));
        await expect(VTOKEN.connect(user0).burnFor(user0.address, await OTOKEN.balanceOf(user0.address))).to.be.reverted;
    });

    it("User2 Buys TOKEN with 20 ETH", async function () {
        console.log("******************************************************");
        await BASE.connect(user2).approve(TOKEN.address, twenty);
        await TOKEN.connect(user2).buy(twenty, 1, 1692282187, user2.address, AddressZero);
    });

    it("User2 sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user2).approve(TOKEN.address, await TOKEN.balanceOf(user2.address));
        await TOKEN.connect(user2).sell(await TOKEN.balanceOf(user2.address), 1, 1792282187, user2.address, AddressZero);
    });

    it("User2 call distributeFees", async function () {
        console.log("******************************************************");
        await fees.distribute();
    });

    it("Forward time by 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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

    it("User0 claims rewards", async function () {
        console.log("******************************************************");
        await rewarder.connect(user0).getReward(user0.address);
    });

    it("User0 burns 10 OTOKEN for voting power", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user0).approve(VTOKEN.address, await OTOKEN.balanceOf(user0.address));
        await VTOKEN.connect(user0).burnFor(user0.address, await OTOKEN.balanceOf(user0.address));
    });

    it("user0 resets vote", async function () {
        console.log("******************************************************");
        await voter.connect(user0).reset();
    });

    it("Forward time by 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("user0 votes on plugins c", async function () {
        console.log("******************************************************");
        await expect(voter.connect(user0).vote([plugin0.address, plugin1.address, plugin2.address, plugin3.address],[ten, ten, ten, ten])).to.be.revertedWith("Voter__AlreadyVotedThisEpoch");
    });

    it("user1 votes on plugins", async function () {
        console.log("******************************************************");
        await voter.connect(user1).vote([plugin0.address, plugin1.address],[ten, ten]);
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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

    it("Forward time by 7 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("user0 votes on plugins d", async function () {
        console.log("******************************************************");
        await voter.connect(user0).vote([plugin0.address, plugin1.address, plugin2.address, plugin3.address],[ten, ten, ten, ten]);
    });

    it("Forward time by 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("owner distributes voting rewards", async function () {
        console.log("******************************************************");
        await voter.distributeToBribes([plugin0.address, plugin1.address, plugin2.address, plugin3.address]);
    });

    it("Forward time by 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BribeCardData, plugin1, user0 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin1.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("BribeCardData, plugin1, user1 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin1.address, user1.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("BribeCardData, plugin3, user0 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin3.address, user0.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("User0 claims bribes", async function () {
        console.log("******************************************************");
        await voter.connect(user0).claimBribes([bribe0.address, bribe1.address, bribe2.address, bribe3.address]);
    });
    
    it("User1 claims bribes", async function () {
        console.log("******************************************************");
        await voter.connect(user1).claimBribes([bribe0.address, bribe1.address]);
    });

    it("BribeCardData, plugin0, user1 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin2.address, user2.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("User0 claims gauges", async function () {
        console.log("******************************************************");
        await voter.connect(user0).claimRewards([gauge0.address, gauge1.address, gauge2.address, gauge3.address]);
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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

    it("user2 tries calling getReward on gauge0 for user0", async function () {
        console.log("******************************************************");
        await expect(gauge0.connect(user2).getReward(user0.address)).to.be.revertedWith("Gauge__NotAuthorizedUser");
    });

    it("Forward time by 3 day", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [3 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("User0 claims bribes", async function () {
        console.log("******************************************************");
        await voter.connect(user0).claimBribes([bribe0.address, bribe1.address, bribe2.address, bribe3.address]);
    });
    
    it("User1 claims bribes", async function () {
        console.log("******************************************************");
        await voter.connect(user1).claimBribes([bribe0.address, bribe1.address]);
    });

    it("owner distributes voting rewards", async function () {
        console.log("******************************************************");
        await voter.distributeToBribes([plugin0.address, plugin1.address, plugin2.address, plugin3.address]);
    });

    it("User2 deposits in all plugins", async function () {
        console.log("******************************************************");
        await TEST0.connect(user2).approve(plugin0.address, ten);
        await plugin0.connect(user2).depositFor(user2.address, ten);
        await TEST1.connect(user2).approve(plugin1.address, ten);
        await plugin1.connect(user2).depositFor(user2.address, ten);
        await LP0.connect(user2).approve(plugin2.address, ten);
        await plugin2.connect(user2).depositFor(user2.address, ten);
        await LP1.connect(user2).approve(plugin3.address, ten);
        await plugin3.connect(user2).depositFor(user2.address, ten);
    });

    it("GaugeCardData, plugin3, user2", async function () {
        console.log("******************************************************");
        let res = await multicall.gaugeCardData(plugin3.address, user2.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.gauge);
        console.log("Plugin: ", res.plugin);
        console.log("Underlying: ", res.underlying);
        console.log("Tokens in Underlying: ");
        for (let i = 0; i < res.tokensInUnderlying.length; i++) {
            console.log(" - ", res.tokensInUnderlying[i]);
        }
        console.log("Underlying Decimals: ", res.underlyingDecimals);
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Price Underlying: $", divDec(res.priceUnderlying));
        console.log("Price OTOKEN: $", divDec(res.priceOTOKEN));
        console.log("APR: ", divDec(res.apr), "%");
        console.log("Total Value Locked: $", divDec(res.tvl));
        console.log("Total Supply: ", divDec(res.totalSupply));
        console.log("Voting Weight: ", divDec(res.votingWeight), "%");
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Balance Underlying: ", divDec(res.accountUnderlyingBalance));
        console.log("Balance Deposited: ", divDec(res.accountStakedBalance));
        console.log("Earned OTOKEN: ", divDec(res.accountEarnedOTOKEN));
    });

    it("User2 Buys TOKEN with 10 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user2).approve(TOKEN.address, ten);
        await TOKEN.connect(user2).buy(ten, 1, 1792282187, user2.address, AddressZero);
    });

    it("User2 stakes all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user2).approve(VTOKEN.address, await TOKEN.balanceOf(user2.address));
        await VTOKEN.connect(user2).deposit(await TOKEN.balanceOf(user2.address));
    });

    it("BondingCurveData, user2", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user2.address);
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

    it("user2 votes on plugins", async function () {
        console.log("******************************************************");
        await expect(voter.connect(user2).vote([plugin3.address],[ten, ten])).to.be.revertedWith("Voter__PluginLengthNotEqualToWeightLength");
        await expect(voter.connect(user2).vote([plugin3.address],[0])).to.be.reverted;
        await voter.connect(user2).vote([plugin3.address], [ten]);
    });

    it("Forward 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BribeCardData, plugin3, user2 ", async function () {
        console.log("******************************************************");
        let res = await multicall.bribeCardData(plugin3.address, user2.address);
        console.log("INFORMATION");
        console.log("Gauge: ", res.bribe);
        console.log("Plugin: ", res.plugin);
        console.log("Reward Tokens: ");
        for (let i = 0; i < res.rewardTokens.length; i++) {
            console.log(" - ", res.rewardTokens[i], res.rewardTokenDecimals[i]);
        }
        console.log("Is Alive: ", res.isAlive);
        console.log();
        console.log("GLOBAL DATA");
        console.log("Protocol: ", res.protocol);
        console.log("Symbol: ", res.symbol);
        console.log("Voting Weight: ", divDec(res.voteWeight));
        console.log("Voting percent: ", divDec(res.votePercent), "%");
        console.log("Reward Per Token: ");
        for (let i = 0; i < res.rewardsPerToken.length; i++) {
            console.log(" - ", divDec(res.rewardsPerToken[i]));
        }
        console.log();
        console.log("ACCOUNT DATA");
        console.log("Account Voting percent: ", divDec(res.accountVotePercent), "%");
        console.log("Earned Rewards: ");
        for (let i = 0; i < res.accountRewardsEarned.length; i++) {
            console.log(" - ", divDec(res.accountRewardsEarned[i]));
        }
    });

    it("User2 claims gauges", async function () {
        console.log("******************************************************");
        await voter.connect(user2).claimRewards([gauge0.address, gauge1.address, gauge2.address, gauge3.address]);
    });

    it("User2 claims bribes", async function () {
        console.log("******************************************************");
        await voter.connect(user2).claimBribes([bribe2.address, bribe3.address]);
    });

    it("BondingCurveData, user2", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user2.address);
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

    it("Owner calls distribute", async function () {
        console.log("******************************************************");
        await voter.connect(owner).distro();
    });

    it("users call get Reward on VTOKEN", async function () {
        console.log("******************************************************");
        await rewarder.connect(user0).getReward(user0.address);
        await rewarder.connect(user1).getReward(user1.address);
        await rewarder.connect(user2).getReward(user2.address);
    });

    it("User2 Buys TOKEN with 20 ETH", async function () {
        console.log("******************************************************");
        await BASE.connect(user2).approve(TOKEN.address, twenty);
        await TOKEN.connect(user2).buy(twenty, 1, 1692282187, user2.address, AddressZero);
    });

    it("User2 sells all TOKEN", async function () {
        console.log("******************************************************");
        await TOKEN.connect(user2).approve(TOKEN.address, await TOKEN.balanceOf(user2.address));
        await TOKEN.connect(user2).sell(await TOKEN.balanceOf(user2.address), 1, 1792282187, user2.address, AddressZero);
    });

    it("User2 call distributeFees", async function () {
        console.log("******************************************************");
        await fees.distribute();
    });

    it("Forward 1 days", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user2", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user2.address);
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

    it("Forward time by 7 day", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("Users claims gauges", async function () {
        console.log("******************************************************");
        await voter.connect(user0).claimRewards([gauge0.address, gauge1.address, gauge2.address, gauge3.address]);
        await voter.connect(user1).claimRewards([gauge0.address, gauge1.address, gauge2.address, gauge3.address]);
        await voter.connect(user2).claimRewards([gauge0.address, gauge1.address, gauge2.address, gauge3.address]);
    });

    it("User2 claims bribes", async function () {
        console.log("******************************************************");
        await voter.connect(user0).claimBribes([bribe0.address, bribe1.address, bribe2.address, bribe3.address]);
        await voter.connect(user1).claimBribes([bribe0.address, bribe1.address, bribe2.address, bribe3.address]);
        await voter.connect(user2).claimBribes([bribe0.address, bribe1.address, bribe2.address, bribe3.address]);
    });

    it("users call get Reward on VTOKEN", async function () {
        console.log("******************************************************");
        await rewarder.connect(user0).getReward(user0.address);
        await rewarder.connect(user1).getReward(user1.address);
        await rewarder.connect(user2).getReward(user2.address);
    });

    it("Owner calls distribute", async function () {
        console.log("******************************************************");
        await voter.connect(owner).distro();
        await voter.distributeToBribes([plugin0.address, plugin1.address, plugin2.address, plugin3.address]);
    });

    it("User1 tries to withdraws staked position", async function () {
        console.log("******************************************************");
        await expect(VTOKEN.connect(user1).withdraw(await VTOKEN.balanceOf(user1.address))).to.be.revertedWith("VTOKEN__VotingWeightActive");
    });

    it("Forward time by 7 day", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("User1 resets vote", async function () {
        console.log("******************************************************");
        await voter.connect(user1).reset();
    });

    it("User1 repays 2 BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, two);
        await TOKEN.connect(user1).repay(two);
    });

    it("User1 unstakes max available VTOKEN", async function () {
        console.log("******************************************************");
        await VTOKEN.connect(user1).withdraw(await VTOKEN.withdrawAvailable(user1.address));
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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

    it("User1 repays all BASE", async function () {
        console.log("******************************************************");
        await BASE.connect(user1).approve(TOKEN.address, await TOKEN.debts(user1.address));
        await TOKEN.connect(user1).repay(await TOKEN.debts(user1.address));
    });

    it("User1 unstakes max available VTOKEN", async function () {
        console.log("******************************************************");
        await VTOKEN.connect(user1).withdraw(await VTOKEN.withdrawAvailable(user1.address));
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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

    it("User1 burns 100 OTOKEN for voting power", async function () {
        console.log("******************************************************");
        await OTOKEN.connect(user1).approve(VTOKEN.address, oneHundred);
        await VTOKEN.connect(user1).burnFor(user1.address, oneHundred);
    });

    it("BondingCurveData, user1", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user1.address);
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

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("Forward 1 hour", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("Forward 1 hour", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("Forward 1 hour", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("Forward 1 hour", async function () {
        console.log("******************************************************");
        await network.provider.send("evm_increaseTime", [1 * 3600]);
        await network.provider.send("evm_mine");
    });

    it("BondingCurveData, user0", async function () {
        console.log("******************************************************");
        let res = await multicall.bondingCurveData(user0.address);
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
        console.log("Earned BASE: ", divDec(res.accountEarnedBASE));
        console.log("Balance VTOKEN: ", divDec(res.accountVTOKEN));
        console.log("Voting Power: ", divDec(res.accountVotingPower));
        console.log("Used Voting Power: ", divDec(res.accountUsedWeights));
        console.log("Borrow Credit: ", divDec(res.accountBorrowCredit), "BASE");
        console.log("Borrow Debt: ", divDec(res.accountBorrowDebt), "BASE");
        console.log("Max Withdraw: ", divDec(res.accountMaxWithdraw), "VTOKEN");
    });

    it("User1 tries to borrow 1 BASE", async function () {
        console.log("******************************************************");
        await expect(TOKEN.connect(user1).borrow(one)).to.be.revertedWith("TOKEN__ExceedsBorrowCreditLimit");
    });

    it("TOKEN coverage testing", async function () {
        console.log("******************************************************");
        await TOKEN.getMarketPrice();
        await TOKEN.getFloorPrice();
        await expect(TOKEN.connect(user1).buy(ten, 1, 10, user1.address, AddressZero)).to.be.revertedWith("TOKEN__SwapExpired");
        await expect(TOKEN.connect(user1).sell(ten, 1, 10, user1.address, AddressZero)).to.be.revertedWith("TOKEN__SwapExpired");
        await expect(TOKEN.connect(user1).buy(ten, ten, 1792282187, user1.address, AddressZero)).to.be.revertedWith("TOKEN__ExceedsSwapSlippageTolerance");
        await BASE.connect(user1).approve(TOKEN.address, ten);
        await TOKEN.connect(user1).buy(ten, 0, 1792282187, user1.address, AddressZero);
        await expect(TOKEN.connect(user1).sell(oneThousand, 0, 1792282187, user1.address, AddressZero)).to.be.revertedWith("TOKEN__ExceedsSwapMarketReserves");
        await expect(TOKEN.connect(user1).sell(five, ten, 1792282187, user1.address, AddressZero)).to.be.revertedWith("TOKEN__ExceedsSwapSlippageTolerance");
        await expect(TOKEN.connect(user1).buy(0, 0, 0, user1.address, AddressZero)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(user1).sell(0, 0, 0, user1.address, AddressZero)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(user1).exercise(0, user1.address)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(user1).borrow(0)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(user1).repay(0)).to.be.revertedWith("TOKEN__InvalidZeroInput");
        await expect(TOKEN.connect(user1).setTreasury(user1.address)).to.be.reverted;
        await TOKEN.connect(owner).setTreasury(owner.address);
    });

    it("OTOKEN coverage testing", async function () {
        console.log("******************************************************");
        await expect(OTOKEN.connect(user1).mint(user1.address, ten)).to.be.revertedWith("OTOKEN__UnauthorisedMinter");
        await expect(OTOKEN.connect(user1).setMinter(user1.address)).to.be.revertedWith("OTOKEN__UnauthorisedMinter");
    });

    it("VTOKEN coverage testing", async function () {
        console.log("******************************************************");
        await expect(VTOKEN.connect(owner).addReward(BASE.address)).to.be.revertedWith("VTOKENRewarder__RewardTokenAlreadyAdded");
        await expect(VTOKEN.connect(owner).deposit(0)).to.be.revertedWith("VTOKEN__InvalidZeroInput");
        await expect(VTOKEN.connect(owner).withdraw(0)).to.be.revertedWith("VTOKEN__InvalidZeroInput");
        await expect(rewarder.connect(owner).notifyRewardAmount(BASE.address, 1)).to.be.revertedWith("VTOKENRewarder__RewardSmallerThanDuration");
        await expect(rewarder.connect(owner).notifyRewardAmount(TEST1.address, 10000000)).to.be.revertedWith("VTOKENRewarder__NotRewardToken");
        await VTOKEN.connect(user1).totalSupplyOTOKEN();
        await VTOKEN.connect(user1).balanceOfOTOKEN(user1.address);
    });

    it("BribeFactory and GaugeFactory Coverage Testing", async function () {
        console.log("******************************************************");
    
        await bribe0.getRewardForDuration(xTEST0.address);
        await bribe0.left(xTEST0.address);
    
        await network.provider.send("evm_increaseTime", [7 * 24 * 3600]);
        await network.provider.send("evm_mine");
    
        await bribe0.left(xTEST0.address);
    
        await expect(bribe0.connect(user1).addReward(BASE.address)).to.be.revertedWith("Bribe__NotAuthorizedVoter");
        await expect(voter.connect(owner).addBribeReward(bribe0.address, xTEST0.address)).to.be.revertedWith("Bribe__RewardTokenAlreadyAdded");
        await expect(bribe0.connect(user1)._deposit(one, user1.address)).to.be.revertedWith("Bribe__NotAuthorizedVoter");
        await expect(bribe0.connect(user1).notifyRewardAmount(BASE.address, one)).to.be.revertedWith("Bribe__NotRewardToken");
        await expect(bribeFactory.connect(user1).createBribe(user1.address)).to.be.revertedWith("BribeFactory__UnathorizedVoter");
    
        await gauge0.connect(user1).getRewardForDuration(OTOKEN.address);
        await expect(gauge0.connect(user1).addReward(BASE.address)).to.be.revertedWith("Gauge__NotAuthorizedVoter");
        await expect(gauge0.connect(user1)._deposit(user1.address, 0)).to.be.revertedWith("Gauge__NotAuthorizedPlugin");
        await expect(gauge0.connect(user1)._withdraw(user1.address, 0)).to.be.revertedWith("Gauge__NotAuthorizedPlugin");
        await expect(gauge0.connect(user1).notifyRewardAmount(OTOKEN.address, one)).to.be.revertedWith("Gauge__NotAuthorizedVoter");
        await expect(gaugeFactory.connect(user1).createGauge(user1.address, TOKEN.address)).to.be.revertedWith("GaugeFactory__UnathorizedVoter");
    });

    it("Voter Coverage Testing", async function () {
        console.log("******************************************************");
        await voter.connect(owner).killGauge(gauge0.address);
        await voter.connect(owner).reviveGauge(gauge0.address);
        await voter.connect(owner).length();
        await voter.connect(owner).updateFor([gauge0.address]);
        await voter.connect(owner).updateForRange(0, 2);
        await voter.connect(owner).updateGauge(gauge1.address);
        await voter.connect(owner).updateAll();
        await expect(voter.connect(user2).vote([plugin0.address], [0])).to.be.reverted;
        await voter.connect(user2).vote([TOKEN.address], [0]);
        await expect(voter.connect(user2).vote([plugin2.address], [0, 10])).to.be.reverted;
        await expect(voter.connect(owner).addPlugin(plugin0.address)).to.be.revertedWith("Voter__GaugeExists");
        await expect(voter.connect(user1).addPlugin(BASE.address)).to.be.revertedWith("Voter__NotAuthorizedGovernance");
        await expect(voter.connect(owner).reviveGauge(gauge0.address)).to.be.revertedWith("Voter__GaugeIsAlive");
        await expect(voter.connect(user1).reviveGauge(gauge0.address)).to.be.revertedWith("Voter__NotAuthorizedGovernance");
        await voter.connect(owner).killGauge(gauge0.address);
        await expect(voter.connect(owner).killGauge(gauge0.address)).to.be.revertedWith("Voter__GaugeIsDead");
        await expect(voter.connect(user1).killGauge(gauge0.address)).to.be.revertedWith("Voter__NotAuthorizedGovernance");
    });

    it("Minter Coverage Testing", async function () {
        console.log("******************************************************");
        await expect(minter.connect(user1).setTeam(user1.address)).to.be.reverted;
        await minter.connect(owner).setTeam(user1.address);
        await expect(minter.connect(user1).setTeamRate(40)).to.be.reverted;
        await minter.connect(owner).setTeamRate(40);;
        await expect(minter.connect(user1).setTeamRate(60)).to.be.reverted;
    });

  });
  