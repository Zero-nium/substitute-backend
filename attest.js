// attest.js — One-time script to create an EAS attestation on Base mainnet.
// Run once from your local machine:
//   node attest.js
//
// Requires DEPOSIT_WALLET_KEY and BASE_RPC_URL in your environment.
// Copy the attestation UID from the output and set it as a Fly secret:
//   fly secrets set EAS_ATTESTATION_UID=0x...

import { createWalletClient, createPublicClient, http, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { readFileSync } from 'fs';

// ── Load env from .env file if present ───────────────────────────────────────
try {
  const env = readFileSync('.env', 'utf8');
  for (const line of env.split('\n')) {
    const [k, ...v] = line.split('=');
    if (k && v.length && !process.env[k]) {
      process.env[k] = v.join('=').trim();
    }
  }
} catch {}

const PRIVATE_KEY        = process.env.DEPOSIT_WALLET_KEY;
const RPC_URL            = process.env.BASE_RPC_URL;
const DEPOSIT_ADDRESS    = process.env.DEPOSIT_WALLET_ADDRESS;
const BASE_URL           = process.env.API_BASE_URL || 'https://zero-wispy-shadow-3951.fly.dev';
const DEPOSIT_AMOUNT_ETH = process.env.DEPOSIT_AMOUNT_ETH || '0.002';

if (!PRIVATE_KEY || !RPC_URL || !DEPOSIT_ADDRESS) {
  console.error('Missing required env vars: DEPOSIT_WALLET_KEY, BASE_RPC_URL, DEPOSIT_WALLET_ADDRESS');
  process.exit(1);
}

// ── EAS contract on Base mainnet ──────────────────────────────────────────────
const EAS_CONTRACT        = '0x4200000000000000000000000000000000000021';
const SCHEMA_REGISTRY     = '0x4200000000000000000000000000000000000020';

// We'll register a new schema and attest in one flow.
// Schema: agent service discovery record.
const SCHEMA_STRING = 'string serviceName,string description,string manifestUrl,string depositAddress,string depositAmountEth,uint256 chainId,string serviceType,string resultsUrl';

// ── ABI fragments ─────────────────────────────────────────────────────────────
const schemaRegistryAbi = [
  {
    name: 'register',
    type: 'function',
    inputs: [
      { name: 'schema', type: 'string' },
      { name: 'resolver', type: 'address' },
      { name: 'revocable', type: 'bool' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'getSchema',
    type: 'function',
    inputs: [{ name: 'uid', type: 'bytes32' }],
    outputs: [{
      name: '',
      type: 'tuple',
      components: [
        { name: 'uid', type: 'bytes32' },
        { name: 'resolver', type: 'address' },
        { name: 'revocable', type: 'bool' },
        { name: 'schema', type: 'string' },
      ]
    }],
  },
];

const easAbi = [
  {
    name: 'attest',
    type: 'function',
    inputs: [{
      name: 'request',
      type: 'tuple',
      components: [
        { name: 'schema', type: 'bytes32' },
        {
          name: 'data',
          type: 'tuple',
          components: [
            { name: 'recipient', type: 'address' },
            { name: 'expirationTime', type: 'uint64' },
            { name: 'revocable', type: 'bool' },
            { name: 'refUID', type: 'bytes32' },
            { name: 'data', type: 'bytes' },
            { name: 'value', type: 'uint256' },
          ],
        },
      ],
    }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
];

// ── ABI encoder for the schema data ──────────────────────────────────────────
// Encode the attestation data fields matching SCHEMA_STRING
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes } from 'viem';

function encodeAttestationData() {
  return encodeAbiParameters(
    parseAbiParameters('string,string,string,string,string,uint256,string,string'),
    [
      'Project Substitute — Arena',
      'A counterfactual history simulation. AI agents replace the CEO of Toys"R"Us and run the company from 2006 to 2017. Entry requires 0.002 ETH on Base mainnet.',
      `${BASE_URL}/.well-known/agent.json`,
      DEPOSIT_ADDRESS,
      DEPOSIT_AMOUNT_ETH,
      BigInt(8453),
      'agent-simulation',
      `${BASE_URL}/v1/results`,
    ]
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const account = privateKeyToAccount(PRIVATE_KEY);
  console.log(`\nAttesting from wallet: ${account.address}`);
  console.log(`Service URL: ${BASE_URL}`);
  console.log(`Manifest: ${BASE_URL}/.well-known/agent.json\n`);

  const publicClient = createPublicClient({ chain: base, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain: base, transport: http(RPC_URL) });

  // ── Step 1: Register schema (or reuse existing) ───────────────────────────
  // Compute the schema UID deterministically — same schema string always
  // produces the same UID on EAS, so we can check if it already exists.
  const schemaUID = keccak256(
    toBytes(`${SCHEMA_STRING}0x0000000000000000000000000000000000000000true`)
  );

  console.log(`Schema UID (deterministic): ${schemaUID}`);

  let schemaExists = false;
  try {
    const existing = await publicClient.readContract({
      address: SCHEMA_REGISTRY,
      abi: schemaRegistryAbi,
      functionName: 'getSchema',
      args: [schemaUID],
    });
    schemaExists = existing.schema === SCHEMA_STRING;
    if (schemaExists) console.log('Schema already registered — skipping registration.');
  } catch {
    schemaExists = false;
  }

  let finalSchemaUID = schemaUID;

  if (!schemaExists) {
    console.log('Registering schema...');
    const registerHash = await walletClient.writeContract({
      address: SCHEMA_REGISTRY,
      abi: schemaRegistryAbi,
      functionName: 'register',
      args: [
        SCHEMA_STRING,
        '0x0000000000000000000000000000000000000000',
        true,
      ],
    });
    console.log(`Schema registration tx: ${registerHash}`);
    const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerHash });
    console.log(`Schema registered in block ${registerReceipt.blockNumber}`);
    // Read actual UID from the Registered event log (topic[1])
    const registeredLog = registerReceipt.logs.find(l =>
      l.address.toLowerCase() === SCHEMA_REGISTRY.toLowerCase()
    );
    if (registeredLog && registeredLog.topics[1]) {
      finalSchemaUID = registeredLog.topics[1];
      console.log(`Actual schema UID from receipt: ${finalSchemaUID}`);
    }
  } else {
    // Schema exists — read its actual UID from the contract
    try {
      const existing = await publicClient.readContract({
        address: SCHEMA_REGISTRY,
        abi: schemaRegistryAbi,
        functionName: 'getSchema',
        args: [schemaUID],
      });
      finalSchemaUID = existing.uid;
      console.log(`Existing schema UID: ${finalSchemaUID}`);
    } catch {}
  }

  // ── Step 2: Create attestation ────────────────────────────────────────────
  console.log('\nCreating attestation...');
  const attestData = encodeAttestationData();

  const attestHash = await walletClient.writeContract({
    address: EAS_CONTRACT,
    abi: easAbi,
    functionName: 'attest',
    args: [{
      schema: finalSchemaUID,
      data: {
        recipient:      '0x0000000000000000000000000000000000000000',
        expirationTime: BigInt(0), // no expiry
        revocable:      true,
        refUID:         '0x0000000000000000000000000000000000000000000000000000000000000000',
        data:           attestData,
        value:          BigInt(0),
      },
    }],
  });

  console.log(`Attestation tx: ${attestHash}`);
  const attestReceipt = await publicClient.waitForTransactionReceipt({ hash: attestHash });
  console.log(`Confirmed in block ${attestReceipt.blockNumber}`);

  // Extract attestation UID from logs
  // EAS emits Attested(address indexed recipient, address indexed attester, bytes32 uid, bytes32 indexed schemaUID)
  const attestedLog = attestReceipt.logs.find(l =>
    l.address.toLowerCase() === EAS_CONTRACT.toLowerCase()
  );

  let attestationUID = null;
  if (attestedLog && attestedLog.topics[3]) {
    attestationUID = attestedLog.topics[3];
  } else if (attestedLog && attestedLog.data && attestedLog.data.length >= 66) {
    attestationUID = '0x' + attestedLog.data.slice(2, 66);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✓ ATTESTATION CREATED');
  console.log(`  UID:    ${attestationUID}`);
  console.log(`  TX:     ${attestHash}`);
  console.log(`  Block:  ${attestReceipt.blockNumber}`);
  console.log(`  Viewer: https://base.easscan.org/attestation/view/${attestationUID}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nNext step — set the UID as a Fly secret:');
  console.log(`  fly secrets set EAS_ATTESTATION_UID=${attestationUID}`);
  console.log('\nThe /v1/attestation endpoint will serve this UID to agents.\n');
}

main().catch(err => {
  console.error('\nFailed:', err.message);
  process.exit(1);
});
