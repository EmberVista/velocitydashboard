# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Communication Protocol

**ALWAYS end every response with "VELOCITY SELLERS ROCKS!"** after completing any command or task. This confirms you have read and are following the CLAUDE.md guidelines.

## Project Overview

**VelocityDashboard** is a Google Apps Script web application that provides inventory management analytics for Amazon FBA sellers. The application serves 50+ clients, processing their Amazon reports (sales, inventory, listings) to generate actionable insights about inventory risks, opportunities, and trends.

## Architecture

### Technology Stack
- **Platform**: Google Apps Script (JavaScript V8 runtime)
- **Frontend**: HTML + Tailwind CSS + vanilla JavaScript
- **Backend**: Apps Script server-side functions
- **Data Source**: Google Sheets (client Amazon reports uploaded as CSV)
- **Storage**: PropertiesService for metrics, client configs, and ghost SKU tracking
- **Deployment**: Web app accessible via unique URLs per client

### Deployment & Development

**CRITICAL: Deployment Process**

We use a FIXED deployment ID to maintain stable URLs for all clients. Always update the existing deployment, never create a new one.

**Deployment ID**: `AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD`

**Deployment Steps**:
```bash
# 1. Push code changes
clasp push

# 2. Check current deployment versions
clasp deployments

# 3. Create NEW VERSION on existing deployment (preserves URL)
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -d "Description of changes"

# 4. Open to verify in browser
clasp open --webapp
```

**Why this matters**:
- Creating a new deployment changes the URL
- All 50+ clients access the app via URLs containing this deployment ID
- Updating the existing deployment maintains URLs while allowing version rollback
- Each update creates a new version (e.g., v2, v3, v4) under the same deployment ID

**Version Management**:
- View all versions: Apps Script Editor → Deploy → Manage Deployments
- Rollback if needed: Select previous version from dropdown
- Each version is timestamped and includes description

**Web app URL format:**
```
https://script.google.com/macros/s/AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD/exec?client={clientId}
```

**Other clasp commands**:
```bash
clasp open        # Open Apps Script editor
clasp logs        # View execution logs
clasp pull        # Pull code from Apps Script (rarely needed)
```

### Multi-Client Architecture

The application uses a centralized configuration system:

1. **Client Configuration Sheet** (`CLIENT_CONFIG_SHEET_ID` in Code.js line 60)
   - Single Google Sheet stores all client configs
   - Columns: client_id, display_name, active, and URLs for each report type
   - Cached for 5 minutes to reduce API calls

2. **Client Data Loading** (`loadClientConfig()` - Code.js:66)
   - Retrieves client-specific sheet URLs
   - Validates client is active
   - Returns config object with sheet URLs for all report types

3. **Report Types Required per Client:**
   - `t7`, `t30`, `t60`, `t90`, `t180`, `t365`: Business reports (sales data)
   - `fba`: FBA inventory age/fees report
   - `fba-inventory`: FBA inventory snapshot
   - `all-listings`: All active listings report
   - `holiday-data`: (optional) Historical holiday sales
   - `awd`: (optional) Amazon Warehousing & Distribution inventory
   - `vendor`: (optional) Vendor Central data

### Core Data Flow

1. **Web App Entry** (`doGet()` - Code.js:193)
   - Client accesses URL with `?client={clientId}` parameter
   - Server loads client config and renders dashboard.html template
   - Client-side JavaScript requests data via `google.script.run`

2. **Data Processing** (`loadDashboardData()` - Code.js:1210)
   - Loads all report sheets for client (via `getSheetData()`)
   - Processes raw data through analysis functions
   - Returns structured results to frontend

3. **Analysis Functions** (Code.js:1458-2900+)
   - `processFBMtoFBA()`: Identifies merchant-fulfilled products that should convert to FBA
   - `processExcessInventory()`: Flags aged inventory (181+ days old)
   - `processRevenueRisk()`: **[v207: Fixed reserved inventory handling]** Detects out-of-stock SKUs losing revenue
   - `processSKUTrends()`: Calculates velocity and days of supply
   - `processLILFMonitor()`: Tracks Low Inventory Level Fee risk

### Revenue at Risk Detection (v207)

**Purpose**: Identifies SKUs that are out of stock but had recent sales, representing lost revenue opportunity.

**Out-of-Stock Detection Logic** (`processRevenueRisk()` - Code.js:2400+):

1. **Primary Method**: Check FBA Inventory health status column
   - Columns checked: `fba-inventory-level-health-status`, `inventory-level-health-status`, `health-status`
   - If contains "out of stock" → flagged

2. **Fallback Method**: Calculate available pipeline inventory
   - **Available Pipeline** = fulfillable + inbound (working + shipped + receiving) + future supply
   - **EXCLUDES reserved units** (being researched, damaged, quality hold, not sellable)
   - If available pipeline = 0 → flagged as out of stock

3. **Sales Requirement**: Must have 90-day sales
   - Check T90 business report for units > 0
   - No longer requires 365-day sales (simplified in v206)

4. **Result**: SKUs meeting all criteria appear in Revenue at Risk section
   - Sorted by lost revenue per day (highest first)
   - Top 10 displayed on dashboard

**Key Fix (v207)**: Reserved inventory now properly excluded from out-of-stock detection. Previously, SKUs with only reserved units (like 5 units being researched) were incorrectly considered "in stock."

**Column Names Used** (FBA Inventory Report):
- `afn-fulfillable-quantity` or `available`: Immediately sellable units
- `afn-reserved-quantity` or `Total Reserved Quantity`: Units held/researched (NOT counted as available)
- `afn-inbound-working-quantity`, `afn-inbound-shipped-quantity`, `afn-inbound-receiving-quantity`: Inbound pipeline
- `afn-future-supply-buyable`: Future committed inventory

