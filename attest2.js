// attest2.js — Standalone attestation script with known schema UID.
// Fill in your credentials in the three variables below, then run:
//   node --input-type=module < attest2.js

import { createWalletClient, createPublicClient, http, encodeAbiParameters, parseAbiParameters } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// ── Fill these in ─────────────────────────────────────────────────────────────
const PRIVATE_KEY     = '0xea359df546d15468350c7f2c7c061c11ac120be8f1832e2702816acfcf9b340e';
const WALLET_ADDRESS  = '0x8986C4b9651f4AD418D1837F84100919D7e34C7E';
const RPC_URL         = 'https://base-mainnet.g.alchemy.com/v2/ejOrEjGGh46G6OmdoyPiU';
const BASE_URL        = 'https://zero-wispy-shadow-3951.fly.dev';
const DEPOSIT_AMOUNT  = '0.002';
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_UID = '0xb4619cdc92849e348b49e816dc3612620aee74ce51fbab8cead9275d01955db3';
const EAS        = '0x4200000000000000000000000000000000000021';

const account      = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) });

console.log('Attesting from:', account.address);

const data = encodeAbiParameters(
  parseAbiParameters('string,string,string,string,string,uint256,string,string'),
  [
    'Project Substitute — Arena',
    'A counterfactual history simulation. AI agents replace the CEO of Toys R Us and run the company from 2006 to 2017. Entry requires 0.002 ETH on Base mainnet.',
    `${BASE_URL}/.well-known/agent.json`,
    WALLET_ADDRESS,
    DEPOSIT_AMOUNT,
    BigInt(8453),
    'agent-simulation',
    `${BASE_URL}/v1/results`,
  ]
);

const hash = await walletClient.writeContract({
  address: EAS,
  abi: [{
    name: 'attest',
    type: 'function',
    inputs: [{ name: 'request', type: 'tuple', components: [
      { name: 'schema', type: 'bytes32' },
      { name: 'data',   type: 'tuple',   components: [
        { name: 'recipient',      type: 'address' },
        { name: 'expirationTime', type: 'uint64'  },
        { name: 'revocable',      type: 'bool'    },
        { name: 'refUID',         type: 'bytes32' },
        { name: 'data',           type: 'bytes'   },
        { name: 'value',          type: 'uint256' },
      ]},
    ]}],
    outputs: [{ name: '', type: 'bytes32' }],
  }],
  functionName: 'attest',
  args: [{
    schema: SCHEMA_UID,
    data: {
      recipient:      '0x0000000000000000000000000000000000000000',
      expirationTime: BigInt(0),
      revocable:      true,
      refUID:         '0x0000000000000000000000000000000000000000000000000000000000000000',
      data,
      value:          BigInt(0),
    },
  }],
});

console.log('Attestation tx:', hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
const log = receipt.logs.find(l => l.address.toLowerCase() === EAS.toLowerCase());
const uid = log?.topics?.[3] ?? ('0x' + receipt.logs[0]?.data?.slice(2, 66));

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✓ Attestation UID:', uid);
console.log('  Viewer: https://base.easscan.org/attestation/view/' + uid);
console.log('\nNext step:');
console.log('  fly secrets set EAS_ATTESTATION_UID=' + uid);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
