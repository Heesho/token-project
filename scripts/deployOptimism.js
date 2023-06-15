const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers")
const hre = require("hardhat")

const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const one = convert("1", 18);
const oneMillion = convert("1000000", 18);
const tenMillion = convert("10000000", 18);

// Contracts
let OTOKEN, TOKEN, VTOKEN, fees, rewarder;;
let VTOKENFactory, OTOKENFactory, feesFactory, rewarderFactory;
let voter, minter, gaugeFactory, bribeFactory;
let multicall, governor;
let BASE;
let TEST0, xTEST0, plugin0, gauge0, bribe0;
let TEST1, xTEST1, plugin1, gauge1, bribe1;
let LP0, plugin2, gauge2, bribe2;
let LP1, plugin3, gauge3, bribe3;
let GAME0, plugin4, gauge4, bribe4;
let GAME1, plugin5, gauge5, bribe5;

const sleep = (delay) => new Promise (( resolve) => setTimeout (resolve, delay));

async function getContracts() {
  BASE = await ethers.getContractAt("contracts/mocks/ERC20Mock.sol:ERC20Mock", "0x17548E0b3f3d556907DF9A61352afB18D8506C32");
  OTOKENFactory = await ethers.getContractAt("contracts/OTOKENFactory.sol:OTOKENFactory", "0xaB0Ab38Ade96aF42742b0030F201E05eCca127d4");
  VTOKENFactory = await ethers.getContractAt("contracts/VTOKENFactory.sol:VTOKENFactory", "0xdCE6609d7b9c933E9aCC453EDA6713c8B9efA067");
  feesFactory = await ethers.getContractAt("contracts/TOKENFeesFactory.sol:TOKENFeesFactory", "0x43FDE9Cb7D2BD5F91e920Ea6f4206Fe3015194B2");
  rewarderFactory = await ethers.getContractAt("contracts/VTOKENRewarderFactory.sol:VTOKENRewarderFactory", "0x51519d0758Dea1f53e5530Afc33aDdd2ce9d7d42");

  TOKEN = await ethers.getContractAt("contracts/TOKEN.sol:TOKEN", "0x067Cd33e00b7719853447362654D900A68077f70")
  OTOKEN = await ethers.getContractAt("contracts/OTOKENFactory.sol:OTOKEN", await TOKEN.OTOKEN());
  VTOKEN = await ethers.getContractAt("contracts/VTOKENFactory.sol:VTOKEN", await TOKEN.VTOKEN());
  fees = await ethers.getContractAt("contracts/TOKENFeesFactory.sol:TOKENFees", await TOKEN.FEES());
  rewarder = await ethers.getContractAt("contracts/VTOKENRewarderFactory.sol:VTOKENRewarder", await VTOKEN.rewarder());

  gaugeFactory = await ethers.getContractAt("contracts/GaugeFactory.sol:GaugeFactory", "0xB5ccEA2Ebb813EA818f2571b89A686E137E67889");
  bribeFactory = await ethers.getContractAt("contracts/BribeFactory.sol:BribeFactory", "0x531A7BC1a8B75107ee3ce76C5D906e0AA7aEd61f");
  voter = await ethers.getContractAt("contracts/Voter.sol:Voter", "0x158CB676938b57475Da1007E66480E19D99F3c26");
  minter = await ethers.getContractAt("contracts/Minter.sol:Minter", "0x91B59B206E2884C63455F11435afAC70B3bD3f4A");
  governor = await ethers.getContractAt("contracts/TOKENGovernor.sol:TOKENGovernor", "0x1764319955D0E57bcb05C2257CaE4bA5b8153cC6");
  multicall = await ethers.getContractAt("contracts/multicalls/Multicall.sol:Multicall", "0x85EB6224D920D4349c2182d18491D1f282107f07");

  TEST0 = await ethers.getContractAt("contracts/mocks/ERC20Mock.sol:ERC20Mock", "0x8A832cd3f401f6D32689B2ea2f2E1f7009BE00AC");
  xTEST0 = await ethers.getContractAt("contracts/mocks/ERC4626Mock.sol:ERC4626Mock", "0xb04c91E738e149BAe5dbDDB78243d6eCA314075a");
  plugin0 = await ethers.getContractAt("contracts/plugins/local/erc4626/ERC4626Mock_Plugin.sol:ERC4626Mock_Plugin", "0x2AE7dFfbFFf8d3444AE359c49fA0DDb7b2308eFc");

  TEST1 = await ethers.getContractAt("contracts/mocks/ERC20Mock.sol:ERC20Mock", "0x1c846D162aE42f993c4A2fe362F6e6446659f22c");
  xTEST1 = await ethers.getContractAt("contracts/mocks/ERC4626Mock.sol:ERC4626Mock", "0xdBcc4816c7B21F5b279e854F52298d3d520FE285");
  plugin1 = await ethers.getContractAt("contracts/plugins/local/erc4626/ERC4626Mock_Plugin.sol:ERC4626Mock_Plugin", "0x1468AB4263ae01b788C9A5Cf741b3693bDf4970B");

  LP0 = await ethers.getContractAt("contracts/mocks/SolidlyLPMock.sol:SolidlyLPMock", "0x4dA4483C9E726f6E3E0184D7375EFE90a521ff91");
  plugin2 = await ethers.getContractAt("contracts/plugins/local/solidly-lp/SolidlyLPMock_Plugin.sol:SolidlyLPMock_Plugin", "0x00491ae6Add5D8D85fF94dDC55C1B1bfDc5A5010");

  LP1 = await ethers.getContractAt("contracts/mocks/SolidlyLPMock.sol:SolidlyLPMock", "0x2f7BEF0490297a794e1263209272b4581D6E6C4c");
  plugin3 = await ethers.getContractAt("contracts/plugins/local/solidly-lp/SolidlyLPMock_Plugin.sol:SolidlyLPMock_Plugin", "0x009Fe3570A3d0872985b72Df72F2355033CB1a93");

  GAME0 = await ethers.getContractAt("contracts/mocks/ERC20GameMock.sol:ERC20GameMock", "0x2E58eD6b14996fb421aCB2F0a572d7B045062F4E");
  plugin4 = await ethers.getContractAt("contracts/plugins/local/game/ERC20GameMock_Plugin.sol:ERC20GameMock_Plugin", "0x853464f2A45177c7C0435bEf9eD2d364A12F42a4");

  GAME1 = await ethers.getContractAt("contracts/mocks/ERC20GameMock.sol:ERC20GameMock", "0xE4706CB696996199470217f5945C852b9e5f5DAe");
  plugin5 = await ethers.getContractAt("contracts/plugins/local/game/ERC20GameMock_Plugin.sol:ERC20GameMock_Plugin", "0x8917984EDf57faBACEEa973CA741B2f03f18E1E1");

  await sleep(5000);
  console.log("Contracts Retrieved");
}

