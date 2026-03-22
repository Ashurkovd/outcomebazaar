import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { orderBookAPI } from '../services/api';

const RANGES = [
  { label: '1D', days: 1 },
  { label: '1W', days: 7 },
  { label: '1M', days: 30 },
];

function generateMockData(days) {
  const now = Date.now();
  const points = days * 24;
  const interval = 3600000;
  const data = [];
  let price = 50;

  for (let i = points; i >= 0; i--) {
    price = Math.max(10, Math.min(90, price + (Math.random() - 0.45) * 4));
    data.push({
      time: now - i * interval,
      price: parseFloat(price.toFixed(2)),
      volume: Math.floor(Math.random() * 1000) + 200,
    });
  }
  return data;
}

export default function PriceChart({ marketId }) {
  const [priceData, setPriceData] = useState([]);
  const [timeRange, setTimeRange] = useState(RANGES[1]);
  const [isMock, setIsMock] = useState(false);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange, marketId]);

  async function loadData() {
    try {
      const data = await orderBookAPI.getPriceHistory(marketId, 0, timeRange.days);
      if (data && data.length > 0) {
        setPriceData(data.map(p => ({
          time: new Date(p.timestamp || p.time).getTime(),
          price: parseFloat(p.price ?? p.yesPrice ?? 50),
          volume: p.volume ?? 0,
        })));
        setIsMock(false);
      } else {
        setPriceData(generateMockData(timeRange.days));
        setIsMock(true);
      }
    } catch {
      setPriceData(generateMockData(timeRange.days));
      setIsMock(true);
    }
  }

  const formatXAxis = (ts) => {
    const d = new Date(ts);
    if (timeRange.days === 1) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-purple-500/30 rounded-xl p-3 shadow-xl">
        <p className="text-gray-400 text-xs mb-1">
          {new Date(d.time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <p className="text-white font-bold text-lg">{d.price}¢</p>
        {d.volume > 0 && <p className="text-gray-400 text-xs">Vol: ${d.volume.toLocaleString()}</p>}
      </div>
    );
  };

  const current = priceData.length > 0 ? priceData[priceData.length - 1].price : 50;
  const start = priceData.length > 0 ? priceData[0].price : 50;
  const change = parseFloat((current - start).toFixed(2));
  const changePct = start > 0 ? ((change / start) * 100).toFixed(2) : '0.00';
  const isUp = change >= 0;

  const high = priceData.length > 0 ? Math.max(...priceData.map(d => d.price)).toFixed(2) : '-';
  const low = priceData.length > 0 ? Math.min(...priceData.map(d => d.price)).toFixed(2) : '-';
  const totalVol = priceData.reduce((s, d) => s + d.volume, 0);

  return (
    <div className="bg-black/40 backdrop-blur-md rounded-2xl p-6 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-white">Price Chart</h3>
            {isMock && (
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">simulated</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-white">{current}¢</span>
            <span className={`text-sm font-semibold px-2 py-0.5 rounded-lg ${isUp ? 'text-green-400 bg-green-900/20' : 'text-red-400 bg-red-900/20'}`}>
              {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(2)}¢ ({changePct}%)
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.label}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange.label === r.label
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/20'
                  : 'bg-purple-900/20 border border-purple-500/20 text-gray-400 hover:text-white hover:border-purple-500/40'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={priceData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${marketId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              tickFormatter={formatXAxis}
              stroke="#374151"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              stroke="#374151"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `${v}¢`}
              width={36}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 2' }} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              fill={`url(#grad-${marketId})`}
              dot={false}
              activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-purple-500/10">
        <div>
          <div className="text-xs text-gray-500 mb-1">High</div>
          <div className="text-white font-semibold">{high}¢</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Low</div>
          <div className="text-white font-semibold">{low}¢</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">Volume</div>
          <div className="text-white font-semibold">{totalVol > 0 ? `$${totalVol.toLocaleString()}` : '—'}</div>
        </div>
      </div>
    </div>
  );
}
