// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying SprayContract...");

  // Get the contract factory
  const SprayContract = await hre.ethers.getContractFactory("SprayContract");

  // Configuration
  const FEE_RECIPIENT = process.env.FEE_RECIPIENT || "YOUR_ADDRESS_HERE";
  const FEE_BPS = 30; // 0.3% fee (30 basis points)

  console.log(`Fee Recipient: ${FEE_RECIPIENT}`);
  console.log(`Fee: ${FEE_BPS / 100}%`);

  // Deploy the contract
  const sprayContract = await SprayContract.deploy(FEE_RECIPIENT, FEE_BPS);

  await sprayContract.waitForDeployment();

  const address = await sprayContract.getAddress();
  console.log(`SprayContract deployed to: ${address}`);

  // Wait for block confirmations before verifying
  console.log("Waiting for block confirmations...");
  await sprayContract.deploymentTransaction().wait(5);

  // Verify the contract on Etherscan/Basescan
  try {
    console.log("Verifying contract on block explorer...");
    await hre.run("verify:verify", {
      address: address,
      constructorArguments: [FEE_RECIPIENT, FEE_BPS],
    });
    console.log("Contract verified successfully");
  } catch (error) {
    console.log("Verification failed:", error.message);
  }

  // Save deployment info
  const fs = require('fs');
  const deploymentInfo = {
    network: hre.network.name,
    address: address,
    feeRecipient: FEE_RECIPIENT,
    feeBps: FEE_BPS,
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.getSigners())[0].address
  };

  const deploymentsDir = './deployments';
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir);
  }

  fs.writeFileSync(
    `${deploymentsDir}/${hre.network.name}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log(`Deployment info saved to ${deploymentsDir}/${hre.network.name}.json`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
