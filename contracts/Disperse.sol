// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title Disperse — non-custodial atomic multisend
/// @notice Transfers token from msg.sender to N recipients in one tx.
///         Uses low-level call to handle USDT (no bool return on transferFrom).
///         Reverts the entire tx if any transfer fails (atomicity).
///         Never holds funds: funds go payer → recipient directly.
///
/// Production hardening (out of MVP scope):
///   - OpenZeppelin SafeERC20
///   - ReentrancyGuard
///   - Pausable (owner)
///   - Max-N cap to bound gas
///   - Audit before mainnet
contract Disperse {
    function disperseToken(
        IERC20 token,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        require(recipients.length == amounts.length, "length mismatch");
        for (uint256 i = 0; i < recipients.length; ) {
            (bool ok, bytes memory data) = address(token).call(
                abi.encodeWithSelector(
                    IERC20.transferFrom.selector,
                    msg.sender,
                    recipients[i],
                    amounts[i]
                )
            );
            // Accept both bool-returning and void-returning ERC20s (e.g. USDT)
            require(
                ok && (data.length == 0 || abi.decode(data, (bool))),
                "transfer failed"
            );
            unchecked { ++i; }
        }
    }
}
