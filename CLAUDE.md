# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important: Communication Protocol

**ALWAYS end every response with "VELOCITY SELLERS ROCKS!"** after completing any command or task. This confirms you have read and are following the CLAUDE.md guidelines.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Deployment & Development](#deployment--development)
4. [Multi-Client Architecture](#multi-client-architecture)
5. [Core Data Flow](#core-data-flow)
6. [Amazon Reports Reference](#amazon-reports-reference)
7. [Analysis Functions](#analysis-functions)
8. [Column Mapping System](#column-mapping-system)
9. [State Management](#state-management)
10. [Key Development Considerations](#key-development-considerations)
11. [File Structure](#file-structure)
12. [Important Code Locations](#important-code-locations)
13. [Troubleshooting & Diagnostics](#troubleshooting--diagnostics)
14. [Version History & Changelogs](#version-history--changelogs)

---

## Project Overview

**VelocityDashboard** is a Google Apps Script web application that provides inventory management analytics for Amazon FBA sellers. The application serves 50+ clients, processing their Amazon reports (sales, inventory, listings) to generate actionable insights about inventory risks, opportunities, and trends.

---

## Architecture

### Technology Stack
- **Platform**: Google Apps Script (JavaScript V8 runtime)
- **Frontend**: HTML + Tailwind CSS + vanilla JavaScript
- **Backend**: Apps Script server-side functions
- **Data Source**: Google Sheets (client Amazon reports uploaded as CSV)
- **Storage**: PropertiesService for metrics, client configs, and ghost SKU tracking
- **Deployment**: Web app accessible via unique URLs per client

---

## Deployment & Development

### CRITICAL: Deployment Process

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
- View all versions: Apps Script Editor -> Deploy -> Manage Deployments
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

### Rollback Procedure

If critical issues occur after deployment:

**Option 1: Redeploy Previous Version**
```bash
# View all versions
clasp deployments

# Redeploy specific version
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -v [PREVIOUS_VERSION]
```

**Option 2: Revert Code Changes via Git**
```bash
# Revert to previous commit
git revert HEAD

# Push reverted code
clasp push

# Deploy
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -d "Rollback: [reason]"
```

**When to Rollback**:
- JavaScript errors prevent dashboard from loading
- Revenue at Risk shows 100+ items (massive false positives)
- Multiple clients report issues
- Performance degrades significantly

**Do NOT rollback for**:
- Minor styling issues (can fix forward)
- One client having data issues (investigate first)
- Non-critical feature bugs (can fix forward)

---

## Multi-Client Architecture

The application uses a centralized configuration system:

### Client Configuration Sheet
- **Location**: `CLIENT_CONFIG_SHEET_ID` in Code.js line 60
- Single Google Sheet stores all client configs
- Columns: client_id, display_name, active, and URLs for each report type
- Cached for 5 minutes to reduce API calls

### Client Data Loading
`loadClientConfig()` - Code.js:66
- Retrieves client-specific sheet URLs
- Validates client is active
- Returns config object with sheet URLs for all report types

### Report Types Required per Client

**Required Reports:**
| Report Key | Description |
|------------|-------------|
| `t7` | Business report - Last 7 days sales |
| `t30` | Business report - Last 30 days sales |
| `t60` | Business report - Last 60 days sales |
| `t90` | Business report - Last 90 days sales |
| `t180` | Business report - Last 180 days sales |
| `t365` | Business report - Last 365 days sales |
| `fba` | FBA inventory age/fees report |
| `fba-inventory` | FBA inventory snapshot |
| `all-listings` | All active listings report |

**Optional Reports:**
| Report Key | Description |
|------------|-------------|
| `holiday-data` | Historical holiday sales (Nov/Dec) |
| `awd` | Amazon Warehousing & Distribution inventory |
| `vendor` | Vendor Central data |

---

## Core Data Flow

### 1. Web App Entry
`doGet()` - Code.js:193
- Client accesses URL with `?client={clientId}` parameter
- Server loads client config and renders dashboard.html template
- Client-side JavaScript requests data via `google.script.run`

### 2. Data Processing
`loadDashboardData()` - Code.js:1210
- Loads all report sheets for client (via `getSheetData()`)
- Processes raw data through analysis functions
- Returns structured results to frontend

### 3. Analysis Functions
Code.js:1458-2900+
- `processFBMtoFBA()`: Identifies merchant-fulfilled products that should convert to FBA
- `processExcessInventory()`: Flags aged inventory (181+ days old)
- `processRevenueRisk()`: Detects out-of-stock SKUs losing revenue
- `processSKUTrends()`: Calculates velocity and days of supply
- `processLILFMonitor()`: Tracks Low Inventory Level Fee risk

### Data Flow Diagram

```
+-------------------------------------------------------------+
|                   ALL LISTINGS REPORT                        |
|  (Master catalog - active/inactive status, prices)           |
+---------------+--------------------------------------+-------+
                |                                      |
                |-> Provides SKU-ASIN mapping          |
                |-> Provides prices for revenue        |
                |-> Identifies FBA vs FBM              |
                |                                      |
+---------------v--------------+    +------------------v-------+
|   BUSINESS REPORTS (T7-T365) |    |  FBA INVENTORY SNAPSHOT  |
|   (What sold & when)         |    |  (What's in stock now)   |
+---------------+--------------+    +------------------+-------+
                |                                      |
                |-> Sales units & revenue              |-> Current quantities
                |-> Sales velocity (units/day)         |-> Inbound shipments
                |                                      |-> Reserved units
                |                                      |
+---------------v--------------------------------------v-------+
|              COMBINED ANALYSIS CALCULATIONS                  |
|  - Revenue at Risk = Sales (T90) + Zero Stock (Snapshot)    |
|  - Days of Supply = Inventory (Snapshot) / Velocity (T30)   |
|  - Velocity Trend = T30 Sales vs T60 Sales                  |
|  - Ghost SKUs = SKUs in T90 Sales but NOT in Snapshot       |
+------------------+-------------------+-----------------------+
                   |                   |
      +------------v-------+  +--------v-----+  +-------------+
      | FBA INVENTORY AGE  |  |     AWD      |  |   HOLIDAY   |
      | (Aged inventory)   |  |   (Backup)   |  |  (Seasonal) |
      +------------+-------+  +--------+-----+  +------+------+
                   |                   |               |
                   |-> Flag aged       |-> Add buffer  |-> Forecast
                   |   inventory       |   inventory   |   Q4 demand
                   |                   |               |
          +--------v-------------------v---------------v-------+
          |           DASHBOARD OUTPUT                         |
          |  - Excess Inventory (age report)                   |
          |  - Revenue at Risk (sales + stock)                 |
          |  - SKU Trends (velocity + inventory)               |
          |  - FBM to FBA (listings + sales)                   |
          |  - Holiday Planning (historical patterns)          |
          +----------------------------------------------------+
```

---

## Amazon Reports Reference

This section provides comprehensive documentation of all Amazon reports used by VelocityDashboard.

### Business Reports (T7, T30, T60, T90, T180, T365)

#### What Are These Reports?
Business Reports are **sales history reports** from Amazon Seller Central that show what products were actually sold during specific time periods. The "T" stands for "Time" and the number indicates the number of days.

- **T7** = Last 7 days of sales data
- **T30** = Last 30 days of sales data
- **T60** = Last 60 days of sales data
- **T90** = Last 90 days of sales data
- **T180** = Last 180 days of sales data
- **T365** = Last 365 days of sales data (full year)

#### Report Location in Amazon
**Seller Central -> Reports -> Business Reports -> Detail Page Sales and Traffic -> Date Range Comparison**

#### Critical Columns

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **(Child) ASIN** or **Child ASIN** | Amazon Standard Identification Number for the specific product variant | **PRIMARY identifier** for matching sales to specific product variations | B08XYZABC12 |
| **SKU** | Your internal Stock Keeping Unit identifier | **SECONDARY identifier** - your own product code | ACME-TSHIRT-RED-LG |
| **Title** or **Product Name** | The product's listing title on Amazon | Helps humans understand what product we're looking at | "Men's Cotton T-Shirt, Red, Large" |
| **Units Ordered** | How many units customers actually purchased | Used to calculate **sales velocity** | 145 units |
| **Ordered Product Sales** | Total dollar amount customers paid | Used to calculate **revenue** and prioritize products | $2,175.00 |

#### Important Notes

1. **Parent vs Child ASINs**:
   - A "Parent ASIN" represents a product family (e.g., "Men's T-Shirt")
   - "Child ASINs" represent specific variations (e.g., "Red Large", "Blue Small")
   - **VelocityDashboard ONLY uses Child ASINs** because we need to track individual SKU performance

2. **Why Multiple Time Periods?**
   - **T90** is used for "Revenue at Risk" analysis
   - **T60** is used for "FBM to FBA" conversion opportunities
   - **T365** is used for long-term trends and Days of Supply calculations
   - **T30** is used for recent velocity changes

3. **Revenue Fallback Logic**:
   - Sometimes Amazon's reports are missing revenue data (shows $0 even with units sold)
   - When this happens, VelocityDashboard calculates revenue by multiplying Units x Price (from All Listings Report)

#### What VelocityDashboard Uses This Data For
- **Revenue at Risk**: Identifies products that sold well recently (T90) but are now out of stock
- **Ghost SKU Detection**: Finds products that disappeared from inventory but had recent sales
- **Sales Velocity**: Calculates how many units sell per day
- **Trend Analysis**: Compares T30 vs T60 to show acceleration/deceleration
- **Holiday Planning**: Uses T365 to forecast seasonal demand

---

### FBA Inventory Age Report

#### What Is This Report?
The **FBA Inventory Age Report** shows your inventory stored at Amazon's warehouses, broken down by **how long it's been sitting there**. Amazon charges higher storage fees for inventory that ages beyond certain thresholds.

#### Report Location in Amazon
**Seller Central -> Reports -> Fulfillment -> Inventory Age**

#### Why This Report Exists
Amazon wants to discourage sellers from using their warehouses as long-term storage. The longer inventory sits unsold, the higher the storage fees become. After 181 days, fees increase significantly.

#### Critical Columns

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **sku** or **seller-sku** | Your SKU identifier | Identifies which product | ACME-WIDGET-001 |
| **asin** or **asin1** | Amazon's product identifier | Matches to sales data | B08XYZABC12 |
| **product-name** | Product title | Human-readable description | "Wireless Mouse, Black" |
| **inv-age-181-to-270-days** | Units in warehouse 181-270 days | **WARNING ZONE**: High fees approaching | 23 units |
| **inv-age-271-to-365-days** | Units stored 271-365 days | **CRITICAL ZONE**: Very high fees | 8 units |
| **inv-age-365-plus-days** | Units stored over 365 days | **EMERGENCY**: Extreme fees | 2 units |
| **qty-to-be-charged-ais-181-210-days** | Units subject to Aged Inventory Surcharge | Extra fees on top of storage | 15 units |
| **estimated-storage-cost-181-to-270-days** | Estimated monthly storage fee | Dollar cost of aging | $34.50 |
| **estimated-excess-storage-cost** | Additional penalty fees | Extra charges beyond normal | $12.25 |

#### Important Age Thresholds
- **0-180 days**: Normal storage fees (acceptable)
- **181-270 days**: Higher storage fees + Aged Inventory Surcharge begins
- **271-365 days**: Very high fees + larger surcharges
- **365+ days**: Extreme fees + risk of forced removal by Amazon

#### What VelocityDashboard Uses This Data For
**Excess Inventory Alert**: Automatically identifies products with ANY units in the 181+ day buckets and prioritizes them by:
1. Oldest inventory first (365+ days gets highest priority)
2. Total aged units
3. Estimated monthly costs

The dashboard calculates a "priority score" based on how old the inventory is.

#### Actionable Insights
When VelocityDashboard flags aged inventory, sellers should:
- Run Lightning Deals or promotions to move aged stock
- Reduce prices to accelerate sales
- Create removal orders to pull inventory out before fees accumulate
- Stop sending more inventory for these SKUs until aged stock clears

---

### FBA Inventory Snapshot Report

#### What Is This Report?
The **FBA Inventory Snapshot Report** is a real-time view of ALL inventory currently at Amazon's fulfillment centers. Think of it as "what's physically in the warehouse right now" plus "what's on the way."

#### Report Location in Amazon
**Seller Central -> Reports -> Fulfillment -> Amazon Fulfilled Inventory**

#### Critical Columns

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **sku** or **seller-sku** | Your SKU identifier | Primary key for inventory lookup | ACME-WIDGET-001 |
| **asin** or **ASIN** | Amazon product identifier | Links inventory to listings | B08XYZABC12 |
| **product-name** or **title** | Product title | Human-readable name | "Wireless Mouse, Black" |
| **snapshot-date** | Date/time report was generated | **CRITICAL**: Shows data freshness | 2025-01-15 08:30:00 |
| **afn-fulfillable-quantity** | Units available to sell RIGHT NOW | **MOST IMPORTANT**: "on the shelf" inventory | 145 units |
| **afn-reserved-quantity** | Units reserved for customer orders | Already sold but not yet shipped | 12 units |
| **afn-inbound-working-quantity** | Units in shipment plans not shipped | Told Amazon it's coming, still at your warehouse | 50 units |
| **afn-inbound-shipped-quantity** | Units in transit to Amazon | On the truck heading to Amazon | 200 units |
| **afn-inbound-receiving-quantity** | Units arrived but not checked in | At Amazon's dock being counted | 30 units |
| **afn-warehouse-quantity** | Total units at Amazon's warehouses | Sum of fulfillable + reserved | 157 units |
| **afn-future-supply-buyable** | Units in future shipment plans | Planned to send in future | 100 units |

#### Understanding the Inventory Pipeline

VelocityDashboard calculates **total inventory pipeline**:

```
Total Pipeline = fulfillable + reserved + inbound_working + inbound_shipped + inbound_receiving + future_supply
```

**Available Pipeline** (for out-of-stock detection - EXCLUDES reserved):
```
Available Pipeline = fulfillable + inbound_working + inbound_shipped + inbound_receiving + future_supply
```

**CRITICAL**: Reserved units are NOT available for sale (being researched, damaged, quality hold).

#### What VelocityDashboard Uses This Data For

1. **Revenue at Risk Detection**:
   - If `available pipeline = 0` AND product had recent sales -> FLAG as revenue at risk

2. **Ghost SKU Detection**:
   - If a SKU **disappears entirely** from this report but still has T90 sales -> It's a "ghost SKU"

3. **Days of Supply Calculation**:
   - Takes `fulfillable + inbound` inventory
   - Divides by daily sales velocity (from T30 Business Report)
   - Result = "How many days until you run out"

4. **Inventory Health Status**:
   - Uses **fba-inventory-level-health-status** column to identify "Out of Stock" status

---

### All Listings Report

#### What Is This Report?
The **All Listings Report** is a complete catalog of every product listing in your Amazon Seller Central account, regardless of whether it's active, inactive, or archived.

#### Report Location in Amazon
**Seller Central -> Inventory -> Inventory Reports -> All Listings Report**

#### Critical Columns

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **seller-sku** or **SKU** | Your internal product identifier | Primary key | ACME-WIDGET-001 |
| **asin1** or **asin** | Amazon's product identifier | Links to sales and inventory | B08XYZABC12 |
| **status** | Current listing status | **CRITICAL**: Only "Active" listings can sell | Active, Inactive |
| **fulfillment-channel** | How orders will be fulfilled | **FBA = "DEFAULT"** or "AMAZON_NA", **FBM = "Merchant"** | DEFAULT, Merchant |
| **item-name** or **Title** | Product listing title | What customers see | "Wireless Mouse" |
| **your-price** or **price** | Current selling price | Fallback for revenue calculations | $29.99 |
| **quantity** | Current available quantity | For FBM products | 15 units |

#### Fulfillment Channel Values

| Channel Value | What It Means | Implications |
|--------------|---------------|--------------|
| **DEFAULT** or **AMAZON_NA** | Amazon fulfills (FBA) | Inventory at Amazon, Prime eligible |
| **Merchant** | You fulfill (FBM) | Inventory at your warehouse |

#### What VelocityDashboard Uses This Data For

1. **FBM to FBA Conversion Analysis**:
   - Finds products with `fulfillment-channel = "Merchant"` AND `status = "Active"`
   - Checks if these products had sales in T60
   - Recommends converting high-volume FBM products to FBA

2. **Price Mapping (Revenue Fallback)**:
   - Builds a map of ASIN -> Price from ALL active listings
   - When Business Reports show units sold but $0 revenue, uses: `Revenue = Units x Price`

3. **SKU to ASIN Mapping**:
   - Creates reverse lookup table: ASIN -> [list of SKUs]
   - Handles cases where one ASIN has multiple SKUs

4. **Revenue at Risk Identification**:
   - Loops through ALL FBA listings (active AND inactive)
   - Identifies which listings have zero stock but recent sales

---

### Holiday Data (Optional)

#### What Is This Report?
**Holiday Data** is a collection of **Business Reports from previous years' holiday seasons** (November and December). Used for **seasonal forecasting**.

#### Report Structure
Multiple separate Business Reports:
- November 2024 (30 days)
- December 2024 (31 days)
- November 2023 (30 days)
- December 2023 (31 days)
- (Can include earlier years)

#### Why This Report Exists
Holiday seasons (Q4) generate **massive sales spikes**. By analyzing previous years' holiday performance, sellers can:
- Forecast holiday demand
- Ensure sufficient inventory
- Identify which products spike during holidays

#### What VelocityDashboard Uses This Data For

1. **Holiday Sales Analysis**:
   - Compares November + December sales to year-round average
   - Identifies products with **holiday multipliers** (e.g., "3x normal volume in November")

2. **Inventory Planning Recommendations**:
   - Calculates: `Recommended Holiday Stock = Normal Velocity x Holiday Multiplier x 60 days`
   - Flags products that need extra stock before holiday rush

3. **Unmatched Product Warnings**:
   - Identifies ASINs that had holiday sales in past but aren't currently active
   - Suggests reactivating for upcoming season

#### Example Use Case

**Product: "Christmas Tree Ornaments Set"**
- January-October: Sells 10 units/day average
- November: Sold 450 units (15 units/day)
- December: Sold 900 units (30 units/day)

**Dashboard Calculation**:
- Holiday multiplier = 2.5x
- Recommended inventory for Q4: 60 days x 20 units/day = 1,200 units
- Alert: "Send extra 800 units before October"

---

### AWD Report (Optional)

#### What Is AWD?
**AWD = Amazon Warehousing and Distribution**

AWD provides **low-cost bulk storage** outside of FBA fulfillment centers. Inventory is stored at AWD facilities and automatically transferred to FBA warehouses as needed.

#### Report Location in Amazon
**Seller Central -> Reports -> Amazon Warehousing & Distribution -> Inventory Report**

#### Why Use AWD?
- **Lower storage costs** than FBA
- **Automatic replenishment** to FBA as stock runs low
- **Avoid aged inventory fees** (AWD doesn't count toward FBA aging)
- **Better for seasonal products**

#### Report Structure (Unique Format)
- Headers are in **Row 4** (not Row 1)
- Data starts at **Row 5**
- Report includes metadata in top 3 rows

#### Critical Columns

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **SKU** | Your product SKU | Matches to other reports | ACME-WIDGET-001 |
| **Inbound to AWD (Units)** | Units in transit TO AWD | Not yet available | 500 units |
| **Available in AWD (Units)** | Units at AWD ready for transfer | "Reserve inventory" | 2,000 units |

#### What VelocityDashboard Uses This Data For

1. **Combined Inventory View**:
   - `Total Inventory = FBA Inventory + AWD Inbound + AWD Available`

2. **Days of Supply Calculation (Enhanced)**:
   - Includes AWD inventory since it auto-transfers to FBA
   - More accurate stockout predictions

3. **SKU Trends Dashboard**:
   - Shows **FBA-only inventory** (what's available now)
   - Shows **Total inventory including AWD** (complete position)

#### Example Scenario

**Product: Wireless Mouse**
- FBA fulfillable: 50 units (3 days of supply)
- AWD available: 950 units
- AWD inbound: 500 units

**Without AWD visibility**: "URGENT: Only 3 days of stock!"
**With AWD visibility**: "3 days FBA, 100 days total (AWD auto-replenishment active)"

---

### Vendor Central Report (Optional)

#### What Is Vendor Central?
**Vendor Central** is a completely different business model:
- **Seller Central** (FBA/FBM): You sell TO customers, Amazon facilitates
- **Vendor Central**: You sell TO Amazon (wholesale), Amazon resells to customers

In Vendor Central, **you are Amazon's supplier**.

#### Report Location in Amazon
**Vendor Central -> Analytics -> Inventory Health**

#### Critical Columns

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **ASIN** | Amazon product identifier | Product this row describes | B08XYZABC12 |
| **Title** | Product listing title | Human-readable identifier | "Wireless Mouse, Black" |
| **Sellable Units** | Units Amazon has to sell | Your inventory Amazon owns | 1,250 units |
| **Unfilled Customer Orders** | Orders Amazon couldn't fulfill | **CRITICAL**: LOST SALES happening NOW | 23 orders |
| **Open Purchase Order Quantity** | Units Amazon ordered from you | Amazon's request for more | 500 units |
| **Net Received Units** | Units Amazon received from you | Shows shipment velocity | 1,200 units |
| **Aged 90+ Units** | Units at Amazon 90+ days | Slow-moving inventory | 45 units |
| **Sell Through Rate (%)** | (Units sold / Units available) x 100 | Higher = better. 20%+ is healthy | 65% |
| **Vendor Confirmation (%)** | % of PO quantity you confirmed | Your reliability. 80%+ expected | 92% |
| **Received Fill (%)** | % of confirmed PO Amazon received | Shipping accuracy. 95%+ expected | 98% |
| **Overall Vendor Lead Time** | Days from PO to delivery | Faster = better. 7-14 days preferred | 12 days |

#### Status Classification System

| Status | Color | Criteria | Meaning |
|--------|-------|----------|---------|
| **Critical** | Red | Unfilled Customer Orders > 0 | LOST SALES RIGHT NOW |
| **Urgent** | Orange | Days of Supply < 30 | STOCKOUT IMMINENT |
| **Warning** | Yellow | Aged 90+ OR Sell-through < 20% OR Process issues | OVERSTOCK OR PROBLEMS |
| **Healthy** | Green | None of the above | OPTIMAL |

#### Actionable Insights

**For Critical (Unfilled Orders)**:
- Contact Amazon Vendor Manager immediately
- Expedite shipments via air freight if necessary

**For Urgent (Low Days of Supply)**:
- Review open POs and confirm quantities
- Ship open PO quantities ASAP

**For Warning (Aged Inventory)**:
- Request promotional support (Lightning Deals, coupons)
- Review pricing strategy

**For Process Issues**:
- Improve PO confirmation rate (target 90%+)
- Investigate shipping accuracy issues

---

## Analysis Functions

### Revenue at Risk Detection

**Purpose**: Identifies SKUs that are out of stock but had recent sales, representing lost revenue opportunity.

**Function**: `processRevenueRisk()` - Code.js:2400+

#### Out-of-Stock Detection Logic

1. **Primary Method**: Check FBA Inventory health status column
   - Columns checked: `fba-inventory-level-health-status`, `inventory-level-health-status`, `health-status`
   - If contains "out of stock" -> flagged

2. **Fallback Method**: Calculate available pipeline inventory
   - **Available Pipeline** = fulfillable + inbound (working + shipped + receiving) + future supply
   - **EXCLUDES reserved units** (being researched, damaged, quality hold, not sellable)
   - If available pipeline = 0 -> flagged as out of stock

3. **Sales Requirement**: Must have 90-day sales
   - Check T90 business report for units > 0
   - No longer requires 365-day sales (simplified in v206)

4. **Result**: SKUs meeting all criteria appear in Revenue at Risk section
   - Sorted by lost revenue per day (highest first)
   - Top 10 displayed on dashboard

#### Key Fix (v207)
Reserved inventory now properly excluded from out-of-stock detection. Previously, SKUs with only reserved units (like 5 units being researched) were incorrectly considered "in stock."

#### Column Names Used (FBA Inventory Report)
- `afn-fulfillable-quantity` or `available`: Immediately sellable units
- `afn-reserved-quantity` or `Total Reserved Quantity`: Units held/researched (NOT counted as available)
- `afn-inbound-working-quantity`, `afn-inbound-shipped-quantity`, `afn-inbound-receiving-quantity`: Inbound pipeline
- `afn-future-supply-buyable`: Future committed inventory

#### Detection Methods Tracked
Results include a `detectionMethod` field for transparency:
- `Ghost SKU (not in FBA report)`
- `Pipeline = 0 + Health Status = Out of Stock`
- `Health Status = Out of Stock`
- `Pipeline = 0`

#### Inactive Listing Handling
Amazon auto-marks FBA listings as "Inactive" when they go out of stock. The function processes ALL FBA listings (active AND inactive) to catch these items. Inactive items are displayed with an "Inactive - OOS" badge.

---

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

---

### Dual-Fulfillment Analysis (FBA + FBM for Same ASIN)

#### The Problem
When an ASIN has both FBA and FBM listings (same ASIN, different SKUs), the Revenue at Risk detection needs to:
1. Find BOTH SKUs for the ASIN
2. Check each SKU independently
3. Match sales correctly to each SKU

#### How It Works

The code loops through ALL listings and processes each SKU separately:
```javascript
data.allListings.forEach(listing => {
  const sku = getColumnValue(listing, 'sku');
  const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');

  // ONLY process FBA listings
  if (!fulfillmentChannel || fulfillmentChannel !== 'AMAZON_NA') return;

  // Check inventory and sales for this specific SKU...
});
```

**For dual-fulfillment ASIN B0759GNNZ7:**
- Listing 1: SKU="ZD-RE8V-XLEH", Fulfillment="DEFAULT" -> SKIPPED (FBM)
- Listing 2: SKU="ZD-RE8V-XLEH_FBA", Fulfillment="AMAZON_NA" -> PROCESSED (FBA)

#### Sales Attribution in Business Reports

**Scenario 1: Amazon Aggregates Sales by ASIN (Most Common)**
```
ASIN         | SKU              | Units | Revenue
B0759GNNZ7   | ZD-RE8V-XLEH     | 28    | $1089.72
```
- Matches by ASIN -> WORKS

**Scenario 2: Amazon Separates Sales by SKU (Rare)**
```
ASIN         | SKU              | Units | Revenue
B0759GNNZ7   | ZD-RE8V-XLEH     | 20    | $800.00  (FBM)
B0759GNNZ7   | ZD-RE8V-XLEH_FBA | 8     | $289.72  (FBA)
```
- Matches by exact SKU first, then falls back to ASIN

#### Potential Issues
- For dual-fulfillment, FBA SKU might get credited with ALL sales (FBA + FBM)
- Lost revenue calculation might be inflated if most sales are FBM

---

### Key Data Relationships

#### Revenue at Risk Calculation
```
FOR EACH FBA SKU in All Listings (active + inactive):
  1. Get T90 sales data (units + revenue)
  2. Get current inventory from FBA Snapshot
  3. Calculate available pipeline: fulfillable + inbound + future supply (EXCLUDES reserved)
  4. IF available pipeline = 0 AND T90 units > 0:
     -> FLAG as Revenue at Risk
     -> Priority = T90 revenue (higher revenue = higher priority)
```

#### Days of Supply Calculation
```
FOR EACH SKU with inventory:
  1. Get current inventory from FBA Snapshot (fulfillable + inbound)
  2. Get AWD inventory if available (available + inbound)
  3. Total Inventory = FBA + AWD
  4. Get T30 sales from Business Report
  5. Daily Velocity = T30 units / 30 days
  6. Days of Supply = Total Inventory / Daily Velocity

Example:
  FBA Inventory: 150 units
  AWD Inventory: 450 units
  Total: 600 units
  T30 Sales: 240 units
  Daily Velocity: 8 units/day
  Days of Supply: 600 / 8 = 75 days
```

#### Ghost SKU Detection
```
STEP 1: Get all SKUs from previous FBA Snapshot (stored in PropertiesService)
STEP 2: Get all SKUs from current FBA Snapshot
STEP 3: Find SKUs that disappeared:
  Ghost SKUs = Previous Snapshot SKUs - Current Snapshot SKUs

STEP 4: For each Ghost SKU:
  1. Check if it had T90 sales
  2. If YES -> Add to Ghost Registry
  3. Calculate revenue at risk based on T90 data

STEP 5: Auto-cleanup:
  - Remove ghosts older than 60 days
  - Remove ghosts that reappeared in inventory
  - Keep max 50 ghosts per client (prioritized by revenue)
```

#### FBM to FBA Conversion
```
FOR EACH listing in All Listings:
  1. Check: fulfillment-channel = "Merchant" (FBM)
  2. Check: status = "Active"
  3. Get T60 sales data
  4. IF T60 sales > 0:
     -> FLAG as FBM to FBA candidate
     -> Show sales volume to justify conversion
```

#### Excess Inventory Identification
```
FOR EACH SKU in FBA Inventory Age Report:
  1. Get age bucket values:
     - inv-age-181-to-270-days
     - inv-age-271-to-365-days
     - inv-age-365-plus-days
  2. Total Aged Units = sum of all 181+ buckets
  3. IF Total Aged Units > 0:
     -> FLAG as Excess Inventory
     -> Priority Score = (365+ x 3) + (271-365 x 2) + (181-270 x 1)
     -> Sort by highest priority first
```

---

## Column Mapping System

Amazon reports have inconsistent column names across accounts and over time. The system uses flexible column mapping (Code.js:6-25):

```javascript
const COLUMN_MAPPINGS = {
  sku: ['seller-sku', 'SKU', 'sku', 'Seller SKU', 'Seller_SKU', 'merchant-sku', 'seller_sku'],
  asin: ['asin1', 'asin', 'ASIN', 'asin-1', 'asin_1', '(Child) ASIN', 'Child ASIN'],
  status: ['status', 'Status', 'STATUS', 'listing-status', 'listing_status'],
  fulfillmentChannel: ['fulfillment-channel', 'Fulfillment Channel', 'fulfillment_channel', 'fulfillment channel', 'channel', 'fulfillment-channel-id'],
  itemName: ['item-name', 'product-name', 'Product Name', 'title', 'Title', 'item_name', 'product_name', 'item-description'],
  price: ['price', 'Price', 'your-price', 'Your Price', 'your_price', 'item-price'],
  quantity: ['quantity', 'Quantity', 'qty', 'quantity-available'],
  inventoryHealthStatus: ['fba-inventory-level-health-status', 'inventory-level-health-status', 'health-status']
};
```

**Usage**: Use `getColumnValue(item, 'sku')` instead of direct property access to handle variations.

### Complete Column Name Variations

#### SKU Variations
`seller-sku`, `SKU`, `sku`, `Seller SKU`, `Seller_SKU`, `merchant-sku`, `seller_sku`

#### ASIN Variations
`asin1`, `asin`, `ASIN`, `asin-1`, `asin_1`, `(Child) ASIN`, `Child ASIN`

#### Status Variations
`status`, `Status`, `STATUS`, `listing-status`, `listing_status`

#### Fulfillment Channel Variations
`fulfillment-channel`, `Fulfillment Channel`, `fulfillment_channel`, `fulfillment channel`, `channel`, `fulfillment-channel-id`

#### Product Name Variations
`item-name`, `product-name`, `Product Name`, `title`, `Title`, `item_name`, `product_name`, `item-description`

#### Price Variations
`price`, `Price`, `your-price`, `Your Price`, `your_price`, `item-price`

#### Sales Variations
`Units Ordered`, `Units Ordered - Sales Channel`
`Ordered Product Sales`, `Product Sales - Sales Channel`

#### Inventory Quantity Variations
`afn-fulfillable-quantity`, `Available`
`afn-inbound-shipped-quantity`, `Inbound`
`afn-warehouse-quantity`, `afn-total-quantity`

---

## State Management

### PropertiesService Usage
- `metrics_{clientId}`: Stores previous metrics for change detection
- `changes_{clientId}`: Stores calculated metric changes
- `ghost_skus_{clientId}`: Ghost SKU registry
- `currentClientConfig`: Active client configuration
- `loading_progress_{clientId}`: Loading state for frontend polling

### Storage Limits
- Total limit: 500KB for all properties
- Per-property limit: 9KB
- Current usage with 50 clients: ~50-100KB for ghost SKUs + existing metrics

### Data Freshness & Caching

**Snapshot Date Tracking**:
- FBA Inventory Snapshot includes `snapshot-date` field
- Dashboard displays this date to users
- Used to detect stale data (if snapshot > 24 hours old, warn user)

**Client Config Caching**:
- Client configurations cached for 5 minutes
- Reduces API calls to config Google Sheet
- Balances performance vs freshness

**Loading Progress**:
- Each report has a weight (percentage of total load time)
- Dashboard updates loading progress bar as each report loads
- Prevents timeout issues on large datasets

---

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

### Error Handling & Validation

**Missing Reports**:
- Required: T7, T30, T60, T90, T180, T365, FBA Inventory, FBA Snapshot, All Listings
- Optional: Holiday Data, AWD, Vendor Central
- If optional missing -> Feature gracefully disabled
- If required missing -> Error message with instructions

**Column Validation**:
- All Listings Report validated for mandatory columns (sku, status, fulfillmentChannel)
- If columns missing -> Error shows which columns were searched and found
- Uses flexible column mapping to handle name variations

**Data Quality Checks**:
- Checks for empty reports (0 rows)
- Validates numeric fields parse correctly
- Handles missing/null values gracefully
- Logs warnings for suspicious data (e.g., units but no revenue)

### Testing in Apps Script Editor
- Run test functions directly: `testGhostSkuDetection('clientId')`
- Use debug endpoints: `?debug=config`, `?debug=trends`, etc.
- Check execution logs in Apps Script dashboard
- Test with multiple client IDs to verify multi-tenant behavior

---

## File Structure

**Core Files (Required for Apps Script)**:
- `Code.js`: Main application logic (~4500 lines)
- `dashboard.html`: Frontend template with embedded JavaScript
- `styles.html`: CSS styles (included in dashboard)
- `logo.html`: Base64 encoded logo image
- `appsscript.json`: Apps Script project configuration

**Configuration Files**:
- `.clasp.json`: clasp deployment configuration
- `.claspignore`: Files to exclude from clasp push
- `.gitignore`: Files to exclude from git

**Documentation**:
- `CLAUDE.md`: This file - comprehensive project documentation

---

## Important Code Locations

| Feature | Location |
|---------|----------|
| Column mapping definition | Code.js:6-25 |
| Column value helper | Code.js:17-25 |
| Client config loading | Code.js:66-145 |
| Main data loader | Code.js:1210-1294 |
| Ghost SKU system | Code.js:1458-1627 |
| Sales lookup helper | Code.js:1646-1681 |
| Revenue at Risk analysis | Code.js:1911-2087 |
| Storage monitoring | Code.js:1465-1569 |

---

## Troubleshooting & Diagnostics

### Issue: Items Not Showing in Revenue at Risk

**Diagnosis:**
1. Run `diagnoseUjramelsonRevenueRisk()` in Apps Script (or equivalent for your client)
2. Check if SKU is in All Listings
3. Verify SKU is FBA (fulfillment = AMAZON_NA)
4. Check if SKU has T90 sales

**Common Causes:**
- SKU is FBM, not FBA
- SKU has inventory (available pipeline > 0)
- SKU has no recent sales (T90 units = 0)
- Data issue in client's sheets

### Issue: Too Many False Positives

**Diagnosis:**
1. Run test functions to see breakdown
2. Check detection methods
3. Review health status values

**Fix:** May need to adjust health status check or add filters

### Issue: JavaScript Errors

**Diagnosis:**
1. Open browser console (F12)
2. Identify specific error
3. Check Code.js for syntax errors

**Fix:** Likely typo or missing field, fix and redeploy

### Issue: Performance Slowdown

**Diagnosis:**
1. Check Apps Script execution logs: `clasp logs`
2. Time dashboard load
3. Compare to other clients

**Fix:** May need to optimize data processing or reduce result sets

### Diagnostic Functions

```javascript
// Check storage usage across all clients
checkStorageUsage();

// Test ghost SKU detection for a client
testGhostSkuDetection('clientId');

// View current ghost SKUs for a client
viewGhostSkus('clientId');

// Test revenue risk fix
testRevenueRiskFix();
```

---

## Version History & Changelogs

### Version 207 (2025-11-06) - Revenue at Risk Fix

**Critical Fix: Reserved Inventory Handling**

**Problem**: SKUs with **only reserved inventory** (units being researched, damaged, or in quality hold) were incorrectly considered "in stock" and not flagged in Revenue at Risk.

**Root Cause**: Out-of-stock detection was checking if `totalPipeline === 0`, which included reserved units. Reserved units are NOT available to sell.

**Solution**: Created separate calculation for **available pipeline** that excludes reserved units:
```javascript
const availablePipeline = fulfillable + inboundWorking + inboundShipped + inboundReceiving + futureSupplyBuyable;
if (availablePipeline === 0) {
  isOutOfStock = true;
}
```

**Impact**:
- SKUs with only reserved inventory now correctly flagged as out of stock
- Revenue at Risk section shows all truly out-of-stock SKUs
- Better visibility into lost revenue from stuck/researched inventory

### Version 206 - Simplified Sales Requirements

**Before**: Required both 90-day revenue > 0 AND 365-day units > 0
**After**: Only requires 90-day units > 0

**Rationale**: If a SKU had sales in the last 90 days and is now out of stock, it's losing revenue - period.

### Inactive FBA Listings Fix

**Two-Pronged Approach**:
1. **Include inactive FBA listings**: Amazon auto-marks items inactive when OOS
2. **Health Status Check**: Use Amazon's "fba-inventory-level-health-status" column as secondary detection

**Detection Logic After Fix**:
```
All Listings -> Filter: FBA only (active + inactive) -> Check OOS conditions -> Check sales -> Flag
                                                              |
                                               Pipeline = 0  OR  Health Status = "Out of Stock"
```

**Now Catches**:
- Active FBA with pipeline = 0
- Inactive FBA with pipeline = 0 (NEW!)
- Active FBA with Health Status = "Out of Stock" (NEW!)
- Inactive FBA with Health Status = "Out of Stock" (NEW!)
- Ghost SKUs (not in FBA report at all)

---

## Quick Reference: Report Usage Matrix

| Dashboard Feature | Primary Reports Used | Supporting Reports |
|------------------|---------------------|-------------------|
| **Revenue at Risk** | All Listings, FBA Snapshot, T90 Business Report | Ghost SKU registry |
| **Excess Inventory** | FBA Inventory Age | All Listings (for titles) |
| **SKU Trends** | T365, T90, T60, T30, FBA Snapshot | AWD (optional), All Listings (prices) |
| **FBM to FBA** | All Listings, T60 Business Report | All Listings (prices) |
| **LILF Monitor** | FBA Snapshot | T60 Business Report |
| **Holiday Planning** | Holiday Data (Nov/Dec), All Listings | FBA Snapshot, AWD |
| **Vendor Central** | Vendor Central Report | All Listings (prices) |

---

## Summary

VelocityDashboard synthesizes **7-9 separate Amazon reports** to provide actionable inventory intelligence:

1. **Business Reports (T7-T365)**: What sold, when, and for how much
2. **FBA Inventory Age**: Which inventory is costing excessive storage fees
3. **FBA Inventory Snapshot**: What's in stock right now and what's coming
4. **All Listings**: Master catalog of active/inactive products and prices
5. **Holiday Data**: Historical seasonal patterns for forecasting
6. **AWD**: Bulk storage inventory positions
7. **Vendor Central**: Amazon's inventory health from vendor perspective

By combining these data sources, the dashboard identifies:
- **Revenue opportunities** (out-of-stock products losing sales)
- **Cost savings** (aged inventory to liquidate before fees accumulate)
- **Operational insights** (products to convert from FBM to FBA)
- **Inventory planning** (days of supply, velocity trends)
- **Seasonal forecasting** (holiday demand predictions)

Each report serves a specific purpose, and their intersection creates insights that no single report could provide alone.