async function deployBASE() {
  console.log('Starting BASE Deployment');
  const BASEArtifact = await ethers.getContractFactory("ERC20Mock");
  const BASEContract = await BASEArtifact.deploy("BASE", "BASE", { gasPrice: ethers.gasPrice, });
  BASE = await BASEContract.deployed();
  await sleep(5000);
  console.log("BASE Deployed at:", BASE.address);
}

async function deployOTOKENFactory() {
  console.log('Starting OTOKENFactory Deployment');
  const OTOKENFactoryArtifact = await ethers.getContractFactory("OTOKENFactory");
  const OTOKENFactoryContract = await OTOKENFactoryArtifact.deploy({ gasPrice: ethers.gasPrice, });
  OTOKENFactory = await OTOKENFactoryContract.deployed();
  await sleep(5000);
  console.log("OTOKENFactory Deployed at:", OTOKENFactory.address);
}

async function deployVTOKENFactory() {
  console.log('Starting VTOKENFactory Deployment');
  const VTOKENFactoryArtifact = await ethers.getContractFactory("VTOKENFactory");
  const VTOKENFactoryContract = await VTOKENFactoryArtifact.deploy({ gasPrice: ethers.gasPrice, });
  VTOKENFactory = await VTOKENFactoryContract.deployed();
  await sleep(5000);
  console.log("VTOKENFactory Deployed at:", VTOKENFactory.address);
}

