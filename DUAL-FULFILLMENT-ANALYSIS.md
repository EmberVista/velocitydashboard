# Dual-Fulfillment Analysis (FBA + FBM for Same ASIN)

## The Problem

When an ASIN has both FBA and FBM listings (same ASIN, different SKUs), the Revenue at Risk detection needs to:
1. Find BOTH SKUs for the ASIN
2. Check each SKU independently
3. Match sales correctly to each SKU

## Current Code Behavior

### How `processRevenueRisk()` Works (Code.js:2180-2275)

```javascript
data.allListings.forEach(listing => {
  const sku = getColumnValue(listing, 'sku');
  const status = getColumnValue(listing, 'status');
  const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');
  const asin = getColumnValue(listing, 'asin');

  // ONLY process active FBA listings
  if (!status || status.toLowerCase() !== 'active') return;
  if (!fulfillmentChannel || fulfillmentChannel !== 'AMAZON_NA') return;

  // Check inventory and sales for this specific SKU...
});
```

**Good News:** The code DOES loop through ALL listings, so it processes each SKU separately.

**For dual-fulfillment ASIN B0759GNNZ7:**
- Listing 1: SKU="ZD-RE8V-XLEH", Fulfillment="DEFAULT" → **SKIPPED** (not FBA)
- Listing 2: SKU="ZD-RE8V-XLEH_FBA", Fulfillment="AMAZON_NA" → **PROCESSED** (if active)

## Sales Attribution Issue

### How `findSalesForSKU()` Works (Code.js:2062-2097)

When checking sales for an FBA SKU, it tries three matching methods:

```javascript
const record = salesReport.find(row => {
  const childAsin = row['(Child) ASIN'] || row['Child ASIN'] || row['ASIN'];
  const reportSku = row['SKU'] || row['sku'];

  return (childAsin && childAsin === asin) ||  // Match by ASIN
         (reportSku && reportSku === sku) ||   // Match by exact SKU
         (childAsin && childAsin === sku);     // Edge case
});
```

### Scenarios in Business Reports

**Scenario 1: Amazon Aggregates Sales by ASIN (Most Common)**
```
Business Report T90:
ASIN         | SKU              | Units | Revenue
B0759GNNZ7   | ZD-RE8V-XLEH     | 28    | $1089.72
```

When checking FBA SKU "ZD-RE8V-XLEH_FBA":
- ✅ Matches by ASIN (B0759GNNZ7)
- ✅ **WORKS** - Sales will be found

**Scenario 2: Amazon Separates Sales by SKU (Rare)**
```
Business Report T90:
ASIN         | SKU              | Units | Revenue
B0759GNNZ7   | ZD-RE8V-XLEH     | 20    | $800.00  (FBM sales)
B0759GNNZ7   | ZD-RE8V-XLEH_FBA | 8     | $289.72  (FBA sales)
```

When checking FBA SKU "ZD-RE8V-XLEH_FBA":
- ✅ Matches by ASIN (finds first row - FBM sales)
- ⚠️ **ISSUE** - `.find()` returns FIRST match only
- ⚠️ **COULD WORK** - Depends on row order

**Scenario 3: Amazon Only Shows Fulfilled Sales (Edge Case)**
```
Business Report T90:
ASIN         | SKU              | Units | Revenue
B0759GNNZ7   | ZD-RE8V-XLEH     | 28    | $1089.72  (Only FBM shown)
```

When checking FBA SKU "ZD-RE8V-XLEH_FBA":
- ✅ Matches by ASIN (B0759GNNZ7)
- ⚠️ **FALSE POSITIVE** - Attributes FBM sales to FBA SKU

## Potential Issues

### Issue 1: Multiple Rows Per ASIN in Business Report
If the business report has multiple rows for the same ASIN (one per SKU), `find()` only returns the first match.

**Impact:**
- If FBM row comes first, FBA SKU gets credited with FBM sales ✓ (works but misleading)
- If FBA row comes first, FBM sales are ignored ✓ (correct behavior)

**Fix:**
Use `.filter()` to find ALL rows for the ASIN, then sum them:
```javascript
const records = salesReport.filter(row => {
  const childAsin = row['(Child) ASIN'] || row['Child ASIN'] || row['ASIN'];
  return childAsin === asin;
});
const totalUnits = records.reduce((sum, row) => sum + parseInt(row['Units Ordered'] || 0), 0);
```

### Issue 2: FBA Listing is Inactive
From the diagnostic:
- B0759GNNZ7: User says BOTH FBA and FBM are active
- B01LY0A06K: FBA version is **INACTIVE**
- B01K2MA1VS: FBA version is **INACTIVE**

**Impact:**
- Inactive FBA listings are correctly excluded from Revenue at Risk
- User needs to reactivate the FBA listing in Seller Central

