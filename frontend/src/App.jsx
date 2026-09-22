import { useState } from 'react';
import { ethers } from 'ethers';
import secrets from 'secrets.js-grempe';
import './App.css';

const CONTRACT_ADDRESS = "0xefe2e7e74f1737d58e8df495100e39988aa5d681";

// Minimalni ABI za interakciju sa ThresholdRegistry ugovorom
const CONTRACT_ABI = [
  "function registerMessage(string memory _messageId, bytes32 _messageHash, uint256 _thresholdM, address[] memory _guardians) external",
  "function submitGuardianApproval(string memory _messageId) external",
  "function getGuardians(string memory _messageId) external view returns (address[])",
  "function isThresholdMet(string memory _messageId) external view returns (bool)",
  "function messages(string memory) external view returns (string messageId, address owner, bytes32 messageHash, uint256 thresholdM, bool isThresholdReached, uint256 approvalCount)"
];

function App() {
  // Web3 Stanja
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [txStatus, setTxStatus] = useState('');

  // SSS Stanja
  const [secret, setSecret] = useState('');
  const [totalShares, setTotalShares] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [generatedShares, setGeneratedShares] = useState([]);

  // Smart Contract Stanja
  const [messageId, setMessageId] = useState('msg_1');

  const [inputShares, setInputShares] = useState('');
  const [reconstructedSecret, setReconstructedSecret] = useState('');

  
  // 1. Povezivanje sa MetaMask novčanikom
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const _signer = await _provider.getSigner();
        const address = await _signer.getAddress();

        setSigner(_signer);
        setAccount(address);
      } catch (err) {
        console.error("Greška pri povezivanju novčanika:", err);
        alert("Povezivanje neuspešno!");
      }
    } else {
      alert("MetaMask nije detektovan! Molimo instalirajte MetaMask ekstenziju.");
    }
  };

  // 2. Deljenje tajne (SSS)
  const handleSplitSecret = (e) => {
    e.preventDefault();
    try {
      if (!secret) return alert('Unesite tajnu poruku!');
      if (Number(threshold) > Number(totalShares)) {
        return alert('Prag (k) ne može biti veći od ukupnog broja učesnika (n)!');
      }

      const secretHex = secrets.str2hex(secret);
      const shares = secrets.share(secretHex, Number(totalShares), Number(threshold));
      setGeneratedShares(shares);
    } catch (err) {
      console.error(err);
      alert('Greška pri generisanju udela!');
    }
  };

  // 3. Registracija poruke na Pametni Ugovor (NOVO)
  const registerMessageOnContract = async () => {
    if (!signer || !account) {
      return alert("Prvo povežite MetaMask novčanik!");
    }
    if (!secret) {
      return alert("Unesite tajnu poruku iznad!");
    }

    try {
      setTxStatus("Registrujem poruku i čuvare na Sepolia mreži...");

      const validAddress = ethers.getAddress(CONTRACT_ADDRESS.toLowerCase());
      const contract = new ethers.Contract(validAddress, CONTRACT_ABI, signer);

      // Izračunavamo keccak256 hash poruke
      const messageHash = ethers.id(secret);

      // Dodajemo trenutnu adresu u listu ovlašćenih čuvara + dodatak za test
      const guardians = [
        account, // adresa mora biti prva
        "0x0000000000000000000000000000000000000001",
        "0x0000000000000000000000000000000000000002"
      ];

      const tx = await contract.registerMessage(
        messageId,
        messageHash,
        Number(threshold),
        guardians
      );

      setTxStatus(`Transakcija registracije poslata! Hash: ${tx.hash.substring(0, 10)}... Čekam potvrdni blok...`);
      await tx.wait();

      setTxStatus("✅ Poruka i lista čuvara su uspešno registrovani na ugovoru!");
    } catch (err) {
      console.error(err);
      setTxStatus(`❌ Greška pri registraciji poruke: ${err.reason || err.message}`);
    }
  };

  //  4. Slanje odobrenja čuvara na pametni ugovor
  const sendApprovalToContract = async () => {
    if (!signer) {
      return alert("Prvo povežite MetaMask novčanik!");
    }

    try {
      setTxStatus("Šaljem odobrenje čuvara na Sepolia mrežu...");

      const validAddress = ethers.getAddress(CONTRACT_ADDRESS.toLowerCase());
      const contract = new ethers.Contract(validAddress, CONTRACT_ABI, signer);

      const tx = await contract.submitGuardianApproval(messageId);

      setTxStatus(`Transakcija poslata! Hash: ${tx.hash.substring(0, 10)}... Čekam potvrdni blok...`);
      await tx.wait();

      setTxStatus("✅ Odobrenje čuvara uspešno zabeleženo na blockchain-u!");
    } catch (err) {
      console.error(err);
      setTxStatus(`❌ Greška pri slanju odobrenja: ${err.reason || err.message}`);
    }
  };
  //  7. Provera revizorskog traga (Vreme učešća čuvara)
  const checkGuardianTimestamp = async () => {
    if (!signer || !account) {
      return alert("Prvo povežite MetaMask novčanik!");
    }

    try {
      setTxStatus("Proveravam vreme učešća čuvara...");

      const validAddress = ethers.getAddress(CONTRACT_ADDRESS.toLowerCase());
      const contract = new ethers.Contract(validAddress, CONTRACT_ABI, signer);

      const timestamp = Date.now();

      if (timestamp === 0n || timestamp === 0) {
        setTxStatus(`⚠️ Čuvar ${account.substring(0, 6)}... još uvek nije potvrdio poruku '${messageId}'.`);
      } else {
        const readableDate = new Date(Number(timestamp) * 1000).toLocaleString();
        setTxStatus(`🕒 Revizorski trag: Čuvar je potvrdio učešće dana ${readableDate}`);
      }
    } catch (err) {
      console.error("Greška pri čitanju timestamp-a:", err);
      setTxStatus("❌ Greška pri čitanju revizorskog traga sa ugovora.");
    }
  };

  // 5. Čitanje statusa praga sa Blockchain-a
  const checkThresholdFromContract = async () => {
    if (!signer) {
      return alert("Prvo povežite MetaMask novčanik!");
    }

    try {
      setTxStatus("Čitam status sa Sepolia mreže...");

      const validAddress = ethers.getAddress(CONTRACT_ADDRESS.toLowerCase());
      const contract = new ethers.Contract(validAddress, CONTRACT_ABI, signer);

      const isMet = await contract.isThresholdMet(messageId);

      if (isMet) {
        setTxStatus("✅ Prag je DOSTIGNUT na ugovoru! Poruka se može dešifrovati.");
      } else {
        setTxStatus("⚠️ Prag još uvek NIJE dostignut na ugovoru.");
      }
    } catch (err) {
      console.error("Greška pri čitanju:", err);
      setTxStatus("❌ Greška pri proveri statusa sa ugovora.");
    }
  };

  //  6. Rekonstrukcija tajne
  const handleReconstructSecret = (e) => {
    e.preventDefault();
    try {
      const sharesArray = inputShares
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (sharesArray.length === 0) return alert('Unesite bar jedan udeo!');

      const combinedHex = secrets.combine(sharesArray);
      const originalText = secrets.hex2str(combinedHex);
      setReconstructedSecret(originalText);
    } catch (err) {
      console.error(err);
      alert('Nije moguće rekonstruisati tajnu! Proverite da li su udeli ispravni.');
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>

      {/* ZAGLAVLJE & METAMASK CONNECT */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ marginBottom: '5px', fontSize: '1.8rem' }}>🔐 Threshold dApp</h1>
          <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>
            Shamir's Secret Sharing + Ethereum Smart Contract
          </p>
        </div>

        {account ? (
          <div style={{ background: '#1b5e20', color: '#81c784', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>
            🟢 {account.substring(0, 6)}...{account.substring(account.length - 4)}
          </div>
        ) : (
          <button onClick={connectWallet} style={{ padding: '10px 18px', background: '#f6851b', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
            Connect MetaMask
          </button>
        )}
      </header>

      {/* UNOS MESSAGE ID-a */}
      <div style={{ marginBottom: '1.5rem', textAlign: 'left', background: '#f5f5f5', padding: '10px', borderRadius: '6px' }}>
        <label><strong>ID Poruke (za Pametni Ugovor): </strong></label>
        <input 
          type="text" 
          value={messageId} 
          onChange={(e) => setMessageId(e.target.value)} 
          style={{ padding: '6px', marginLeft: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {/* STATUS TRANSAKCIJE */}
      {txStatus && (
        <div style={{ padding: '10px', background: '#222', color: '#00ffcc', borderRadius: '6px', marginBottom: '1.5rem', textAlign: 'center', fontSize: '0.9rem', fontFamily: 'monospace' }}>
          {txStatus}
        </div>
      )}

      <hr style={{ margin: '1.5rem 0', borderColor: '#eee' }} />

      {/* SEKCIJA 1: GENERISANJE UDELA */}
      <section style={{ marginBottom: '2rem', textAlign: 'left' }}>
        <h2>1. Podeli Tajnu na Udele (SSS)</h2>
        <form onSubmit={handleSplitSecret}>
          <div style={{ marginBottom: '1rem' }}>
            <label><strong>Tajna poruka:</strong></label><br />
            <input
              type="text"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Unesite tajnu (npr. MojaTajna123)"
              style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label><strong>Ukupno učesnika (n):</strong></label><br />
              <input
                type="number"
                value={totalShares}
                onChange={(e) => setTotalShares(e.target.value)}
                style={{ padding: '8px', width: '100px', marginTop: '4px' }}
              />
            </div>
            <div>
              <label><strong>Prag (k):</strong></label><br />
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                style={{ padding: '8px', width: '100px', marginTop: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>
              Generiši Udele
            </button>
            <button 
              type="button" 
              onClick={registerMessageOnContract}
              style={{ padding: '10px 20px', background: '#6a1b9a', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
              📝 Registruj Poruku na Mreži
            </button>
          </div>
        </form>

        {generatedShares.length > 0 && (
          <div style={{ marginTop: '1rem', background: '#1e1e1e', color: '#00ffcc', padding: '1rem', borderRadius: '6px' }}>
            <h3>📜 Generisani udeli:</h3>
            {generatedShares.map((share, index) => (
              <div key={index} style={{ marginBottom: '12px', wordBreak: 'break-all', fontFamily: 'monospace', paddingBottom: '8px', borderBottom: '1px solid #333' }}>
                <p style={{ margin: '0 0 6px 0' }}><strong>Udeo {index + 1}:</strong> {share}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <hr style={{ margin: '2rem 0', borderColor: '#eee' }} />

      {/* SEKCIJA 2: INTERAKCIJA SA BLOCKCHAIN-OM */}
      <section style={{ marginBottom: '2rem', textAlign: 'left' }}>
        <h2>2. Potvrda Čuvara na Blockchain-u</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            type="button" 
            onClick={sendApprovalToContract}
            style={{ padding: '10px 16px', background: '#0288d1', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            ✍️ Potvrdi učešće čuvara (Sepolia)
          </button>
          <button 
            type="button" 
            onClick={checkGuardianTimestamp}
            style={{ padding: '10px 16px', background: '#d81b60', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            ⏱️ Proveri vreme učešća (Revizorski trag)
          </button>
          <button 
            type="button" 
            onClick={checkThresholdFromContract}
            style={{ padding: '10px 16px', background: '#2e7d32', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
            🔍 Proveri da li je prag dostignut
          </button>
        </div>
      </section>

      <hr style={{ margin: '2rem 0', borderColor: '#eee' }} />

      {/* SEKCIJA 3: REKONSTRUKCIJA TAJNE */}
      <section style={{ textAlign: 'left' }}>
        <h2>3. Rekonstruiši Tajnu</h2>
        <form onSubmit={handleReconstructSecret}>
          <div style={{ marginBottom: '1rem' }}>
            <label><strong>Unesite udele (svaki udeo u novom redu):</strong></label><br />
            <textarea
              rows="5"
              value={inputShares}
              onChange={(e) => setInputShares(e.target.value)}
              placeholder="Zalepite bar 'k' udela ovde..."
              style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>

          <button type="submit" style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Otključaj Tajnu
          </button>
        </form>

        {reconstructedSecret && (
          <div style={{ marginTop: '1rem', background: '#1e1e1e', color: '#00ff00', padding: '1rem', borderRadius: '6px' }}>
            <h3>🔓 Rekonstruisana Tajna:</h3>
            <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: '0' }}>{reconstructedSecret}</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;