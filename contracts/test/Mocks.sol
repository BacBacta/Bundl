// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Test-only mocks. Not deployed by scripts/deploy.ts.

/// @dev USDT-style token whose transfer/transferFrom return NO bool — proves
///      SafeERC20 handles non-standard ERC20s.
contract NoReturnToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 a) external { balanceOf[to] += a; }

    function approve(address s, uint256 a) external returns (bool) {
        allowance[msg.sender][s] = a;
        return true;
    }

    // no return value (like USDT)
    function transferFrom(address f, address t, uint256 a) external {
        require(balanceOf[f] >= a, "balance");
        uint256 al = allowance[f][msg.sender];
        require(al >= a, "allowance");
        allowance[f][msg.sender] = al - a;
        balanceOf[f] -= a;
        balanceOf[t] += a;
    }
}

/// @dev Reverts on the `failAt`-th transferFrom — used to prove atomicity
///      (earlier transfers roll back when a later one fails).
contract RevertingToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public failAt;
    uint256 public count;

    constructor(uint256 _failAt) { failAt = _failAt; }

    function mint(address to, uint256 a) external { balanceOf[to] += a; }

    function approve(address s, uint256 a) external returns (bool) {
        allowance[msg.sender][s] = a;
        return true;
    }

    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        count += 1;
        require(count != failAt, "forced failure");
        require(balanceOf[f] >= a, "balance");
        uint256 al = allowance[f][msg.sender];
        require(al >= a, "allowance");
        allowance[f][msg.sender] = al - a;
        balanceOf[f] -= a;
        balanceOf[t] += a;
        return true;
    }
}

interface IDisperse {
    function disperseToken(address token, address[] calldata r, uint256[] calldata a) external;
}

/// @dev On transferFrom, re-enters disperseToken once — proves ReentrancyGuard
///      blocks reentrancy (the nested call reverts and bubbles up).
contract ReentrantToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    address public disperse;
    bool private entered;

    function mint(address to, uint256 a) external { balanceOf[to] += a; }
    function setDisperse(address d) external { disperse = d; }

    function approve(address s, uint256 a) external returns (bool) {
        allowance[msg.sender][s] = a;
        return true;
    }

    function transferFrom(address f, address t, uint256 a) external returns (bool) {
        if (!entered) {
            entered = true;
            address[] memory r = new address[](1);
            uint256[] memory am = new uint256[](1);
            r[0] = t;
            am[0] = a;
            // Must revert via ReentrancyGuard before doing anything.
            IDisperse(disperse).disperseToken(address(this), r, am);
        }
        balanceOf[f] -= a;
        balanceOf[t] += a;
        return true;
    }
}