async function deployFeesFactory() {
  console.log('Starting FeesFactory Deployment');
  const feesFactoryArtifact = await ethers.getContractFactory("TOKENFeesFactory");
  const feesFactoryContract = await feesFactoryArtifact.deploy({ gasPrice: ethers.gasPrice, });
  feesFactory = await feesFactoryContract.deployed();
  await sleep(5000);
  console.log("FeesFactory Deployed at:", feesFactory.address);
}

async function deployRewarderFactory() {
  console.log('Starting RewarderFactory Deployment');
  const rewarderFactoryArtifact = await ethers.getContractFactory("VTOKENRewarderFactory");
  const rewarderFactoryContract = await rewarderFactoryArtifact.deploy({ gasPrice: ethers.gasPrice, });
  rewarderFactory = await rewarderFactoryContract.deployed();
  await sleep(5000);
  console.log("RewarderFactory Deployed at:", rewarderFactory.address);
}

async function deployTOKEN() {
  console.log('Starting TOKEN Deployment');
  const BASE = await ethers.getContractAt("contracts/mocks/ERC20Mock.sol:ERC20Mock", "0x17548E0b3f3d556907DF9A61352afB18D8506C32");
  const OTOKENFactory = await ethers.getContractAt("contracts/OTOKENFactory.sol:OTOKENFactory", "0xaB0Ab38Ade96aF42742b0030F201E05eCca127d4");
  const VTOKENFactory = await ethers.getContractAt("contracts/VTOKENFactory.sol:VTOKENFactory", "0xdCE6609d7b9c933E9aCC453EDA6713c8B9efA067");
  const feesFactory = await ethers.getContractAt("contracts/TOKENFeesFactory.sol:TOKENFeesFactory", "0x43FDE9Cb7D2BD5F91e920Ea6f4206Fe3015194B2");
  const rewarderFactory = await ethers.getContractAt("contracts/VTOKENRewarderFactory.sol:VTOKENRewarderFactory", "0x51519d0758Dea1f53e5530Afc33aDdd2ce9d7d42");

  const TOKENArtifact = await ethers.getContractFactory("TOKEN");
  const TOKENContract = await TOKENArtifact.deploy(BASE.address, oneMillion, OTOKENFactory.address, VTOKENFactory.address, rewarderFactory.address, feesFactory.address, { gasPrice: ethers.gasPrice, });
  TOKEN = await TOKENContract.deployed();
  OTOKEN = await ethers.getContractAt("contracts/OTOKENFactory.sol:OTOKEN", await TOKEN.OTOKEN());
  VTOKEN = await ethers.getContractAt("contracts/VTOKENFactory.sol:VTOKEN", await TOKEN.VTOKEN());
  fees = await ethers.getContractAt("contracts/TOKENFeesFactory.sol:TOKENFees", await TOKEN.FEES());
  rewarder = await ethers.getContractAt("contracts/VTOKENRewarderFactory.sol:VTOKENRewarder", await VTOKEN.rewarder());
  await sleep(5000);
  console.log("TOKEN Deployed at:", TOKEN.address);
}

async function verifyTOKEN() {
  console.log('Starting TOKEN Verification');
  await hre.run("verify:verify", {
    address: TOKEN.address,
    contract: "contracts/TOKEN.sol:TOKEN",
    constructorArguments: [
      BASE.address, 
      oneMillion, 
      OTOKENFactory.address,
      VTOKENFactory.address,
      rewarderFactory.address,
      feesFactory.address
    ],
  });
  console.log("TOKEN Verified");
}

async function verifyOTOKEN(wallet) {
  console.log('Starting OTOKEN Verification');
  await hre.run("verify:verify", {
    address: OTOKEN.address,
    contract: "contracts/OTOKENFactory.sol:OTOKEN",
    constructorArguments: [
      wallet, 
    ],
  });
  console.log("OTOKEN Verified");
}

