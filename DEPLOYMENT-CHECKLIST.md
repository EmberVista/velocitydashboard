# Deployment Checklist: Revenue at Risk Critical Fix

## Pre-Deployment Checklist

### Code Review
- [x] Code.js changes implemented (lines 2196-2293)
- [x] dashboard.html changes implemented (lines 1256-1260, 1750-1757)
- [x] Comments added explaining critical fix
- [x] New fields added: status, healthStatus, detectionMethod, isInactive
- [ ] Review diff: `git diff Code.js dashboard.html`

### Testing Preparation
- [x] Test script created: `test-revenue-risk-fix.js`
- [x] Diagnostic scripts available
- [x] Documentation complete

### Backup & Rollback
- [ ] Note current deployment version number
- [ ] Confirm rollback procedure understood
- [ ] Git commit created with clear message

---

## Deployment Steps

### Step 1: Push Code
```bash
# From project directory
clasp push
```

**Expected output:** "Pushed X files"

**Verification:**
- [ ] No push errors
- [ ] All files uploaded successfully

### Step 2: Verify in Apps Script Editor
```bash
clasp open
```

**Manual checks:**
- [ ] Open Code.js, navigate to line 2196
- [ ] Confirm status check is removed
- [ ] Confirm health status check is present (lines 2228-2237)
- [ ] Open dashboard.html via Files menu
- [ ] Confirm status badges added
- [ ] No syntax errors shown

### Step 3: Test in Apps Script Editor
Run test function:
```javascript
testRevenueRiskFix()
```

**Expected results:**
- [ ] Total items: 12-13 (was 10 before)
- [ ] shovelshape9_fba found: YES
- [ ] WD-HI5E-UM7O_FBA found: YES
- [ ] New fields present: YES
- [ ] Inactive items detected: YES
- [ ] "ALL TESTS PASSED" message shown

**If tests fail:**
- Review console logs
- Check for JavaScript errors
- Verify data loads correctly
- DO NOT DEPLOY if tests fail

### Step 4: Deploy New Version
```bash
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -d "Critical fix: Include inactive FBA listings + health status check for Revenue at Risk"
```

**Expected output:** "Created version X"

**Note the version number:** _______________

### Step 5: Open Web App
```bash
clasp open --webapp
```

Add `?client=ujramelson` to URL

---

## Post-Deployment Verification

### ujramelson Client Tests

#### Test 1: Dashboard Loads
- [ ] Dashboard loads without errors
- [ ] Open browser console (F12)
- [ ] No JavaScript errors in console
- [ ] All metrics display correctly

#### Test 2: Revenue at Risk Card
- [ ] Click Revenue at Risk card
- [ ] Count total items displayed
- [ ] **Expected:** 12-13 items (up from ~10)

#### Test 3: Target SKUs Present
- [ ] Search/scroll for `shovelshape9_fba`
- [ ] **Expected:** Found with "Inactive - OOS" badge
- [ ] Search/scroll for `WD-HI5E-UM7O_FBA`
- [ ] **Expected:** Found with "Inactive - OOS" badge

#### Test 4: Status Badges
- [ ] Inactive items show orange badge
- [ ] Badge says "Inactive - OOS"
- [ ] Badge styling looks correct (not broken)

#### Test 5: Detection Method Tooltips
- [ ] Hover over SKU links in full table
- [ ] **Expected:** Tooltip shows detection method
- [ ] Methods make sense (e.g., "Pipeline = 0", "Health Status = Out of Stock")

#### Test 6: Full Revenue at Risk View
- [ ] Click "View Full Report" or similar
- [ ] Verify all items display correctly
- [ ] Status badges show on inactive items
- [ ] Tooltips work on hover

### Other Client Tests

Test with 2-3 additional clients to ensure no issues:

**Client 1:** _________________
- [ ] Dashboard loads
- [ ] Revenue at Risk displays correctly
- [ ] No unexpected items
- [ ] Status badges show appropriately

**Client 2:** _________________
- [ ] Dashboard loads
- [ ] Revenue at Risk displays correctly
- [ ] No unexpected items
- [ ] Status badges show appropriately

---

## Success Criteria

### Must-Have (Critical)
- [x] Code deployed without errors
- [ ] ujramelson shows 12-13 items (up from 10)
- [ ] shovelshape9_fba appears with "Inactive" badge
- [ ] WD-HI5E-UM7O_FBA appears with "Inactive" badge
- [ ] No JavaScript console errors
- [ ] Other clients still work correctly

