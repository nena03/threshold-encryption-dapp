import hre from "hardhat";

async function main() {
  console.log("🚀 Započinjem deploy ThresholdRegistry ugovora na Sepolia mrežu...");

  // Preuzimamo network connection / provider direktno iz hre
  const { ethers } = await hre.network.connect();

  // Preuzimanje fabrike ugovora
  const ThresholdRegistry = await ethers.getContractFactory("ThresholdRegistry");

  // Pokretanje deployment-a
  const registry = await ThresholdRegistry.deploy();

  // Čekamo da se transakcija potvrdi na blockchain-u
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();

  console.log("----------------------------------------------------");
  console.log("✅ ThresholdRegistry je uspešno deploy-ovan!");
  console.log(`📍 Adresa ugovora: ${contractAddress}`);
  console.log("----------------------------------------------------");
}

main().catch((error) => {
  console.error("❌ Greška tokom deploy-a:", error);
  process.exitCode = 1;
});