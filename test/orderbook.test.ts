/**
 * Order Book Test Suite
 *
 * Tests the matching engine WITHOUT needing a database or blockchain.
 * Run: npm test
 */

import { OrderBook } from '../src/matching/OrderBook';
import { OrderBookManager } from '../src/matching/OrderBookManager';
import { Order } from '../src/types';

// ─── Helpers ──────────────────────────────────────────────────────────────

let idCounter = 0;

function makeOrder(overrides: Partial<Order> = {}): Order {
  idCounter++;
  return {
    id: `order-${idCounter}`,
    maker: `0x${String(idCounter).padStart(40, '0')}`,
    market: 'market-1',
    conditionId: 'market-1',
    side: 'BUY',
    outcomeIndex: 0,
    price: 50,
    size: 100,
    filled: 0,
    status: 'OPEN',
    timestamp: Date.now() + idCounter,
    expiresAt: Date.now() + 86400000,
    ...overrides,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ✅ ${message}`);
}

// ─── Tests ────────────────────────────────────────────────────────────────

async function runTests(): Promise<void> {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void): void {
    console.log(`\n▶ ${name}`);
    try {
      fn();
      passed++;
    } catch (err) {
      console.error(`  ❌ ${(err as Error).message}`);
      failed++;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 1: Empty order book
  // ─────────────────────────────────────────────────────────────────────────

  test('Empty order book has no bids or asks', () => {
    const book = new OrderBook('market-1');
    const snap = book.getSnapshot();
    assert(snap.bids.length === 0, 'No bids');
    assert(snap.asks.length === 0, 'No asks');
    assert(snap.lastTradePrice === undefined, 'No last trade');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 2: Single buy order rests on book
  // ─────────────────────────────────────────────────────────────────────────

  test('Buy order with no matching asks rests on book', () => {
    const book = new OrderBook('market-1');
    const order = makeOrder({ side: 'BUY', price: 60, size: 100 });

    const trades = book.addOrder(order);

    assert(trades.length === 0, 'No immediate trades');
    assert(order.status === 'OPEN', 'Order stays OPEN');
    assert(order.filled === 0, 'Nothing filled');

    const snap = book.getSnapshot();
    assert(snap.bids.length === 1, 'One bid level');
    assert(snap.bids[0][0] === 60, 'Bid at price 60');
    assert(snap.bids[0][1] === 100, 'Bid size 100');
    assert(snap.asks.length === 0, 'No asks');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 3: Perfect match - full fill
  // ─────────────────────────────────────────────────────────────────────────

  test('Buy and sell at same price → full match', () => {
    const book = new OrderBook('market-1');

    const buy = makeOrder({ side: 'BUY', price: 65, size: 100 });
    const sell = makeOrder({ side: 'SELL', price: 65, size: 100 });

    book.addOrder(buy);
    const trades = book.addOrder(sell);

    assert(trades.length === 1, 'One trade executed');
    assert(trades[0].price === 65, 'Trade at price 65');
    assert(trades[0].size === 100, 'Trade size 100');
    assert(buy.status === 'FILLED', 'Buy order FILLED');
    assert(sell.status === 'FILLED', 'Sell order FILLED');
    assert(buy.filled === 100, 'Buy fully filled');
    assert(sell.filled === 100, 'Sell fully filled');

    const snap = book.getSnapshot();
    assert(snap.bids.length === 0, 'No bids remaining');
    assert(snap.asks.length === 0, 'No asks remaining');
    assert(snap.lastTradePrice === 65, 'Last trade price is 65');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 4: Price crossing - buy price > ask price
  // ─────────────────────────────────────────────────────────────────────────

  test('Buy at 70 matches resting sell at 60 (taker gets maker price)', () => {
    const book = new OrderBook('market-1');

    const sell = makeOrder({ side: 'SELL', price: 60, size: 50 });
    book.addOrder(sell);

    const buy = makeOrder({ side: 'BUY', price: 70, size: 50 });
    const trades = book.addOrder(buy);

    assert(trades.length === 1, 'One trade');
    assert(trades[0].price === 60, 'Trade at maker price (60), not taker price (70)');
    assert(trades[0].size === 50, 'Full size matched');
    assert(buy.status === 'FILLED', 'Buy filled');
    assert(sell.status === 'FILLED', 'Sell filled');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 5: Partial fill
  // ─────────────────────────────────────────────────────────────────────────

  test('Buy 100, sell 60 → partial fill, remainder rests', () => {
    const book = new OrderBook('market-1');

    const sell = makeOrder({ side: 'SELL', price: 55, size: 60 });
    book.addOrder(sell);

    const buy = makeOrder({ side: 'BUY', price: 55, size: 100 });
    const trades = book.addOrder(buy);

    assert(trades.length === 1, 'One trade');
    assert(trades[0].size === 60, 'Matched 60 (sell size)');
    assert(sell.status === 'FILLED', 'Sell fully filled');
    assert(buy.status === 'PARTIALLY_FILLED', 'Buy partially filled');
    assert(buy.filled === 60, 'Buy filled 60');

    const snap = book.getSnapshot();
    assert(snap.bids.length === 1, 'Remaining buy on book');
    assert(snap.bids[0][1] === 40, 'Remaining buy size = 40');
    assert(snap.asks.length === 0, 'No asks left');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 6: No match - price too far apart
  // ─────────────────────────────────────────────────────────────────────────

  test('Buy at 40, sell at 60 → no match (spread too wide)', () => {
    const book = new OrderBook('market-1');

    const buy = makeOrder({ side: 'BUY', price: 40, size: 100 });
    const sell = makeOrder({ side: 'SELL', price: 60, size: 100 });

    book.addOrder(buy);
    const trades = book.addOrder(sell);

    assert(trades.length === 0, 'No trades (prices dont cross)');
    assert(buy.status === 'OPEN', 'Buy still OPEN');
    assert(sell.status === 'OPEN', 'Sell still OPEN');

    const snap = book.getSnapshot();
    assert(snap.bids.length === 1, 'Buy on book');
    assert(snap.asks.length === 1, 'Sell on book');
    assert(snap.spread === 20, 'Spread is 20');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 7: Cancel order
  // ─────────────────────────────────────────────────────────────────────────

  test('Cancel removes order from book', () => {
    const book = new OrderBook('market-1');
    const order = makeOrder({ side: 'BUY', price: 50, size: 100 });
    book.addOrder(order);

    const cancelled = book.cancelOrder(order.id);
    assert(cancelled === true, 'Cancel returns true');
    assert(order.status === 'CANCELLED', 'Order status = CANCELLED');

    const snap = book.getSnapshot();
    assert(snap.bids.length === 0, 'Book is empty after cancel');

    // Try to cancel again
    const cancelAgain = book.cancelOrder(order.id);
    assert(cancelAgain === false, 'Double cancel returns false');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 8: Price-time priority
  // ─────────────────────────────────────────────────────────────────────────

  test('Orders at same price fill in time order (FIFO)', () => {
    const book = new OrderBook('market-1');

    const buy1 = makeOrder({ id: 'buy-1', side: 'BUY', price: 55, size: 50, timestamp: 1000 });
    const buy2 = makeOrder({ id: 'buy-2', side: 'BUY', price: 55, size: 50, timestamp: 2000 });
    book.addOrder(buy1);
    book.addOrder(buy2);

    // Sell that can only fill ONE buy
    const sell = makeOrder({ side: 'SELL', price: 55, size: 50 });
    const trades = book.addOrder(sell);

    assert(trades.length === 1, 'One trade');
    assert(trades[0].buyOrderId === 'buy-1', 'FIFO: first buy fills first');
    assert(buy1.status === 'FILLED', 'First buy filled');
    assert(buy2.status === 'OPEN', 'Second buy still waiting');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 9: OrderBookManager across multiple markets
  // ─────────────────────────────────────────────────────────────────────────

  test('OrderBookManager handles multiple markets independently', () => {
    const manager = new OrderBookManager();

    const m1buy = makeOrder({ market: 'market-A', side: 'BUY', price: 60, size: 100 });
    const m2buy = makeOrder({ market: 'market-B', side: 'BUY', price: 70, size: 200 });

    manager.placeOrder(m1buy);
    manager.placeOrder(m2buy);

    const snap1 = manager.getSnapshot('market-A');
    const snap2 = manager.getSnapshot('market-B');

    assert(snap1 !== null, 'market-A has order book');
    assert(snap2 !== null, 'market-B has order book');
    assert(snap1!.bids[0][1] === 100, 'market-A bid size 100');
    assert(snap2!.bids[0][1] === 200, 'market-B bid size 200');
    assert(manager.getMarketCount() === 2, '2 markets tracked');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // TEST 10: Multiple trades from one order
  // ─────────────────────────────────────────────────────────────────────────

  test('Large buy sweeps multiple sell levels', () => {
    const book = new OrderBook('market-1');

    // Three sell orders at different prices
    book.addOrder(makeOrder({ side: 'SELL', price: 50, size: 30 }));
    book.addOrder(makeOrder({ side: 'SELL', price: 55, size: 30 }));
    book.addOrder(makeOrder({ side: 'SELL', price: 60, size: 30 }));

    // Big buy that sweeps all three levels
    const bigBuy = makeOrder({ side: 'BUY', price: 65, size: 90 });
    const trades = book.addOrder(bigBuy);

    assert(trades.length === 3, 'Three trades (one per price level)');
    assert(trades[0].price === 50, 'First trade at best ask (50)');
    assert(trades[1].price === 55, 'Second trade at 55');
    assert(trades[2].price === 60, 'Third trade at 60');
    assert(bigBuy.status === 'FILLED', 'Buy fully filled after sweeping 3 levels');

    const snap = book.getSnapshot();
    assert(snap.asks.length === 0, 'All asks consumed');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────────────────────────────────

  console.log('\n══════════════════════════════════════════════');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