async function verifyTOKENFees() {
  console.log("TOKENFees Deployed at:", fees.address);
  console.log('Starting TOKENFees Verification');
  await hre.run("verify:verify", {
    address: await fees.address,
    contract: "contracts/TOKENFeesFactory.sol:TOKENFees",
    constructorArguments: [
      rewarder.address,
      TOKEN.address, 
      BASE.address, 
      OTOKEN.address, 
    ],
  });
  console.log("TOKENFees Verified");
}

async function verifyVTOKEN() {
  console.log('Starting VTOKEN Verification');
  await hre.run("verify:verify", {
    address: VTOKEN.address,
    contract: "contracts/VTOKENFactory.sol:VTOKEN",
    constructorArguments: [
      TOKEN.address, 
      OTOKEN.address,
      rewarderFactory.address,
    ],
  });
  console.log("VTOKEN Verified");
}

async function verifyRewarder() {
  console.log("Rewarder Deployed at:", rewarder.address);
  console.log('Starting Rewarder Verification');
  await hre.run("verify:verify", {
    address: rewarder.address,
    contract: "contracts/VTOKENRewarderFactory.sol:VTOKENRewarder",
    constructorArguments: [
      VTOKEN.address, 
    ],
  });
  console.log("Rewarder Verified");
}

async function deployGaugeFactory(wallet) {
  console.log('Starting GaugeFactory Deployment');
  const gaugeFactoryArtifact = await ethers.getContractFactory("GaugeFactory");
  const gaugeFactoryContract = await gaugeFactoryArtifact.deploy(wallet, { gasPrice: ethers.gasPrice, });
  gaugeFactory = await gaugeFactoryContract.deployed();
  await sleep(5000);
  console.log("GaugeFactory Deployed at:", gaugeFactory.address);
}

async function verifyGaugeFactory(wallet) {
  console.log('Starting GaugeFactory Verification');
  await hre.run("verify:verify", {
    address: gaugeFactory.address,
    contract: "contracts/GaugeFactory.sol:GaugeFactory",
    constructorArguments: [
      wallet, 
    ],
  }); 
  console.log("GaugeFactory Verified");
}

async function deployBribeFactory(wallet) {
  console.log('Starting BribeFactory Deployment');
  const bribeFactoryArtifact = await ethers.getContractFactory("BribeFactory");
  const bribeFactoryContract = await bribeFactoryArtifact.deploy(wallet, { gasPrice: ethers.gasPrice, });
  bribeFactory = await bribeFactoryContract.deployed();
  await sleep(5000);
  console.log("BribeFactory Deployed at:", bribeFactory.address);
}

async function verifyBribeFactory(wallet) {
  console.log('Starting BribeFactory Verification');
  await hre.run("verify:verify", {
    address: bribeFactory.address,
    contract: "contracts/BribeFactory.sol:BribeFactory",
    constructorArguments: [
      wallet, 
    ],
  });
  console.log("BribeFactory Verified");
}

async function deployVoter() {
  console.log('Starting Voter Deployment');
  const voterArtifact = await ethers.getContractFactory("Voter");
  const voterContract = await voterArtifact.deploy(VTOKEN.address, OTOKEN.address, gaugeFactory.address, bribeFactory.address, { gasPrice: ethers.gasPrice, });
  voter = await voterContract.deployed();
  await sleep(5000);
  console.log("Voter Deployed at:", voter.address);
}

async function verifyVoter() {
  console.log('Starting Voter Verification');
  await hre.run("verify:verify", {
    address: voter.address,
    contract: "contracts/Voter.sol:Voter",
    constructorArguments: [
      VTOKEN.address, 
      OTOKEN.address,
      gaugeFactory.address,
      bribeFactory.address,
    ],
  });
  console.log("Voter Verified");
}

async function deployMinter() {
  console.log('Starting Minter Deployment');
  const minterArtifact = await ethers.getContractFactory("Minter");
  const minterContract = await minterArtifact.deploy(voter.address, TOKEN.address, VTOKEN.address, OTOKEN.address, { gasPrice: ethers.gasPrice, });
  minter = await minterContract.deployed();
  await sleep(5000);
  console.log("Minter Deployed at:", minter.address);
}

