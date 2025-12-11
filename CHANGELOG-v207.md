# Version 207 - Revenue at Risk Fix

**Date**: 2025-11-06
**Deployment**: Version @207

## Critical Fix: Reserved Inventory Handling

### Problem
SKUs with **only reserved inventory** (units being researched, damaged, or in quality hold) were incorrectly considered "in stock" and not flagged in the Revenue at Risk section.

**Example Case**:
- SKU: B0C8PNZWYM (Pink Luster Dust Edible 15G)
- Fulfillable: 0 units
- Reserved: 5 units (being researched)
- Status: Should be OUT OF STOCK, but was not being flagged

### Root Cause
The out-of-stock detection was checking if `totalPipeline === 0`, which included reserved units:
```javascript
// OLD (Incorrect)
totalPipeline = fulfillable + reserved + inbound + futureSupply
if (totalPipeline === 0) {
  isOutOfStock = true;
}
```

Reserved units are **NOT available to sell** - they're stuck in research, quality hold, or damaged status.

### Solution
Created separate calculation for **available pipeline** that excludes reserved units:
```javascript
// NEW (Correct) - Code.js:2546-2553
const availablePipeline = fulfillable + inboundWorking + inboundShipped + inboundReceiving + futureSupplyBuyable;

if (availablePipeline === 0) {
  isOutOfStock = true;
}
```

### Impact
- ✅ SKUs with only reserved inventory now correctly flagged as out of stock
- ✅ Revenue at Risk section now shows all truly out-of-stock SKUs
- ✅ Better visibility into lost revenue from stuck/researched inventory

## Additional Improvements (v206-v207)

### Simplified Sales Requirements (v206)
**Before**: Required both 90-day revenue > 0 AND 365-day units > 0
**After**: Only requires 90-day units > 0

**Rationale**: If a SKU had sales in the last 90 days and is now out of stock, it's losing revenue - period. No need to check historical 365-day data.

### Ghost SKU Integration
Confirmed working - SKUs completely missing from FBA inventory but with T90 sales are now:
- ✅ Detected via `updateGhostSkuRegistry()` on each dashboard load
- ✅ Integrated into Revenue at Risk results
- ✅ Flagged with `isGhost: true` property

## Documentation Updates

### CLAUDE.md
- Added comprehensive "Revenue at Risk Detection (v207)" section
- Documented out-of-stock detection logic (both methods)
- Explained reserved inventory exclusion
- Updated Ghost SKU Tracking System details
- Updated Inventory Pipeline Calculation section

### Code.js
- Added detailed function header comment for `processRevenueRisk()`
- Explains purpose, detection methods, critical fix, and return value
- Line 2453-2473

## Testing
All changes tested with client "dazzle":
- ✅ SKU B0C8PNZWYM now appears in Revenue at Risk
- ✅ Ghost SKU detection working
- ✅ Reserved inventory properly excluded
- ✅ 90-day sales requirement working

## Deployment
```bash
clasp push
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD \
  -d "Fixed: Reserved inventory no longer counts as available - flags true out of stock"
```

**Version**: @207
**Status**: ✅ Deployed and Verified
**URL**: All client URLs remain unchanged (same deployment ID)
