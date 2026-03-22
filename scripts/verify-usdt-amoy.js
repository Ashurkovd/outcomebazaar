const hre = require('hardhat');

async function main() {
  console.log('🔍 Searching for USDT on Amoy testnet...\n');
  console.log('=' .repeat(70));

  // Addresses to check
  const addresses = [
    {
      name: 'Option 1 (from spec)',
      addr: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
      source: 'Previously verified in our checks'
    },
    {
      name: 'Option 2',
      addr: '0x52eF3d68BaB452a294342DC3e5f464d7f610f72E',
      source: 'User provided'
    },
    {
      name: 'Current deployment',
      addr: '0xFEe6Bd130A6b7EF9B40666b7504B863343511C9A',
      source: 'First factory deployment'
    }
  ];

  const erc20Abi = [
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address) view returns (uint256)'
  ];

  const results = [];

  for (const { name, addr, source } of addresses) {
    console.log(`\n📍 Checking ${name}`);
    console.log(`   Address: ${addr}`);
    console.log(`   Source: ${source}`);
    console.log(`   Explorer: https://amoy.polygonscan.com/address/${addr}`);

    try {
      // Check if contract exists
      const code = await hre.ethers.provider.getCode(addr);

      if (code === '0x') {
        console.log(`   ❌ Status: NO CONTRACT DEPLOYED`);
        results.push({ name, addr, status: 'NO_CONTRACT', viable: false });
        continue;
      }

      console.log(`   ✅ Contract exists!`);

      // Try to read ERC20 data
      const token = new hre.ethers.Contract(addr, erc20Abi, hre.ethers.provider);

      try {
        const [tokenName, symbol, decimals, supply] = await Promise.all([
          token.name().catch(() => 'N/A'),
          token.symbol().catch(() => 'N/A'),
          token.decimals().catch(() => 0),
          token.totalSupply().catch(() => 0n)
        ]);

        console.log(`   📋 Token Details:`);
        console.log(`      Name: ${tokenName}`);
        console.log(`      Symbol: ${symbol}`);
        console.log(`      Decimals: ${decimals}`);
        console.log(`      Total Supply: ${hre.ethers.formatUnits(supply, decimals)}`);

        // Check if it's viable for our use
        const isViable = decimals === 6 && supply > 0n;

        if (isViable) {
          console.log(`   ✅ VIABLE - 6 decimals, has supply`);
        } else {
          console.log(`   ⚠️  NOT IDEAL - Decimals: ${decimals}, Supply: ${supply > 0n ? 'OK' : 'ZERO'}`);
        }

        results.push({
          name,
          addr,
          status: 'ERC20',
          tokenName,
          symbol,
          decimals,
          supply: supply.toString(),
          viable: isViable
        });

      } catch (e) {
        console.log(`   ⚠️  Contract exists but not a standard ERC20: ${e.message}`);
        results.push({ name, addr, status: 'NOT_ERC20', viable: false });
      }

    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
      results.push({ name, addr, status: 'ERROR', error: e.message, viable: false });
    }
  }

  // Summary and recommendations
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY & RECOMMENDATIONS');
  console.log('='.repeat(70));

  const viableTokens = results.filter(r => r.viable);

  if (viableTokens.length > 0) {
    console.log('\n✅ VIABLE USDT/USDC TOKENS FOUND:\n');
    viableTokens.forEach(token => {
      console.log(`   ${token.symbol} - ${token.tokenName}`);
      console.log(`   Address: ${token.addr}`);
      console.log(`   Decimals: ${token.decimals}`);
      console.log(`   Supply: ${hre.ethers.formatUnits(token.supply, token.decimals)}`);
      console.log(`   Explorer: https://amoy.polygonscan.com/address/${token.addr}\n`);
    });

    console.log('💡 RECOMMENDATION: Use this token address!');
    console.log(`   Best choice: ${viableTokens[0].addr}`);
    console.log(`   Symbol: ${viableTokens[0].symbol}`);
  } else {
    console.log('\n❌ NO VIABLE USDT TOKENS FOUND ON AMOY\n');
    console.log('💡 RECOMMENDED SOLUTION: Deploy Mock USDT');
    console.log('\n🎯 BENEFITS OF DEPLOYING MOCK USDT:');
    console.log('   ✅ Full control over supply');
    console.log('   ✅ Can mint test USDT to any user');
    console.log('   ✅ No dependency on external contracts');
    console.log('   ✅ Standard practice for testnets');
    console.log('   ✅ Can include faucet functionality');
    console.log('\n📝 TO DEPLOY MOCK USDT:');
    console.log('   1. Create contracts/MockUSDT.sol');
    console.log('   2. Deploy with: npx hardhat run scripts/deploy-mock-usdt.js --network amoy');
    console.log('   3. Update deployment.json with new token address');
    console.log('   4. Redeploy MarketFactory with mock USDT');
  }

  console.log('\n' + '='.repeat(70));

  // Save results to file
  const fs = require('fs');
  fs.writeFileSync(
    './amoy-usdt-verification.json',
    JSON.stringify({ timestamp: new Date().toISOString(), results }, null, 2)
  );
  console.log('\n💾 Results saved to: amoy-usdt-verification.json');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
