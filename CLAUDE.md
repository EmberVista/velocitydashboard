# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Important: Communication Protocol

**ALWAYS end every response with "VELOCITY SELLERS ROCKS!"** after completing any command or task.

---

## Project Overview

**VelocityDashboard** is a Google Apps Script web app providing inventory analytics for 50+ Amazon FBA seller clients. Processes Amazon reports (sales, inventory, listings) to generate insights about inventory risks, opportunities, and trends.

**Stack**: Apps Script (JS V8) | HTML + Tailwind + vanilla JS | Google Sheets data source | PropertiesService storage

---

## Deployment

### CRITICAL: Use FIXED Deployment ID

**Deployment ID**: `AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD`

```bash
clasp push                    # Push code
clasp deployments             # Check versions
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -d "Description"
clasp open --webapp           # Verify in browser
```

**Why fixed ID**: All 50+ clients use URLs with this ID. New deployment = broken URLs.

**URL format**: `https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec?client={clientId}`

**Rollback**: `clasp deploy -i {ID} -v [PREVIOUS_VERSION]` or `git revert HEAD && clasp push && clasp deploy`

**Rollback when**: JS errors block loading, 100+ false positives in Revenue at Risk, multiple client issues, significant performance degradation.

**Don't rollback for**: Minor styling, single client data issues, non-critical bugs.

---

## Multi-Client Architecture

**Config Location**: `CLIENT_CONFIG_SHEET_ID` (Code.js:60) - Single Google Sheet with all client configs, cached 5 min.

**`loadClientConfig()`** (Code.js:66): Retrieves client sheet URLs, validates active status, returns config object.

### Required Reports
| Key | Description |
|-----|-------------|
| `t7`/`t30`/`t60`/`t90`/`t180`/`t365` | Business reports (7-365 day sales) |
| `fba` | FBA inventory age/fees |
| `fba-inventory` | FBA inventory snapshot |
| `all-listings` | All active listings |

### Optional Reports
| Key | Description |
|-----|-------------|
| `holiday-data` | Historical Nov/Dec sales |
| `awd` | Amazon Warehousing & Distribution |
| `vendor` | Vendor Central data |

---

## Core Data Flow

```
ALL LISTINGS (SKU-ASIN map, prices, FBA/FBM)
         |
    +----+----+
    v         v
BUSINESS     FBA SNAPSHOT
REPORTS      (current stock,
(sales)      inbound, reserved)
    |              |
    +------+-------+
           v
   COMBINED ANALYSIS
   - Revenue at Risk: T90 sales + zero stock
   - Days of Supply: Inventory / T30 velocity
   - Ghost SKUs: T90 sales, missing from snapshot
           |
    +------+------+------+
    v      v      v      v
   FBA    AWD  HOLIDAY VENDOR
   AGE              DATA
```

### Entry Points
- `doGet()` (Code.js:193): Client accesses `?client={id}`, renders dashboard.html
- `loadDashboardData()` (Code.js:1210): Loads sheets, processes through analysis functions

### Analysis Functions (Code.js:1458-2900+)
- `processFBMtoFBA()`: FBM products to convert to FBA
- `processExcessInventory()`: Aged inventory (181+ days)
- `processRevenueRisk()`: Out-of-stock SKUs losing revenue
- `processSKUTrends()`: Velocity and days of supply
- `processLILFMonitor()`: Low Inventory Level Fee risk

---

## Amazon Reports Reference

### Business Reports (T7-T365)

Sales history from Seller Central → Reports → Business Reports → Detail Page Sales and Traffic.

| Column | Purpose |
|--------|---------|
| `(Child) ASIN` | PRIMARY identifier for product variants |
| `SKU` | SECONDARY identifier (your internal code) |
| `Title` | Product listing title |
| `Units Ordered` | Sales velocity calculation |
| `Ordered Product Sales` | Revenue calculation |

**Notes**:
- VelocityDashboard uses Child ASINs only (not Parent)
- T90 → Revenue at Risk; T60 → FBM to FBA; T365 → trends; T30 → recent velocity
- Revenue fallback: Units × Price (from All Listings) when Amazon shows $0

