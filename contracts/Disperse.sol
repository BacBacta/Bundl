// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title Disperse — non-custodial atomic multisend (hardened)
/// @notice Transfers a stablecoin from msg.sender to N recipients in one tx.
///         - SafeERC20 handles non-standard ERC20s (e.g. USDT returns no bool).
///         - Atomic: reverts the whole tx if any transfer fails.
///         - Never holds funds: tokens go payer → recipient directly.
///         - ReentrancyGuard, owner Pausable kill-switch, and a max-recipients
///           cap to bound gas.
/// @dev Emits BundleSettled so off-chain analytics can index volume + revenue.
contract Disperse is Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @notice Upper bound on recipients per call to keep gas predictable.
    uint256 public constant MAX_RECIPIENTS = 150;

    /// @notice Emitted once per successful settlement.
    event BundleSettled(
        address indexed payer,
        address indexed token,
        uint256 recipientCount,
        uint256 totalAmount
    );

    constructor() Ownable(msg.sender) {}

    /// @notice Send `amounts[i]` of `token` from the caller to each `recipients[i]`.
    /// @dev Requires the caller to have approved this contract for the total.
    function disperseToken(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external whenNotPaused nonReentrant {
        uint256 n = recipients.length;
        require(n == amounts.length, "length mismatch");
        require(n > 0, "no recipients");
        require(n <= MAX_RECIPIENTS, "too many recipients");

        uint256 total;
        for (uint256 i = 0; i < n; ) {
            address to = recipients[i];
            uint256 amount = amounts[i];
            require(to != address(0), "zero address");
            require(amount > 0, "zero amount");

            token.safeTransferFrom(msg.sender, to, amount);
            total += amount;

            unchecked {
                ++i;
            }
        }

        emit BundleSettled(msg.sender, address(token), n, total);
    }

    /// @notice Owner kill-switch — pause new settlements.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Owner — resume settlements.
    function unpause() external onlyOwner {
        _unpause();
    }
}