### Issue 3: Sales Attribution Ambiguity
When sales occur through both FBA and FBM for the same ASIN, Amazon's business report might:
- Show one aggregated row (most common)
- Show separate rows per SKU (rare)
- Only show the primary fulfillment method

**Impact:**
- FBA SKU might get credited with ALL sales (including FBM)
- Lost revenue calculation might be inflated

## Diagnostic Results Needed

Run `diagnoseDualFulfillmentASINs()` to determine:

1. **For each ASIN, how many SKUs exist?**
   - Are there really 2 SKUs (FBA + FBM)?
   - What are the exact SKU names?

2. **What is the status of each SKU?**
   - Is the FBA version truly Active?
   - Is the FBM version Active?

3. **What inventory does the FBA SKU have?**
   - Is totalPipeline = 0?
   - Or does it have hidden inventory (future-supply, etc.)?

4. **How does the business report show sales?**
   - One row per ASIN (aggregated)?
   - Multiple rows per ASIN (split by SKU)?
   - Which SKU is shown in the report?

## Recommended Solutions

### Solution 1: Fix Inactive FBA Listings (Immediate)
For B01LY0A06K and B01K2MA1VS:
1. Go to Amazon Seller Central
2. Reactivate the FBA listings
3. Once active, they'll appear in Revenue at Risk

### Solution 2: Improve Sales Matching for Dual-Fulfillment
Modify `findSalesForSKU()` to aggregate ALL rows for an ASIN:

```javascript
function findSalesForSKU(salesReport, sku, asin, priceMap) {
  // Try exact SKU match first (most accurate)
  const exactSkuMatch = salesReport.find(row => {
    const reportSku = row['SKU'] || row['sku'];
    return reportSku === sku;
  });

  if (exactSkuMatch) {
    // Found exact SKU match, use it
    const units = parseInt(exactSkuMatch['Units Ordered'] || 0);
    const revenue = parseFloat((exactSkuMatch['Ordered Product Sales'] || '0').toString().replace(/[$,]/g, ''));
    if (units > 0 || revenue > 0) {
      return { units, revenue };
    }
  }

  // Fallback: Find all rows for this ASIN and aggregate
  const asinMatches = salesReport.filter(row => {
    const childAsin = row['(Child) ASIN'] || row['Child ASIN'] || row['ASIN'];
    return childAsin === asin;
  });

  if (asinMatches.length > 0) {
    const totalUnits = asinMatches.reduce((sum, row) => sum + parseInt(row['Units Ordered'] || 0), 0);
    let totalRevenue = asinMatches.reduce((sum, row) => {
      return sum + parseFloat((row['Ordered Product Sales'] || '0').toString().replace(/[$,]/g, ''));
    }, 0);

    // Price fallback if needed
    if (totalRevenue === 0 && totalUnits > 0 && priceMap && asin) {
      const price = priceMap.get(asin);
      if (price) {
        totalRevenue = totalUnits * price;
      }
    }

    if (totalUnits > 0 || totalRevenue > 0) {
      return { units: totalUnits, revenue: totalRevenue };
    }
  }

  return null;
}
```

**Pros:**
- Tries exact SKU match first (most accurate)
- Falls back to ASIN match and aggregates ALL rows
- Handles both single-row and multi-row scenarios

**Cons:**
- For dual-fulfillment, FBA SKU gets credited with ALL sales (FBA + FBM)
- Lost revenue might be inflated if most sales are FBM

### Solution 3: Add Fulfillment-Specific Sales Tracking (Advanced)
Track which fulfillment method was used for each sale:
- Requires Amazon's "Fulfillment Channel" data in business reports
- Most business reports don't include this column
- Would need "All Orders" report instead (more complex)

### Solution 4: Add Warning for Dual-Fulfillment ASINs
Add a flag in the Revenue at Risk results:

```javascript
// In processRevenueRisk(), after finding an at-risk SKU
const allSkusForAsin = data.allListings.filter(l => getColumnValue(l, 'asin') === asin);
const hasBothFulfillment = allSkusForAsin.some(l => getColumnValue(l, 'fulfillmentChannel') === 'AMAZON_NA') &&
                          allSkusForAsin.some(l => getColumnValue(l, 'fulfillmentChannel') === 'DEFAULT');

results.push({
  // ... existing fields
  isDualFulfillment: hasBothFulfillment,
  warning: hasBothFulfillment ? 'This ASIN has both FBA and FBM listings. Sales may include both.' : null
});
```

## Next Steps

1. **Run the diagnostic** to see exact SKU details and sales attribution
2. **Reactivate inactive FBA listings** if needed
3. **Consider implementing Solution 2** to improve sales matching
4. **Consider implementing Solution 4** to warn about dual-fulfillment scenarios