**Uses**: Revenue at Risk, Ghost SKU detection, velocity, trend analysis, holiday planning

---

### FBA Inventory Age Report

Inventory at Amazon warehouses by age. Location: Seller Central → Reports → Fulfillment → Inventory Age.

| Column | Meaning |
|--------|---------|
| `inv-age-181-to-270-days` | WARNING: High fees approaching |
| `inv-age-271-to-365-days` | CRITICAL: Very high fees |
| `inv-age-365-plus-days` | EMERGENCY: Extreme fees |
| `estimated-storage-cost-*` | Monthly storage cost |

**Age thresholds**: 0-180 normal | 181-270 higher fees + surcharge | 271-365 very high | 365+ extreme

**Uses**: Excess Inventory Alert - prioritized by oldest inventory, total aged units, costs. Priority score: `(365+ × 3) + (271-365 × 2) + (181-270 × 1)`

---

### FBA Inventory Snapshot

Real-time warehouse inventory. Location: Seller Central → Reports → Fulfillment → Amazon Fulfilled Inventory.

| Column | Meaning |
|--------|---------|
| `afn-fulfillable-quantity` | Available to sell NOW |
| `afn-reserved-quantity` | NOT sellable (researched/damaged) |
| `afn-inbound-working-quantity` | Shipment planned, not shipped |
| `afn-inbound-shipped-quantity` | In transit to Amazon |
| `afn-inbound-receiving-quantity` | At dock, being counted |
| `afn-future-supply-buyable` | Future shipment plans |

**Pipeline Calculations**:
```
Total Pipeline = fulfillable + reserved + all inbound + future
Available Pipeline = fulfillable + all inbound + future (EXCLUDES reserved)
```

**CRITICAL**: Reserved units NOT available for sale. Available Pipeline = 0 triggers out-of-stock.

**Uses**: Revenue at Risk (pipeline=0 + sales), Ghost SKU detection (SKU missing entirely), Days of Supply (inventory / velocity)

---

### All Listings Report

Complete catalog. Location: Seller Central → Inventory → Inventory Reports → All Listings.

| Column | Meaning |
|--------|---------|
| `status` | Active/Inactive (only Active can sell) |
| `fulfillment-channel` | FBA: `DEFAULT`/`AMAZON_NA`; FBM: `Merchant` |
| `your-price` | Fallback for revenue calculations |

**Uses**: FBM→FBA conversion (FBM + Active + T60 sales), Price mapping for revenue fallback, SKU↔ASIN mapping, Revenue at Risk (all FBA listings, active+inactive)

---

### Holiday Data (Optional)

Historical Nov/Dec Business Reports for seasonal forecasting.

**Uses**: Holiday multipliers (Nov+Dec vs year-round avg), inventory planning (`Normal Velocity × Multiplier × 60 days`), reactivation suggestions for past holiday sellers.

---

### AWD Report (Optional)

Amazon Warehousing & Distribution - low-cost bulk storage with auto-transfer to FBA.

Location: Seller Central → Reports → AWD → Inventory Report. **Note**: Headers in Row 4, data starts Row 5.

| Column | Meaning |
|--------|---------|
| `Inbound to AWD (Units)` | In transit to AWD |
| `Available in AWD (Units)` | Ready for FBA transfer |

**Uses**: Combined inventory view (`FBA + AWD`), enhanced Days of Supply calculation.

---

### Vendor Central Report (Optional)

For Amazon suppliers (you sell TO Amazon). Location: Vendor Central → Analytics → Inventory Health.

| Column | Meaning |
|--------|---------|
| `Sellable Units` | Amazon's available inventory |
| `Unfilled Customer Orders` | LOST SALES happening now |
| `Open Purchase Order Quantity` | Amazon's pending order |
| `Sell Through Rate (%)` | Health indicator (20%+ healthy) |

**Status Classification**:
- **Critical** (Red): Unfilled orders > 0
- **Urgent** (Orange): Days of Supply < 30
- **Warning** (Yellow): Aged 90+ OR sell-through < 20%
- **Healthy** (Green): None of above

