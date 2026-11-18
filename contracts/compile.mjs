// Compile contracts/AGBadge.sol with solc-js. Resolves @openzeppelin imports
// from node_modules. Writes out/AGBadge.json (abi, bytecode, deployed size).
import solc from 'solc';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(dir, 'AGBadge.sol'), 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'AGBadge.sol': { content: source } },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: { '*': { '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode'] } },
  },
};

function findImports(importPath) {
  try {
    const full = path.join(dir, 'node_modules', importPath);
    return { contents: fs.readFileSync(full, 'utf8') };
  } catch {
    return { error: `import not found: ${importPath}` };
  }
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

const errors = (output.errors || []).filter((e) => e.severity === 'error');
const warnings = (output.errors || []).filter((e) => e.severity === 'warning');
for (const w of warnings) console.log(`warning: ${w.formattedMessage.trim()}`);
if (errors.length > 0) {
  for (const e of errors) console.log(`ERROR: ${e.formattedMessage.trim()}`);
  process.exit(1);
}

const contract = output.contracts['AGBadge.sol']['AGBadge'];
const bytecode = contract.evm.bytecode.object;
const deployed = contract.evm.deployedBytecode.object;
const deployedBytes = deployed.length / 2;

fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
fs.writeFileSync(
  path.join(dir, 'out', 'AGBadge.json'),
  JSON.stringify(
    { abi: contract.abi, bytecode: `0x${bytecode}`, deployedBytecode: `0x${deployed}` },
    null,
    2,
  ),
);

console.log(`compiled OK: AGBadge`);
console.log(`  bytecode: ${bytecode.length / 2} bytes`);
console.log(`  deployed: ${deployedBytes} bytes (EIP-170 limit 24576)`);
console.log(`  abi entries: ${contract.abi.length}`);
if (deployedBytes >= 24576) {
  console.log('ERROR: deployed bytecode exceeds the 24,576-byte limit');
  process.exit(1);
}
