const hre = require('hardhat');

async function main() {
  const MARKET = '0x067446b3503B2af17F93E60467555e71BB33296C';

  const market = await hre.ethers.getContractAt('PredictionMarket', MARKET);
  const info = await market.getMarketInfo();

  console.log('Market:', MARKET);
  console.log('Question:', info._question);
  console.log('State:', Number(info._state), '(0=Active, 1=Resolved, 2=Cancelled)');
  console.log('Outcome:', info._outcome, '(true=YES, false=NO)');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