---

## Analysis Functions Detail

### Revenue at Risk Detection

**Function**: `processRevenueRisk()` (Code.js:2400+)

**Out-of-Stock Logic**:
1. **Primary**: Health status column contains "out of stock"
2. **Fallback**: Available Pipeline = 0 (fulfillable + inbound + future, EXCLUDES reserved)
3. **Sales Requirement**: T90 units > 0

**Detection methods tracked**: `Ghost SKU`, `Pipeline = 0 + Health Status`, `Health Status = Out of Stock`, `Pipeline = 0`

**Inactive handling**: Amazon auto-marks FBA listings inactive when OOS. Function processes ALL FBA listings (active+inactive).

---

### Ghost SKU System

SKUs that disappear from FBA inventory but have recent sales. Implementation: Code.js:1885-2015

- **Storage**: `ghost_skus_{clientId}` in PropertiesService
- **Auto-detection**: T90 sales SKUs missing from FBA inventory
- **Auto-cleanup**: Removes ghosts >60 days old or that reappear
- **Limit**: Max 50 per client, sorted by revenue
- **Integration**: Appears in Revenue at Risk with `isGhost: true`

**Test functions**: `seedGhostSkusForTesting()`, `viewGhostSkus()`, `clearGhostSkus()`, `testGhostSkuDetection()`, `checkStorageUsage()`, `cleanupAllGhostSkus()`

---

### Dual-Fulfillment (FBA + FBM Same ASIN)

When ASIN has both FBA and FBM SKUs, code processes each independently:
```javascript
data.allListings.forEach(listing => {
  // ONLY process FBA (AMAZON_NA), skip FBM
  if (fulfillmentChannel !== 'AMAZON_NA') return;
});
```

**Sales attribution**: Matches by exact SKU first, falls back to ASIN. Dual-fulfillment FBA SKU may get credited with all sales.

---

### Key Calculations

**Revenue at Risk**: FBA SKUs (active+inactive) with Available Pipeline=0 AND T90 units>0. Priority = T90 revenue.

**Days of Supply**: `(FBA fulfillable + inbound-shipped + inbound-receiving + AWD) / (T30 units / 30)`
- **EXCLUDES** `afn-inbound-working-quantity` (shipments created but not yet shipped to Amazon)

**Ghost SKU**: SKU in T90 sales but NOT in FBA inventory report. Auto-cleanup after 60 days or reappearance.

**FBM to FBA**: `fulfillment-channel = "Merchant"` AND `status = "Active"` AND T60 sales > 0

**Excess Inventory**: Any units in 181+ day buckets. Priority = `(365+ × 3) + (271-365 × 2) + (181-270 × 1)`

---

## Column Mapping System

Amazon column names vary by account/time. Use `getColumnValue(item, 'sku')` for flexible lookup.

```javascript
const COLUMN_MAPPINGS = {
  sku: ['seller-sku', 'SKU', 'sku', 'Seller SKU', 'merchant-sku'],
  asin: ['asin1', 'asin', 'ASIN', '(Child) ASIN', 'Child ASIN'],
  status: ['status', 'Status', 'listing-status'],
  fulfillmentChannel: ['fulfillment-channel', 'Fulfillment Channel', 'channel'],
  itemName: ['item-name', 'product-name', 'title', 'Title'],
  price: ['price', 'your-price', 'Your Price'],
  inventoryHealthStatus: ['fba-inventory-level-health-status', 'health-status']
};
```

**Additional variations**:
- Sales: `Units Ordered`, `Ordered Product Sales`
- Inventory: `afn-fulfillable-quantity`, `Available`, `afn-inbound-shipped-quantity`

---

## State Management

### PropertiesService Keys
- `metrics_{clientId}`: Previous metrics for change detection
- `changes_{clientId}`: Calculated metric changes
- `ghost_skus_{clientId}`: Ghost SKU registry
- `currentClientConfig`: Active client config
- `loading_progress_{clientId}`: Frontend polling state