async function verifyMinter() {
  console.log('Starting Minter Verification');
  await hre.run("verify:verify", {
    address: minter.address,
    contract: "contracts/Minter.sol:Minter",
    constructorArguments: [
      voter.address, 
      TOKEN.address,
      VTOKEN.address,
      OTOKEN.address,
    ],
  });
  console.log("Minter Verified");
}

async function deployGovernor() {
  console.log('Starting Governor Deployment');
  const governorArtifact = await ethers.getContractFactory("TOKENGovernor");
  const governorContract = await governorArtifact.deploy(VTOKEN.address, { gasPrice: ethers.gasPrice, });
  governor = await governorContract.deployed();
  await sleep(5000);
  console.log("Governor Deployed at:", governor.address);
}

async function verifyGovernor() {
  console.log('Starting Governor Verification');
  await hre.run("verify:verify", {
    address: governor.address,
    contract: "contracts/TOKENGovernor.sol:TOKENGovernor",
    constructorArguments: [
      VTOKEN.address,
    ],
  });
  console.log("Governor Verified");
}

async function deployMulticall() {
  console.log('Starting Multicall Deployment');
  const multicallArtifact = await ethers.getContractFactory("contracts/multicalls/Multicall.sol:Multicall");
  const multicallContract = await multicallArtifact.deploy(voter.address, BASE.address, TOKEN.address, OTOKEN.address, VTOKEN.address, rewarder.address, { gasPrice: ethers.gasPrice, });
  multicall = await multicallContract.deployed();
  await sleep(5000);
  console.log("Multicall Deployed at:", multicall.address);
}

async function verifyMulticall() {
  console.log('Starting Multicall Verification');
  await hre.run("verify:verify", {
    address: multicall.address,
    contract: "contracts/multicalls/Multicall.sol:Multicall",
    constructorArguments: [
      voter.address, 
      BASE.address,
      TOKEN.address,
      OTOKEN.address,
      VTOKEN.address,
      rewarder.address
    ],
  });
  console.log("Multicall Verified");
}

async function setUpSystem(wallet) {
  console.log('Starting System Set Up');
  await gaugeFactory.setVoter(voter.address);
  console.log("1")
  await sleep(5000);
  await bribeFactory.setVoter(voter.address);
  console.log("2")
  await sleep(5000);
  await VTOKEN.addReward(TOKEN.address);
  console.log("3")
  await sleep(5000);
  await VTOKEN.addReward(OTOKEN.address);
  console.log("4")
  await sleep(5000);
  await VTOKEN.addReward(BASE.address);
  console.log("5")
  await sleep(5000);
  await VTOKEN.setVoter(voter.address);
  console.log("6")
  await sleep(5000);
  await OTOKEN.setMinter(minter.address);
  console.log("7")
  await sleep(5000);
  await voter.initialize(minter.address);
  console.log("8")
  await sleep(5000);
  await minter.initialize({ gasPrice: ethers.gasPrice, });
  console.log("9")
  await sleep(5000);
  await multicall.setPriceBase(one, { gasPrice: ethers.gasPrice, });
  console.log("10")
  await sleep(5000);
  console.log("System Set Up");
}

async function deployPlugin0() {
  console.log('Starting plugin0 deployment');
  const ERC20MockArtifact = await ethers.getContractFactory("ERC20Mock");
  const ERC20MockContract = await ERC20MockArtifact.deploy("TEST0", "TEST0", { gasPrice: ethers.gasPrice, });
  TEST0 = await ERC20MockContract.deployed();
  console.log("TEST0 deployed at: ", TEST0.address);
  await sleep(5000);
  const ERC4626MockArtifact = await ethers.getContractFactory("ERC4626Mock");
  const ERC4626MockContract = await ERC4626MockArtifact.deploy("xTEST0", "xTEST0", TEST0.address, { gasPrice: ethers.gasPrice, });
  xTEST0 = await ERC4626MockContract.deployed();
  console.log("xTEST0 deployed at: ", xTEST0.address);
  await sleep(5000);
  const ERC4626Mock_PluginArtifact = await ethers.getContractFactory("ERC4626Mock_Plugin");
  const ERC4626Mock_PluginContract = await ERC4626Mock_PluginArtifact.deploy(TEST0.address, xTEST0.address, OTOKEN.address, voter.address, [TEST0.address], [xTEST0.address], "Vault Protocol0", { gasPrice: ethers.gasPrice, });
  plugin0 = await ERC4626Mock_PluginContract.deployed();
  await sleep(5000);
  console.log("plugin0 deployed at: ", plugin0.address);
}

