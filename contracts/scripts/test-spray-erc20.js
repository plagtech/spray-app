const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Sender:", signer.address);

  const SPRAY_ADDRESS = "0x08fA5D1c16CD6E2a16FC0E4839f262429959E073";
  const USDT0_ADDRESS = "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb";

  // USDT0 has 6 decimals
  const erc20Abi = [
    "function balanceOf(address) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function decimals() view returns (uint8)"
  ];

  const usdt0 = new hre.ethers.Contract(USDT0_ADDRESS, erc20Abi, signer);
  
  const decimals = await usdt0.decimals();
  console.log("USDT0 decimals:", decimals);

  const balance = await usdt0.balanceOf(signer.address);
  console.log("USDT0 balance:", hre.ethers.formatUnits(balance, decimals));

  // Send 0.01 USDT0 to 3 addresses
  const amount = hre.ethers.parseUnits("0.01", decimals);
  const recipients = [
    { recipient: "0x000000000000000000000000000000000000dEaD", amount: amount },
    { recipient: "0x0000000000000000000000000000000000000001", amount: amount },
    { recipient: "0x0000000000000000000000000000000000000002", amount: amount },
  ];

  const totalAmount = amount * 3n;
  const fee = (totalAmount * 30n) / 10000n;
  const totalRequired = totalAmount + fee;
  console.log("Total to send:", hre.ethers.formatUnits(totalAmount, decimals), "USDT0");
  console.log("Fee (0.3%):", hre.ethers.formatUnits(fee, decimals), "USDT0");
  console.log("Total required:", hre.ethers.formatUnits(totalRequired, decimals), "USDT0");

  // Step 1: Approve
  console.log("\nApproving USDT0...");
  const approveTx = await usdt0.approve(SPRAY_ADDRESS, totalRequired);
  await approveTx.wait();
  console.log("✅ Approved!");

  // Step 2: Spray ERC20
  const sprayAbi = [
    "function sprayERC20(address token, tuple(address recipient, uint256 amount)[] recipients)"
  ];
  const spray = new hre.ethers.Contract(SPRAY_ADDRESS, sprayAbi, signer);

  console.log("Spraying USDT0 to 3 addresses...");
  const tx = await spray.sprayERC20(USDT0_ADDRESS, recipients);
  const receipt = await tx.wait();
  console.log("Tx hash:", receipt.hash);
  console.log("✅ ERC-20 Spray successful! Gas used:", receipt.gasUsed.toString());
}

main().catch(console.error);