import { writeFileSync } from "fs";
import { createHash } from 'crypto';

import { ethers } from "hardhat";

import { DeterministicDeployer } from '@account-abstraction/sdk'
import { EntryPoint__factory } from '@account-abstraction/contracts'

import * as EntryPoint from '@account-abstraction/contracts/artifacts/EntryPoint.json';
import * as SimpleAccountFactory from '@account-abstraction/contracts/artifacts/SimpleAccountFactory.json';
import * as SimpleAccount from '@account-abstraction/contracts/artifacts/SimpleAccount.json';
import * as VerifyingPaymaster from '@account-abstraction/contracts/artifacts/VerifyingPaymaster.json';

import config from './config.json';

export const HARDHAT_CHAIN = 31337;
export const LOCAL_CHAIN = 1337;

async function deployEntryPoint(chainConfig){
    chainConfig.entrypoint = {address: DeterministicDeployer.getAddress(EntryPoint__factory.bytecode)};
    let deployer = new DeterministicDeployer(ethers.provider)
    if (await deployer.isContractDeployed(chainConfig.entrypoint.address)) {
      console.log(`\tEntryPoint address: ${chainConfig.entrypoint.address}`);
      return
    }
    if (chainConfig.chainId !== HARDHAT_CHAIN && chainConfig.chainId !== LOCAL_CHAIN){
        throw new Error(`EntryPoint is not deployed on chain ${chainConfig.chainId}`)
    }
    await deployer.deterministicDeploy(EntryPoint__factory.bytecode)
    console.log(`\tEntryPoint address: ${chainConfig.entrypoint.address}`);
}

async function deployBundler(chainConfig){
    if (chainConfig.chainId == HARDHAT_CHAIN){
        const bundler = ethers.Wallet.createRandom();
        const address = await bundler.getAddress();
        chainConfig.bundler = {address};
        console.log(`\tBundler address: ${chainConfig.bundler.address}`);
    }else{
        if (!chainConfig.bundler.url) throw new Error(`Bundler url is not defined for chain ${chainConfig.chainId}`);
        console.log(`\tBundler url: ${chainConfig.bundler.url}`);
    }
}

async function deployContract(config, factory, contractDeployer){
    const hash = createHash('sha256').update(factory.bytecode).digest('hex');
    if (!config || !config.hash || hash !== config.hash || !config.address || (await ethers.provider.getCode(config.address)) == "0x"){
        return contractDeployer(hash);
    }
}

async function deployGreeter(chainConfig){
    const Greeter = await ethers.getContractFactory("Greeter");
    await deployContract(chainConfig.greeter, Greeter, async function(hash){
        console.log(`\tDeploying Greeter`);
        const greeter = await Greeter.deploy("Hello World!");
        chainConfig.greeter = {address: greeter.address, hash};
    })
    console.log(`\tGreeter address: ${chainConfig.greeter.address}`);
}

async function deployFactory(chainConfig){
    const Factory = await ethers.getContractFactory(SimpleAccountFactory.abi, SimpleAccountFactory.bytecode);
    await deployContract(chainConfig.factory, Factory, async function(hash){
        console.log(`\tDeploying Factory`);
        const factory = await Factory.deploy(chainConfig.entrypoint.address);
        chainConfig.factory = {address: factory.address, hash};
    })
    console.log(`\tFactory address: ${chainConfig.factory.address}`);
}

async function deployPaymaster(chainConfig, adminAddress){
    const Paymaster = await ethers.getContractFactory(VerifyingPaymaster.abi, VerifyingPaymaster.bytecode);
    await deployContract(chainConfig.paymaster, Paymaster, async function(hash){
        console.log(`\tDeploying Paymaster`);
        const paymaster = await Paymaster.deploy(chainConfig.entrypoint.address, adminAddress);
        chainConfig.paymaster = {address: paymaster.address, hash};
    })
    console.log(`\tPaymaster address: ${chainConfig.paymaster.address}`);
}

export async function deployAll(adminAddress) {
    const chainId = Number((await ethers.provider.getNetwork()).chainId);
    const chainConfig = config[chainId] || {chainId}

    await deployEntryPoint(chainConfig);
    await deployBundler(chainConfig);
    await deployGreeter(chainConfig);
    await deployFactory(chainConfig);
    await deployPaymaster(chainConfig, adminAddress);
        
    if (chainId !== HARDHAT_CHAIN){
        config[chainId] = chainConfig;
        writeFileSync('./src/config.json', JSON.stringify(config, null, 2));
    }
        
    return chainConfig;
}