async function deployPlugin1() {
  console.log('Starting plugin1 deployment');
  const ERC20MockArtifact = await ethers.getContractFactory("ERC20Mock");
  const ERC20MockContract = await ERC20MockArtifact.deploy("TEST1", "TEST1", { gasPrice: ethers.gasPrice, });
  TEST1 = await ERC20MockContract.deployed();
  console.log("TEST1 deployed at: ", TEST1.address);
  await sleep(5000);
  const ERC4626MockArtifact = await ethers.getContractFactory("ERC4626Mock");
  const ERC4626MockContract = await ERC4626MockArtifact.deploy("xTEST1", "xTEST1", TEST1.address, { gasPrice: ethers.gasPrice, });
  xTEST1 = await ERC4626MockContract.deployed();
  console.log("xTEST1 deployed at: ", xTEST1.address);
  await sleep(5000);
  const ERC4626Mock_PluginArtifact = await ethers.getContractFactory("ERC4626Mock_Plugin");
  const ERC4626Mock_PluginContract = await ERC4626Mock_PluginArtifact.deploy(TEST1.address, xTEST1.address, OTOKEN.address, voter.address, [TEST1.address], [xTEST1.address], "Vault Protocol0", { gasPrice: ethers.gasPrice, });
  plugin1 = await ERC4626Mock_PluginContract.deployed();
  await sleep(5000);
  console.log("plugin1 deployed at: ", plugin1.address);
}

async function deployPlugin2() {
  console.log('Starting plugin2 deployment');
  const SolidlyLPMockArtifact = await ethers.getContractFactory("SolidlyLPMock");
  const SolidlyLPMockContract = await SolidlyLPMockArtifact.deploy("vLP-TEST0/BASE", "vLP-TEST0/BASE", TEST0.address, BASE.address, { gasPrice: ethers.gasPrice, });
  LP0 = await SolidlyLPMockContract.deployed();
  console.log("LP0 deployed at: ", LP0.address);
  await sleep(5000);
  const SolidlyLPMock_PluginArtifact = await ethers.getContractFactory("SolidlyLPMock_Plugin");
  const SolidlyLPMock_PluginContract = await SolidlyLPMock_PluginArtifact.deploy(LP0.address, OTOKEN.address, voter.address, [TEST0.address, BASE.address], [TEST0.address, BASE.address], "AMM Protocol0");
  plugin2 = await ethers.getContractAt("SolidlyLPMock_Plugin", SolidlyLPMock_PluginContract.address);
  await sleep(5000);
  console.log("plugin2 deployed at: ", plugin2.address);
}

async function deployPlugin3() {
  console.log('Starting plugin3 deployment');
  const SolidlyLPMockArtifact = await ethers.getContractFactory("SolidlyLPMock");
  const SolidlyLPMockContract = await SolidlyLPMockArtifact.deploy("vLP-TEST1/BASE", "vLP-TEST1/BASE", TEST1.address, BASE.address, { gasPrice: ethers.gasPrice, });
  LP1 = await SolidlyLPMockContract.deployed();
  console.log("LP1 deployed at: ", LP1.address);
  await sleep(5000);
  const SolidlyLPMock_PluginArtifact = await ethers.getContractFactory("SolidlyLPMock_Plugin");
  const SolidlyLPMock_PluginContract = await SolidlyLPMock_PluginArtifact.deploy(LP1.address, OTOKEN.address, voter.address, [TEST1.address, BASE.address], [TEST1.address, BASE.address], "AMM Protocol0");
  plugin3 = await ethers.getContractAt("SolidlyLPMock_Plugin", SolidlyLPMock_PluginContract.address);
  await sleep(5000);
  console.log("plugin3 deployed at: ", plugin3.address);
}