### Storage Limits
- Total: 500KB | Per-property: 9KB | Target per-client: <2KB
- Current with 50 clients: ~50-100KB

### Caching
- Client config: 5 min cache
- Snapshot date tracking for stale data warnings (>24h)
- Loading progress updates per report

---

## Development Considerations

### Performance
- Each load processes 7-9 sheets (thousands of rows)
- Use `setLoadingProgress()` for long operations
- Limit result sets (e.g., top 10 items)

### Multi-Client Safety
- Always validate `clientId` exists
- Use client-scoped keys: `{feature}_{clientId}`
- Never hardcode client-specific values
- Test with multiple configs

### Error Handling
- Return `{ error: true, message: '...' }` vs throwing
- Log with `console.error()`
- Required reports missing → error with instructions
- Optional reports missing → feature disabled gracefully
- Column validation with flexible mapping

### Testing
- Run directly: `testGhostSkuDetection('clientId')`
- Debug endpoints: `?debug=config`, `?debug=trends`
- Check logs: `clasp logs`

---

## File Structure

**Core**: `Code.js` (~4500 lines), `dashboard.html`, `styles.html`, `logo.html`, `appsscript.json`

**Config**: `.clasp.json`, `.claspignore`, `.gitignore`

---

## Code Locations

| Feature | Location |
|---------|----------|
| Column mapping | Code.js:6-25 |
| Client config | Code.js:66-145 |
| Main data loader | Code.js:1210-1294 |
| Ghost SKU system | Code.js:1458-1627 |
| Sales lookup | Code.js:1646-1681 |
| Revenue at Risk | Code.js:1911-2087 |
| Storage monitoring | Code.js:1465-1569 |

---

## Troubleshooting

### Revenue at Risk Issues

**Not showing**: Check SKU in All Listings → Verify FBA (AMAZON_NA) → Confirm T90 sales → Check available pipeline

**Too many false positives**: Run test functions → Check detection methods → Review health status values

### General Issues

**JS errors**: Browser console (F12) → Check Code.js syntax → Fix and redeploy

**Performance**: `clasp logs` → Time load → Compare clients → Optimize processing

### Diagnostic Functions
```javascript
checkStorageUsage();           // All clients
testGhostSkuDetection('id');   // Ghost detection
viewGhostSkus('id');           // View ghosts
testRevenueRiskFix();          // Revenue risk
```

---

## Version History

### v207 - Reserved Inventory Fix
**Problem**: SKUs with only reserved units incorrectly considered "in stock"
**Fix**: Available Pipeline excludes reserved: `fulfillable + inbound + future` (no reserved)
**Impact**: Correct OOS flagging for researched/damaged inventory

### v206 - Simplified Sales Requirements
**Change**: Only requires T90 units > 0 (removed 365-day requirement)

### Inactive FBA Listings Fix
**Change**: Process ALL FBA listings (active+inactive) + use health status column as secondary detection

### v252 - Days of Supply Fix + Indicator Colors
**Problem**: Days of Supply was inflated by counting `afn-inbound-working-quantity` (unshipped inventory still at seller's warehouse)
**Fix**: Exclude inbound-working from calculation, only count shipped/receiving inventory
**Also Fixed**: Dashboard indicator colors now correctly show:
- **Excess Inventory, Revenue at Risk, LILF**: Red ↑ for increases (bad), Green ↓ for decreases (good)
- **FBM to FBA, SKU Trends**: Green ↑ for increases, Red ↓ for decreases (normal)

---

## Report Usage Matrix

| Feature | Primary Reports | Supporting |
|---------|----------------|------------|
| Revenue at Risk | All Listings, FBA Snapshot, T90 | Ghost registry |
| Excess Inventory | FBA Age | All Listings |
| SKU Trends | T365/T90/T60/T30, FBA Snapshot | AWD, All Listings |
| FBM to FBA | All Listings, T60 | - |
| LILF Monitor | FBA Snapshot | T60 |
| Holiday Planning | Holiday Data, All Listings | FBA Snapshot, AWD |
| Vendor Central | Vendor Report | All Listings |