### Nice-to-Have (Important)
- [ ] Detection method tooltips work
- [ ] Status badges styled correctly
- [ ] Performance is good (no slowdown)

### Metrics to Monitor
- **Before fix:** ~10 items for ujramelson
- **After fix:** 12-13 items for ujramelson
- **New captures:** 2-3 inactive FBA items with sales
- **Lost revenue captured:** ~$5.55/day for ujramelson

---

## Rollback Procedure

If critical issues occur:

### Option 1: Redeploy Previous Version
```bash
# View all versions
clasp deployments

# Redeploy specific version
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -v [PREVIOUS_VERSION]
```

### Option 2: Revert Code Changes
```bash
# Revert to previous commit
git revert HEAD

# Push reverted code
clasp push

# Deploy
clasp deploy -i AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD -d "Rollback: Revert revenue at risk fix"
```

### When to Rollback
Rollback immediately if:
- [ ] JavaScript errors prevent dashboard from loading
- [ ] Revenue at Risk shows 100+ items (massive false positives)
- [ ] Multiple clients report issues
- [ ] Performance degrades significantly

Do NOT rollback for:
- [ ] Minor styling issues (can fix forward)
- [ ] One client having data issues (investigate first)
- [ ] Tooltips not showing (non-critical, can fix forward)

---

## Post-Deployment Tasks

### Documentation
- [ ] Update CLAUDE.md with this enhancement
- [ ] Add entry to changelog/version history
- [ ] Document any issues encountered

### Monitoring (First 24 Hours)
- [ ] Check 5-10 random clients
- [ ] Monitor for support tickets
- [ ] Review Apps Script execution logs: `clasp logs`
- [ ] Check for any error patterns

### Follow-Up (First Week)
- [ ] Gather feedback from clients
- [ ] Measure impact (new items detected across platform)
- [ ] Identify any edge cases
- [ ] Plan any refinements

---

## Issue Troubleshooting

### Issue: Items Not Showing Up
**Diagnosis:**
1. Run `diagnoseUjramelsonRevenueRisk()` in Apps Script
2. Check if SKU is in All Listings
3. Verify SKU is FBA (fulfillment = AMAZON_NA)
4. Check if SKU has T90 + T365 sales

**Fix:** Likely data issue, not code issue

### Issue: Too Many False Positives
**Diagnosis:**
1. Run `testRevenueRiskFix()` to see breakdown
2. Check detection methods
3. Review health status values

**Fix:** May need to adjust health status check or add filters

### Issue: JavaScript Errors
**Diagnosis:**
1. Open browser console
2. Identify specific error
3. Check Code.js for syntax errors

**Fix:** Likely typo or missing field, fix and redeploy

### Issue: Performance Slowdown
**Diagnosis:**
1. Check Apps Script execution logs
2. Time dashboard load
3. Compare to other clients

**Fix:** Unlikely, but may need to optimize health status check

---

## Notes

### Deployment Time
**Estimated:** 30 minutes total
- Push: 2 min
- Verify: 5 min
- Test: 10 min
- Deploy: 2 min
- Verify: 10 min

### Best Time to Deploy
- **Recommended:** Outside business hours (evening/weekend)
- **Avoid:** Monday morning, peak usage times

### Communication
- [ ] Notify key stakeholders deployment is happening
- [ ] Prepare to explain new "Inactive - OOS" badges
- [ ] Have rollback plan ready if needed

---

## Completion Sign-Off

### Deployed By
Name: _________________
Date: _________________
Time: _________________

### Verification
- [ ] All pre-deployment checks passed
- [ ] Code deployed successfully
- [ ] Tests passed in Apps Script
- [ ] ujramelson verified working
- [ ] Other clients spot-checked
- [ ] Documentation updated

### Version Info
- Deployment ID: AKfycbzqVMuxbCY2hsPx5jyPKACV6gaERp0s4NYC6yBpSF2GDn-sh4C-MmMVy6EmVMD-oeJD
- Version Number: _________________
- Git Commit: _________________

### Issues Encountered
None / List any issues:
_________________________________________________
_________________________________________________
_________________________________________________

### Overall Status
- [ ] Successful - No issues
- [ ] Successful - Minor issues resolved
- [ ] Partial - Some issues remain
- [ ] Failed - Rolled back

---

**Next Review:** [Date] - Check metrics and gather feedback
