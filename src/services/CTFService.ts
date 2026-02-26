import { ethers } from 'ethers';
import CTF_ABI from '../contracts/GnosisCTF.abi.json';
import { ADDRESSES, ZERO_BYTES32, BINARY_PARTITION } from '../contracts/addresses';

/**
 * CTFService - Gnosis Conditional Token Framework integration
 *
 * Handles all on-chain interactions for market creation and resolution.
 * The CTF contract is already deployed on Polygon at a well-known address.
 *
 * Flow:
 * 1. prepareCondition() → creates a market condition (defines YES/NO outcomes)
 * 2. splitPosition()    → users convert USDT → YES/NO tokens to trade
 * 3. mergePositions()   → users convert tokens back to USDT (cancel out)
 * 4. reportPayouts()    → oracle resolves the market
 * 5. redeemPositions()  → winners claim their USDT
 */
export class CTFService {
  private contract: ethers.Contract;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private ctfAddress: string;
  private usdtAddress: string;
  private connectionTested = false;

  constructor(
    providerUrl: string,
    privateKey: string,
    network: 'polygon' | 'amoy' = 'polygon'
  ) {
    console.log('🔧 Initializing CTFService...');
    console.log(`📡 Primary RPC: ${providerUrl}`);

    // Fallback RPC URLs (in order of preference based on tests)
    const fallbackUrls = [
      'https://polygon.drpc.org',
      'https://1rpc.io/matic'
    ];

    try {
      // Create provider with static network (no auto-detection)
      this.provider = new ethers.JsonRpcProvider(providerUrl, 137, {
        staticNetwork: true,  // Don't auto-detect network
        batchMaxCount: 1,
        polling: false
      });

      this.signer = new ethers.Wallet(privateKey, this.provider);
      this.ctfAddress = ADDRESSES[network].CTF;
      this.usdtAddress = ADDRESSES[network].USDT;

      this.contract = new ethers.Contract(
        this.ctfAddress,
        CTF_ABI,
        this.signer
      );

      console.log('✅ CTFService initialized (lazy connection)');

      // Test connection in background (don't block startup)
      this.testConnectionWithFallback(providerUrl, fallbackUrls, privateKey, network);

    } catch (error) {
      console.error('❌ CTFService initialization error:', error);
      throw error;
    }
  }

  /**
   * Test blockchain connection in background.
   * If primary RPC fails, automatically switch to fallback.
   */
  private async testConnectionWithFallback(
    primaryUrl: string,
    fallbackUrls: string[],
    privateKey: string,
    network: 'polygon' | 'amoy'
  ): Promise<void> {
    try {
      console.log('🔍 Testing blockchain connection...');

      // Test primary RPC with timeout
      const networkTest = await Promise.race([
        this.provider.getNetwork(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
        )
      ]);

      console.log(`✅ Connected to chain ID: ${networkTest.chainId}`);
      this.connectionTested = true;

    } catch (primaryError) {
      console.error(`⚠️  Primary RPC failed: ${(primaryError as Error).message}`);
      console.log('🔄 Trying fallback RPCs...');

      // Try fallback RPCs
      for (const fallbackUrl of fallbackUrls) {
        try {
          console.log(`   Testing: ${fallbackUrl}`);

          const testProvider = new ethers.JsonRpcProvider(fallbackUrl, 137, {
            staticNetwork: true
          });

          // Quick test
          await Promise.race([
            testProvider.getBlockNumber(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('Timeout')), 5000)
            )
          ]);

          // Fallback works! Switch to it
          console.log(`   ✅ Fallback working: ${fallbackUrl}`);
          console.log(`🔄 Switching to fallback RPC...`);

          this.provider = testProvider;
          this.signer = new ethers.Wallet(privateKey, this.provider);
          this.contract = new ethers.Contract(
            this.ctfAddress,
            CTF_ABI,
            this.signer
          );

          console.log('✅ Successfully switched to fallback RPC');
          this.connectionTested = true;
          return;

        } catch (fallbackError) {
          console.log(`   ❌ Failed: ${(fallbackError as Error).message}`);
          continue;
        }
      }

