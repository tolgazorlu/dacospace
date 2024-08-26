const { ethers } = require("hardhat");
const courses = require("../../courses.json");
require("@nomicfoundation/hardhat-toolbox");

const tokens = (n: any) => {
    return ethers.utils.parseUnits(n.toString(), "ether");
};

async function main() {
    // Setup accounts
    const [deployer] = await ethers.getSigners();

    // Deploy Dacospace contract
    const Dacospace = await ethers.getContractFactory("Dacospace");
    const dacospace = await Dacospace.deploy();
    await dacospace.deployed();

    console.log(`Deployed Dacospace Contract at: ${dacospace.address}\n`);

    // Listing courses...
    for (let i = 0; i < courses.length; i++) {
        const transaction = await dacospace
            .connect(deployer)
            .list(
                courses[i].id,
                courses[i].title,
                courses[i].description,
                courses[i].image,
                courses[i].category,
                tokens(courses[i].cost),
                courses[i].rating,
                courses[i].sold,
                courses[i].dailyContents,
            );

        await transaction.wait();

        console.log(`Listed course ${courses[i].id}: ${courses[i].title}`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
