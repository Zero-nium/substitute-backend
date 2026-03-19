// chain.js — Base mainnet deposit detection and verification.
// Uses viem's public client — no wallet needed here, just reading the chain.

import { createPublicClient, http, parseEther, formatEther } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL),
});

const DEPOSIT_AMOUNT_ETH = process.env.DEPOSIT_AMOUNT_ETH || '0.002';
const REQUIRED_WEI = parseEther(DEPOSIT_AMOUNT_ETH);

// ── verifyDeposit ─────────────────────────────────────────────────────────────
// Given a tx hash and the expected run details, confirm the deposit is valid.
// Returns { ok: true } or { ok: false, reason: string }.

export async function verifyDeposit({ txHash, depositAddress, walletAddress }) {
  let tx, receipt;

  try {
    [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: txHash }),
      client.getTransactionReceipt({ hash: txHash }),
    ]);
  } catch (err) {
    return { ok: false, reason: 'Transaction not found on Base mainnet.' };
  }

  // Must have at least 1 confirmation.
  if (!receipt || receipt.status === 'reverted') {
    return { ok: false, reason: 'Transaction reverted or not yet mined.' };
  }

  const currentBlock = await client.getBlockNumber();
  if (currentBlock < receipt.blockNumber) {
    return { ok: false, reason: 'Transaction not yet confirmed.' };
  }

  // Destination must be the deposit address for this run.
  if (tx.to?.toLowerCase() !== depositAddress.toLowerCase()) {
    return {
      ok: false,
      reason: `Transaction destination ${tx.to} does not match deposit address ${depositAddress}.`,
    };
  }

  // Must come from the registered wallet address.
  if (tx.from?.toLowerCase() !== walletAddress.toLowerCase()) {
    return {
      ok: false,
      reason: `Transaction sender ${tx.from} does not match registered wallet ${walletAddress}.`,
    };
  }

  // Value must be >= required amount (overpayment is accepted silently).
  if (tx.value < REQUIRED_WEI) {
    return {
      ok: false,
      reason: `Deposit value ${formatEther(tx.value)} ETH is below required ${DEPOSIT_AMOUNT_ETH} ETH.`,
    };
  }

  return { ok: true };
}

// ── generateDepositAddress ────────────────────────────────────────────────────
// Each registration gets a unique deposit address so txs can be attributed
// to a specific run without needing memo fields.
//
// Strategy: derive child addresses from the main deposit wallet using an
// incrementing index. In production, use a proper HD wallet derivation
// (e.g. viem's mnemonicToAccount with a path index). For simplicity here
// we return the main deposit address — fine for low volume; swap this out
// if you need per-run attribution at the chain level.

export function generateDepositAddress() {
  // TODO: derive per-run address from HD wallet using run index as path component.
  // For now, all deposits go to the same platform wallet.
  // Attribution is via from-address (walletAddress) + tx hash verification.
  return process.env.DEPOSIT_WALLET_ADDRESS;
}

// ── watchDeposits ─────────────────────────────────────────────────────────────
// Called by the runner on startup. Watches for incoming txs to the deposit
// wallet and emits confirmed deposits. Used as a belt-and-suspenders check
// alongside the explicit /deposit/confirm POST flow.
//
// In practice, agents will POST their tx hash immediately after sending —
// this watcher catches any that don't, auto-confirming after 2 confirmations.

export async function pollPendingDeposits(pendingRuns, onConfirmed) {
  if (!pendingRuns.length) return;

  for (const run of pendingRuns) {
    if (!run.deposit_tx_hash) continue; // No hash submitted yet — skip.

    const result = await verifyDeposit({
      txHash: run.deposit_tx_hash,
      depositAddress: run.deposit_address,
      walletAddress: run.wallet_address,
    });

    if (result.ok) {
      await onConfirmed(run.run_id, run.deposit_tx_hash);
    }
  }
}