async function deployPlugin4() {
  console.log('Starting plugin4 deployment');
  const ERC20MockArtifact = await ethers.getContractFactory("ERC20GameMock");
  const ERC20MockContract = await ERC20MockArtifact.deploy("GAME0", "GAME0", { gasPrice: ethers.gasPrice, });
  GAME0 = await ERC20MockContract.deployed();
  console.log("GAME0 deployed at: ", GAME0.address);
  await sleep(5000);
  const ERC20GameMock_PluginArtifact = await ethers.getContractFactory("ERC20GameMock_Plugin");
  const ERC20GameMock_PluginContract = await ERC20GameMock_PluginArtifact.deploy(GAME0.address, OTOKEN.address, voter.address, [BASE.address], [BASE.address], "Game Protocol0");
  plugin4 = await ethers.getContractAt("ERC20GameMock_Plugin", ERC20GameMock_PluginContract.address);
  await sleep(5000);
  console.log("plugin4 deployed at: ", plugin4.address);
}

async function deployPlugin5() {
  console.log('Starting plugin5 deployment');
  const ERC20MockArtifact = await ethers.getContractFactory("ERC20GameMock");
  const ERC20MockContract = await ERC20MockArtifact.deploy("GAME1", "GAME1", { gasPrice: ethers.gasPrice, });
  GAME1 = await ERC20MockContract.deployed();
  console.log("GAME1 deployed at: ", GAME1.address);
  await sleep(5000);
  const ERC20GameMock_PluginArtifact = await ethers.getContractFactory("ERC20GameMock_Plugin");
  const ERC20GameMock_PluginContract = await ERC20GameMock_PluginArtifact.deploy(GAME1.address, OTOKEN.address, voter.address, [BASE.address], [BASE.address], "Game Protocol1");
  plugin5 = await ethers.getContractAt("ERC20GameMock_Plugin", ERC20GameMock_PluginContract.address);
  await sleep(5000);
  console.log("plugin5 deployed at: ", plugin5.address);
}

async function addPlugins() {
  console.log('Starting to add plugins');
  await voter.addPlugin(plugin0.address);
  console.log("1");
  await sleep(5000);
  await voter.addPlugin(plugin1.address);
  console.log("2");
  await sleep(5000);
  await voter.addPlugin(plugin2.address);
  console.log("3");
  await sleep(5000);
  await voter.addPlugin(plugin3.address);
  console.log("4");
  await sleep(5000);
  await voter.addPlugin(plugin4.address);
  console.log("5");
  await sleep(5000);
  await voter.addPlugin(plugin5.address);
  console.log("6");
  await sleep(5000);
  console.log("plugins addred to voter");
}

async function main() {

  const [wallet] = await ethers.getSigners();
  console.log('Using wallet: ', wallet.address);

  await getContracts();

  // TOKEN system 
  // await deployBASE();
  // await deployOTOKENFactory()
  // await deployVTOKENFactory()
  // await deployFeesFactory()
  // await deployRewarderFactory()
  // await deployTOKEN();

  // Voting system
  // await deployGaugeFactory(wallet.address); 
  // await deployBribeFactory(wallet.address);
  // await deployVoter();
  // await deployMinter();
  // await deployGovernor();
  // await deployMulticall();

  // Verification
  // await verifyTOKEN();
  // await verifyOTOKEN(wallet.address);
  // await verifyTOKENFees();
  // await verifyVTOKEN();
  // await verifyRewarder();
  // await verifyGaugeFactory(wallet.address); 
  // await verifyBribeFactory(wallet.address);
  // await verifyVoter();
  // await verifyMinter();
  // await verifyGovernor();
  // await verifyMulticall();

  // Set up
  // await setUpSystem(wallet.address);

  // Plugins
  // await deployPlugin0();
  // await deployPlugin1();
  // await deployPlugin2();
  // await deployPlugin3();
  // await deployPlugin4();
  // await deployPlugin5();

  await addPlugins();

  console.log("System Deployed");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

