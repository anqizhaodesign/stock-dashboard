# Stock Dashboard Design & Implementation Summary

## 1. Project Objective
**Goal**: Create a rich, browser-based dashboard to visualize "Weekly K-Line" charts for multiple Chinese stocks.
**Evolution**: Originally a simple static grid, the project has evolved into a structured **App Shell** application with sidebar navigation, tabbed workspaces, robust list/grid views, and filtering capabilities.

## 2. Technical Architecture
The project is built as a **Static Single-Page Application (SPA)** using Vanilla JavaScript.
-   **No Backend**: Runs entirely in the client's browser.
-   **Hostable**: Compatible with GitHub Pages (files located in `docs/`).
-   **Persistence**: Uses `localStorage` to save user data (Favorites and Tabs).

### 2.1 Project Structure
-   **`docs/`**: Contains the web application files (`index.html`, `style.css`, `script.js`). This structure is optimized for GitHub Pages deployment.
-   **Root**: Contains project documentation (`DESIGN.md`, `README.md`) and utility scripts (`analyze_concepts.py`).

### 2.2 App Shell Layout
-   **Sidebar**: "UPLOADS" (History) and "Favorites" navigation.
-   **Top Bar**: Global search/add stock controls and export actions.
-   **Filter Bar**: Advanced multi-select filtering for Concepts and Agencies with fixed search headers.
-   **Main Content**: A scrollable area supporting both **List View** (Data Table) and **Grid View** (Chart Cards).

## 3. Key Feature Implementation

### A. Navigation & Tabs
-   **Favorites**: A persistent, default tab for the user's curated list.
-   **Imported Tabs**: Uploaded Excel files create new "Dashboard" tabs in the sidebar under "UPLOADS".
-   **State Management**: A central `State` object tracks `activeTabId`, `tabs` array, `favorites` Set, and `filters`.

### B. View Modes
-   **Grid View**: Displays 3-6 columns of Chart Cards (Weekly K-Line images from Eastmoney API).
-   **List View**: A dense data table showing Code, Name, Concept, Agency, and Price.
    -   **Columns**: Optimized for readability (truncation with hover tooltips).
    -   **Header Controls**: [Grid/List Toggle] -> [Page Size] -> [Columns (Grid only)].

### C. Advanced Filtering
-   **Concepts & Agency Filters**:
    -   **Multi-Select**: Users can select multiple tags (OR logic).
    -   **Search**: Fixed search input at the top of the filter section allows quick finding of tags.
    -   **Independent Scrolling**: Tag lists scroll independently without moving the search box.
    -   **Data Structure**: Uses `Set<string>` for performant filtering.

### D. Data Management (Import/Export)
-   **Import**: Parses Excel (`.xlsx`) files using `SheetJS`.
    -   **Smart Parsing**: Detects columns (Code, Name, Concept, Agency, Price).
    -   **Split Logic**: Automatically splits "Agency Name" cells by semicolon (`;` or `；`) to support multi-agency entries.
-   **Export**: Generates an Excel file of "Favorites".
    -   **Format**: "Agency Name" column joins multiple agencies with `;` to ensure re-import compatibility.

## 4. User Workflow
1.  **Sidebar**: Switch between "Favorites" and imported "UPLOADS".
2.  **Import**: Click "Import Analysis" to load an Excel file.
3.  **Filtering**: Expand "Concepts" or "Agency" to filter the current view.
4.  **Viewing**: Toggle between List/Grid views and use pagination.
5.  **Refine**: Star stocks to add to Favorites.
6.  **Export**: Export your favorites list to Excel for backup or sharing.
