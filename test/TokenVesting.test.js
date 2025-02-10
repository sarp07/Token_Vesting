const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Terminal renkleri için
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
║                   Token Vesting Test Suite                       ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}`;

const separator = `${colors.fg.cyan}════════════════════════════════════════════════════════════════${colors.reset}`;

describe("TokenVesting", function () {
    console.log(banner);
    
    let TokenVesting;
    let TestToken;
    let vesting;
    let token;
    let owner;
    let beneficiary;
    let addr1;
    let addr2;

    const TOKEN_DECIMALS = 6; // USDT gibi 6 decimal'li token için test edelim
    const TOTAL_AMOUNT = BigInt(1000) * BigInt(10 ** TOKEN_DECIMALS); // 1000 token
    const SLICE_PERIOD = 1; // 1 saniye
    let START_TIME;
    const CLIFF_DURATION = 60; // 60 saniye
    const DURATION = 180; // 180 saniye

    beforeEach(async function () {
        console.log(`\n${colors.fg.yellow}🔧 Setting up test environment...${colors.reset}`);
        
        // Kontratları deploy et
        [owner, beneficiary, addr1, addr2] = await ethers.getSigners();
        console.log(`  ${colors.dim}├─ Got signers${colors.reset}`);

        // Test ERC20 token'ı deploy et
        const TestTokenFactory = await ethers.getContractFactory("TestToken");
        token = await TestTokenFactory.deploy("Test Token", "TST", TOKEN_DECIMALS);
        console.log(`  ${colors.dim}├─ Deployed TestToken: ${colors.fg.cyan}${token.target}${colors.reset}`);

        // Vesting kontratını deploy et
        const TokenVestingFactory = await ethers.getContractFactory("TokenVesting");
        vesting = await TokenVestingFactory.deploy();
        console.log(`  ${colors.dim}├─ Deployed TokenVesting: ${colors.fg.cyan}${vesting.target}${colors.reset}`);

        // Test token'larını mint et
        await token.mint(owner.address, TOTAL_AMOUNT);
        console.log(`  ${colors.dim}├─ Minted ${TOTAL_AMOUNT.toString()} tokens${colors.reset}`);
        
        // Vesting kontratına approval ver
        await token.approve(vesting.target, TOTAL_AMOUNT);
        console.log(`  ${colors.dim}└─ Approved tokens for vesting${colors.reset}`);

        // Başlangıç zamanını ayarla
        START_TIME = await time.latest();
    });

    describe("Temel Kontroller", function () {
        it("Kontrat sahibi doğru ayarlanmalı", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing owner settings...${colors.reset}`);
            expect(await vesting.owner()).to.equal(owner.address);
            console.log(`  ${colors.fg.green}✓ Owner correctly set to: ${colors.fg.cyan}${owner.address}${colors.reset}`);
        });

        it("Başlangıçta vesting planı sayısı 0 olmalı", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing initial vesting count...${colors.reset}`);
            expect(await vesting.vestingSchedulesCount()).to.equal(0);
            console.log(`  ${colors.fg.green}✓ Initial vesting count is 0${colors.reset}`);
        });

        it("Token decimal değeri doğru olmalı", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing token decimals...${colors.reset}`);
            expect(await token.decimals()).to.equal(TOKEN_DECIMALS);
            console.log(`  ${colors.fg.green}✓ Token decimals set to: ${TOKEN_DECIMALS}${colors.reset}`);
        });
    });

    describe("Vesting Planı Oluşturma", function () {
        it("Sadece owner vesting planı oluşturabilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing owner-only vesting creation...${colors.reset}`);
            await expect(vesting.connect(addr1).createVestingSchedule(
                token.target,
                beneficiary.address,
                START_TIME,
                CLIFF_DURATION,
                DURATION,
                SLICE_PERIOD,
                TOTAL_AMOUNT
            )).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount");
            console.log(`  ${colors.fg.green}✓ Non-owner vesting creation correctly rejected${colors.reset}`);
        });

        it("Vesting planı başarıyla oluşturulmalı ve decimal değeri doğru olmalı", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing vesting schedule creation...${colors.reset}`);
            
            await vesting.createVestingSchedule(
                token.target,
                beneficiary.address,
                START_TIME,
                CLIFF_DURATION,
                DURATION,
                SLICE_PERIOD,
                TOTAL_AMOUNT
            );
            console.log(`  ${colors.dim}├─ Created vesting schedule${colors.reset}`);

            expect(await vesting.vestingSchedulesCount()).to.equal(1);
            console.log(`  ${colors.dim}├─ Verified vesting count${colors.reset}`);
            
            const schedules = await vesting.getVestingSchedulesByBeneficiary(beneficiary.address);
            expect(schedules.length).to.equal(1);
            console.log(`  ${colors.dim}├─ Verified beneficiary schedules${colors.reset}`);

            const schedule = await vesting.getVestingSchedule(schedules[0]);
            expect(schedule.decimals).to.equal(TOKEN_DECIMALS);
            expect(schedule.totalAmount).to.equal(TOTAL_AMOUNT);
            console.log(`  ${colors.fg.green}✓ Vesting schedule created with correct parameters${colors.reset}`);
        });
    });

    describe("Token Çekme İşlemleri", function () {
        let vestingScheduleId;

        beforeEach(async function () {
            await vesting.createVestingSchedule(
                token.target,
                beneficiary.address,
                START_TIME,
                CLIFF_DURATION,
                DURATION,
                SLICE_PERIOD,
                TOTAL_AMOUNT
            );

            const schedules = await vesting.getVestingSchedulesByBeneficiary(beneficiary.address);
            vestingScheduleId = schedules[0];
        });

        it("Cliff süresi dolmadan token çekilememeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing cliff period restriction...${colors.reset}`);
            await expect(
                vesting.connect(beneficiary).release(vestingScheduleId, 1)
            ).to.be.revertedWith("Not enough vested tokens");
            console.log(`  ${colors.fg.green}✓ Token withdrawal correctly blocked during cliff${colors.reset}`);
        });

        it("Cliff süresi dolduktan sonra kısmi token çekilebilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing partial token release after cliff...${colors.reset}`);
            
            // Cliff süresini geç
            await time.increase(CLIFF_DURATION + 10);
            console.log(`  ${colors.dim}├─ Advanced time past cliff${colors.reset}`);

            const releasableAmount = await vesting.computeReleasableAmount(vestingScheduleId);
            expect(releasableAmount).to.be.gt(0);
            console.log(`  ${colors.dim}├─ Computed releasable amount: ${releasableAmount}${colors.reset}`);

            await vesting.connect(beneficiary).release(vestingScheduleId, releasableAmount);
            console.log(`  ${colors.dim}├─ Released tokens${colors.reset}`);
            
            const schedule = await vesting.getVestingSchedule(vestingScheduleId);
            expect(schedule.released).to.equal(releasableAmount);
            console.log(`  ${colors.fg.green}✓ Partial token release successful${colors.reset}`);
        });

        it("Tüm süre dolunca tüm tokenlar çekilebilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing full token release...${colors.reset}`);
            
            // Tüm süreyi geç
            await time.increase(DURATION + 10);
            console.log(`  ${colors.dim}├─ Advanced time past duration${colors.reset}`);

            const releasableAmount = await vesting.computeReleasableAmount(vestingScheduleId);
            expect(releasableAmount).to.equal(TOTAL_AMOUNT);
            console.log(`  ${colors.dim}├─ Verified full amount is releasable${colors.reset}`);

            await vesting.connect(beneficiary).release(vestingScheduleId, TOTAL_AMOUNT);
            console.log(`  ${colors.dim}├─ Released all tokens${colors.reset}`);
            
            const schedule = await vesting.getVestingSchedule(vestingScheduleId);
            expect(schedule.released).to.equal(TOTAL_AMOUNT);
            console.log(`  ${colors.fg.green}✓ Full token release successful${colors.reset}`);
        });
    });

    describe("Sahiplik Transferi", function () {
        it("Owner başarıyla transfer edilebilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing ownership transfer...${colors.reset}`);
            await vesting.transferOwnership(addr1.address);
            expect(await vesting.owner()).to.equal(addr1.address);
            console.log(`  ${colors.fg.green}✓ Ownership transferred to: ${colors.fg.cyan}${addr1.address}${colors.reset}`);
        });

        it("Yeni owner vesting planı oluşturabilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing new owner functionality...${colors.reset}`);
            
            await vesting.transferOwnership(addr1.address);
            console.log(`  ${colors.dim}├─ Transferred ownership${colors.reset}`);
            
            // Test token'larını yeni owner'a transfer et
            await token.transfer(addr1.address, TOTAL_AMOUNT);
            console.log(`  ${colors.dim}├─ Transferred tokens to new owner${colors.reset}`);
            
            // Yeni owner'dan approval
            await token.connect(addr1).approve(vesting.target, TOTAL_AMOUNT);
            console.log(`  ${colors.dim}├─ New owner approved tokens${colors.reset}`);

            await vesting.connect(addr1).createVestingSchedule(
                token.target,
                beneficiary.address,
                START_TIME,
                CLIFF_DURATION,
                DURATION,
                SLICE_PERIOD,
                TOTAL_AMOUNT
            );
            console.log(`  ${colors.dim}├─ Created vesting schedule as new owner${colors.reset}`);

            expect(await vesting.vestingSchedulesCount()).to.equal(1);
            console.log(`  ${colors.fg.green}✓ New owner successfully created vesting schedule${colors.reset}`);
        });
    });

    describe("Acil Durum Çekme", function () {
        it("Sadece owner acil durum çekimi yapabilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing emergency withdrawal restrictions...${colors.reset}`);
            await expect(
                vesting.connect(addr1).emergencyWithdraw(token.target, 1)
            ).to.be.revertedWithCustomError(vesting, "OwnableUnauthorizedAccount");
            console.log(`  ${colors.fg.green}✓ Non-owner emergency withdrawal correctly rejected${colors.reset}`);
        });

        it("Owner başarıyla acil durum çekimi yapabilmeli", async function () {
            console.log(`\n${colors.fg.yellow}🔍 Testing emergency withdrawal...${colors.reset}`);
            
            // Önce token gönder
            await token.transfer(vesting.target, 100);
            console.log(`  ${colors.dim}├─ Transferred tokens to vesting contract${colors.reset}`);
            
            const initialBalance = await token.balanceOf(owner.address);
            await vesting.emergencyWithdraw(token.target, 100);
            console.log(`  ${colors.dim}├─ Executed emergency withdrawal${colors.reset}`);
            
            expect(await token.balanceOf(owner.address)).to.equal(initialBalance + 100n);
            console.log(`  ${colors.fg.green}✓ Emergency withdrawal successful${colors.reset}`);
        });
    });

    after(function() {
        console.log(separator);
        console.log(`\n${colors.fg.magenta}All tests completed successfully! 🎉${colors.reset}`);
        
        // SOLAZAN imzası
        console.log(`${colors.fg.magenta}
    ░██████╗░█████╗░██╗░░░░░░█████╗░███████╗░█████╗░███╗░░██╗
    ██╔════╝██╔══██╗██║░░░░░██╔══██╗╚════██║██╔══██╗████╗░██║
    ╚█████╗░██║░░██║██║░░░░░███████║░░███╔═╝███████║██╔██╗██║
    ░╚═══██╗██║░░██║██║░░░░░██╔══██║██╔══╝░░██╔══██║██║╚████║
    ██████╔╝╚█████╔╝███████╗██║░░██║███████╗██║░░██║██║░╚███║
    ╚═════╝░░╚════╝░╚══════╝╚═╝░░╚═╝╚══════╝╚═╝░░╚═╝╚═╝░░╚══╝${colors.reset}\n`);
    });
});

// Test Token kontratı
const TestToken = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}`; 