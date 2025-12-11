# Amazon Reports Comprehensive Guide for VelocityDashboard

## Table of Contents
1. [Business Reports (T7, T30, T60, T90, T180, T365)](#business-reports)
2. [FBA Inventory Age Report](#fba-inventory-age-report)
3. [FBA Inventory Snapshot Report](#fba-inventory-snapshot-report)
4. [All Listings Report](#all-listings-report)
5. [Holiday Data (Optional)](#holiday-data-optional)
6. [AWD Report (Optional)](#awd-report-optional)
7. [Vendor Central Report (Optional)](#vendor-central-report-optional)
8. [Report Relationships & Data Flow](#report-relationships--data-flow)

---

## Business Reports (T7, T30, T60, T90, T180, T365)

### What Are These Reports?
Business Reports are **sales history reports** from Amazon Seller Central that show what products were actually sold during specific time periods. The "T" stands for "Time" and the number indicates the number of days.

- **T7** = Last 7 days of sales data
- **T30** = Last 30 days of sales data
- **T60** = Last 60 days of sales data
- **T90** = Last 90 days of sales data
- **T180** = Last 180 days of sales data
- **T365** = Last 365 days of sales data (full year)

### Report Location in Amazon
**Seller Central → Reports → Business Reports → Detail Page Sales and Traffic → Date Range Comparison**

### Critical Columns Explained

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **(Child) ASIN** or **Child ASIN** | Amazon Standard Identification Number for the specific product variant (e.g., "Red Large T-Shirt" vs "Blue Small T-Shirt") | **PRIMARY identifier** for matching sales to specific product variations. This is how we know WHICH exact product sold. | B08XYZABC12 |
| **SKU** | Your internal Stock Keeping Unit identifier | **SECONDARY identifier** - your own product code. Sometimes used when ASIN matching fails. | ACME-TSHIRT-RED-LG |
| **Title** or **Product Name** | The product's listing title on Amazon | Helps humans understand what product we're looking at when reviewing reports. | "Men's Cotton T-Shirt, Red, Large" |
| **Units Ordered** or **Units Ordered - Sales Channel** | How many units customers actually purchased | Used to calculate **sales velocity** (how fast products sell). Essential for inventory planning. | 145 units |
| **Ordered Product Sales** or **Product Sales - Sales Channel** | Total dollar amount customers paid for these units | Used to calculate **revenue** and prioritize which products matter most to your business. | $2,175.00 |

### Important Notes About Business Reports

1. **Parent vs Child ASINs**:
   - A "Parent ASIN" represents a product family (e.g., "Men's T-Shirt")
   - "Child ASINs" represent specific variations (e.g., "Red Large", "Blue Small")
   - **VelocityDashboard ONLY uses Child ASINs** because we need to track individual SKU performance, not aggregated family data

2. **Why Multiple Time Periods?**
   - **T90** is used for "Revenue at Risk" analysis (detecting out-of-stock products with recent sales)
   - **T60** is used for "FBM to FBA" conversion opportunities (products selling via Merchant Fulfilled that should convert to FBA)
   - **T365** is used for long-term trends and Days of Supply calculations
   - **T30** is used for recent velocity changes

3. **Revenue Fallback Logic**:
   - Sometimes Amazon's reports are missing revenue data (shows $0 even with units sold)
   - When this happens, VelocityDashboard calculates revenue by multiplying Units × Price (from All Listings Report)

### What VelocityDashboard Uses This Data For

- **Revenue at Risk**: Identifies products that sold well recently (T90) but are now out of stock
- **Ghost SKU Detection**: Finds products that completely disappeared from inventory but had recent sales
- **Sales Velocity**: Calculates how many units sell per day (used for Days of Supply calculations)
- **Trend Analysis**: Compares T30 vs T60 to show if products are accelerating or decelerating
- **Holiday Planning**: Uses historical year data (T365) to forecast seasonal demand

---

## FBA Inventory Age Report

### What Is This Report?
The **FBA Inventory Age Report** shows your inventory stored at Amazon's warehouses (FBA = Fulfilled by Amazon), broken down by **how long it's been sitting there**. Amazon charges higher storage fees for inventory that ages beyond certain thresholds.

### Report Location in Amazon
**Seller Central → Reports → Fulfillment → Inventory Age**

### Why This Report Exists
Amazon wants to discourage sellers from using their warehouses as long-term storage. The longer inventory sits unsold, the higher the storage fees become. After 181 days (about 6 months), fees increase significantly. This report helps you identify "aged inventory" that's costing you money.

### Critical Columns Explained

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **sku** or **seller-sku** | Your SKU identifier | Identifies which of YOUR products this row describes | ACME-WIDGET-001 |
| **asin** or **asin1** | Amazon's product identifier | Matches this inventory to product listings and sales data | B08XYZABC12 |
| **product-name** or **Product Name** | Product title | Human-readable description of what this inventory is | "Wireless Mouse, Black" |
| **inv-age-181-to-270-days** | Units that have been in Amazon's warehouse for 181-270 days | **WARNING ZONE**: Inventory approaching high storage fees. Needs action soon. | 23 units |
| **inv-age-271-to-365-days** | Units stored for 271-365 days | **CRITICAL ZONE**: Very high storage fees. Should liquidate/remove ASAP. | 8 units |
| **inv-age-365-plus-days** | Units stored over 365 days (1+ years) | **EMERGENCY**: Extremely high fees, potential for forced removal. Immediate action required. | 2 units |
| **qty-to-be-charged-ais-181-210-days** | Units subject to Aged Inventory Surcharge (181-210 day bucket) | Amazon charges EXTRA fees on top of storage for inventory this old | 15 units |
| **estimated-storage-cost-181-to-270-days** | Estimated monthly storage fee for 181-270 day inventory | Shows actual dollar cost of letting inventory age | $34.50 |
| **estimated-excess-storage-cost** | Additional penalty fees for overstocked/aged items | Extra charges beyond normal storage fees | $12.25 |

### Important Age Thresholds

- **0-180 days**: Normal storage fees (acceptable)
- **181-270 days**: Higher storage fees + Aged Inventory Surcharge begins
- **271-365 days**: Very high fees + larger surcharges
- **365+ days**: Extreme fees + risk of forced removal by Amazon

### What VelocityDashboard Uses This Data For

**Excess Inventory Alert**: Automatically identifies products with ANY units in the 181+ day buckets and prioritizes them by:
1. Oldest inventory first (365+ days gets highest priority)
2. Total aged units
3. Estimated monthly costs

The dashboard calculates a "priority score" based on how old the inventory is, helping you decide which products to discount, promote, or remove first.

### Actionable Insights From This Report

When VelocityDashboard flags aged inventory, sellers should:
- Run Lightning Deals or promotions to move aged stock
- Reduce prices to accelerate sales
- Create removal orders to pull inventory out before fees accumulate
- Stop sending more inventory for these SKUs until aged stock clears

---

## FBA Inventory Snapshot Report

### What Is This Report?
The **FBA Inventory Snapshot Report** is a real-time view of ALL inventory currently at Amazon's fulfillment centers. Think of it as "what's physically in the warehouse right now" plus "what's on the way."

### Report Location in Amazon
**Seller Central → Reports → Fulfillment → Amazon Fulfilled Inventory**

### Critical Columns Explained

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **sku** or **seller-sku** | Your SKU identifier | Primary key for inventory lookup | ACME-WIDGET-001 |
| **asin** or **ASIN** | Amazon product identifier | Links inventory to product listings | B08XYZABC12 |
| **product-name** or **title** | Product title | Human-readable name | "Wireless Mouse, Black" |
| **snapshot-date** or **Snapshot Date** | Date/time this report was generated | **CRITICAL**: Shows how fresh the data is. Inventory changes constantly, so we track this timestamp. | 2025-01-15 08:30:00 |
| **afn-fulfillable-quantity** | Units available to sell RIGHT NOW | **MOST IMPORTANT**: This is your "on the shelf" inventory that can ship to customers immediately | 145 units |
| **afn-reserved-quantity** | Units reserved for customer orders | Already sold but not yet shipped. These units are spoken for. | 12 units |
| **afn-inbound-working-quantity** | Units in shipment plans you created but haven't shipped yet | Inventory you told Amazon is coming, but still at your warehouse/supplier | 50 units |
| **afn-inbound-shipped-quantity** | Units you shipped to Amazon that are in transit | On the truck/plane heading to Amazon's warehouse | 200 units |
| **afn-inbound-receiving-quantity** | Units that arrived at Amazon but not yet checked in | At Amazon's dock, being unloaded and counted | 30 units |
| **afn-warehouse-quantity** or **afn-total-quantity** | Total units physically at Amazon's warehouses | Sum of fulfillable + reserved quantities | 157 units |
| **afn-future-supply-buyable** | Units in future shipment plans not yet started | Inventory you planned to send in future shipments | 100 units |
| **afn-reserved-future-supply** | Future supply units already reserved | Reserved units from future planned shipments | 5 units |

### Understanding the Inventory Pipeline

VelocityDashboard uses this report to calculate **total inventory pipeline**:

```
Total Pipeline = fulfillable + reserved + inbound_working + inbound_shipped + inbound_receiving + future_supply
```

This gives a complete picture of inventory position:
- **What's sellable now** (fulfillable)
- **What's coming soon** (inbound)
- **What's planned** (future supply)

### What VelocityDashboard Uses This Data For

1. **Revenue at Risk Detection**:
   - If `total pipeline = 0` AND product had recent sales (from Business Reports) → FLAG as revenue at risk
   - Calculates exact quantities for each inventory stage (fulfillable, inbound, etc.)

2. **Ghost SKU Detection**:
   - Compares previous snapshot to current snapshot
   - If a SKU **disappears entirely** from this report but still has T90 sales → It's a "ghost SKU" losing revenue

3. **Days of Supply Calculation**:
   - Takes `fulfillable + inbound` inventory
   - Divides by daily sales velocity (from T30 Business Report)
   - Result = "How many days until you run out of stock at current sales rate"

4. **Inventory Health Status**:
   - Uses **fba-inventory-level-health-status** column to identify SKUs flagged by Amazon as "Low Inventory" (LILF risk)

### Snapshot Date Importance

The `snapshot-date` field is used to:
- Show users when data was last refreshed
- Compare snapshots over time to detect inventory changes
- Validate that data isn't stale (Amazon updates this daily)

---

## All Listings Report

### What Is This Report?
The **All Listings Report** is a complete catalog of every product listing in your Amazon Seller Central account, regardless of whether it's active, inactive, or archived. It shows the **current state** of your listings.

### Report Location in Amazon
**Seller Central → Inventory → Inventory Reports → All Listings Report**

### Critical Columns Explained

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **seller-sku** or **SKU** | Your internal product identifier | Primary key for identifying products | ACME-WIDGET-001 |
| **asin1** or **asin** | Amazon's product identifier | Links to sales data and inventory | B08XYZABC12 |
| **status** or **Status** | Current listing status | **CRITICAL**: Only "Active" listings can sell. Identifies which products are live on Amazon. | Active, Inactive, Incomplete |
| **fulfillment-channel** or **Fulfillment Channel** | How orders will be fulfilled | **FBA = "DEFAULT"** (Amazon ships), **FBM = "Merchant"** (seller ships). Determines which products are FBA vs FBM. | DEFAULT, Merchant |
| **item-name** or **product-name** or **Title** | Product listing title | What customers see on Amazon | "Wireless Mouse with USB Receiver, Black" |
| **your-price** or **price** or **Price** | Current selling price | Used as **fallback** when Business Reports don't have revenue data. Critical for revenue calculations. | $29.99 |
| **quantity** or **Quantity** | Current available quantity | For FBM products, shows how many you have to sell | 15 units |
| **condition** | Product condition | New, Used, Refurbished, etc. | New |

### Fulfillment Channel Deep Dive

Understanding fulfillment channels is critical:

| Channel Value | What It Means | Implications |
|--------------|---------------|--------------|
| **DEFAULT** | Amazon fulfills (FBA) | Inventory at Amazon, faster shipping, Prime eligible |
| **Merchant** | You fulfill (FBM) | Inventory at your warehouse, you handle shipping |

### What VelocityDashboard Uses This Data For

1. **FBM to FBA Conversion Analysis**:
   - Finds products with `fulfillment-channel = "Merchant"` AND `status = "Active"`
   - Checks if these products had sales in T60 Business Report
   - Recommends converting high-volume FBM products to FBA for better performance

2. **Price Mapping (Revenue Fallback)**:
   - Builds a map of ASIN → Price from ALL active listings
   - When Business Reports show units sold but $0 revenue, uses: `Revenue = Units × Price`
   - Only uses prices from **active** listings with valid price values

3. **SKU to ASIN Mapping**:
   - Creates reverse lookup table: ASIN → [list of SKUs]
   - Handles cases where one ASIN has multiple SKUs (variations)
   - Critical for matching Business Report sales (by ASIN) to specific SKUs

4. **Revenue at Risk Identification**:
   - Loops through ALL active FBA listings (`fulfillment-channel = "DEFAULT"` AND `status = "Active"`)
   - Checks each against FBA Inventory Report to determine stock status
   - Identifies which active listings have zero stock but recent sales

5. **Product Title Enrichment**:
   - Uses product names from All Listings to make reports human-readable
   - Falls back to All Listings title if other reports have truncated/missing titles

### Column Mapping Flexibility

VelocityDashboard uses a **flexible column mapping system** because Amazon's All Listings Report has different column name variations across accounts:

```javascript
COLUMN_MAPPINGS = {
  sku: ['seller-sku', 'SKU', 'sku', 'Seller SKU', 'Seller_SKU', 'merchant-sku', 'seller_sku'],
  asin: ['asin1', 'asin', 'ASIN', 'asin-1', 'asin_1'],
  status: ['status', 'Status', 'STATUS', 'listing-status', 'listing_status'],
  fulfillmentChannel: ['fulfillment-channel', 'Fulfillment Channel', 'fulfillment_channel', ...],
  price: ['price', 'Price', 'your-price', 'Your Price', 'your_price', 'item-price']
}
```

This ensures the software works regardless of which column name format Amazon uses.

### Validation Requirements

VelocityDashboard validates that All Listings Report contains:
- **sku** (one of the valid column names)
- **status** (to filter active listings)
- **fulfillmentChannel** (to distinguish FBA from FBM)

If these columns are missing, the dashboard returns an error showing:
- Which columns it looked for
- Which columns were actually found
- Guidance for fixing the issue

---

## Holiday Data (Optional)

### What Is This Report?
**Holiday Data** is a collection of **Business Reports from previous years' holiday seasons** (specifically November and December). This historical data is used for **seasonal forecasting** and **holiday inventory planning**.

### Report Structure
Unlike other reports, Holiday Data consists of **multiple separate Business Reports**:
- November 2024 (30 days)
- December 2024 (31 days)
- November 2023 (30 days)
- December 2023 (31 days)
- (Can include earlier years if desired)

### Why This Report Exists
Holiday seasons (Q4: October-December) generate **massive sales spikes** for most Amazon sellers. By analyzing previous years' holiday performance, sellers can:
- Forecast 2025 holiday demand
- Ensure sufficient inventory to avoid stockouts during peak season
- Identify which products spike during holidays vs those that don't

### Critical Columns Explained
Holiday Data files use the **same format as Business Reports** (see Business Reports section above):

| Column Name | What It Means | Why It's Important |
|------------|---------------|-------------------|
| **(Child) ASIN** | Product identifier | Match sales to specific products |
| **Units Ordered** | Units sold during that month | Calculate monthly demand patterns |
| **Ordered Product Sales** or **Product Sales - Sales Channel** | Revenue for that month | Prioritize which products to stock heavily |
| **Title** | Product name | Help identify seasonal vs year-round products |

### What VelocityDashboard Uses This Data For

1. **Holiday Sales Analysis**:
   - Compares November + December sales to year-round average
   - Identifies products with **holiday multipliers** (e.g., "This product sells 3x normal volume in November")

2. **Inventory Planning Recommendations**:
   - Calculates: `Recommended Holiday Stock = Normal Velocity × Holiday Multiplier × 60 days`
   - Flags products that need extra stock sent before holiday rush

3. **SKU-ASIN Matching for Historical Data**:
   - Uses All Listings Report to map historical ASINs to current active SKUs
   - Handles cases where you sold products in previous holidays that you might not sell this year

4. **Unmatched Product Warnings**:
   - Identifies ASINs that had holiday sales in past but aren't currently active
   - Suggests reactivating these products for upcoming holiday season

### Example Use Case

**Product: "Christmas Tree Ornaments Set"**
- January-October: Sells 10 units/day average
- November: Sold 450 units (15 units/day)
- December: Sold 900 units (30 units/day)

**Dashboard Calculation**:
- Holiday multiplier = 2.5x (average of 15 and 30 divided by 10)
- Recommended inventory for Q4: 60 days × 20 units/day average = 1,200 units
- Alert: "Send extra 800 units before October to prepare for holiday spike"

---

## AWD Report (Optional)

### What Is AWD?
**AWD = Amazon Warehousing and Distribution**

AWD is a separate Amazon service that provides **low-cost bulk storage** outside of FBA fulfillment centers. Inventory is stored at AWD facilities and automatically transferred to FBA warehouses as needed. It's cheaper than FBA storage but doesn't fulfill orders directly.

### Report Location in Amazon
**Seller Central → Reports → Amazon Warehousing & Distribution → Inventory Report**

### Why Use AWD?
- **Lower storage costs** than FBA (bulk storage rates vs fulfillment center rates)
- **Automatic replenishment** to FBA as stock runs low
- **Avoid aged inventory fees** (inventory at AWD doesn't count toward FBA aging thresholds)
- **Better for seasonal products** (store bulk holiday inventory cheaply, transfer to FBA gradually)

### Report Structure (Unique Format)

**AWD reports have a special format**:
- Headers are in **Row 4** (not Row 1 like other reports)
- Data starts at **Row 5**
- Report includes metadata in top 3 rows

### Critical Columns Explained

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **SKU** (not FNSKU) | Your product SKU | Matches to your other reports | ACME-WIDGET-001 |
| **Inbound to AWD (Units)** | Units in transit TO AWD facility | Inventory on the way to bulk storage (not yet available) | 500 units |
| **Available in AWD (Units)** | Units physically at AWD ready for transfer | Your "reserve inventory" that can be sent to FBA when needed | 2,000 units |

### What VelocityDashboard Uses This Data For

1. **Combined Inventory View**:
   - Adds AWD inventory to FBA inventory for total inventory position
   - Formula: `Total Inventory = FBA Inventory + AWD Inbound + AWD Available`

2. **Days of Supply Calculation (Enhanced)**:
   - Old calculation: Only counted FBA inventory
   - New calculation: Includes AWD inventory since it auto-transfers to FBA
   - Result: More accurate stockout predictions

3. **SKU Trends Dashboard**:
   - Shows **FBA-only inventory** (what's available to ship now)
   - Shows **Total inventory including AWD** (your complete inventory position)
   - Helps sellers understand: "I have 3 days in FBA but 60 days total with AWD"

### Example Scenario

**Product: Wireless Mouse**
- FBA fulfillable: 50 units (3 days of supply at current velocity)
- AWD available: 950 units
- AWD inbound: 500 units

**Without AWD visibility**: Dashboard shows "URGENT: Only 3 days of stock!"
**With AWD visibility**: Dashboard shows "3 days FBA, 100 days total (AWD auto-replenishment active)"

This prevents false alarms and unnecessary panic ordering.

### Technical Implementation Notes

VelocityDashboard includes special handling for AWD:
1. Detects if AWD sheet URL is configured (optional)
2. Looks for headers in Row 4 (not Row 1)
3. Finds columns by partial match: "inbound to awd", "available in awd"
4. Maps AWD inventory by SKU (not ASIN, since AWD uses seller SKUs)
5. Returns empty map if AWD not configured (graceful degradation)

---

## Vendor Central Report (Optional)

### What Is Vendor Central?
**Vendor Central** is a completely different business model from Seller Central:
- **Seller Central** (FBA/FBM): You sell TO customers, Amazon facilitates
- **Vendor Central**: You sell TO Amazon (wholesale), Amazon resells to customers

In Vendor Central, **you are Amazon's supplier**. Amazon issues Purchase Orders (POs) to you, and you ship inventory to Amazon who then owns and sells it.

### Report Location in Amazon
**Vendor Central → Analytics → Inventory Health**

### Critical Columns Explained

| Column Name | What It Means | Why It's Important | Example |
|------------|---------------|-------------------|---------|
| **ASIN** | Amazon product identifier | Product this row describes | B08XYZABC12 |
| **Title** or **Product Name** | Product listing title | Human-readable identifier | "Wireless Mouse, Black" |
| **Sellable Units** | Units Amazon currently has available to sell | Your product inventory that Amazon owns and can ship to customers | 1,250 units |
| **Unfilled Customer Orders** | Orders Amazon couldn't fulfill due to being out of stock | **CRITICAL ALERT**: These are LOST SALES happening RIGHT NOW. Immediate action required. | 23 orders |
| **Open Purchase Order Quantity** | Units Amazon has ordered from you but you haven't shipped | Amazon's request for more inventory. You need to fulfill this PO. | 500 units |
| **Net Received Units** | Units Amazon received from you during reporting period | Shows velocity of your shipments to Amazon | 1,200 units |
| **Aged 90+ Units** | Units sitting at Amazon 90+ days without selling | Slow-moving inventory. Amazon may stop ordering or return to you. | 45 units |
| **Sell Through Rate (%)** | (Units sold / Units available) × 100 | Percentage of available inventory that actually sold. Higher = better. 20%+ is healthy. | 65% |
| **Vendor Confirmation (%)** | Percentage of PO quantity you confirmed to ship | Shows your reliability. 80%+ is expected. Below 80% may damage relationship. | 92% |
| **Received Fill (%)** | Percentage of confirmed PO quantity Amazon actually received | Shows shipping accuracy. 95%+ is expected. Below 95% indicates shipping problems. | 98% |
| **Overall Vendor Lead Time (days)** | Days from PO creation to delivery at Amazon's warehouse | How fast you fulfill orders. Faster = better. Amazon prefers 7-14 days. | 12 days |

### Status Classification System

VelocityDashboard categorizes each ASIN into one of 4 status levels:

| Status | Color | Criteria | Meaning |
|--------|-------|----------|---------|
| **Critical** | 🔴 Red | Unfilled Customer Orders > 0 | **LOST SALES RIGHT NOW** - Customers are trying to buy but Amazon is out of stock |
| **Urgent** | 🟠 Orange | Days of Supply < 30 | **STOCKOUT IMMINENT** - Will run out within 30 days at current sales rate |
| **Warning** | 🟡 Yellow | Aged 90+ inventory OR Sell-through < 20% OR Process issues | **OVERSTOCK OR PROBLEMS** - Inventory not moving efficiently OR operational issues |
| **Healthy** | 🟢 Green | None of the above | **OPTIMAL** - Good inventory levels, no issues |

### What VelocityDashboard Uses This Data For

1. **Critical Alerts**:
   - Identifies ASINs with unfilled orders (lost sales)
   - Shows exact number of orders being missed
   - Generates urgent recommendations to expedite shipments

2. **Urgency Ranking**:
   - Calculates days of supply based on net received velocity
   - Flags ASINs with < 30 days of stock
   - Prioritizes by lowest days of supply first

3. **Aged Inventory Warnings**:
   - Identifies products with 90+ day aged units
   - Flags products with < 20% sell-through rate
   - Recommends promotions, price adjustments, or removing slow products

4. **Process Health Monitoring**:
   - Tracks Vendor Confirmation % (are you accepting POs reliably?)
   - Tracks Received Fill % (are your shipments accurate?)
   - Flags operational issues that could damage Amazon relationship

5. **Predictive Stockout Analysis**:
   - Formula: `Days of Supply = Sellable Units ÷ (Net Received Units ÷ Reporting Period Days)`
   - Predicts which products will stockout first
   - Generates prioritized action list

### Example Dashboard Output

```
CRITICAL ISSUES (3 ASINs):
• B08XYZ123: 23 unfilled orders - LOSING SALES NOW
• B08ABC456: 15 unfilled orders - LOSING SALES NOW
• B08DEF789: 8 unfilled orders - LOSING SALES NOW

URGENT ISSUES (5 ASINs):
• B08GHI321: Only 12 days of supply (450 units) - Expedite PO fulfillment
• B08JKL654: Only 18 days of supply (230 units) - Increase shipment frequency

WARNINGS (8 ASINs):
• B08MNO987: 245 units aged 90+ days (42% sell-through) - Run promotion to move stock
• B08PQR246: 12% sell-through rate - Review pricing and listing optimization
```

### Actionable Insights

When VelocityDashboard flags Vendor Central issues:

**For Critical (Unfilled Orders)**:
- Contact Amazon Vendor Manager immediately
- Expedite shipments via air freight if necessary
- Increase buffer stock to prevent future stockouts

**For Urgent (Low Days of Supply)**:
- Review open POs and confirm quantities
- Ship open PO quantities ASAP
- Discuss increasing PO frequency with Amazon

**For Warning (Aged Inventory)**:
- Request promotional support from Amazon (Lightning Deals, coupons)
- Review pricing strategy
- Consider discontinuing slow-moving SKUs
- Improve listing content (images, bullets, A+ Content)

**For Process Issues**:
- Improve PO confirmation rate (target 90%+)
- Investigate shipping accuracy issues
- Reduce lead times to meet Amazon's expectations

---

## Report Relationships & Data Flow

### How Reports Work Together

VelocityDashboard combines multiple reports to generate actionable insights. Here's how data flows:

```
┌─────────────────────────────────────────────────────────┐
│                   ALL LISTINGS REPORT                   │
│  (Master catalog - active/inactive status, prices)      │
└───────────────┬──────────────────────────────────┬──────┘
                │                                  │
                ├──> Provides SKU-ASIN mapping    │
                ├──> Provides prices for revenue  │
                ├──> Identifies FBA vs FBM        │
                │                                  │
┌───────────────▼──────────────┐    ┌──────────────▼──────────────┐
│   BUSINESS REPORTS (T7-T365)  │    │  FBA INVENTORY SNAPSHOT     │
│   (What sold & when)          │    │  (What's in stock now)      │
└───────────────┬──────────────┘    └──────────────┬──────────────┘
                │                                   │
                ├──> Sales units & revenue          ├──> Current quantities
                ├──> Sales velocity (units/day)     ├──> Inbound shipments
                │                                   ├──> Reserved units
                │                                   │
┌───────────────▼───────────────────────────────────▼──────────────┐
│              COMBINED ANALYSIS CALCULATIONS                       │
│  • Revenue at Risk = Sales (T90) + Zero Stock (Snapshot)         │
│  • Days of Supply = Inventory (Snapshot) ÷ Velocity (T30)        │
│  • Velocity Trend = T30 Sales vs T60 Sales                       │
│  • Ghost SKUs = SKUs in T90 Sales but NOT in Snapshot            │
└──────────────────────────────────┬───────────────────────────────┘
                                   │
                  ┌────────────────┼────────────────┐
                  │                │                │
      ┌───────────▼───────┐  ┌────▼─────┐  ┌──────▼──────┐
      │ FBA INVENTORY AGE │  │   AWD    │  │   HOLIDAY   │
      │ (Aged inventory)  │  │ (Backup) │  │  (Seasonal) │
      └───────────┬───────┘  └────┬─────┘  └──────┬──────┘
                  │                │                │
                  ├──> Flag aged   ├──> Add buffer  ├──> Forecast
                  │    inventory   │    inventory   │    Q4 demand
                  │                │                │
         ┌────────▼────────────────▼────────────────▼────────┐
         │           DASHBOARD OUTPUT                         │
         │  • Excess Inventory (age report)                   │
         │  • Revenue at Risk (sales + stock)                 │
         │  • SKU Trends (velocity + inventory)               │
         │  • FBM to FBA (listings + sales)                   │
         │  • Holiday Planning (historical patterns)          │
         └────────────────────────────────────────────────────┘
```

### Key Data Relationships

#### 1. Revenue at Risk Calculation
```
FOR EACH active FBA SKU in All Listings:
  1. Get T90 sales data (units + revenue)
  2. Get current inventory from FBA Snapshot
  3. Calculate total pipeline: fulfillable + reserved + inbound + future supply
  4. IF pipeline = 0 AND T90 sales > 0:
     → FLAG as Revenue at Risk
     → Priority = T90 revenue (higher revenue = higher priority)
```

#### 2. Days of Supply Calculation
```
FOR EACH SKU with inventory:
  1. Get current inventory from FBA Snapshot (fulfillable + inbound)
  2. Get AWD inventory if available (available + inbound)
  3. Total Inventory = FBA + AWD
  4. Get T30 sales from Business Report
  5. Daily Velocity = T30 units ÷ 30 days
  6. Days of Supply = Total Inventory ÷ Daily Velocity

Example:
  FBA Inventory: 150 units
  AWD Inventory: 450 units
  Total: 600 units
  T30 Sales: 240 units
  Daily Velocity: 8 units/day
  Days of Supply: 600 ÷ 8 = 75 days
```

#### 3. Ghost SKU Detection
```
STEP 1: Get all SKUs from previous FBA Snapshot (stored in PropertiesService)
STEP 2: Get all SKUs from current FBA Snapshot
STEP 3: Find SKUs that disappeared:
  Ghost SKUs = Previous Snapshot SKUs - Current Snapshot SKUs

STEP 4: For each Ghost SKU:
  1. Check if it had T90 sales
  2. If YES → Add to Ghost Registry
  3. Calculate revenue at risk based on T90 data

STEP 5: Auto-cleanup:
  - Remove ghosts older than 60 days
  - Remove ghosts that reappeared in inventory
  - Keep max 50 ghosts per client (prioritized by revenue)
```

#### 4. FBM to FBA Conversion
```
FOR EACH listing in All Listings:
  1. Check: fulfillment-channel = "Merchant" (FBM)
  2. Check: status = "Active"
  3. Get T60 sales data
  4. IF T60 sales > 0:
     → FLAG as FBM to FBA candidate
     → Show sales volume to justify conversion
     → Estimate potential revenue improvement
```

#### 5. Excess Inventory Identification
```
FOR EACH SKU in FBA Inventory Age Report:
  1. Get age bucket values:
     - inv-age-181-to-270-days
     - inv-age-271-to-365-days
     - inv-age-365-plus-days
  2. Total Aged Units = sum of all 181+ buckets
  3. IF Total Aged Units > 0:
     → FLAG as Excess Inventory
     → Priority Score = (365+ × 3) + (271-365 × 2) + (181-270 × 1)
     → Sort by highest priority first
```

### Data Freshness & Caching

**Snapshot Date Tracking**:
- FBA Inventory Snapshot includes `snapshot-date` field
- Dashboard displays this date to users
- Used to detect stale data (if snapshot is > 24 hours old, warn user)

**Client Config Caching**:
- Client configurations cached for 5 minutes
- Reduces API calls to config Google Sheet
- Balances performance vs freshness

**Loading Progress**:
- Each report has a weight (percentage of total load time)
- Dashboard updates loading progress bar as each report loads
- Prevents timeout issues on large datasets

### Error Handling & Validation

**Missing Reports**:
- Required: T7, T30, T60, T90, T180, T365, FBA Inventory, FBA Snapshot, All Listings
- Optional: Holiday Data, AWD, Vendor Central
- If optional missing → Feature gracefully disabled
- If required missing → Error message with instructions

**Column Validation**:
- All Listings Report validated for mandatory columns (sku, status, fulfillmentChannel)
- If columns missing → Error shows which columns were searched and which were found
- Uses flexible column mapping to handle name variations

**Data Quality Checks**:
- Checks for empty reports (0 rows)
- Validates numeric fields parse correctly
- Handles missing/null values gracefully
- Logs warnings for suspicious data (e.g., units but no revenue)

---

## Appendix: Column Name Variations

Amazon's reports use inconsistent column naming. VelocityDashboard handles these variations:

### SKU Variations
- `seller-sku`, `SKU`, `sku`, `Seller SKU`, `Seller_SKU`, `merchant-sku`, `seller_sku`

### ASIN Variations
- `asin1`, `asin`, `ASIN`, `asin-1`, `asin_1`, `(Child) ASIN`, `Child ASIN`

### Status Variations
- `status`, `Status`, `STATUS`, `listing-status`, `listing_status`

### Fulfillment Channel Variations
- `fulfillment-channel`, `Fulfillment Channel`, `fulfillment_channel`, `fulfillment channel`, `channel`, `fulfillment-channel-id`

### Product Name Variations
- `item-name`, `product-name`, `Product Name`, `title`, `Title`, `item_name`, `product_name`, `item-description`

### Price Variations
- `price`, `Price`, `your-price`, `Your Price`, `your_price`, `item-price`

### Sales Variations
- `Units Ordered`, `Units Ordered - Sales Channel`
- `Ordered Product Sales`, `Product Sales - Sales Channel`

### Inventory Quantity Variations
- `afn-fulfillable-quantity`, `Available`
- `afn-inbound-shipped-quantity`, `Inbound`
- `afn-warehouse-quantity`, `afn-total-quantity`

---

## Quick Reference: Report Usage Matrix

| Dashboard Feature | Primary Reports Used | Supporting Reports |
|------------------|---------------------|-------------------|
| **Revenue at Risk** | All Listings, FBA Snapshot, T90 Business Report | Ghost SKU registry (PropertiesService) |
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
2. **FBA Inventory Age**: Which inventory is costing you excessive storage fees
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