      // All RPCs failed
      console.error('❌ All RPC endpoints failed (primary + fallbacks)');
      console.error('   Blockchain features will not work until RPC is available');
      console.error('   App will continue but market creation will fail');
    }
  }

  /**
   * Calculate the conditionId for a market.
   * conditionId = keccak256(abi.encodePacked(oracle, questionId, outcomeSlotCount))
   */
  getConditionId(oracle: string, questionId: string, outcomeSlotCount = 2): string {
    return ethers.solidityPackedKeccak256(
      ['address', 'bytes32', 'uint256'],
      [oracle, questionId, outcomeSlotCount]
    );
  }

  /**
   * Create a new market condition on-chain.
   * This must be called before users can trade.
   *
   * @param questionId - Unique identifier for the question (bytes32)
   * @param outcomeSlotCount - Number of outcomes (2 for binary YES/NO markets)
   * @returns conditionId - The unique ID for this market
   */
  async createMarketCondition(
    questionId: string,
    outcomeSlotCount = 2
  ): Promise<string> {
    const oracleAddress = await this.signer.getAddress();

    console.log(`Creating market condition...`);
    console.log(`  Oracle: ${oracleAddress}`);
    console.log(`  QuestionId: ${questionId}`);
    console.log(`  Outcomes: ${outcomeSlotCount}`);

    const tx = await this.contract.prepareCondition(
      oracleAddress,
      questionId,
      outcomeSlotCount
    );

    const receipt = await tx.wait();
    console.log(`  ✅ Condition created in tx: ${receipt.hash}`);

    // Compute the conditionId
    const conditionId = this.getConditionId(oracleAddress, questionId, outcomeSlotCount);
    console.log(`  ConditionId: ${conditionId}`);

    return conditionId;
  }

  /**
   * Get the ERC1155 position IDs for YES and NO tokens.
   * These are the token IDs that users hold when trading.
   */
  async getPositionIds(conditionId: string): Promise<{ yesPositionId: bigint; noPositionId: bigint }> {
    // YES position: indexSet = 0b01 = 1
    const yesCollectionId = await this.contract.getCollectionId(
      ZERO_BYTES32,
      conditionId,
      1 // YES index set
    );

    // NO position: indexSet = 0b10 = 2
    const noCollectionId = await this.contract.getCollectionId(
      ZERO_BYTES32,
      conditionId,
      2 // NO index set
    );

    const yesPositionId = await this.contract.getPositionId(this.usdtAddress, yesCollectionId);
    const noPositionId = await this.contract.getPositionId(this.usdtAddress, noCollectionId);

    return { yesPositionId, noPositionId };
  }

  /**
   * Resolve the market. Oracle reports YES wins or NO wins.
   *
   * @param questionId - The original question ID used to create the condition
   * @param yesWins - true if YES wins, false if NO wins
   */
  async resolveMarket(questionId: string, yesWins: boolean): Promise<string> {
    // payouts[0] = YES payout, payouts[1] = NO payout
    const payouts = yesWins ? [1, 0] : [0, 1];

    console.log(`Resolving market...`);
    console.log(`  QuestionId: ${questionId}`);
    console.log(`  Outcome: ${yesWins ? 'YES wins' : 'NO wins'}`);

    const tx = await this.contract.reportPayouts(questionId, payouts);
    const receipt = await tx.wait();

    console.log(`  ✅ Market resolved in tx: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Get the balance of YES or NO tokens for a user.
   */
  async getTokenBalance(
    userAddress: string,
    conditionId: string,
    outcomeIndex: 0 | 1
  ): Promise<bigint> {
    const { yesPositionId, noPositionId } = await this.getPositionIds(conditionId);
    const positionId = outcomeIndex === 0 ? yesPositionId : noPositionId;

    return await this.contract.balanceOf(userAddress, positionId);
  }

  /**
   * Check if a market condition has been prepared (exists on-chain).
   */
  async isConditionPrepared(conditionId: string): Promise<boolean> {
    try {
      const slotCount = await this.contract.getOutcomeSlotCount(conditionId);
      return slotCount > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if a market has been resolved.
   */
  async isMarketResolved(conditionId: string): Promise<boolean> {
    try {
      const denominator = await this.contract.payoutDenominator(conditionId);
      return denominator > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique questionId from market question text + timestamp.
   * Returns a bytes32 hex string.
   */
  static generateQuestionId(question: string, timestamp = Date.now()): string {
    return ethers.id(`${question}:${timestamp}`);
  }

  getSignerAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  getContractAddress(): string {
    return this.ctfAddress;
  }
}