### Ghost SKU Tracking System

**Problem Solved**: SKUs that completely disappear from Amazon's FBA inventory reports but still have recent sales data. Without tracking, these "ghost SKUs" aren't flagged as revenue at risk.

**Implementation** (Code.js:1885-2015):
- **Registry Storage**: PropertiesService key `ghost_skus_{clientId}`
- **Auto-detection**: Scans T90 sales report for SKUs missing from FBA inventory
- **Auto-update**: Called during each dashboard load via `updateGhostSkuRegistry()` (Code.js:1172)
- **Auto-cleanup**: Removes ghosts older than 60 days or that reappear in inventory
- **Storage limit**: Max 50 ghost SKUs per client, sorted by revenue
- **Integration**: Ghost SKUs appear in Revenue at Risk report with `isGhost: true` flag
- **Detection criteria**: SKU in T90 sales but NOT in FBA inventory report at all

**Testing Functions**:
```javascript
// Seed test data
seedGhostSkusForTesting(clientId, [/* array of test SKUs */]);

// View current ghosts
viewGhostSkus(clientId);

// Clear ghosts
clearGhostSkus(clientId);

// Test detection
testGhostSkuDetection(clientId);

// Monitor storage
checkStorageUsage();

// Cleanup all clients
cleanupAllGhostSkus();
```

### Column Mapping System

Amazon reports have inconsistent column names across accounts and over time. The system uses flexible column mapping (Code.js:6-25):

```javascript
const COLUMN_MAPPINGS = {
  sku: ['seller-sku', 'SKU', 'sku', 'Seller SKU', ...],
  asin: ['asin1', 'asin', 'ASIN', ...],
  status: ['status', 'Status', 'STATUS', ...],
  // ... etc
};
```

Use `getColumnValue(item, 'sku')` instead of direct property access to handle variations.

### State Management

**PropertiesService Usage**:
- `metrics_{clientId}`: Stores previous metrics for change detection
- `changes_{clientId}`: Stores calculated metric changes
- `ghost_skus_{clientId}`: Ghost SKU registry (new feature)
- `currentClientConfig`: Active client configuration
- `loading_progress_{clientId}`: Loading state for frontend polling

**Storage Limits**:
- Total limit: 500KB for all properties
- Per-property limit: 9KB
- Current usage with 50 clients: ~50-100KB for ghost SKUs + existing metrics

### Data Processing Patterns

**Sales Data Lookup** (`findSalesForSKU()` - Code.js:1646):
- Matches by both SKU and ASIN (business reports use Child ASIN)
- Falls back to price calculation if revenue missing
- Returns `{ units, revenue }` or `null`

**Inventory Pipeline Calculation** (Revenue Risk - v207 Updated):
- **Total Pipeline** (for display): fulfillable + reserved + inbound (working/shipped/receiving) + future supply
- **Available Pipeline** (for out-of-stock detection): fulfillable + inbound + future supply (EXCLUDES reserved)
- **Critical**: Reserved units are NOT available for sale (being researched, damaged, quality hold)
- Flags as "at risk" if available pipeline = 0 AND has 90-day sales (units > 0)
- No longer requires 365-day sales data (90-day sales sufficient)

**Price Mapping** (`buildAsinPriceMap()` - Code.js:1528):
- Builds ASIN → price map from All Listings report
- Used as fallback when business reports missing revenue data

## Key Development Considerations

### Performance
- Each client dashboard load processes 7-9 Google Sheets (thousands of rows)
- Use progress tracking (`setLoadingProgress()`) for long operations
- Cache client configs for 5 minutes to reduce Sheet API calls
- Limit result sets (e.g., top 10 revenue at risk items)

### PropertiesService Management
- Always check storage usage when adding new persistent data
- Use `checkStorageUsage()` to monitor usage across all clients
- Keep per-client data under 2KB to scale to 50+ clients
- Implement auto-cleanup for time-based data

### Multi-Client Safety
- Always validate `clientId` parameter exists
- Use client-scoped storage keys: `{feature}_{clientId}`
- Never hardcode client-specific values in shared functions
- Test changes with multiple client configs

### Error Handling
- Return error objects `{ error: true, message: '...' }` rather than throwing
- Log errors with `console.error()` for Apps Script logging
- Frontend polls for progress and handles error states

### Testing in Apps Script Editor
- Run test functions directly: `testGhostSkuDetection('clientId')`
- Use debug endpoints: `?debug=config`, `?debug=trends`, etc.
- Check execution logs in Apps Script dashboard
- Test with multiple client IDs to verify multi-tenant behavior

## File Structure

**Core Files**:
- `Code.js`: Main application logic (~4500 lines)
- `dashboard.html`: Frontend template with embedded JavaScript
- `styles.html`: CSS styles (included in dashboard)
- `appsscript.json`: Apps Script project configuration
- `.clasp.json`: clasp deployment configuration

**Optional Modules**:
- `holiday-planning-v2.js`: Seasonality forecasting
- `advanced-forecasting.js`: Advanced inventory planning
- `check-specific-asins.js`: ASIN-specific analysis

## Important Code Locations

- **Client config loading**: Code.js:66-145
- **Main data loader**: Code.js:1210-1294
- **Ghost SKU system**: Code.js:1458-1627
- **Revenue at Risk analysis**: Code.js:1911-2087
- **Column mapping helper**: Code.js:17-25
- **Sales lookup helper**: Code.js:1646-1681
- **Storage monitoring**: Code.js:1465-1569
