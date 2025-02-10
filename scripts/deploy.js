const hre = require("hardhat");
const { ethers } = require("hardhat");
const { networks } = require("../hardhat.config");

async function main() {
    const colors = {
        reset: "\x1b[0m",
        bright: "\x1b[1m",
        dim: "\x1b[2m",
        fg: {
            cyan: "\x1b[36m",
            magenta: "\x1b[35m",
            green: "\x1b[32m",
            yellow: "\x1b[33m",
            blue: "\x1b[34m"
        }
    };

    const banner = `
${colors.fg.cyan}╔════════════════════════════════════════════════════════════════╗
║                   Token Vesting Deployment                       ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`;

    const separator = `${colors.fg.cyan}════════════════════════════════════════════════════════════════${colors.reset}`;

    console.log(banner);

    // Get the deployer's signer
    const [deployer] = await ethers.getSigners();
    console.log(`${colors.fg.yellow}Deploying contracts with the account: ${colors.reset}${deployer.address}`);

    // Get the network
    const network = await ethers.provider.getNetwork();
    const networkName = network.chainId === 97 ? "bscTestnet" : "bsc";
    const explorerUrl = networks[networkName].blockExplorerUrl;

    // TokenVesting kontratını deploy et
    console.log(`${colors.fg.yellow}📝 Deploying TokenVesting...${colors.reset}`);
    const TokenVesting = await ethers.getContractFactory("TokenVesting");
    const tokenVesting = await TokenVesting.connect(deployer).deploy();
    await tokenVesting.waitForDeployment();
    
    const tokenVestingAddress = await tokenVesting.getAddress();
    console.log(`${colors.fg.green}✓ TokenVesting deployed${colors.reset}`);
    console.log(`  ${colors.dim}├─ Address: ${colors.fg.cyan}${tokenVestingAddress}${colors.reset}`);
    console.log(`  ${colors.dim}└─ Explorer: ${colors.fg.blue}${explorerUrl}/address/${tokenVestingAddress}${colors.reset}\n`);

    console.log(separator);
    console.log(`\n${colors.fg.magenta}Deployment completed successfully! 🎉${colors.reset}`);
    console.log(`\n${colors.bright}Contract Address to save:${colors.reset}`);
    console.log(`${colors.fg.cyan}TokenVesting: ${tokenVestingAddress}${colors.reset}`);
    console.log(`${colors.fg.blue}🔍 View on BSCScan: ${explorerUrl}/address/${tokenVestingAddress}${colors.reset}\n`);

    console.log(`${colors.fg.magenta}
    ░██████╗░█████╗░██╗░░░░░░█████╗░███████╗░█████╗░███╗░░██╗
    ██╔════╝██╔══██╗██║░░░░░██╔══██╗╚════██║██╔══██╗████╗░██║
    ╚█████╗░██║░░██║██║░░░░░███████║░░███╔═╝███████║██╔██╗██║
    ░╚═══██╗██║░░██║██║░░░░░██╔══██║██╔══╝░░██╔══██║██║╚████║
    ██████╔╝╚█████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║
    ╚═════╝░░╚════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝${colors.reset}\n`);

    // Verify contract on BSCScan
    console.log(`\n${colors.fg.yellow}Verifying contract on BSCScan...${colors.reset}`);
    try {
        await hre.run("verify:verify", {
            address: tokenVestingAddress,
            constructorArguments: [],
        });
        console.log(`${colors.fg.green}✓ Contract verified successfully${colors.reset}`);
    } catch (error) {
        console.log(`${colors.fg.yellow}⚠️  Verification failed:${colors.reset}`, error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
}); 