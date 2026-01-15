# Stock Dashboard - Functional Test Checklist

## 1. Data Management
- [ ] **Import Excel**: 
  - Click "Import", select `stocks-example.xlsx`. 
  - Verify a new tab is created with the filename.
  - Verify data populates in the grid/list.
- [ ] **History Tabs**:
  - Click a history tab to switch datasets.
  - Click the "x" on a tab to remove it.
- [ ] **Export**:
  - Go to "Favorites" tab.
  - Click "Export" button.
  - Verify `favorites.xlsx` is downloaded with correct columns.

## 2. View Modes
- [ ] **Switching**:
  - Click "List View" -> Table layout appears.
  - Click "Grid View" -> Card layout appears.
- [ ] **Grid Settings**:
  - (Grid View Only) Change "Columns" dropdown (3, 4, 5, 6, Auto). verify layout updates.
- [ ] **Page Size**:
  - Change "Per Page" (20, 50, 100, 200, 500, 1000).
  - Verify number of items displayed changes.
  - Verify pagination resets to Page 1.

## 3. List View Layout
- [ ] **Columns**: Verify order: `#`, `Fav`, `Code`, `Name`, `Concept`, `Agency`, `Price`.
- [ ] **Name Column**:
  - Should **NOT** wrap text.
  - Should auto-expand width to fit long names.
- [ ] **Concept Column**:
  - Should be **single-line** (no wrapping).
  - Long text should be truncated with `...`.
  - **Hover**: Tooltip should show full text.
- [ ] **Visuals**:
  - Zebra striping (alternating row colors).
  - Row hover effect (highlight).
  - Vertical alignment (content at top).

## 4. Filters (Concept & Agency)
### Concept Filter
- [ ] **Expand/Collapse**: Click `[Expand]/[Collapse]` to show/hide full list.
- [ ] **Search**: Type in "Concept Search box". Tags should filter in real-time.
- [ ] **Multi-Select**:
  - Click Tag A (e.g., "5G"). It highlights blue.
  - Click Tag B (e.g., "AI"). It highlights blue.
  - Verify list shows stocks containing *either* "5G" **OR** "AI".
- [ ] **Clear**: Click "All" tag. All selections clear, all stocks shown.
- [ ] **Scrollbars**: Verify only **vertical** scrollbar appears (no horizontal).

### Agency Filter
- [ ] **Expand/Collapse**: Click `[Expand]/[Collapse]`.
- [ ] **Search**: Type in "Agency Search box". Tags filter.
- [ ] **Multi-Select**: Click multiple agencies. Verify OR logic filtering.
- [ ] **Clear**: Click "All" tag.
- [ ] **Fix Verification**: Verify clicking tags does NOT throw errors (previously fixed).

## 5. Favorites
- [ ] **Toggle**: Click Star icon (in Grid card or List row). Icon turns filled (★).
- [ ] **Favorites Tab**: Click "⭐ Favorites Watchlist" sidebar item.
  - Verify only starred stocks are shown.
- [ ] **Persistence**: Refresh page. Favorites should remain.

## 6. Pagination
- [ ] **Navigation**:
  - Click "Next" -> moves to page 2.
  - Click "Prev" -> moves to page 1.
  - Buttons disable correctly at start/end.
- [ ] **Info**: "Showing X-Y of Z" updates correctly.
