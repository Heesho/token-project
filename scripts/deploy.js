const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers")
const hre = require("hardhat")

const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const oneMillion = convert("1000000", 18);
const tenMillion = convert("10000000", 18);

// Contracts
let OTOKEN, TOKEN, VTOKEN, fees, rewarder;;
let VTOKENFactory, OTOKENFactory, feesFactory, rewarderFactory;
let voter, minter, gaugeFactory, bribeFactory;
let multicall, governor;
let BASE;

const sleep = (delay) => new Promise (( resolve) => setTimeout (resolve, delay));

async function deployBASE() {
  console.log('Starting BASE Deployment');
  const BASEArtifact = await ethers.getContractFactory("ERC20Mock");
  const BASEContract = await BASEArtifact.deploy({ gasPrice: ethers.gasPrice, });
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
    contract: "contracts/OTOKEN.sol:OTOKEN",
    constructorArguments: [
      wallet, 
    ],
  });
  console.log("OTOKEN Verified");
}

async function verifyTOKENFees() {
  console.log("TOKENFees Deployed at:", await TOKEN.fees());
  console.log('Starting TOKENFees Verification');
  await hre.run("verify:verify", {
    address: await TOKEN.fees(),
    contract: "contracts/TOKEN.sol:TOKENFees",
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
    contract: "contracts/VTOKEN.sol:VTOKEN",
    constructorArguments: [
      TOKEN.address, 
      OTOKEN.address,
      VTOKENFactory.address,
    ],
  });
  console.log("VTOKEN Verified");
}

async function verifyRewarder() {
  console.log("Rewarder Deployed at:", await VTOKEN.rewarder());
  console.log('Starting Rewarder Verification');
  await hre.run("verify:verify", {
    address: await VTOKEN.rewarder(),
    contract: "contracts/VTOKEN.sol:Rewarder",
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
  const multicallArtifact = await ethers.getContractFactory("contracts/utilities/MulticallFantom.sol:MulticallFantom");
  const multicallContract = await multicallArtifact.deploy(voter.address, BASE.address, TOKEN.address, OTOKEN.address, VTOKEN.address, rewarder.address, { gasPrice: ethers.gasPrice, });
  multicall = await multicallContract.deployed();
  await sleep(5000);
  console.log("Multicall Deployed at:", multicall.address);
}

async function verifyMulticall() {
  console.log('Starting Multicall Verification');
  await hre.run("verify:verify", {
    address: multicall.address,
    contract: "contracts/utilities/MulticallFantom.sol:MulticallFantom",
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
  await bribeFactory.setVoter(voter.address);
  await VTOKEN.addReward(TOKEN.address);
  await VTOKEN.addReward(OTOKEN.address);
  await VTOKEN.addReward(BASE.address);
  await VTOKEN.setVoter(voter.address);
  await OTOKEN.setMinter(minter.address);
  await voter.initialize(minter.address);
  await minter.initialize();
  await multicall.setPriceBase(one);
  console.log("System Set Up");
}

async function main() {

  const [wallet] = await ethers.getSigners();
  console.log('Using wallet: ', wallet.address);
  
  await deployOTOKEN();
  await deployTOKEN(wallet.address);
  await deployVTOKEN();
  await deployGaugeFactory(wallet.address); 
  await deployBribeFactory(wallet.address);
  await deployVoter();
  await deployMinter();
  await deployGovernor();
  await deployMulticall();

  await verifyOTOKEN();
  await verifyTOKEN(wallet.address);
  await verifyTOKENFees();
  await verifyVTOKEN();
  await verifyRewarder();
  await verifyGaugeFactory(wallet.address); 
  await verifyBribeFactory(wallet.address);
  await verifyVoter();
  await verifyMinter();
  await verifyGovernor();
  await verifyMulticall();

  await setUpSystem(wallet.address);

  // await setUpSystemPostDeploy(wallet.address);

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

