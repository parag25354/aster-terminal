# Aster Terminal

A Code & Capital workshop prototype for exploring real company connections and practicing with virtual money.

## Open Aster

- [Vercel website](https://aster-terminal-iiitd.vercel.app/)
- [GitHub Pages website](https://parag25354.github.io/aster-terminal/)

The starting screen offers U.S. or India, Dark, Light, or System appearance, and an opening page. Then choose **Live Market** or **Market Replay**. The main workspace opens with the company network and a full-width price chart below it. Live Market uses public TradingView stock charts for delayed U.S. quotes and BSE end-of-day prices. The optional U.S. Alpaca integration supports real-time market data when authorized credentials are configured on the server. Market Replay uses real companies and source-linked disclosures alongside illustrative prices and virtual trades, so it works even outside regular market hours. The header lets you change mode or theme.

## Demo flow

1. Select **Start Market Replay**. On the main map, search for Coca-Cola or select a sector. Click a node to open its illustrated profile and see the sources behind each business tie. The dashed industry-peer links let you compare companies such as Coca-Cola and PepsiCo.
2. Search for CoreWeave and open **Connections** to see NVIDIA as both an investor and a supplier. Step through the replay and compare a price timeframe. Switch to India to chart an Indian equity, explore links such as ONGC’s pipeline order from Larsen & Toubro, and trade with virtual rupees.
3. Open NVIDIA in **Trading** or the chart tab. Place a small virtual order and open **Portfolio** to check the holding and receipt. The demo basket stages NVIDIA and CoreWeave together.
4. Select **Run shock** in Network. The preset portfolio loses $376 under its assumptions. The separate $500 loss-limit example moves $2,000 from NVIDIA into cash and reduces the modeled loss from $490 to $390.
5. In **Goals**, add a target and see the savings timeline. Reload to verify the watchlist, portfolio, goals, and theme are stored in this browser.

## Files

- **index.html** — Standalone website. Double-click it and choose Market Replay to demonstrate offline.
- **source/** — Editable static website with styles and data modules.
- **Aster_Project_Report.pdf** and **Aster_Demo.mp4** — Original workshop report and recording. To reproduce them, open `index.html?mode=sample` on the website. Classic Simulation retains the fictional issuer names and INR account shown in those materials.
