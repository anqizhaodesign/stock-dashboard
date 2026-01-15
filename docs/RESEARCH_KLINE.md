# Future Feature Research: Interactive K-Line Charts

## User Requirement
Replace static K-line images with interactive, "moving" charts similar to Eastmoney's official site.

## Research Findings (2025-01-15)

### Option A: Iframe Embedding (Low Effort)
Embed the mobile/H5 version of the chart page. 
- **URL Pattern**: `https://quote.eastmoney.com/unify/cr/[MarketID].[Code]`
  - MarketID: `0` for SZ/BJ, `1` for SH.
- **Pros**: Zero coding for chart logic, official look & feel.
- **Cons**: Includes Eastmoney branding/nav/ads, heavy resource usage per card.

### Option B: Native Rendering with ECharts (High Quality)
Fetch raw data from Eastmoney API and render using Apache ECharts.
- **Data Source**: `https://push2his.eastmoney.com/api/qt/stock/kline/get`
- **Parameters**: `secid=[Market].[Code]`, `klt=[101(D)|102(W)|103(M)]`.
- **Implementation**:
  - Fetch JSON.
  - Parse `klines` array (Date, Open, Close, High, Low, Vol).
  - Render using ECharts `candlestick` series.
- **Pros**: Clean UI, lightweight, fully customizable, no cross-origin iframe issues.
- **Cons**: Requires implementing chart configuration.

## Recommendation
**Option B** is recommended for a professional dashboard to maintain a clean aesthetic and high performance.
