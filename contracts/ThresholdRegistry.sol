// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title ThresholdRegistry
 * @dev Ugovor beleži metapodatke o zaštićenoj poruci i koordinira proces dešifrovanja.
 */
contract ThresholdRegistry {
    
    struct MessageMeta {
        string messageId;
        address owner;
        bytes32 messageHash;
        uint256 thresholdM;
        address[] guardians;
        bool isThresholdReached;
        uint256 approvalCount;
    }

    // messageId => MessageMeta
    mapping(string => MessageMeta) public messages;
    
    // messageId => guardian_address => bool (da li je čuvar dao svoj doprinos)
    mapping(string => mapping(address => bool)) public hasSubmittedShare;

    // Događaji iz specifikacije zadatka
    event MessageRegistered(
        string indexed messageId, 
        address indexed owner, 
        uint256 thresholdM, 
        uint256 totalGuardians
    );
    event GuardianApproved(
        string indexed messageId, 
        address indexed guardian, 
        uint256 currentApprovals
    );
    event ThresholdReached(
        string indexed messageId, 
        uint256 totalApprovals
    );

    modifier onlyGuardian(string memory _messageId) {
        bool isG = false;
        address[] memory gList = messages[_messageId].guardians;
        for (uint256 i = 0; i < gList.length; i++) {
            if (gList[i] == msg.sender) {
                isG = true;
                break;
            }
        }
        require(isG, "Nisi ovlasceni cuvar za ovu poruku!");
        _;
    }

    /**
     * @dev Registracija metapodataka o novoj poruci (NE čuva se sadržaj, već samo hash).
     */
    function registerMessage(
        string memory _messageId,
        bytes32 _messageHash,
        uint256 _thresholdM,
        address[] memory _guardians
    ) external {
        require(bytes(_messageId).length > 0, "ID poruke ne sme biti prazan");
        require(messages[_messageId].owner == address(0), "Poruka sa ovim ID-em vec postoji");
        require(_guardians.length > 0, "Lista cuvara ne sme biti prazna");
        require(_thresholdM > 0 && _thresholdM <= _guardians.length, "Nevalidan prag M");

        MessageMeta storage msgMeta = messages[_messageId];
        msgMeta.messageId = _messageId;
        msgMeta.owner = msg.sender;
        msgMeta.messageHash = _messageHash;
        msgMeta.thresholdM = _thresholdM;
        msgMeta.guardians = _guardians;
        msgMeta.isThresholdReached = false;
        msgMeta.approvalCount = 0;

        emit MessageRegistered(_messageId, msg.sender, _thresholdM, _guardians.length);
    }

    /**
     * @dev Čuvar potvrđuje svoje učešće u dešifrovanju.
     */
    function submitGuardianApproval(string memory _messageId) external onlyGuardian(_messageId) {
        MessageMeta storage msgMeta = messages[_messageId];
        require(!hasSubmittedShare[_messageId][msg.sender], "Vec si potvrdio ucesce");

        hasSubmittedShare[_messageId][msg.sender] = true;
        msgMeta.approvalCount++;

        emit GuardianApproved(_messageId, msg.sender, msgMeta.approvalCount);

        if (msgMeta.approvalCount >= msgMeta.thresholdM && !msgMeta.isThresholdReached) {
            msgMeta.isThresholdReached = true;
            emit ThresholdReached(_messageId, msgMeta.approvalCount);
        }
    }

    /**
     * @dev Pomoćne funkcije za čitanje sa front-enda
     */
    function getGuardians(string memory _messageId) external view returns (address[] memory) {
        return messages[_messageId].guardians;
    }

    function isThresholdMet(string memory _messageId) external view returns (bool) {
        return messages[_messageId].isThresholdReached;
    }
}