const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

const TOKEN_NAME = "Test Token";
const TOKEN_SYMBOL = "TST";
const TOKEN_DECIMALS = 6; // USDT gibi 6 decimal'li test token
const INITIAL_SUPPLY = 1000000; // 1M token

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
        crimson: "\x1b[38m"
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
        crimson: "\x1b[48m"
    }
};

// ASCII banner
const banner = `
${colors.fg.cyan}╔════════════════════════════════════════════════════════════════╗
║                   Token Vesting Deployment                       ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`;

const separator = `${colors.fg.cyan}════════════════════════════════════════════════════════════════${colors.reset}`;

module.exports = buildModule("TokenVestingDeployment", async (m) => {
    console.log(banner);
    
    // Test Token'ı deploy et
    console.log(`\n${colors.fg.yellow}📝 Deploying Test Token...${colors.reset}`);
    const testToken = await m.contract("TestToken", [TOKEN_NAME, TOKEN_SYMBOL, TOKEN_DECIMALS]);
    console.log(`${colors.fg.green}✓ Test Token deployed${colors.reset}`);
    console.log(`  ${colors.dim}├─ Address: ${colors.fg.cyan}${testToken.address}${colors.reset}`);
    console.log(`  ${colors.dim}├─ Name: ${TOKEN_NAME}${colors.reset}`);
    console.log(`  ${colors.dim}├─ Symbol: ${TOKEN_SYMBOL}${colors.reset}`);
    console.log(`  ${colors.dim}└─ Decimals: ${TOKEN_DECIMALS}${colors.reset}\n`);

    // TokenVesting kontratını deploy et
    console.log(`${colors.fg.yellow}📝 Deploying TokenVesting...${colors.reset}`);
    const tokenVesting = await m.contract("TokenVesting", []);
    console.log(`${colors.fg.green}✓ TokenVesting deployed${colors.reset}`);
    console.log(`  ${colors.dim}└─ Address: ${colors.fg.cyan}${tokenVesting.address}${colors.reset}\n`);

    // Test senaryosu için örnek bir vesting planı oluştur
    const now = Math.floor(Date.now() / 1000);
    const cliffDuration = 2592000; // 30 gün
    const duration = 31536000; // 1 yıl
    const slicePeriodSeconds = 86400; // 1 gün
    const amount = BigInt(1000) * BigInt(10 ** TOKEN_DECIMALS); // 1000 token

    console.log(`${colors.fg.yellow}📝 Setting up vesting schedule...${colors.reset}`);
    
    // Test token'larını mint et ve vesting kontratına approve ver
    console.log(`  ${colors.dim}├─ Minting tokens...${colors.reset}`);
    await m.call(testToken, "mint", [m.walletAddress, amount]);
    
    console.log(`  ${colors.dim}├─ Approving tokens...${colors.reset}`);
    await m.call(testToken, "approve", [tokenVesting.address, amount]);

    // Vesting planını oluştur
    console.log(`  ${colors.dim}└─ Creating vesting schedule...${colors.reset}`);
    await m.call(tokenVesting, "createVestingSchedule", [
        testToken.address,
        m.walletAddress,
        now,
        cliffDuration,
        duration,
        slicePeriodSeconds,
        amount
    ]);

    console.log(`\n${colors.fg.green}✓ Vesting schedule created successfully${colors.reset}`);
    console.log(`  ${colors.dim}├─ Amount: ${amount.toString()} (${1000} tokens)${colors.reset}`);
    console.log(`  ${colors.dim}├─ Cliff: ${cliffDuration / 86400} days${colors.reset}`);
    console.log(`  ${colors.dim}├─ Duration: ${duration / 86400} days${colors.reset}`);
    console.log(`  ${colors.dim}└─ Slice Period: ${slicePeriodSeconds / 3600} hours${colors.reset}\n`);

    console.log(separator);
    console.log(`\n${colors.fg.magenta}Deployment completed successfully! 🎉${colors.reset}`);
    console.log(`\n${colors.bright}Contract Addresses to save:${colors.reset}`);
    console.log(`${colors.fg.cyan}TestToken: ${testToken.address}${colors.reset}`);
    console.log(`${colors.fg.cyan}TokenVesting: ${tokenVesting.address}${colors.reset}\n`);
    
    console.log(`${colors.fg.magenta}
    ░██████╗░█████╗░██╗░░░░░░█████╗░███████╗░█████╗░███╗░░██╗
    ██╔════╝██╔══██╗██║░░░░░██╔══██╗╚════██║██╔══██╗████╗░██║
    ╚█████╗░██║░░██║██║░░░░░███████║░░███╔═╝███████║██╔██╗██║
    ░╚═══██╗██║░░██║██║░░░░░██╔══██║██╔══╝░░██╔══██║██║╚████║
    ██████╔╝╚█████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║
    ╚═════╝░░╚════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝${colors.reset}\n`);

    return {
        testToken: testToken,
        tokenVesting: tokenVesting
    };
}); 