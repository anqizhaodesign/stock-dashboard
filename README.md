# Stock Weekly K-Line Dashboard

A professional, browser-based dashboard to visualize "Weekly K-Line" charts for Chinese stocks (A-share & Beijing Stock Exchange), designed for high-volume analysis.

## 🚀 Features

### 📊 Visualization
-   **Grid View**: Monitor 20+ K-Line charts simultaneously in a responsive grid.
-   **List View**: Dense data table with columns for Code, Name, Concept, Agency, and Price.
-   **Toggle Layouts**: Instantly switch between Grid and List views.

### 🔍 Advanced Filtering
-   **Concepts**: Multi-select filtering for stock concepts (e.g., "AI", "EV").
-   **Agencies**: Filter by researching agencies.
-   **Smart Search**: Fixed search bars allow you to quickly find specific tags without losing your scroll position.
-   **Natural Scrolling**: Filters automatically scroll out of view to maximize screen space for data.

### 💾 Data Management
-   **Excel Import**: Drag & Drop `.xlsx` files to create new analysis dashboards.
    -   *Supports splitting multiple agencies (separated by `;`) in a single cell.*
-   **Favorites**: Star (★) your best stocks. They are saved persistently in your browser.
-   **Export**: Backup your Favorites list to an Excel file (fully compatible for re-import).
-   **Local Storage**: All data is stored in your browser's `localStorage` for privacy and speed.

## 🛠️ Deployment

This project is built to be hosted on **GitHub Pages**.

1.  Push this repository to GitHub.
2.  Go to **Settings** -> **Pages**.
3.  Source: Select **`main` branch** and **`/docs` folder**.
4.  Your site will be live at `https://<username>.github.io/<repo-name>/`.

## 📖 How to Use

1.  **Open**: Navigate to your deployed URL.
2.  **Import**: Click **"+ Import Analysis"** and select your stock Excel file.
3.  **Filter**: Use the sidebar to expand Concept/Agency filters. Click tags to refine the list.
4.  **Analyze**: Switch to **Grid View** to see charts.
5.  **Save**: Click the Star icon to pin stocks to your **Favorites** tab.
6.  **Backup**: Uses the **Export** button to save your favorites for safe keeping.

## 📂 Project Structure

-   `docs/`: Contains the web application (`index.html`, `style.css`, `script.js`).
-   `DESIGN.md`: Technical architecture and design decisions.
-   `analyze_concepts.py`: Python utility for analyzing concept statistics.
