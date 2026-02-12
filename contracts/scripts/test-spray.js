const hre = require("hardhat");

async function main() {
  const [sender] = await hre.ethers.getSigners();
  console.log("Sender:", sender.address);

  const balance = await hre.ethers.provider.getBalance(sender.address);
  console.log("Balance:", hre.ethers.formatEther(balance), "XPL");

  // Connect to deployed contract
  const contractAddress = "0x08fA5D1c16CD6E2a16FC0E4839f262429959E073";
  const SprayContract = await hre.ethers.getContractFactory("SprayContract");
  const spray = SprayContract.attach(contractAddress);

  // Test: send small amounts to 3 addresses
  const recipients = [
    { recipient: "0x0000000000000000000000000000000000000001", amount: hre.ethers.parseEther("0.001") },
    { recipient: "0x0000000000000000000000000000000000000002", amount: hre.ethers.parseEther("0.001") },
    { recipient: "0x0000000000000000000000000000000000000003", amount: hre.ethers.parseEther("0.001") },
  ];

  const totalAmount = hre.ethers.parseEther("0.003");
  const fee = totalAmount * 30n / 10000n; // 0.3% fee
  const totalWithFee = totalAmount + fee;

  console.log("Total to send:", hre.ethers.formatEther(totalAmount), "XPL");
  console.log("Fee (0.3%):", hre.ethers.formatEther(fee), "XPL");
  console.log("Total with fee:", hre.ethers.formatEther(totalWithFee), "XPL");
  console.log("");
  console.log("Spraying to 3 addresses...");

  const tx = await spray.sprayETH(recipients, { value: totalWithFee });
  console.log("Tx hash:", tx.hash);

  const receipt = await tx.wait();
  console.log("✅ Spray successful! Gas used:", receipt.gasUsed.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error.message);
    process.exit(1);
  });