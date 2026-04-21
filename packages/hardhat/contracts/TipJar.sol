// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract TipJar {
    address public owner;

    struct Tip {
        address sender;
        uint256 amount;
        string message;
        uint256 timestamp;
    }

    Tip[] public tips;

    event TipReceived(address indexed tipper, uint256 amount, string message, uint256 timestamp);
    event TipWithdrawn(address indexed owner, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can call this function.");
        _;
    }

    function tip(string memory _message) public payable {
        require(msg.value > 0, "You must send some ETH to tip.");

        tips.push(Tip({
            sender: msg.sender,
            amount: msg.value,
            message: _message,
            timestamp: block.timestamp
        }));

        emit TipReceived(msg.sender, msg.value, _message, block.timestamp);
    }

    function getAllTips() public view returns (Tip[] memory) {
        return tips;
    }

    function withdrawTips() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No tips to withdraw.");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdrawal failed.");
        
        emit TipWithdrawn(owner, balance);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    receive() external payable {
        tip("Anonymous Tip");
    }
}