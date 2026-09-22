import { expect } from "chai";
import hre from "hardhat";

describe("ThresholdRegistry Unit Testovi", function () {
  let thresholdRegistry;
  let owner, guardian1, guardian2, guardian3, nonGuardian;

  beforeEach(async function () {
    const signers = await hre.ethers.getSigners();
    owner = signers[0];
    guardian1 = signers[1];
    guardian2 = signers[2];
    guardian3 = signers[3];
    nonGuardian = signers[4];

    const ThresholdRegistry = await hre.ethers.getContractFactory("ThresholdRegistry");
    thresholdRegistry = await ThresholdRegistry.deploy();
    await thresholdRegistry.waitForDeployment();
  });

  // TEST 1
  it("1. Treba da vrati prazne podatke za nepostojecu poruku", async function () {
    const msgData = await thresholdRegistry.messages("nepostojeca");
    expect(msgData.owner).to.equal("0x0000000000000000000000000000000000000000");
  });

  // TEST 2: Validacija praga M (M ne sme biti veće od N)
  it("2. Ne sme dozvoliti registraciju sa nevazecim pragom M (kada je M > N)", async function () {
    const msgId = "msg-invalid-m";
    const msgHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Test"));
    const guardians = [guardian1.address, guardian2.address];

    await expect(
      thresholdRegistry.registerMessage(msgId, msgHash, 3, guardians)
    ).to.be.reverted;
  });

  // TEST 3: Kontrola pristupa
  it("3. Ne sme dozvoliti neovlascenom licu da potvrdjuje ucesce", async function () {
    const msgId = "msg-102";
    const msgHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Tajna"));
    await thresholdRegistry.registerMessage(msgId, msgHash, 2, [guardian1.address, guardian2.address]);

    await expect(
      thresholdRegistry.connect(nonGuardian).submitGuardianApproval(msgId)
    ).to.be.reverted;
  });

  // TEST 4: Provera da prag NIJE dostignut kada ima manje od M čuvara
  it("4. Prag M ne sme biti dostignut kada ucestvuje manje od M cuvara", async function () {
    const msgId = "msg-103";
    const msgHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Tajna"));
    await thresholdRegistry.registerMessage(msgId, msgHash, 2, [guardian1.address, guardian2.address, guardian3.address]);

    await thresholdRegistry.connect(guardian1).submitGuardianApproval(msgId);

    const isMet = await thresholdRegistry.isThresholdMet(msgId);
    expect(isMet).to.be.false;
  });

  // TEST 5: Uspešno dostizanje praga M i emitovanje ThresholdMet događaja
  it("5. Treba da dostigne prag M i emituje ThresholdMet kada ucestvuje M cuvara", async function () {
    const msgId = "msg-104";
    const msgHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("Tajna"));
    await thresholdRegistry.registerMessage(msgId, msgHash, 2, [guardian1.address, guardian2.address, guardian3.address]);

    await thresholdRegistry.connect(guardian1).submitGuardianApproval(msgId);

    await expect(thresholdRegistry.connect(guardian2).submitGuardianApproval(msgId))
      .to.emit(thresholdRegistry, "ThresholdMet");

    const isMet = await thresholdRegistry.isThresholdMet(msgId);
    expect(isMet).to.be.true;
  });
});