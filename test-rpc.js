const { ethers } = require('ethers');

const endpoints = [
  'https://polygon-bor-rpc.publicnode.com',
  'https://polygon-rpc.com',
  'https://rpc.ankr.com/polygon',
  'https://polygon.llamarpc.com',
  'https://polygon.blockpi.network/v1/rpc/public',
  'https://1rpc.io/matic',
  'https://polygon.drpc.org'
];

async function testEndpoint(url) {
  console.log(`\nTesting: ${url}`);
  const startTime = Date.now();

  try {
    const provider = new ethers.JsonRpcProvider(url, undefined, {
      staticNetwork: true,
      timeout: 10000
    });

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const responseTime = Date.now() - startTime;

    console.log(`  ✅ SUCCESS`);
    console.log(`  Chain ID: ${network.chainId}`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  Response time: ${responseTime}ms`);

    return { url, success: true, responseTime, chainId: network.chainId.toString() };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.log(`  ❌ FAILED (${responseTime}ms)`);
    console.log(`  Error: ${error.message}`);
    return { url, success: false, error: error.message };
  }
}

async function testAll() {
  console.log('Testing Polygon RPC endpoints...\n');
  console.log('='.repeat(60));

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between tests
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log('='.repeat(60));

  const working = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (working.length > 0) {
    console.log(`\n✅ WORKING ENDPOINTS (${working.length}):`);
    working
      .sort((a, b) => a.responseTime - b.responseTime)
      .forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.url}`);
        console.log(`     Speed: ${r.responseTime}ms, Chain: ${r.chainId}`);
      });

    console.log(`\n📌 RECOMMENDED: Use the fastest one`);
    console.log(`   ${working[0].url}`);
  }

  if (failed.length > 0) {
    console.log(`\n❌ FAILED ENDPOINTS (${failed.length}):`);
    failed.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.url}`);
      console.log(`     Error: ${r.error}`);
    });
  }
}

testAll().catch(console.error);
