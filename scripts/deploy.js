const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers")
const hre = require("hardhat")

const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const one = convert("1", 18);
const oneMillion = convert("1000000", 18);
const tenMillion = convert("10000000", 18);

// Contracts
let OTOKEN, TOKEN, VTOKEN, fees, rewarder;
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

// async function deployMulticall() {
//   console.log('Starting Multicall Deployment');
//   const multicallArtifact = await ethers.getContractFactory("contracts/multicalls/Multicall.sol:Multicall");
//   const multicallContract = await multicallArtifact.deploy(voter.address, BASE.address, TOKEN.address, OTOKEN.address, VTOKEN.address, rewarder.address, { gasPrice: ethers.gasPrice, });
//   multicall = await multicallContract.deployed();
//   await sleep(5000);
//   console.log("Multicall Deployed at:", multicall.address);
// }

async function deployMulticall() {
  console.log('Starting Multicall Deployment');
  const multicallArtifact = await ethers.getContractFactory("contracts/multicalls/Multicall.sol:Multicall");
  const multicallContract = await multicallArtifact.deploy("0x6cC3217Eed6d45497b0f566522C36927da108321", "0xAa171Ad6f4eD52ED74707300aD90bDAEE8398773", "0x8d6abe4176f262F79317a1ec60B9C6e070a2142a", "0xc7a80762B3dcA438E81Ef6daA92E7323BE2e7C13", "0x0a5D71AbF79daaeE3853Db43c1Fb9c20195585f9", "0xc759291f52cA29d754cb071Cc7BC41F3E029b045", { gasPrice: ethers.gasPrice, });
  multicall = await multicallContract.deployed();
  await sleep(5000);
  console.log("Multicall Deployed at:", multicall.address);
  console.log('Starting Multicall Verification');
  await hre.run("verify:verify", {
    address: multicall.address,
    contract: "contracts/multicalls/Multicall.sol:Multicall",
    constructorArguments: [
      "0x6cC3217Eed6d45497b0f566522C36927da108321", 
      "0xAa171Ad6f4eD52ED74707300aD90bDAEE8398773",
      "0x8d6abe4176f262F79317a1ec60B9C6e070a2142a",
      "0xc7a80762B3dcA438E81Ef6daA92E7323BE2e7C13",
      "0x0a5D71AbF79daaeE3853Db43c1Fb9c20195585f9",
      "0xc759291f52cA29d754cb071Cc7BC41F3E029b045"
    ],
  });
  console.log("Multicall Verified");
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
  await sleep(5000);
  await bribeFactory.setVoter(voter.address);
  await sleep(5000);
  await VTOKEN.addReward(TOKEN.address);
  await sleep(5000);
  await VTOKEN.addReward(OTOKEN.address);
  await sleep(5000);
  await VTOKEN.addReward(BASE.address);
  await sleep(5000);
  await VTOKEN.setVoter(voter.address);
  await sleep(5000);
  await OTOKEN.setMinter(minter.address);
  await sleep(5000);
  await voter.initialize(minter.address);
  await sleep(5000);
  await minter.initialize();
  await sleep(5000);
  await multicall.setPriceBase(one);
  await sleep(5000);
  console.log("System Set Up");
}

async function deployPlugin0() {
  console.log('Starting plugin0 deployment');
  const ERC20MockArtifact = await ethers.getContractFactory("ERC20Mock");
  const ERC20MockContract = await ERC20MockArtifact.deploy("TEST0", "TEST0", { gasPrice: ethers.gasPrice, });
  TEST0 = await ERC20MockContract.deployed();
  await sleep(5000);
  const ERC4626MockArtifact = await ethers.getContractFactory("ERC4626Mock");
  const ERC4626MockContract = await ERC4626MockArtifact.deploy("xTEST0", "xTEST0", TEST0.address, { gasPrice: ethers.gasPrice, });
  xTEST0 = await ERC4626MockContract.deployed();
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
  await sleep(5000);
  const ERC4626MockArtifact = await ethers.getContractFactory("ERC4626Mock");
  const ERC4626MockContract = await ERC4626MockArtifact.deploy("xTEST1", "xTEST1", TEST1.address, { gasPrice: ethers.gasPrice, });
  xTEST1 = await ERC4626MockContract.deployed();
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
  await sleep(5000);
  await voter.addPlugin(plugin1.address);
  await sleep(5000);
  await voter.addPlugin(plugin2.address);
  await sleep(5000);
  await voter.addPlugin(plugin3.address);
  await sleep(5000);
  await voter.addPlugin(plugin4.address);
  await sleep(5000);
  await voter.addPlugin(plugin5.address);
  await sleep(5000);
  console.log("plugins addred to voter");
}

async function main() {

  const [wallet] = await ethers.getSigners();
  console.log('Using wallet: ', wallet.address);
  
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

  // await addPlugins();

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

