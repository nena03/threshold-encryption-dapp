# 🔐 Threshold dApp

A decentralized application (dApp) that combines **Shamir's Secret Sharing (SSS)** with an Ethereum smart contract on the **Sepolia testnet** to achieve secure, threshold-based message coordination and decentralized auditing.

---

## 🌟 Key Features

* **Client-Side Secret Splitting (SSS):** Splits confidential text messages into mathematical shares using Shamir's Secret Sharing scheme (`secrets.js-grempe`) entirely in the browser. The raw shares never travel to the blockchain, preserving full privacy.
* **Smart Contract Coordination:** Utilizes a Solidity smart contract (`ThresholdRegistry.sol`) deployed on Sepolia to manage message metadata, authorization lists, and threshold rules.
* **Role-Based Access Control:** Enforces strict guardian verification via smart contract modifiers (`onlyGuardian`) and MetaMask authentication, preventing unauthorized access or double voting.
* **Transparent Audit Trail:** Emits custom blockchain events (`MessageRegistered`, `GuardianApproved`, `ThresholdReached`) to maintain an immutable, verifiable history of guardian participation.

---

## 📂 Project Architecture

The project follows a hybrid decentralized architecture:

1. **Smart Contract Layer (`ThresholdRegistry.sol`):**
   * Acts as an immutable, decentralized coordinator and judge.
   * Stores message metadata (`MessageMeta` struct): owner address, message hash (`bytes32`), threshold parameter (M), guardian addresses, and approval counts.
   * Implements nested mappings (`hasSubmittedShare`) to prevent duplicate voting from the same guardian.
   * Automatically updates state (`isThresholdReached = true`) once the required number of guardian approvals is met.

2. **Frontend Interface (`React` & `App.jsx`):**
   * Acts as the client-side bridge between the user and the blockchain.
   * Integrates **Ethers.js** (`BrowserProvider`) for seamless MetaMask wallet connection and transaction signing.
   * Provides an intuitive interface for secret splitting, contract interaction, status monitoring, and secret reconstruction.

---

## 🛠️ Tech Stack

* **Smart Contract:** Solidity (^0.8.28), Remix IDE / Hardhat, Ethereum Sepolia Testnet
* **Frontend:** React, JavaScript (ES6+), HTML5, CSS3
* **Web3 Library:** Ethers.js v6
* **Cryptography:** Shamir's Secret Sharing (`secrets.js-grempe`)

---

## ⚙️ Smart Contract Functions (`ThresholdRegistry.sol`)

* `registerMessage(string _messageId, bytes32 _messageHash, uint256 _thresholdM, address[] _guardians)`: Registers a new message, sets the threshold rule, and defines authorized guardians.
* `submitGuardianApproval(string _messageId)`: Allows an authorized guardian to cast their vote/approval. Automatically checks eligibility and evaluates if the threshold has been reached.
* `getGuardians(string _messageId)`: View function to fetch the exact list of authorized guardians directly from the blockchain.
* `isThresholdMet(string _messageId)`: View function to check whether the required threshold of approvals has been reached.

---

## 🚀 Workflow

1. **Setup & Split:** The owner inputs a secret message and parameters ($n$ total shares, $k$ threshold) to generate shares locally.
2. **Registration:** The owner registers the message hash, threshold, and guardian address array onto the Sepolia smart contract via MetaMask.
3. **Approval:** Designated guardians connect their wallets through the frontend dApp and submit their approval on-chain.
4. **Decryption:** Once the smart contract verifies that the approval count meets or exceeds the threshold ($M$), the threshold status turns `true`, enabling authorized participants to combine their shares and reconstruct the secret.

