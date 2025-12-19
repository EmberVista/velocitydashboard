// Cache for storing data update timestamps
const CACHE_KEY_LAST_UPDATE = 'LAST_DATA_UPDATE';
const cache = CacheService.getScriptCache();

// Column mapping for flexible All Listings Report support
const COLUMN_MAPPINGS = {
  sku: ['seller-sku', 'SKU', 'sku', 'Seller SKU', 'Seller_SKU', 'merchant-sku', 'seller_sku'],
  asin: ['asin1', 'asin', 'ASIN', 'asin-1', 'asin_1'],
  status: ['status', 'Status', 'STATUS', 'listing-status', 'listing_status'],
  fulfillmentChannel: ['fulfillment-channel', 'Fulfillment Channel', 'fulfillment_channel', 'fulfillment channel', 'channel', 'fulfillment-channel-id'],
  itemName: ['item-name', 'product-name', 'Product Name', 'title', 'Title', 'item_name', 'product_name', 'item-description'],
  price: ['price', 'Price', 'your-price', 'Your Price', 'your_price', 'item-price'],
  quantity: ['quantity', 'Quantity', 'qty', 'quantity-available'],
  inventoryHealthStatus: ['fba-inventory-level-health-status', 'inventory-level-health-status', 'health-status']
};

// Helper function to get column value with multiple fallbacks
function getColumnValue(item, columnType) {
  const possibleNames = COLUMN_MAPPINGS[columnType] || [];
  for (const name of possibleNames) {
    if (item[name] !== undefined && item[name] !== null && item[name] !== '') {
      return item[name];
    }
  }
  return null;
}

// Validate All Listings Report has required columns
function validateAllListingsReport(data) {
  if (!data || data.length === 0) {
    return { valid: false, message: 'All Listings Report is empty' };
  }

  const firstRow = data[0];
  const availableColumns = Object.keys(firstRow);
  const missingColumns = [];

  // Check for mandatory columns
  const mandatoryColumns = ['sku', 'status', 'fulfillmentChannel'];

  for (const columnType of mandatoryColumns) {
    const value = getColumnValue(firstRow, columnType);
    if (value === null) {
      missingColumns.push(`${columnType} (looked for: ${COLUMN_MAPPINGS[columnType].join(', ')})`);
    }
  }

  if (missingColumns.length > 0) {
    return {
      valid: false,
      message: `Missing required columns: ${missingColumns.join('; ')}`,
      availableColumns: availableColumns
    };
  }

  return { valid: true, message: 'All required columns found' };
}

// Multi-Client Configuration
// IMPORTANT: Create a Google Sheet with client configurations and update this ID
const CLIENT_CONFIG_SHEET_ID = '1hA6LHmhwh8f_lcrnRznR64XP4CTn3YTLJbEhJ76eNOI'; // TODO: Replace with your config sheet ID

// Cache for client configurations
const configCache = CacheService.getScriptCache();

// Load client configuration from Google Sheets
function loadClientConfig(clientId, forceRefresh = false) {
  if (!clientId) return null;
  
  // Check cache first (unless force refresh)
  const cacheKey = `client_config_${clientId}`;
  if (!forceRefresh) {
    const cached = configCache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  }
  
  try {
    const sheet = SpreadsheetApp.openById(CLIENT_CONFIG_SHEET_ID);
    const dataRange = sheet.getSheetByName('Sheet1').getDataRange();
    const data = dataRange.getValues();
    
    // Find headers
    const headers = data[0];
    const clientIdIndex = headers.indexOf('client_id');
    const displayNameIndex = headers.indexOf('display_name');
    const activeIndex = headers.indexOf('active');
    
    // Find client row
    const clientRow = data.find((row, index) => {
      return index > 0 && row[clientIdIndex] === clientId && row[activeIndex] === true;
    });
    
    if (!clientRow) {
      console.error(`Client not found or inactive: ${clientId}`);
      return null;
    }
    
    // Build configuration object
    const config = {
      name: clientId,
      displayName: clientRow[displayNameIndex],
      sheets: {
        't7': clientRow[headers.indexOf('t7_sheet_url')],
        't30': clientRow[headers.indexOf('t30_sheet_url')],
        't60': clientRow[headers.indexOf('t60_sheet_url')],
        't90': clientRow[headers.indexOf('t90_sheet_url')],
        't180': clientRow[headers.indexOf('t180_sheet_url')],
        't365': clientRow[headers.indexOf('t365_sheet_url')],
        'fba': clientRow[headers.indexOf('fba_sheet_url')],
        'fba-inventory': clientRow[headers.indexOf('fba_inventory_sheet_url')],
        'all-listings': clientRow[headers.indexOf('all_listings_sheet_url')],
        'holiday-data': clientRow[headers.indexOf('holiday_data_sheet_url')] || null,
        'awd': clientRow[headers.indexOf('awd_sheet_url')] || null,
        'vendor': clientRow[headers.indexOf('vendor_sheet')] || null
      }
    };
    
    // Cache for 5 minutes
    configCache.put(cacheKey, JSON.stringify(config), 300);
    
    return config;
  } catch (error) {
    console.error('Error loading client config:', error);
    return null;
  }
}

// Fallback configuration for testing (used if sheet not configured)
const FALLBACK_CONFIG = {
  name: 'vertx',
  displayName: 'Vertx',
  sheets: {
    't7': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=0#gid=0',
    't30': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=764952600#gid=764952600', 
    't60': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=1389575048#gid=1389575048',
    't90': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=896040479#gid=896040479',
    't180': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=1078696352#gid=1078696352',
    't365': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=1624838395#gid=1624838395',
    'fba': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=1621414619#gid=1621414619',
    'fba-inventory': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=420619625#gid=420619625',
    'all-listings': 'https://docs.google.com/spreadsheets/d/1N6z36IXEEgD_aDpMGuidk0CgfwktTygHKtIAPOsTgWM/edit?gid=871697116#gid=871697116'
  }
};

// Main entry point
// Test function to verify Google Apps Script return values
function doGet(e) {
  // Handle action parameters FIRST before checking for client
  if (e.parameter.action) {
    // Simple test endpoint
    if (e.parameter.action === 'test') {
      return ContentService.createTextOutput('Test successful');
    }
    
    // Check config for any client
    if (e.parameter.action === 'checkconfig') {
      const clientId = e.parameter.client || 'rtic';
      const config = loadClientConfig(clientId, true);
      
      return ContentService.createTextOutput(JSON.stringify({
        clientId: clientId,
        configFound: !!config,
        displayName: config?.displayName || null,
        sheets: config?.sheets ? Object.keys(config.sheets) : null,
        error: config ? null : 'Config not found'
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Compare two clients
    if (e.parameter.action === 'compare') {
      const rticConfig = loadClientConfig('rtic', true);
      const toolsConfig = loadClientConfig('toolstoday', true);
      
      return ContentService.createTextOutput(JSON.stringify({
        rtic: {
          found: !!rticConfig,
          displayName: rticConfig?.displayName || null,
          sheets: rticConfig?.sheets ? Object.keys(rticConfig.sheets).length : 0
        },
        toolstoday: {
          found: !!toolsConfig,
          displayName: toolsConfig?.displayName || null,
          sheets: toolsConfig?.sheets ? Object.keys(toolsConfig.sheets).length : 0
        }
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Debug parameters
  if (e.parameter.debug === 'params') {
    return ContentService.createTextOutput(JSON.stringify({
      parameters: e.parameter,
      queryString: e.queryString,
      contextPath: e.contextPath,
      contentLength: e.contentLength,
      parameter: e.parameter
    }, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug RTIC data loading
  if (e.parameter.debug === 'rtic') {
    try {
      const result = loadDashboardData('rtic');
      return ContentService.createTextOutput(JSON.stringify({
        success: result ? true : false,
        hasError: result && result.error ? true : false,
        errorMessage: result && result.error ? result.message : null,
        dataKeys: result && !result.error ? Object.keys(result) : null,
        result: result
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        stack: error.stack
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Debug client config
  if (e.parameter.debug === 'config') {
    const clientId = e.parameter.client || 'rtic';
    try {
      const config = loadClientConfig(clientId, true);
      return ContentService.createTextOutput(JSON.stringify({
        clientId: clientId,
        configFound: config ? true : false,
        config: config,
        error: config ? null : 'Client not found or inactive'
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        clientId: clientId,
        error: error.toString(),
        stack: error.stack
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Direct test - RTIC should return test data
  if (e.parameter.test === 'rtic-direct') {
    console.log('Direct RTIC test requested');
    const testData = {
      fbmToFBA: [],
      excessInventory: { items: [], ageSummary: { days0_90: { units: 0, skuCount: 0 }, days91_180: { units: 0, skuCount: 0 }, days181_270: { units: 0, skuCount: 0 }, days271_365: { units: 0, skuCount: 0 }, days365Plus: { units: 0, skuCount: 0 } }, totalInventoryUnits: 0 },
      revenueRisk: [],
      skuTrends: [],
      lilfMonitor: [],
      lastUpdate: new Date().toISOString(),
      holidayPlanning: null,
      changes: {}
    };
    return ContentService.createTextOutput(JSON.stringify({
      test: 'rtic-direct',
      data: testData,
      timestamp: new Date().toISOString()
    }, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Test simple function return
  if (e.parameter.test === 'simple-return') {
    return ContentService.createTextOutput(JSON.stringify({
      test: 'simple',
      client: e.parameter.client || 'none',
      timestamp: new Date().toISOString()
    }, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Alternative debug endpoint for client data
  if (e.parameter.client === 'rtic' && e.parameter.test === 'data') {
    try {
      const result = loadDashboardData('rtic');
      return ContentService.createTextOutput(JSON.stringify({
        timestamp: new Date().toISOString(),
        client: 'rtic',
        success: result ? true : false,
        hasError: result && result.error ? true : false,
        errorMessage: result && result.error ? result.message : null,
        dataReceived: result !== null && result !== undefined,
        resultType: typeof result,
        dataKeys: result && !result.error ? Object.keys(result) : null
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        timestamp: new Date().toISOString(),
        client: 'rtic',
        success: false,
        error: error.toString(),
        stack: error.stack,
        message: error.message
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Debug Revenue at Risk
  if (e.parameter.debug === 'revenue') {
    debugRevenueAtRisk();
    return ContentService.createTextOutput('Check logs in Apps Script editor');
  }
  
  // Debug SKU Trends Analysis
  if (e.parameter.debug === 'trends') {
    const debugInfo = debugSKUTrendsAnalysis();
    return ContentService.createTextOutput(JSON.stringify(debugInfo, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug Excess Inventory
  if (e.parameter.debug === 'excess') {
    const fbaInventory = getSheetData('fba-inventory');
    const sample = fbaInventory.slice(0, 5);
    
    // Check for specific SKU
    const targetSku = 'FBA-46189';
    const targetItem = fbaInventory.find(item => 
      (item['sku'] || item['SKU']) === targetSku
    );
    
    const result = {
      totalRows: fbaInventory.length,
      columns: fbaInventory.length > 0 ? Object.keys(fbaInventory[0]) : [],
      sampleData: sample,
      targetSkuFound: !!targetItem,
      targetSkuData: targetItem || 'Not found',
      processedExcess: processExcessInventory({fbaInventory: targetItem ? [targetItem] : []})
    };
    
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug Holiday Calculations
  if (e.parameter.debug === 'holiday') {
    const clientId = e.parameter.client || 'toolstoday';
    const testSku = e.parameter.sku || null;
    const result = debugHolidayCalculations(clientId, testSku);
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Simple SKU check
  if (e.parameter.debug === 'simple') {
    const t90 = getSheetData('t90');
    const allListings = getSheetData('all-listings');
    
    const result = {
      t90Rows: t90.length,
      t90Columns: t90.length > 0 ? Object.keys(t90[0]) : [],
      t90Sample: t90.slice(0, 2),
      allListingsRows: allListings.length,
      allListingsColumns: allListings.length > 0 ? Object.keys(allListings[0]).slice(0, 20) : [],
      activeCount: allListings.filter(l => l['status'] === 'Active').length
    };
    
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Temporarily serve test page
  if (e.parameter.test === '1') {
    return HtmlService.createHtmlOutputFromFile('test')
      .setTitle('Test Page');
  }
  
  // Run RTIC test
  if (e.parameter.debug === 'rtic-test') {
    const result = runRTICTest();
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug RTIC sheets
  if (e.parameter.debug === 'rtic-sheets') {
    const result = debugRTICSheets();
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug RTIC processing
  if (e.parameter.debug === 'rtic-processing') {
    const result = debugRTICProcessing();
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Test RTIC minimal
  if (e.parameter.debug === 'rtic-minimal') {
    try {
      const config = loadClientConfig('rtic', true);
      const fba = getSheetData('fba', config);
      
      // Return just the first row to test serialization
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        fbaRows: fba.length,
        firstRow: fba[0],
        columns: Object.keys(fba[0] || {})
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        error: error.message,
        stack: error.stack
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Debug data size issue
  if (e.parameter.debug === 'datasize') {
    const clientId = e.parameter.client || 'rtic';
    
    try {
      // Load dashboard data
      const dashboardData = loadDashboardData(clientId);
      
      // Calculate sizes
      const jsonString = JSON.stringify(dashboardData);
      const sizeInBytes = jsonString.length;
      const sizeInKB = sizeInBytes / 1024;
      const sizeInMB = sizeInKB / 1024;
      
      // Count items in each section
      const counts = {};
      if (dashboardData && !dashboardData.error) {
        for (const key in dashboardData) {
          if (Array.isArray(dashboardData[key])) {
            counts[key] = dashboardData[key].length;
          }
        }
      }
      
      return ContentService.createTextOutput(JSON.stringify({
        client: clientId,
        sizeInBytes: sizeInBytes,
        sizeInKB: sizeInKB.toFixed(2),
        sizeInMB: sizeInMB.toFixed(2),
        counts: counts,
        hasError: dashboardData?.error || false,
        errorMessage: dashboardData?.message || null,
        // Google Apps Script has a ~50MB limit for returned data
        exceedsLimit: sizeInMB > 50,
        warning: sizeInMB > 10 ? 'Data size is large and may cause issues' : null
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
      
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        client: clientId,
        error: error.toString(),
        message: error.message
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Debug RTIC issue
  if (e.parameter.debug === 'rtic-deep') {
    console.log('=== RTIC DEEP DEBUG ===');
    
    const result = {
      config: {},
      reportTests: {},
      error: null
    };
    
    try {
      // Test 1: Config loading
      const rticConfig = loadClientConfig('rtic', true);
      result.config = {
        found: !!rticConfig,
        displayName: rticConfig?.displayName,
        sheetsCount: rticConfig?.sheets ? Object.keys(rticConfig.sheets).length : 0
      };
      
      // Test 2: Individual reports
      const reportTypes = ['t7', 'fba', 'fba-inventory', 'all-listings'];
      for (const reportType of reportTypes) {
        try {
          const data = getSheetData(reportType, rticConfig);
          result.reportTests[reportType] = {
            success: true,
            rows: data ? data.length : 0,
            columns: data && data.length > 0 ? Object.keys(data[0]).slice(0, 5) : []
          };
        } catch (error) {
          result.reportTests[reportType] = {
            success: false,
            error: error.toString(),
            message: error.message
          };
        }
      }
      
      // Test 3: Dashboard data
      try {
        const dashboardData = loadDashboardData('rtic');
        result.dashboardData = {
          loaded: !!dashboardData,
          hasError: dashboardData?.error || false,
          errorMessage: dashboardData?.message || null
        };
      } catch (error) {
        result.dashboardData = {
          loaded: false,
          hasError: true,
          errorMessage: error.toString()
        };
      }
      
    } catch (error) {
      result.error = error.toString();
    }
    
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Holiday Planning API endpoint
  if (e.parameter.action === 'getHolidayForecast') {
    console.log('Holiday forecast API called with params:', e.parameter);
    const clientId = e.parameter.client;
    const growthFactor = parseFloat(e.parameter.growthFactor || '1.1');
    
    console.log('Processing holiday forecast for client:', clientId, 'growth:', growthFactor);
    
    try {
      const result = processSeasonalityForecast(clientId, growthFactor);
      console.log('Holiday forecast result:', result ? 'success' : 'null');
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      console.error('Holiday forecast error:', error);
      return ContentService.createTextOutput(JSON.stringify({
        error: error.toString(),
        message: 'Error processing holiday forecast'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Debug holiday config
  if (e.parameter.debug === 'holidayconfig') {
    const clientId = e.parameter.client || 'vertx';
    const config = loadClientConfig(clientId, true); // Force refresh
    
    // Also check raw sheet data
    const sheet = SpreadsheetApp.openById(CLIENT_CONFIG_SHEET_ID);
    const dataRange = sheet.getSheetByName('Sheet1').getDataRange();
    const data = dataRange.getValues();
    const headers = data[0];
    
    const result = {
      clientId: clientId,
      config: config,
      configSheetHeaders: headers,
      holidayDataUrl: config ? config.sheets['holiday-data'] : null,
      rawConfigData: config
    };
    
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug holiday data mapping
  if (e.parameter.debug === 'holidaymapping') {
    const clientId = e.parameter.client || 'vertx';
    const result = debugHolidayMapping(clientId);
    
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Debug holiday forecast processing
  if (e.parameter.debug === 'holidayforecast') {
    const clientId = e.parameter.client || 'vertx';
    const growthFactor = parseFloat(e.parameter.growthFactor || '1.1');
    
    try {
      const result = processSeasonalityForecast(clientId, growthFactor);
      return ContentService.createTextOutput(JSON.stringify(result, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        error: error.toString(),
        stack: error.stack
      }, null, 2))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Automated test suite for holiday forecast
  if (e.parameter.action === 'runHolidayTests') {
    const clientId = e.parameter.client || 'toolstoday';
    const result = runAutomatedHolidayTests(clientId);
    return ContentService.createTextOutput(JSON.stringify(result, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  // Get holiday forecast chunk (for large data sets)
  if (e.parameter.action === 'getHolidayForecastChunk') {
    const clientId = e.parameter.client;
    const chunkIndex = parseInt(e.parameter.chunkIndex || '0');
    const chunkSize = parseInt(e.parameter.chunkSize || '50');
    const growthFactor = parseFloat(e.parameter.growthFactor || '1.1');
    
    try {
      const result = getHolidayForecastChunked(clientId, growthFactor, chunkIndex, chunkSize);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        error: error.toString(),
        message: 'Error getting holiday forecast chunk'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Get holiday forecast metadata (summary info without full data)
  if (e.parameter.action === 'getHolidayForecastMeta') {
    const clientId = e.parameter.client;
    const growthFactor = parseFloat(e.parameter.growthFactor || '1.1');
    
    try {
      const result = getHolidayForecastMetadata(clientId, growthFactor);
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
      return ContentService.createTextOutput(JSON.stringify({
        error: error.toString(),
        message: 'Error getting holiday forecast metadata'
      }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  // Clear cache endpoint
  if (e.parameter.action === 'clearCache') {
    const cache = CacheService.getScriptCache();
    cache.removeAll(['client_config_' + e.parameter.client]);
    return ContentService.createTextOutput('Cache cleared for ' + e.parameter.client);
  }
  
  // Q4 Planning Tool - Hidden Feature
  if (e.parameter.q4planning === '1') {
    const clientId = e.parameter.client;
    
    // Create template and pass client ID
    const template = HtmlService.createTemplateFromFile('q4planning');
    template.clientId = clientId || '';

    return template.evaluate()
      .setTitle('Q4 Holiday Inventory Planning')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  
  // Get client ID from URL parameter
  const clientId = e.parameter.client;
  
  // If no client specified AND not a debug request, show error page
  if (!clientId && !e.parameter.debug) {
    return HtmlService.createHtmlOutput(`
      <html>
        <head>
          <title>Client Required</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #d32f2f; margin-bottom: 20px; }
            .example { background: #f5f5f5; padding: 20px; margin: 20px auto; max-width: 600px; border-radius: 8px; }
            code { background: #e0e0e0; padding: 2px 4px; border-radius: 3px; }
          </style>
        </head>
        <body>
          <h1 class="error">Client Parameter Required</h1>
          <p>Please specify a client in the URL using the <code>client</code> parameter.</p>
          <div class="example">
            <h3>Example:</h3>
            <p><code>${ScriptApp.getService().getUrl()}?client=vertx</code></p>
          </div>
        </body>
      </html>
    `);
  }
  
  // Load client configuration
  let clientConfig = null;
  
  // Try to load from Google Sheets
  if (CLIENT_CONFIG_SHEET_ID !== 'YOUR_CONFIG_SHEET_ID_HERE') {
    clientConfig = loadClientConfig(clientId);
  }
  
  // If no config found in sheet, check if it's the fallback client
  if (!clientConfig && clientId === 'vertx') {
    clientConfig = FALLBACK_CONFIG;
  }
  
  // If still no config, show error
  if (!clientConfig) {
    return HtmlService.createHtmlOutput(`
      <html>
        <head>
          <title>Client Not Found</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .error { color: #d32f2f; margin-bottom: 20px; }
            .info { background: #f5f5f5; padding: 20px; margin: 20px auto; max-width: 600px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1 class="error">Client Not Found: ${clientId}</h1>
          <p>The specified client does not exist or is not active.</p>
          <div class="info">
            <p>Please check:</p>
            <ul style="text-align: left; display: inline-block;">
              <li>The client ID is spelled correctly</li>
              <li>The client is marked as active in the configuration</li>
              <li>You have access to this client's dashboard</li>
            </ul>
          </div>
        </body>
      </html>
    `);
  }
  
  // Store config in script properties for access by other functions
  const scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperty('currentClientConfig', JSON.stringify(clientConfig));
  
  const template = HtmlService.createTemplateFromFile('dashboard');
  template.clientName = clientConfig.displayName;
  template.clientId = clientId;
  
  return template.evaluate()
    .setTitle(clientConfig.displayName + ' - Inventory Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Include function for CSS and JS files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Get Velocity Sellers logo as base64
function getVelocityLogoBase64() {
  try {
    // Get the base64 string from the logo.html file
    const logoBase64 = HtmlService.createHtmlOutputFromFile('logo').getContent().trim();
    return logoBase64;
  } catch (e) {
    console.error('Error loading logo:', e);
    // Return a transparent 1x1 PNG as fallback
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  }
}

// Get client display name
function getClientName() {
  return CLIENT_CONFIG.displayName;
}

// Get last update time from FBA Inventory snapshot date
function getLastUpdateTime(clientId) {
  // Try to get from cache first
  const cacheKey = clientId ? `LAST_UPDATE_${clientId}` : CACHE_KEY_LAST_UPDATE;
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  
  try {
    // Get client config
    let clientConfig;
    if (clientId) {
      clientConfig = loadClientConfig(clientId);
    } else {
      const scriptProperties = PropertiesService.getScriptProperties();
      const configJson = scriptProperties.getProperty('currentClientConfig');
      clientConfig = configJson ? JSON.parse(configJson) : FALLBACK_CONFIG;
    }
    
    if (!clientConfig) {
      return formatUpdateTime(new Date());
    }
    
    // Get snapshot date from FBA Inventory report
    const fbaInventoryData = getSheetData('fba-inventory', clientConfig);
    
    if (fbaInventoryData && fbaInventoryData.length > 0) {
      // Look for snapshot-date in the first row
      const firstRow = fbaInventoryData[0];
      const snapshotDate = firstRow['snapshot-date'] || firstRow['snapshot_date'] || firstRow['Snapshot Date'];
      
      if (snapshotDate) {
        // Parse the date - it should be in format like "2024-01-15"
        const date = new Date(snapshotDate);
        if (!isNaN(date.getTime())) {
          const formattedTime = formatUpdateTime(date);
          cache.put(cacheKey, formattedTime, 300); // Cache for 5 minutes
          return formattedTime;
        }
      }
    }
    
    // Fallback to checking file modification time
    const sheetUrl = clientConfig.sheets['fba-inventory'];
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch) {
      const file = DriveApp.getFileById(sheetIdMatch[1]);
      const lastUpdated = file.getLastUpdated();
      const formattedTime = formatUpdateTime(lastUpdated);
      cache.put(cacheKey, formattedTime, 300);
      return formattedTime;
    }
  } catch (e) {
    console.error('Error getting last update time:', e);
  }
  
  return formatUpdateTime(new Date());
}

// Format update time
function formatUpdateTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

// Get data from Google Sheets - FIXED VERSION
function getSheetData(reportType, clientConfig) {
  try {
    // Use provided config or fall back to script properties
    let config = clientConfig;
    
    if (!config) {
      const scriptProperties = PropertiesService.getScriptProperties();
      const configJson = scriptProperties.getProperty('currentClientConfig');
      
      if (configJson) {
        config = JSON.parse(configJson);
      } else {
        // Final fallback to hardcoded config
        config = FALLBACK_CONFIG;
      }
    }
    
    const sheetUrl = config.sheets[reportType];
    
    if (!sheetUrl || sheetUrl.includes('PASTE_')) {
      throw new Error(`Sheet URL not configured for ${reportType}`);
    }
    
    // Extract sheet ID and gid (tab ID)
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = sheetUrl.match(/[#&]gid=([0-9]+)/);
    
    if (!sheetIdMatch) {
      throw new Error(`Invalid sheet URL for ${reportType}`);
    }
    
    const sheetId = sheetIdMatch[1];
    const gid = gidMatch ? parseInt(gidMatch[1]) : 0;
    
    console.log(`Loading ${reportType} - Sheet ID: ${sheetId}, GID: ${gid}`);
    
    // Open the spreadsheet
    const spreadsheet = SpreadsheetApp.openById(sheetId);
    
    // Get the specific sheet by GID
    let sheet = null;
    const sheets = spreadsheet.getSheets();
    
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getSheetId() === gid) {
        sheet = sheets[i];
        break;
      }
    }
    
    if (!sheet) {
      // If no GID match, try by name or use first sheet
      if (gid === 0) {
        sheet = spreadsheet.getSheets()[0];
      } else {
        throw new Error(`Could not find sheet tab with GID ${gid} for ${reportType}`);
      }
    }
    
    console.log(`Found sheet: ${sheet.getName()}`);

    // Get all data including headers
    const data = sheet.getDataRange().getValues();

    // Special handling for vendor sheet which has 2 header rows
    let headers, rows, metadata = null;
    if (reportType === 'vendor') {
      console.log('Vendor sheet detected - using row 2 as headers');

      // Extract metadata from row 1 (columns J and K contain viewing range and report update date)
      const metadataRow = data[0];
      const viewingRangeCol = 9; // Column J (0-indexed)
      const reportUpdatedCol = 10; // Column K (0-indexed)

      metadata = {
        viewingRange: metadataRow[viewingRangeCol] || '',
        reportUpdated: metadataRow[reportUpdatedCol] || ''
      };

      console.log('Vendor metadata extracted:', metadata);

      headers = data[1]; // Row 2 is the actual headers
      rows = data.slice(2); // Data starts from row 3
    } else {
      headers = data[0];
      rows = data.slice(1);
    }
    
    console.log(`${reportType} has ${rows.length} rows, ${headers.length} columns`);

    // Enhanced debugging for All Listings to check column access
    if (reportType === 'all-listings') {
      console.log(`All Listings Headers: ${headers.slice(0, 10).join(', ')}...`);
      console.log(`Looking for critical columns:`);
      console.log(`- status found at index: ${headers.indexOf('status')}`);
      console.log(`- fulfillment-channel found at index: ${headers.indexOf('fulfillment-channel')}`);
      console.log(`- seller-sku found at index: ${headers.indexOf('seller-sku')}`);
      console.log(`- asin1 found at index: ${headers.indexOf('asin1')}`);

      if (rows.length > 0) {
        const firstRow = rows[0];
        console.log(`First row sample - Length: ${firstRow.length}`);
        console.log(`- status value: "${firstRow[headers.indexOf('status')]}"`);
        console.log(`- fulfillment-channel value: "${firstRow[headers.indexOf('fulfillment-channel')]}"`);
        console.log(`- seller-sku value: "${firstRow[headers.indexOf('seller-sku')]}"`);
        console.log(`- asin1 value: "${firstRow[headers.indexOf('asin1')]}"`);
      }
    }
    
    // Convert to objects
    const dataObjects = rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        // Handle undefined values and convert to string to ensure serialization
        const value = row[index];
        if (value === undefined || value === null) {
          obj[header] = '';
        } else if (typeof value === 'object' && !(value instanceof Date)) {
          // If it's an object (but not a Date), convert to string
          obj[header] = String(value);
        } else if (value instanceof Date) {
          // Special handling for SKUs that look like dates
          // If the header is SKU-related, convert to simple string
          if (header.toLowerCase().includes('sku') || header === 'seller-sku') {
            // Format as a simple number string if it looks like a year
            const year = value.getFullYear();
            if (year >= 1900 && year <= 9999) {
              obj[header] = String(year);
            } else {
              // Otherwise convert to ISO string
              obj[header] = value.toISOString();
            }
          } else {
            // For non-SKU fields, convert dates to ISO string
            obj[header] = value.toISOString();
          }
        } else {
          obj[header] = value;
        }
      });
      return obj;
    });

    // For vendor data, return both data and metadata
    if (reportType === 'vendor' && metadata) {
      return {
        data: dataObjects,
        metadata: metadata
      };
    }

    return dataObjects;
    
  } catch (error) {
    console.error(`Error fetching ${reportType}:`, error.message);
    throw new Error(`Failed to load ${reportType}: ${error.message}`);
  }
}

// Store loading progress in cache for client access
function setLoadingProgress(clientId, progress, message) {
  const cache = CacheService.getUserCache();
  const progressData = {
    progress: progress,
    message: message,
    timestamp: new Date().getTime()
  };
  cache.put(`progress_${clientId}`, JSON.stringify(progressData), 60); // Cache for 1 minute
}

// Get current loading progress
function getLoadingProgress(clientId) {
  const cache = CacheService.getUserCache();
  const data = cache.get(`progress_${clientId}`);
  if (data) {
    return JSON.parse(data);
  }
  return { progress: 0, message: 'Initializing...' };
}

// Process all reports and calculate metrics with progress tracking
function loadDashboardDataWithProgress(clientId) {
  console.log(`Starting loadDashboardDataWithProgress for client: ${clientId}`);
  console.log('Function called at:', new Date().toISOString());
  console.log('ClientId type in loadDashboardDataWithProgress:', typeof clientId);
  
  try {
    // Set initial progress
    setLoadingProgress(clientId, 0, 'Loading client configuration...');
    
    // Get client config
    let clientConfig = loadClientConfig(clientId);
    console.log(`Client config loaded:`, clientConfig ? 'Success' : 'Failed');
    console.log('Config displayName:', clientConfig?.displayName);
    
    if (!clientConfig) {
      console.error(`Client configuration not found for: ${clientId}`);
      throw new Error(`Client configuration not found for: ${clientId}`);
    }
    
    setLoadingProgress(clientId, 5, 'Configuration loaded');
    
    // Define reports to load with progress weights
    const reports = [
      { name: 't7', weight: 10, message: 'Loading 7-day sales data...' },
      { name: 't30', weight: 10, message: 'Loading 30-day sales data...' },
      { name: 't60', weight: 10, message: 'Loading 60-day sales data...' },
      { name: 't90', weight: 10, message: 'Loading 90-day sales data...' },
      { name: 't180', weight: 10, message: 'Loading 180-day sales data...' },
      { name: 't365', weight: 10, message: 'Loading 365-day sales data...' },
      { name: 'fba', weight: 15, message: 'Loading FBA inventory data...' },
      { name: 'fbaInventory', weight: 15, message: 'Loading FBA inventory details...', optional: true },
      { name: 'allListings', weight: 10, message: 'Loading all listings data...' }
    ];

    // Add vendor report if available
    if (clientConfig.sheets.vendor) {
      reports.push({ name: 'vendor', weight: 5, message: 'Loading Vendor Central data...' });
    }
    
    const data = {};
    let currentProgress = 5;
    
    // Load each report with progress updates
    for (const report of reports) {
      setLoadingProgress(clientId, currentProgress, report.message);

      try {
        data[report.name] = getSheetData(report.name.replace(/([A-Z])/g, '-$1').toLowerCase(), clientConfig);

        // Special logging for vendor data
        if (report.name === 'vendor') {
          console.log('Vendor data loaded successfully. Rows:', data[report.name] ? data[report.name].length : 0);
        }
      } catch (error) {
        console.error(`Error loading ${report.name}:`, error);
        console.error(`Error message: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);

        // For optional reports (vendor, fbaInventory), set to null and continue
        if (report.optional || report.name === 'vendor' || report.name === 'fbaInventory') {
          data[report.name] = null;
          console.log(`${report.name} set to null due to error (optional report)`);
        }
        // Continue with other reports
      }

      currentProgress += report.weight;
    }
    
    setLoadingProgress(clientId, 95, 'Processing dashboard metrics...');
    
    // Build price map from All Listings for revenue calculation fallback
    const priceMap = buildAsinPriceMap(data.allListings);

    // Build AWD inventory map
    const awdInventoryMap = buildAWDInventoryMap(clientConfig);

    // Debug vendor data loading
    console.log('=== VENDOR DATA DEBUG ===');
    console.log('Client config vendor sheet:', clientConfig.sheets.vendor);
    console.log('Vendor data loaded:', data.vendor ? 'YES' : 'NO');
    if (data.vendor) {
      console.log('Vendor data rows:', data.vendor.length);
    }

    // Update ghost SKU registry BEFORE processing revenue risk
    // This ensures ghost SKUs are detected from current data
    console.log('Updating ghost SKU registry...');
    updateGhostSkuRegistry(clientId, data.fba, { t90: data.t90, t365: data.t365 }, priceMap);

    // Process each feature
    const result = {
      fbmToFba: processFBMtoFBA(data, priceMap),
      excessInventory: processExcessInventory(data),
      revenueRisk: processRevenueRisk(data, priceMap, clientId),
      skuTrends: processSKUTrends(data, priceMap),
      skuTrendsAnalysis: processSKUTrendsAnalysis(data, priceMap, awdInventoryMap),
      lilfMonitor: processLILFMonitor(data),
      vendorCentral: data.vendor ? processVendorCentralAnalysis(data.vendor, priceMap) : null
    };

    // Calculate changes from previous metrics
    const changes = calculateMetricChanges(clientId, result, data);
    result.changes = changes;
    
    setLoadingProgress(clientId, 100, 'Complete!');
    
    // Debug logging before return
    console.log('=== loadDashboardDataWithProgress RETURN ===');
    console.log('Returning result object with keys:', Object.keys(result).join(', '));
    console.log('Result.fbmToFBA length:', result.fbmToFBA ? result.fbmToFBA.length : 'null');
    console.log('Result.revenueRisk length:', result.revenueRisk ? result.revenueRisk.length : 'null');
    console.log('Result.skuTrends length:', result.skuTrends ? result.skuTrends.length : 'null');
    
    return result;
    
  } catch (error) {
    console.error('Error processing client data:', error);
    console.error('Error stack:', error.stack);
    setLoadingProgress(clientId, -1, 'Error: ' + error.message);
    
    // Return error object instead of throwing
    return {
      error: true,
      message: error.message || error.toString(),
      stack: error.stack,
      clientId: clientId
    };
  }
}

// Process all reports and calculate metrics
function loadDashboardData(clientId) {
  console.log(`loadDashboardData called for client: ${clientId}`);
  
  // Quick test: Check if config exists
  const testConfig = loadClientConfig(clientId);
  if (!testConfig) {
    console.error(`Config not found for ${clientId}`);
    return {
      error: true,
      message: `Client configuration not found for: ${clientId}`,
      clientId: clientId
    };
  }
  
  try {
    // Step 1: Call the processing function
    console.log('Step 1: Calling loadDashboardDataWithProgress...');
    console.log('Client ID being passed:', clientId);
    console.log('Client ID type:', typeof clientId);
    
    const result = loadDashboardDataWithProgress(clientId);
    console.log('Step 2: Received result from loadDashboardDataWithProgress');
    console.log('Result is:', result);
    console.log('Result === null?', result === null);
    console.log('Result === undefined?', result === undefined);
    
    // Step 3: Check if result is null or undefined
    if (!result) {
      console.error('Step 3: Result is null/undefined!');
      return {
        error: true,
        message: 'No data returned from processing function',
        clientId: clientId
      };
    }
    
    // Step 4: Check result type and structure
    console.log(`Step 4: Result type: ${typeof result}`);
    console.log(`Step 4: Result is array: ${Array.isArray(result)}`);
    console.log(`Step 4: Result keys: ${result ? Object.keys(result).join(', ') : 'null'}`);
    
    // Step 5: Check for error in result
    if (result.error) {
      console.error('Step 5: Result contains error:', result.error);
      return result;
    }
    
    // Step 6: Try to stringify to check size
    console.log('Step 6: Attempting to stringify result...');
    let dataSize = 0;
    try {
      const jsonString = JSON.stringify(result);
      dataSize = jsonString.length;
      console.log(`Step 7: Stringify successful. Size: ${dataSize} characters (${(dataSize / 1024 / 1024).toFixed(2)} MB)`);
      
      // Google Apps Script has a ~50MB limit for return values
      if (dataSize > 50 * 1024 * 1024) {
        console.error('Step 8: Result is too large for Google Apps Script');
        return {
          error: true,
          message: `Data too large: ${(dataSize / 1024 / 1024).toFixed(2)} MB exceeds 50MB limit`,
          clientId: clientId
        };
      }
    } catch (e) {
      console.error('Result is NOT JSON serializable:', e);
      return {
        error: true,
        message: 'Data serialization error: ' + e.toString(),
        clientId: clientId
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error in loadDashboardData:', error);
    // Return error object instead of throwing
    return {
      error: true,
      message: error.toString(),
      clientId: clientId,
      stack: error.stack
    };
  }
}

// ========================================
// GHOST SKU UTILITY FUNCTIONS
// ========================================

// View ghost SKUs for a client
function viewGhostSkus(clientId) {
  try {
    const ghostData = getGhostSkus(clientId);
    console.log(`=== Ghost SKUs for ${clientId} ===`);
    console.log(`Last updated: ${ghostData.lastUpdated}`);
    console.log(`Total ghost SKUs: ${ghostData.skus ? ghostData.skus.length : 0}`);

    if (ghostData.skus && ghostData.skus.length > 0) {
      ghostData.skus.forEach((sku, index) => {
        console.log(`${index + 1}. ${sku.sku} - $${sku.revenue90.toFixed(2)} (90d) - Last seen: ${sku.lastSeenDate}`);
      });
    }

    return ghostData;
  } catch (error) {
    console.error('Error viewing ghost SKUs:', error);
    return { error: error.message };
  }
}

// Clear ghost SKUs for a client
function clearGhostSkus(clientId) {
  try {
    PropertiesService.getScriptProperties().deleteProperty(`ghost_skus_${clientId}`);
    console.log(`Cleared ghost SKUs for ${clientId}`);
    return { success: true, clientId: clientId };
  } catch (error) {
    console.error('Error clearing ghost SKUs:', error);
    return { success: false, error: error.message };
  }
}

// Monitor PropertiesService storage usage
function checkStorageUsage() {
  try {
    const props = PropertiesService.getScriptProperties().getProperties();
    const sizes = {};
    let total = 0;
    let ghostSkuTotal = 0;
    let ghostSkuCount = 0;

    for (const [key, value] of Object.entries(props)) {
      const size = new Blob([value]).size;
      sizes[key] = {
        sizeBytes: size,
        sizeKB: (size / 1024).toFixed(2)
      };
      total += size;

      // Track ghost SKU storage separately
      if (key.startsWith('ghost_skus_')) {
        ghostSkuTotal += size;
        ghostSkuCount++;
      }
    }

    const result = {
      totalBytes: total,
      totalKB: (total / 1024).toFixed(2),
      totalMB: (total / 1024 / 1024).toFixed(3),
      limitKB: 500,
      limitMB: (500 / 1024).toFixed(2),
      percentUsed: ((total / 1024 / 500) * 100).toFixed(1),
      ghostSkuStorage: {
        totalBytes: ghostSkuTotal,
        totalKB: (ghostSkuTotal / 1024).toFixed(2),
        clientCount: ghostSkuCount,
        avgPerClient: ghostSkuCount > 0 ? (ghostSkuTotal / 1024 / ghostSkuCount).toFixed(2) : 0
      },
      propertyCount: Object.keys(props).length,
      breakdown: sizes,
      warning: null
    };

    // Add warnings
    if (result.percentUsed > 80) {
      result.warning = 'CRITICAL: Storage usage above 80% - immediate cleanup required!';
    } else if (result.percentUsed > 60) {
      result.warning = 'WARNING: Storage usage above 60% - consider cleanup soon';
    }

    console.log(`=== PropertiesService Storage Usage ===`);
    console.log(`Total: ${result.totalKB} KB / ${result.limitKB} KB (${result.percentUsed}%)`);
    console.log(`Ghost SKU Storage: ${result.ghostSkuStorage.totalKB} KB across ${result.ghostSkuStorage.clientCount} clients`);
    console.log(`Average per client: ${result.ghostSkuStorage.avgPerClient} KB`);
    if (result.warning) {
      console.warn(result.warning);
    }

    return result;

  } catch (error) {
    console.error('Error checking storage usage:', error);
    return { error: error.message };
  }
}

// Cleanup all ghost SKU registries (for all clients)
function cleanupAllGhostSkus() {
  try {
    const props = PropertiesService.getScriptProperties().getProperties();
    const results = {
      totalClientsProcessed: 0,
      totalSkusRemoved: 0,
      totalSkusRemaining: 0,
      clientDetails: []
    };

    for (const key of Object.keys(props)) {
      if (key.startsWith('ghost_skus_')) {
        const clientId = key.replace('ghost_skus_', '');
        const cleanup = cleanupGhostSkuRegistry(clientId);

        results.totalClientsProcessed++;
        results.totalSkusRemoved += cleanup.removed || 0;
        results.totalSkusRemaining += cleanup.remaining || 0;

        results.clientDetails.push({
          clientId: clientId,
          removed: cleanup.removed,
          remaining: cleanup.remaining
        });
      }
    }

    console.log(`=== Cleanup Complete ===`);
    console.log(`Processed ${results.totalClientsProcessed} clients`);
    console.log(`Removed ${results.totalSkusRemoved} stale ghost SKUs`);
    console.log(`${results.totalSkusRemaining} ghost SKUs still active`);

    return results;

  } catch (error) {
    console.error('Error cleaning up all ghost SKUs:', error);
    return { error: error.message };
  }
}

// Store current metrics for comparison
function storeCurrentMetrics(clientId, processedData, rawData) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `metrics_${clientId}`;
    
    // Get snapshot date from FBA inventory
    let snapshotDate = new Date().toISOString();
    if (rawData.fbaInventory && rawData.fbaInventory.length > 0) {
      const firstRow = rawData.fbaInventory[0];
      const snapshot = firstRow['snapshot-date'] || firstRow['snapshot_date'] || firstRow['Snapshot Date'];
      if (snapshot) {
        snapshotDate = snapshot;
      }
    }
    
    const metrics = {
      fbmCount: processedData.fbmToFba.length,
      excessCount: processedData.excessInventory.items.filter(function(i) { return i.hasAgedInventory; }).length,
      revenueRisk: processedData.revenueRisk.reduce((sum, item) => sum + item.lostRevenuePerDay, 0),
      lilfCount: processedData.lilfMonitor.length,
      trendsCount: processedData.skuTrendsAnalysis ? processedData.skuTrendsAnalysis.length : 0,
      fbmSkus: processedData.fbmToFba.map(item => item.sku).slice(0, 100), // Store up to 100 SKUs
      lastSnapshot: snapshotDate,
      timestamp: new Date().toISOString()
    };
    
    scriptProperties.setProperty(key, JSON.stringify(metrics));
  } catch (error) {
    console.error('Error storing metrics:', error);
  }
}

// Calculate changes from previous metrics
function calculateMetricChanges(clientId, currentData, rawData) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `metrics_${clientId}`;
    const previousJson = scriptProperties.getProperty(key);
    
    // Get current snapshot date
    let currentSnapshotDate = new Date().toISOString();
    if (rawData.fbaInventory && rawData.fbaInventory.length > 0) {
      const firstRow = rawData.fbaInventory[0];
      const snapshot = firstRow['snapshot-date'] || firstRow['snapshot_date'] || firstRow['Snapshot Date'];
      if (snapshot) {
        currentSnapshotDate = snapshot;
      }
    }
    
    if (!previousJson) {
      // No previous data, store current metrics for future comparison
      storeCurrentMetrics(clientId, currentData, rawData);
      return {
        fbmChange: 0,
        excessChange: 0,
        revenueRiskChange: 0,
        lilfChange: 0,
        trendsChange: 0,
        newFbmSkus: [],
        isFirstLoad: true
      };
    }
    
    const previous = JSON.parse(previousJson);
    
    // Check if snapshot date has changed - if so, update stored metrics
    if (previous.lastSnapshot !== currentSnapshotDate) {
      // New data! Calculate changes before storing new metrics
      const currentRevenueRisk = currentData.revenueRisk.reduce((sum, item) => sum + item.lostRevenuePerDay, 0);
      
      // Calculate new FBM SKUs
      const currentFbmSkus = new Set(currentData.fbmToFba.map(item => item.sku));
      const previousFbmSkus = new Set(previous.fbmSkus || []);
      const newFbmSkus = [...currentFbmSkus].filter(sku => !previousFbmSkus.has(sku));
      
      const changes = {
        fbmChange: currentData.fbmToFba.length - (previous.fbmCount || 0),
        excessChange: currentData.excessInventory.items.filter(function(i) { return i.hasAgedInventory; }).length - (previous.excessCount || 0),
        revenueRiskChange: currentRevenueRisk - (previous.revenueRisk || 0),
        lilfChange: currentData.lilfMonitor.length - (previous.lilfCount || 0),
        trendsChange: (currentData.skuTrendsAnalysis ? currentData.skuTrendsAnalysis.length : 0) - (previous.trendsCount || 0),
        newFbmSkus: newFbmSkus,
        previousSnapshot: previous.lastSnapshot,
        isFirstLoad: false
      };
      
      // Store the new metrics for next time
      storeCurrentMetrics(clientId, currentData, rawData);
      
      // Also store the changes separately so they persist
      scriptProperties.setProperty(`changes_${clientId}`, JSON.stringify(changes));
      
      return changes;
    } else {
      // Same snapshot date - return previously calculated changes
      const storedChanges = scriptProperties.getProperty(`changes_${clientId}`);
      if (storedChanges) {
        return JSON.parse(storedChanges);
      }
      
      // Fallback - calculate from stored previous data
      const currentRevenueRisk = currentData.revenueRisk.reduce((sum, item) => sum + item.lostRevenuePerDay, 0);
      const currentFbmSkus = new Set(currentData.fbmToFba.map(item => item.sku));
      const previousFbmSkus = new Set(previous.fbmSkus || []);
      const newFbmSkus = [...currentFbmSkus].filter(sku => !previousFbmSkus.has(sku));
      
      return {
        fbmChange: currentData.fbmToFba.length - (previous.fbmCount || 0),
        excessChange: currentData.excessInventory.items.filter(function(i) { return i.hasAgedInventory; }).length - (previous.excessCount || 0),
        revenueRiskChange: currentRevenueRisk - (previous.revenueRisk || 0),
        lilfChange: currentData.lilfMonitor.length - (previous.lilfCount || 0),
        trendsChange: (currentData.skuTrendsAnalysis ? currentData.skuTrendsAnalysis.length : 0) - (previous.trendsCount || 0),
        newFbmSkus: newFbmSkus,
        previousSnapshot: previous.lastSnapshot,
        isFirstLoad: false
      };
    }
  } catch (error) {
    console.error('Error calculating changes:', error);
    return {
      fbmChange: 0,
      excessChange: 0,
      revenueRiskChange: 0,
      lilfChange: 0,
      trendsChange: 0,
      newFbmSkus: [],
      isFirstLoad: true
    };
  }
}

// ========================================
// GHOST SKU TRACKING SYSTEM
// Tracks SKUs that disappear from FBA inventory but still have recent sales
// ========================================

// Get ghost SKUs for a client (SKUs not in current FBA inventory but recently had sales)
function getGhostSkus(clientId) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `ghost_skus_${clientId}`;
    const ghostData = scriptProperties.getProperty(key);

    if (!ghostData) {
      return { lastUpdated: null, skus: [] };
    }

    return JSON.parse(ghostData);
  } catch (error) {
    console.error('Error loading ghost SKUs:', error);
    return { lastUpdated: null, skus: [] };
  }
}

// Update ghost SKU registry after processing revenue risk
function updateGhostSkuRegistry(clientId, currentFbaSKUs, salesData, priceMap) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `ghost_skus_${clientId}`;

    // Get existing ghost SKUs
    const existingGhosts = getGhostSkus(clientId);
    const currentDate = new Date().toISOString();
    const ghostSkuMap = new Map();

    // Convert current FBA SKUs to Set for quick lookup
    const activeFbaSkus = new Set(currentFbaSKUs.map(item => item['sku'] || item['SKU']).filter(Boolean));

    // Keep existing ghosts that are still missing and recently seen (< 60 days)
    if (existingGhosts.skus) {
      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

      existingGhosts.skus.forEach(ghost => {
        // Remove if SKU reappeared in FBA inventory
        if (activeFbaSkus.has(ghost.sku)) {
          console.log(`Ghost SKU ${ghost.sku} reappeared in FBA inventory - removing from registry`);
          return;
        }

        // Remove if too old (>60 days since last seen)
        const lastSeen = new Date(ghost.lastSeenDate);
        if (lastSeen < sixtyDaysAgo) {
          console.log(`Ghost SKU ${ghost.sku} is stale (>60 days) - removing from registry`);
          return;
        }

        // Keep this ghost
        ghostSkuMap.set(ghost.sku, ghost);
      });
    }

    // Check for new ghosts: SKUs in previous FBA inventory that are now missing
    // We identify new ghosts by checking sales data against current FBA inventory
    if (salesData.t90 && salesData.t90.length > 0) {
      salesData.t90.forEach(salesRow => {
        const sku = salesRow['SKU'] || salesRow['sku'];
        const asin = salesRow['(Child) ASIN'] || salesRow['Child ASIN'] || salesRow['ASIN'];

        if (!sku && !asin) return;

        // Skip if already in active FBA inventory
        if (activeFbaSkus.has(sku)) return;

        // Skip if already tracked as ghost
        if (ghostSkuMap.has(sku)) return;

        // Check if this SKU has meaningful sales in last 90 days
        const sales90 = findSalesForSKU(salesData.t90, sku, asin, priceMap);
        const sales365 = findSalesForSKU(salesData.t365, sku, asin, priceMap);

        if (sales90 && sales90.revenue > 0 && sales90.units > 0) {
          // This is a new ghost! Had sales but not in FBA inventory
          console.log(`New ghost SKU detected: ${sku} with $${sales90.revenue.toFixed(2)} in 90-day revenue`);

          ghostSkuMap.set(sku, {
            sku: sku,
            asin: asin,
            title: '', // Will be populated if available
            lastSeenDate: currentDate,
            revenue90: sales90.revenue,
            revenue365: sales365 ? sales365.revenue : 0,
            units90: sales90.units,
            units365: sales365 ? sales365.units : 0
          });
        }
      });
    }

    // Convert map to array and ensure we don't store too many
    const ghostSkusArray = Array.from(ghostSkuMap.values());

    // Sort by 90-day revenue (highest first) and keep top 50 per client
    ghostSkusArray.sort((a, b) => b.revenue90 - a.revenue90);
    const limitedGhosts = ghostSkusArray.slice(0, 50);

    // Calculate storage size
    const registryData = {
      lastUpdated: currentDate,
      skus: limitedGhosts
    };

    const dataSize = new Blob([JSON.stringify(registryData)]).size;
    console.log(`Ghost SKU registry for ${clientId}: ${limitedGhosts.length} SKUs, ${(dataSize / 1024).toFixed(2)} KB`);

    // Warn if registry is getting large
    if (dataSize > 5000) {
      console.warn(`WARNING: Ghost SKU registry for ${clientId} is ${(dataSize / 1024).toFixed(2)} KB - consider cleanup`);
    }

    // Store the registry
    scriptProperties.setProperty(key, JSON.stringify(registryData));

    return limitedGhosts.length;

  } catch (error) {
    console.error('Error updating ghost SKU registry:', error);
    return 0;
  }
}

// Cleanup stale ghost SKUs (can be called periodically)
function cleanupGhostSkuRegistry(clientId) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    const key = `ghost_skus_${clientId}`;
    const ghostData = getGhostSkus(clientId);

    if (!ghostData.skus || ghostData.skus.length === 0) {
      return { removed: 0, remaining: 0 };
    }

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const originalCount = ghostData.skus.length;

    // Keep only SKUs seen in last 60 days
    const activeGhosts = ghostData.skus.filter(ghost => {
      const lastSeen = new Date(ghost.lastSeenDate);
      return lastSeen >= sixtyDaysAgo;
    });

    // Update registry
    const updatedRegistry = {
      lastUpdated: new Date().toISOString(),
      skus: activeGhosts
    };

    scriptProperties.setProperty(key, JSON.stringify(updatedRegistry));

    const removed = originalCount - activeGhosts.length;
    console.log(`Cleaned up ${removed} stale ghost SKUs for ${clientId}, ${activeGhosts.length} remaining`);

    return { removed: removed, remaining: activeGhosts.length };

  } catch (error) {
    console.error('Error cleaning up ghost SKU registry:', error);
    return { removed: 0, remaining: 0, error: error.message };
  }
}

// FBM to FBA Suggestions
function processFBMtoFBA(data, priceMap) {
  const results = [];
  
  // First, create a set of all FBA SKUs for quick lookup
  const fbaSkuSet = new Set();
  data.allListings.forEach(listing => {
    const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');
    const status = getColumnValue(listing, 'status');

    if ((fulfillmentChannel === 'AMAZON_NA' || fulfillmentChannel === 'AFN') && status?.toLowerCase() === 'active') {
      const sku = getColumnValue(listing, 'sku');
      // Skip invalid SKUs that contain ".found" or ".missing" patterns
      if (sku && !isInvalidSku(sku)) {
        fbaSkuSet.add(sku);
      }
    }
  });
  
  // Find FBM products with high sales
  data.allListings.forEach(listing => {
    const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');
    const status = getColumnValue(listing, 'status');

    if ((fulfillmentChannel === 'DEFAULT' || fulfillmentChannel === 'Merchant') && status?.toLowerCase() === 'active') {
      // Find sales data for this SKU - using Child ASIN as SKU identifier
      const sku = getColumnValue(listing, 'sku');
      const asin = getColumnValue(listing, 'asin');

      // Skip if no SKU
      if (!sku) return;

      // Skip invalid SKUs that contain ".found" or ".missing" patterns
      if (isInvalidSku(sku)) {
        return;
      }

      // Convert SKU to string for concatenation
      const skuStr = String(sku);

      // Check if there's an FBA equivalent
      const potentialFbaSku = 'FBA-' + skuStr;
      
      // Skip if an FBA version already exists
      if (fbaSkuSet.has(potentialFbaSku)) {
        return;
      }
      
      // Look for sales in business reports using Child ASIN
      const salesData = findSalesForSKU(data.t60, sku, asin, priceMap);
      
      if (salesData && salesData.units > 20) {
        results.push({
          sku: sku,
          title: listing['item-name'] || listing['Product Name'] || listing['product-name'] || listing['Title'],
          units60Days: salesData.units,
          revenue60Days: salesData.revenue,
          avgPrice: salesData.revenue / salesData.units
        });
      }
    }
  });
  
  return results.sort((a, b) => b.revenue60Days - a.revenue60Days).slice(0, 20);
}

// Helper function to check if SKU is invalid (Amazon-created variants)
// Returns true if SKU contains .found, .missing, or similar patterns (case-insensitive)
function isInvalidSku(sku) {
  if (!sku) return false;

  const skuStr = String(sku).toLowerCase();

  // Check for common Amazon-created variant patterns (case-insensitive)
  const invalidPatterns = [
    '.found',
    '.missing',
    '-found',
    '-missing',
    '_found',
    '_missing',
    ' found',
    ' missing'
  ];

  return invalidPatterns.some(pattern => skuStr.includes(pattern));
}

// Helper function to select primary SKU from a group sharing the same ASIN
// Returns the SKU string that should be considered "primary"
// Scoring logic: shorter SKU name = primary, prefer Active status, highest sales as tie-breaker
function selectPrimarySku(skuArray, salesData) {
  if (!skuArray || skuArray.length === 0) return null;
  if (skuArray.length === 1) return skuArray[0].sku;

  // Score each SKU
  const scored = skuArray.map(skuObj => {
    const sku = skuObj.sku;
    let score = 0;

    // Revenue is the most important factor for selecting primary SKU
    // Use pre-calculated revenue90Days if available (from OOS results)
    if (skuObj.revenue90Days) {
      score += skuObj.revenue90Days; // Direct revenue score
    } else if (salesData && salesData.t90) {
      // Fall back to looking up in sales data
      const sales90 = salesData.t90.find(s =>
        (s['sku'] && s['sku'] === sku) ||
        (s['child-asin'] && s['child-asin'] === skuObj.asin)
      );
      if (sales90) {
        const revenue = parseFloat((sales90['Ordered Product Sales'] || '0').toString().replace(/[$,]/g, ''));
        const units = parseInt(sales90['Units Ordered'] || sales90['units'] || 0);
        score += revenue || (units * 10); // Use revenue, fallback to units * 10
      }
    }

    // Shorter SKU name gets minor bonus (prefer original over variants)
    // Max bonus: 100 points (normalized by length difference)
    const lengthScore = Math.max(0, 100 - String(sku).length);
    score += lengthScore;

    // Active status gets bonus
    if (skuObj.status && skuObj.status.toLowerCase() === 'active') {
      score += 50;
    }

    return { sku, score };
  });

  // Sort by score descending and return highest
  scored.sort((a, b) => b.score - a.score);
  return scored[0].sku;
}

// Helper function to build ASIN to SKU mapping for shared ASIN detection
// Returns Map<ASIN, Array<{sku, fulfillmentChannel}>>
function buildAsinToSkuMap(allListings) {
  const asinToSkuMap = new Map();

  allListings.forEach(listing => {
    const asin = getColumnValue(listing, 'asin');
    const sku = getColumnValue(listing, 'sku');
    const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');
    const status = getColumnValue(listing, 'status');

    // Include both active AND inactive SKUs to detect all shared ASINs
    if (!asin || !sku) return;

    // Skip invalid SKUs
    if (isInvalidSku(sku)) return;

    if (!asinToSkuMap.has(asin)) {
      asinToSkuMap.set(asin, []);
    }

    asinToSkuMap.get(asin).push({
      sku: sku,
      fulfillmentChannel: fulfillmentChannel,
      status: status  // Track status for debugging
    });
  });

  console.log(`Built ASIN-to-SKU map with ${asinToSkuMap.size} ASINs`);

  // Debug: Log ASINs with multiple SKUs
  let sharedAsinCount = 0;
  asinToSkuMap.forEach((skuList, asin) => {
    if (skuList.length > 1) {
      sharedAsinCount++;
      console.log(`Shared ASIN detected: ${asin} has ${skuList.length} SKUs:`, skuList.map(s => s.sku).join(', '));
    }
  });
  console.log(`Found ${sharedAsinCount} ASINs with multiple SKUs`);

  return asinToSkuMap;
}

/**
 * Builds a map of ASIN -> inventory availability status across all FBA SKUs
 * Used to determine if an ASIN has ANY FBA SKU with inventory (to filter false positives)
 *
 * @param {Array} allListings - All Listings report data
 * @param {Map} fbaInventoryMap - Map of SKU -> FBA inventory item
 * @returns {Map<string, {hasInventory: boolean, fbaSkusWithInventory: string[], allFbaSkus: string[]}>}
 */
function buildAsinInventoryStatus(allListings, fbaInventoryMap) {
  const asinStatus = new Map();

  allListings.forEach(listing => {
    const asin = getColumnValue(listing, 'asin');
    const sku = getColumnValue(listing, 'sku');
    const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');

    // Only consider FBA SKUs (AMAZON_NA)
    if (!asin || !sku || fulfillmentChannel !== 'AMAZON_NA') return;
    if (isInvalidSku(sku)) return;

    // Initialize ASIN entry if needed
    if (!asinStatus.has(asin)) {
      asinStatus.set(asin, {
        hasInventory: false,
        fbaSkusWithInventory: [],
        allFbaSkus: []
      });
    }

    const status = asinStatus.get(asin);
    status.allFbaSkus.push(sku);

    // Check if this SKU has available inventory
    const fbaItem = fbaInventoryMap.get(sku);
    if (fbaItem) {
      const fulfillableQuantity = parseInt(fbaItem['afn-fulfillable-quantity'] || fbaItem['available'] || 0) || 0;
      const inboundWorking = parseInt(fbaItem['afn-inbound-working-quantity'] || 0) || 0;
      const inboundShipped = parseInt(fbaItem['afn-inbound-shipped-quantity'] || 0) || 0;
      const inboundReceiving = parseInt(fbaItem['afn-inbound-receiving-quantity'] || 0) || 0;
      const futureSupplyBuyable = parseInt(fbaItem['afn-future-supply-buyable'] || 0) || 0;

      // Check aggregate inbound-quantity fallback
      let totalInbound = inboundWorking + inboundShipped + inboundReceiving;
      if (totalInbound === 0 && fbaItem['inbound-quantity']) {
        totalInbound = parseInt(fbaItem['inbound-quantity'] || 0) || 0;
      }

      // Available pipeline excludes reserved (same logic as main OOS check)
      const availablePipeline = fulfillableQuantity + totalInbound + futureSupplyBuyable;

      // Check health status for OOS
      const healthStatus = getColumnValue(fbaItem, 'inventoryHealthStatus');
      const isOutOfStockByHealth = healthStatus && healthStatus.toLowerCase().includes('out of stock');

      // SKU has inventory if pipeline > 0 AND not marked OOS by health status
      if (availablePipeline > 0 && !isOutOfStockByHealth) {
        status.hasInventory = true;
        status.fbaSkusWithInventory.push(sku);
      }
    }
  });

  // Log summary for multi-SKU ASINs
  let asinWithInventory = 0;
  let asinAllOos = 0;
  asinStatus.forEach((status, asin) => {
    if (status.allFbaSkus.length > 1) {
      if (status.hasInventory) {
        asinWithInventory++;
      } else {
        asinAllOos++;
      }
    }
  });
  console.log(`ASIN inventory status: ${asinWithInventory} multi-SKU ASINs have inventory, ${asinAllOos} completely OOS`);

  return asinStatus;
}

// Helper function to build ASIN to price mapping from All Listings Report
function buildAsinPriceMap(allListings) {
  const priceMap = new Map();

  allListings.forEach(listing => {
    const asin = getColumnValue(listing, 'asin');
    const price = parseFloat(getColumnValue(listing, 'price') || 0);
    const status = getColumnValue(listing, 'status');

    // Only use active listings with valid prices
    if (asin && price > 0 && status?.toLowerCase() === 'active') {
      // If multiple SKUs have same ASIN, keep the highest price
      if (!priceMap.has(asin) || priceMap.get(asin) < price) {
        priceMap.set(asin, price);
      }
    }
  });

  console.log(`Built price map with ${priceMap.size} ASINs`);
  return priceMap;
}

// Helper function to build AWD inventory mapping from AWD sheet
// Note: AWD sheets have a special format with headers in row 4
function buildAWDInventoryMap(clientConfig) {
  console.log('Building AWD inventory map...');

  const awdMap = new Map();

  try {
    // Check if AWD sheet URL is configured
    if (!clientConfig || !clientConfig.sheets || !clientConfig.sheets.awd) {
      console.log('No AWD sheet configured for client');
      return awdMap; // Return empty map
    }

    // Get raw sheet data for AWD (different structure than other sheets)
    const awdUrl = clientConfig.sheets.awd;
    console.log('Fetching AWD data from:', awdUrl);

    // Extract sheet ID and GID from URL
    const sheetId = awdUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gid = awdUrl.match(/[#&]gid=([0-9]+)/);

    if (!sheetId) {
      console.log('Invalid AWD sheet URL format');
      return awdMap;
    }

    const spreadsheet = SpreadsheetApp.openById(sheetId[1]);
    let sheet;

    if (gid && gid[1]) {
      // Find sheet by GID
      const sheets = spreadsheet.getSheets();
      sheet = sheets.find(s => s.getSheetId().toString() === gid[1]);
    } else {
      // Use first sheet if no GID specified
      sheet = spreadsheet.getSheets()[0];
    }

    if (!sheet) {
      console.log('AWD sheet not found');
      return awdMap;
    }

    const rawData = sheet.getDataRange().getValues();
    console.log(`Raw AWD data has ${rawData.length} rows`);

    if (rawData.length < 5) {
      console.log('AWD sheet has insufficient data rows');
      return awdMap;
    }

    // Headers are in row 4 (index 3)
    const headers = rawData[3];
    console.log('AWD Headers:', headers);

    // ============================================================================
    // AWD INVENTORY COLUMN SELECTION - CRITICAL FOR PREVENTING DOUBLE-COUNTING
    // ============================================================================
    // Amazon's AWD report contains 5 inventory columns, but we INTENTIONALLY only
    // count 2 of them to prevent double-counting with FBA inventory reports.
    //
    // AWD Report Columns (per Amazon's definitions):
    //
    //   Column 3: "Inbound to AWD (Units)" ✓ USE THIS
    //     Definition: "Units for which an inbound shipment has been created through the receiving stage"
    //     → Units in transit TO AWD (not yet received)
    //
    //   Column 4: "Available in AWD (Units)" ✓ USE THIS
    //     Definition: "Inventory which is received in the AWD network, and available to fill outbound orders"
    //     → Units physically AT AWD, ready to ship
    //
    //   Column 5: "Reserved in AWD" ✗ SKIP - Already counted in FBA reports
    //     Definition: "Inventory which is tied to an outbound order, in transit between AWD facilities,
    //                  or set aside for additional processing"
    //     → Units being prepared to leave AWD (likely shows in FBA inbound)
    //
    //   Column 6: "Outbound to FBA" ✗ SKIP - Already counted in FBA reports
    //     Definition: "Units for which an outbound shipment has been created, through the received into FBA stage"
    //     → Units in transit to FBA OR already received at FBA (definitely in FBA inbound/warehouse)
    //
    //   Column 7: "Available in FBA" ✗ SKIP - Already counted in FBA reports
    //     → Units that completed the AWD→FBA transfer (in FBA warehouse)
    //
    // Why this prevents double-counting:
    // - "Reserved in AWD" units are being prepared for FBA transfer (may already show in FBA inbound)
    // - "Outbound to FBA" explicitly includes units already RECEIVED at FBA (definitely in FBA warehouse)
    // - By only counting columns 3 & 4, we count units that are truly "owned" by AWD
    // - Once units are reserved/outbound, FBA reports take over tracking them
    //
    // This creates a clean handoff: AWD owns units until they're allocated to leave
    // ============================================================================

    // Find column indices - only for the columns we want to count
    const skuCol = headers.findIndex(h => h && (h.toString().toLowerCase().includes('sku') && !h.toString().toLowerCase().includes('fnsku')));
    const inboundCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('inbound to awd (units)'));
    const availableCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('available in awd (units)'));

    // Also find the columns we're intentionally NOT counting (for logging/verification)
    const reservedCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('reserved in awd'));
    const outboundCol = headers.findIndex(h => h && h.toString().toLowerCase().includes('outbound to fba'));

    console.log(`Column indices - SKU: ${skuCol}, Inbound: ${inboundCol}, Available: ${availableCol}`);
    console.log(`Excluded columns - Reserved: ${reservedCol}, Outbound: ${outboundCol}`);

    if (skuCol === -1 || inboundCol === -1 || availableCol === -1) {
      console.log('Required AWD columns not found');
      return awdMap;
    }

    // Process data rows (starting from row 5, index 4)
    for (let i = 4; i < rawData.length; i++) {
      const row = rawData[i];
      const sku = row[skuCol];
      const inboundUnits = parseInt(row[inboundCol] || 0);
      const availableUnits = parseInt(row[availableCol] || 0);

      // Read the excluded columns for logging/verification
      const reservedUnits = reservedCol !== -1 ? parseInt(row[reservedCol] || 0) : 0;
      const outboundUnits = outboundCol !== -1 ? parseInt(row[outboundCol] || 0) : 0;

      // IMPORTANT: Only sum "Inbound to AWD" + "Available in AWD"
      // Do NOT include "Reserved in AWD", "Outbound to FBA", or "Available in FBA"
      // Those quantities are already counted in FBA inventory reports
      const totalAwdUnits = inboundUnits + availableUnits;

      if (sku && totalAwdUnits > 0) {
        awdMap.set(sku, {
          sku: sku,
          inbound: inboundUnits,
          available: availableUnits,
          total: totalAwdUnits,
          // Store excluded values for debugging/verification
          reserved: reservedUnits,
          outbound: outboundUnits
        });

        // Log if there are Reserved or Outbound quantities (to verify they're being excluded)
        if (reservedUnits > 0 || outboundUnits > 0) {
          console.log(`AWD: ${sku} = ${inboundUnits} inbound + ${availableUnits} available = ${totalAwdUnits} total (EXCLUDED: ${reservedUnits} reserved + ${outboundUnits} outbound)`);
        } else {
          console.log(`AWD: ${sku} = ${inboundUnits} inbound + ${availableUnits} available = ${totalAwdUnits} total`);
        }
      }
    }

    console.log(`Built AWD inventory map with ${awdMap.size} SKUs`);
    return awdMap;

  } catch (error) {
    console.error('Error building AWD inventory map:', error);
    return awdMap; // Return empty map on error
  }
}

// Helper function to find sales data - Updated to match Business Report format
function findSalesForSKU(salesReport, sku, asin, priceMap) {
  // Business reports might use either (Child) ASIN or SKU
  const record = salesReport.find(row => {
    const childAsin = row['(Child) ASIN'] || row['Child ASIN'] || row['ASIN'];
    const reportSku = row['SKU'] || row['sku'];
    
    // Check both ASIN and SKU
    return (childAsin && childAsin === asin) || 
           (reportSku && reportSku === sku) ||
           (childAsin && childAsin === sku); // Sometimes SKU is stored in ASIN field
  });
  
  if (record) {
    const units = parseInt(record['Units Ordered'] || record['Units Ordered - Sales Channel'] || 0);
    let revenue = parseFloat((record['Ordered Product Sales'] || record['Ordered Product Sales - Sales Channel'] || '0').toString().replace(/[$,]/g, ''));
    
    // Fallback: Calculate revenue using price from All Listings if revenue is missing
    if (revenue === 0 && units > 0 && priceMap && asin) {
      const price = priceMap.get(asin);
      if (price) {
        revenue = units * price;
        console.log(`Using price fallback for ASIN ${asin}: ${units} units × $${price} = $${revenue.toFixed(2)}`);
      }
    }
    
    // Only return if there are actual sales
    if (units > 0 || revenue > 0) {
      return {
        units: units,
        revenue: revenue
      };
    }
  }
  
  return null;
}

// Process Excess Inventory
function processExcessInventory(data) {
  var results = [];
  var ageSummary = {
    days0_90: { units: 0, skuCount: 0 },
    days91_180: { units: 0, skuCount: 0 },
    days181_270: { units: 0, skuCount: 0 },
    days271_365: { units: 0, skuCount: 0 },
    days365Plus: { units: 0, skuCount: 0 }
  };
  var totalInventoryUnits = 0;

  data.fbaInventory.forEach(function(item) {
    var sku = item['sku'] || item['SKU'];
    if (isInvalidSku(sku)) return;

    var days0_90 = parseInt(item['inv-age-0-to-90-days'] || item['inv-age-0-90-days'] || 0) || 0;
    var days91_180 = parseInt(item['inv-age-91-to-180-days'] || item['inv-age-91-180-days'] || 0) || 0;
    var days181_270 = parseInt(item['inv-age-181-to-270-days'] || item['inv-age-181-270-days'] || 0) || 0;
    var days271_365 = parseInt(item['inv-age-271-to-365-days'] || item['inv-age-271-365-days'] || 0) || 0;
    var days365Plus = parseInt(item['inv-age-365-plus-days'] || 0) || 0;

    if (days0_90 > 0) { ageSummary.days0_90.units += days0_90; ageSummary.days0_90.skuCount++; }
    if (days91_180 > 0) { ageSummary.days91_180.units += days91_180; ageSummary.days91_180.skuCount++; }
    if (days181_270 > 0) { ageSummary.days181_270.units += days181_270; ageSummary.days181_270.skuCount++; }
    if (days271_365 > 0) { ageSummary.days271_365.units += days271_365; ageSummary.days271_365.skuCount++; }
    if (days365Plus > 0) { ageSummary.days365Plus.units += days365Plus; ageSummary.days365Plus.skuCount++; }

    var totalUnits = days0_90 + days91_180 + days181_270 + days271_365 + days365Plus;
    totalInventoryUnits += totalUnits;
    var totalAged = days181_270 + days271_365 + days365Plus;

    if (totalUnits > 0) {
      var priorityScore = (days365Plus * 3) + (days271_365 * 2) + (days181_270 * 1);
      results.push({
        sku: sku,
        asin: item['asin1'] || item['asin'] || item['ASIN'],
        title: item['product-name'] || item['Product Name'] || item['title'] || item['item-name'] || item['Title'],
        days0_90: days0_90,
        days91_180: days91_180,
        days181_270: days181_270,
        days271_365: days271_365,
        days365Plus: days365Plus,
        totalAgedUnits: totalAged,
        totalUnits: totalUnits,
        priorityScore: priorityScore,
        estimatedStorage: totalAged * 0.75,
        hasAgedInventory: totalAged > 0
      });
    }
  });

  results.sort(function(a, b) {
    if (a.days365Plus !== b.days365Plus) return b.days365Plus - a.days365Plus;
    if (a.days271_365 !== b.days271_365) return b.days271_365 - a.days271_365;
    if (a.days181_270 !== b.days181_270) return b.days181_270 - a.days181_270;
    return b.totalAgedUnits - a.totalAgedUnits;
  });

  return {
    items: results,
    ageSummary: ageSummary,
    totalInventoryUnits: totalInventoryUnits
  };
}

// Process Revenue at Risk (v207 - Fixed reserved inventory handling)
//
// PURPOSE: Identifies SKUs that are out of stock but had recent sales (90 days)
//
// OUT-OF-STOCK DETECTION (Two methods):
//   1. Primary: FBA health status column contains "out of stock"
//   2. Fallback: Available pipeline = 0 (excludes reserved units)
//
// CRITICAL FIX (v207): Reserved inventory is NOT counted as available.
//   - Reserved units are being researched, damaged, or in quality hold
//   - Only counts: fulfillable + inbound + future supply
//   - Example: SKU with 0 fulfillable + 5 reserved = OUT OF STOCK
//
// SALES REQUIREMENT: Must have units > 0 in T90 business report
//   - Simplified in v206: No longer requires 365-day sales data
//
// GHOST SKU INTEGRATION: Automatically includes SKUs from ghost registry
//   - Ghost SKUs: In T90 sales but completely missing from FBA inventory
//   - Registry updated on each load via updateGhostSkuRegistry()
//
// RETURNS: Top 10 SKUs sorted by lost revenue per day
function processRevenueRisk(data, priceMap, clientId) {
  const results = [];

  console.log('=== REVENUE AT RISK - ALL LISTINGS APPROACH ===');

  // Validate we have the required data
  if (!data.allListings || data.allListings.length === 0) {
    console.error('No All Listings data available');
    return results;
  }

  // Build a map of FBA inventory for quick lookup
  const fbaInventoryMap = new Map();
  if (data.fba && data.fba.length > 0) {
    data.fba.forEach(item => {
      const sku = item['sku'] || item['SKU'];
      if (sku) {
        fbaInventoryMap.set(sku, item);
      }
    });
  }

  // Build ASIN-to-SKU mapping to detect shared ASINs (multiple SKUs per ASIN)
  const asinToSkuMap = buildAsinToSkuMap(data.allListings);

  // Build ASIN-level inventory status to filter multi-SKU ASINs where at least one SKU has stock
  const asinInventoryStatus = buildAsinInventoryStatus(data.allListings, fbaInventoryMap);

  // Helper to check if an ASIN has multiple SKUs (regardless of fulfillment method)
  const hasSharedAsin = (asin) => {
    const skuList = asinToSkuMap.get(asin);
    const isShared = skuList && skuList.length > 1;
    if (isShared) {
      console.log(`hasSharedAsin(${asin}) = TRUE - SKUs: ${skuList.map(s => s.sku).join(', ')}`);
    }
    return isShared; // Multiple SKUs sharing same ASIN
  };

  console.log(`Processing ${data.allListings.length} listings, ${fbaInventoryMap.size} FBA inventory records`);

  // Loop through ALL LISTINGS to discover active FBA SKUs
  data.allListings.forEach(listing => {
    const sku = getColumnValue(listing, 'sku');
    const status = getColumnValue(listing, 'status');
    const fulfillmentChannel = getColumnValue(listing, 'fulfillmentChannel');
    const asin = getColumnValue(listing, 'asin');
    const title = getColumnValue(listing, 'itemName');

    // Skip if no SKU
    if (!sku) return;

    // Skip invalid SKUs that contain ".found" or ".missing" patterns
    if (isInvalidSku(sku)) {
      return;
    }

    // Process active AND inactive FBA listings (inactive often means out of stock)
    if (!status || (status.toLowerCase() !== 'active' && status.toLowerCase() !== 'inactive')) return;
    if (!fulfillmentChannel || fulfillmentChannel !== 'AMAZON_NA') return;

    // Now we have an active or inactive FBA listing - check if it's out of stock
    const fbaItem = fbaInventoryMap.get(sku);

    // Skip if SKU not found in FBA Inventory report (can't determine stock status)
    if (!fbaItem) {
      return;
    }

    // Determine if SKU is out of stock
    let isOutOfStock = false;
    let fulfillableQuantity = 0;
    let reservedQuantity = 0;
    let inboundWorking = 0;
    let inboundShipped = 0;
    let inboundReceiving = 0;
    let futureSupplyBuyable = 0;
    let reservedFutureSupply = 0;
    let totalPipeline = 0;
    let totalInbound = 0;

    // PRIMARY: Check FBA inventory health status column
    const healthStatus = getColumnValue(fbaItem, 'inventoryHealthStatus');
    if (healthStatus && healthStatus.toLowerCase().includes('out of stock')) {
      isOutOfStock = true;
    }

    // Get quantities for display and fallback calculation (with NaN protection)
    // Support multiple FBA report formats
    fulfillableQuantity = parseInt(fbaItem['afn-fulfillable-quantity'] || fbaItem['available'] || 0) || 0;
    reservedQuantity = parseInt(fbaItem['afn-reserved-quantity'] || fbaItem['Total Reserved Quantity'] || 0) || 0;
    inboundWorking = parseInt(fbaItem['afn-inbound-working-quantity'] || fbaItem['inbound-working'] || 0) || 0;
    inboundShipped = parseInt(fbaItem['afn-inbound-shipped-quantity'] || fbaItem['inbound-shipped'] || 0) || 0;
    inboundReceiving = parseInt(fbaItem['afn-inbound-receiving-quantity'] || fbaItem['inbound-received'] || 0) || 0;
    futureSupplyBuyable = parseInt(fbaItem['afn-future-supply-buyable'] || 0) || 0;
    reservedFutureSupply = parseInt(fbaItem['afn-reserved-future-supply'] || 0) || 0;

    // If individual inbound columns not found, try aggregate inbound-quantity
    if (inboundWorking === 0 && inboundShipped === 0 && inboundReceiving === 0 && fbaItem['inbound-quantity']) {
      const totalInboundQty = parseInt(fbaItem['inbound-quantity'] || 0) || 0;
      // Assume all inbound is "shipped" for simplicity
      inboundShipped = totalInboundQty;
    }

    // Total pipeline inventory (all inventory that could become available)
    // NOTE: We include reserved in display but NOT in out-of-stock calculation
    totalPipeline = fulfillableQuantity + reservedQuantity + inboundWorking + inboundShipped + inboundReceiving + futureSupplyBuyable;
    totalInbound = inboundWorking + inboundShipped + inboundReceiving;

    // Calculate AVAILABLE pipeline (excluding reserved - those are stuck/being researched)
    const availablePipeline = fulfillableQuantity + inboundWorking + inboundShipped + inboundReceiving + futureSupplyBuyable;

    // FALLBACK: If health status not available or doesn't say out of stock, check AVAILABLE pipeline
    // Reserved units don't count - they're being researched, damaged, or otherwise unavailable
    if (!isOutOfStock && availablePipeline === 0) {
      isOutOfStock = true;
    }

    // SKU is at risk if out of stock
    if (isOutOfStock) {
      // ASIN-LEVEL FILTER: Skip if this ASIN has inventory via another FBA SKU
      // This prevents false positives when one variant is OOS but others are in stock
      const asinStatus = asinInventoryStatus.get(asin);
      if (asinStatus && asinStatus.hasInventory) {
        // This ASIN has at least one SKU with inventory - customer can still buy
        return; // Skip this OOS SKU
      }

      // Check if it has recent sales (90 days is sufficient)
      const sales90Data = findSalesForSKU(data.t90, sku, asin, priceMap);
      const sales365Data = findSalesForSKU(data.t365, sku, asin, priceMap);

      // Flag as at risk if it had ANY sales in last 90 days
      if (sales90Data && sales90Data.units > 0) {
        // This SKU is at risk!
        const lostPerDay90 = sales90Data.revenue / 90;
        const lostPerDay365 = sales365Data ? sales365Data.revenue / 365 : 0;
        const lostRevenuePerDay = Math.max(lostPerDay90, lostPerDay365);

        // Get better title from FBA inventory if available
        let displayTitle = title || '';
        if (fbaItem) {
          displayTitle = fbaItem['product-name'] || fbaItem['Product Name'] || fbaItem['title'] || title || '';
        }
        if (!displayTitle && data.fbaInventory) {
          const fbaInvItem = data.fbaInventory.find(inv => (inv['sku'] || inv['SKU']) === sku);
          if (fbaInvItem) {
            displayTitle = fbaInvItem['product-name'] || fbaInvItem['Product Name'] || fbaInvItem['title'] || '';
          }
        }

        results.push({
          sku: sku,
          asin: asin,
          title: displayTitle || '(Product Title Not Available)',
          status: status, // Add status field for primary SKU selection
          revenue90Days: sales90Data.revenue,
          revenue365Days: sales365Data ? sales365Data.revenue : 0,
          lostRevenuePerDay: lostRevenuePerDay,
          fulfillableQuantity: fulfillableQuantity,
          reservedQuantity: reservedQuantity,
          inboundWorking: inboundWorking,
          inboundShipped: inboundShipped,
          inboundReceiving: inboundReceiving,
          totalInbound: totalInbound,
          totalPipeline: totalPipeline,
          futureSupplyBuyable: futureSupplyBuyable,
          reservedFutureSupply: reservedFutureSupply,
          detectedViaHealthStatus: (healthStatus && healthStatus.toLowerCase().includes('out of stock')),
          sharedAsin: hasSharedAsin(asin) // Flag for manual review warning
        });
      }
    }
  });

  console.log(`Found ${results.length} SKUs at revenue risk from FBA Inventory`);

  // ========================================
  // INTEGRATE GHOST SKUs
  // Add SKUs that have sales but are completely missing from FBA Inventory
  // ========================================

  console.log(`Attempting to load ghost SKUs for client: ${clientId}`);
  const ghostData = getGhostSkus(clientId);
  console.log(`Ghost data loaded:`, ghostData);
  console.log(`Ghost SKUs found: ${ghostData.skus ? ghostData.skus.length : 0}`);

  if (ghostData.skus && ghostData.skus.length > 0) {
    console.log(`Processing ${ghostData.skus.length} ghost SKUs`);
    console.log(`Ghost SKU details:`, JSON.stringify(ghostData.skus, null, 2));

    ghostData.skus.forEach(ghost => {
      // Check if this ghost SKU is already in results (shouldn't be, but just in case)
      // Only check by SKU, not ASIN - multiple SKUs can share an ASIN legitimately
      const alreadyExists = results.some(r => r.sku === ghost.sku);
      if (alreadyExists) {
        console.log(`Ghost SKU ${ghost.sku} already in results, skipping`);
        return;
      }

      // Get fresh sales data for this ghost
      const sales90Data = findSalesForSKU(data.t90, ghost.sku, ghost.asin, priceMap);
      const sales365Data = findSalesForSKU(data.t365, ghost.sku, ghost.asin, priceMap);

      // Only include if still has recent sales (90 days is sufficient)
      if (sales90Data && sales90Data.units > 0) {
        // ASIN-LEVEL FILTER: Skip if this ASIN has inventory via another FBA SKU
        const asinStatus = asinInventoryStatus.get(ghost.asin);
        if (asinStatus && asinStatus.hasInventory) {
          console.log(`Skipping ghost SKU ${ghost.sku}: ASIN ${ghost.asin} has inventory via other SKU(s)`);
          return; // Skip this ghost - ASIN has inventory elsewhere
        }

        const lostPerDay90 = sales90Data.revenue / 90;
        const lostPerDay365 = sales365Data ? sales365Data.revenue / 365 : 0;
        const lostRevenuePerDay = Math.max(lostPerDay90, lostPerDay365);

        // Try to get title from All Listings or use stored title
        let displayTitle = ghost.title || '';
        if (!displayTitle) {
          const listing = data.allListings.find(l =>
            getColumnValue(l, 'sku') === ghost.sku ||
            getColumnValue(l, 'asin') === ghost.asin
          );
          if (listing) {
            displayTitle = getColumnValue(listing, 'itemName') || '';
          }
        }

        console.log(`Adding ghost SKU ${ghost.sku} with $${lostRevenuePerDay.toFixed(2)}/day lost revenue`);

        results.push({
          sku: ghost.sku,
          asin: ghost.asin,
          title: displayTitle || '(Product Title Not Available)',
          revenue90Days: sales90Data.revenue,
          revenue365Days: sales365Data ? sales365Data.revenue : 0,
          lostRevenuePerDay: lostRevenuePerDay,
          fulfillableQuantity: 0,
          reservedQuantity: 0,
          inboundWorking: 0,
          inboundShipped: 0,
          inboundReceiving: 0,
          totalInbound: 0,
          totalPipeline: 0,
          futureSupplyBuyable: 0,
          reservedFutureSupply: 0,
          detectedViaHealthStatus: false,
          isGhost: true, // Flag this as a ghost SKU
          sharedAsin: hasSharedAsin(ghost.asin) // Flag for manual review warning
        });
      } else {
        console.log(`Ghost SKU ${ghost.sku} no longer has recent sales, will be cleaned up`);
      }
    });
  }

  console.log(`Total revenue at risk SKUs (including ghosts): ${results.length}`);

  // Group results by ASIN to identify multi-SKU ASINs where ALL are OOS
  const asinGroups = new Map();
  results.forEach(result => {
    if (!asinGroups.has(result.asin)) {
      asinGroups.set(result.asin, []);
    }
    asinGroups.get(result.asin).push(result);
  });

  // Filter: For multi-SKU ASINs where ALL are OOS, only show the primary SKU
  const filteredResults = [];
  asinGroups.forEach((skuList, asin) => {
    if (skuList.length > 1) {
      // Multiple OOS SKUs share this ASIN - select and keep only the primary
      // Include revenue in SKU objects for better primary selection
      const skuObjects = skuList.map(r => ({
        sku: r.sku,
        asin: r.asin,
        status: r.status || 'active',
        revenue90Days: r.revenue90Days
      }));

      const primarySku = selectPrimarySku(skuObjects, data);

      // Find the primary result and add metadata
      const primaryResult = skuList.find(r => r.sku === primarySku);
      if (primaryResult) {
        primaryResult.isPrimary = true;
        primaryResult.otherOosSkus = skuList
          .filter(r => r.sku !== primarySku)
          .map(r => r.sku);
        primaryResult.totalOosSiblings = skuList.length;
        // Aggregate revenue from all OOS SKUs for this ASIN
        primaryResult.combinedRevenue90Days = skuList.reduce((sum, r) => sum + r.revenue90Days, 0);
        primaryResult.combinedLostRevenuePerDay = skuList.reduce((sum, r) => sum + r.lostRevenuePerDay, 0);
        filteredResults.push(primaryResult);
      }

      console.log(`ASIN ${asin} has ${skuList.length} OOS SKUs - showing primary: ${primarySku}`);
    } else {
      // Only one SKU for this ASIN - keep it
      skuList[0].isPrimary = true;
      filteredResults.push(skuList[0]);
    }
  });

  return filteredResults.sort((a, b) => b.lostRevenuePerDay - a.lostRevenuePerDay).slice(0, 10);
}

// Process SKU Trends
function processSKUTrends(data, priceMap) {
  const results = [];

  data.fbaInventory.forEach(item => {
    const sku = item['sku'] || item['SKU'];

    // Skip invalid SKUs that contain ".found" or ".missing" patterns
    if (isInvalidSku(sku)) {
      return;
    }

    const asin = item['asin'] || item['ASIN'];
    const available = parseInt(item['afn-fulfillable-quantity'] || item['Available'] || 0);
    const inbound = parseInt(item['afn-inbound-shipped-quantity'] || item['Inbound'] || 0);
    const customerOrders = parseInt(item['afn-reserved-quantity'] || 0);
    
    // Get sales velocity
    const sales60 = findSalesForSKU(data.t60, sku, asin, priceMap);
    const sales30 = findSalesForSKU(data.t30, sku, asin, priceMap);
    
    if (sales60 && sales60.units > 0) {
      const dailyVelocity = sales60.units / 60;
      const netAvailable = available - customerOrders;
      const totalInventory = netAvailable + inbound;
      const daysOfSupply = totalInventory / dailyVelocity;
      const suggestedSend = Math.max(0, (dailyVelocity * 90) - totalInventory);
      
      if (suggestedSend > 0) {
        results.push({
          sku: sku,
          title: item['product-name'] || item['Product Name'] || item['title'],
          available: netAvailable,
          inbound: inbound,
          velocity60Days: dailyVelocity,
          daysOfSupply: Math.round(daysOfSupply),
          suggestedSend: Math.ceil(suggestedSend),
          trend: sales30 ? ((sales30.units * 2) - sales60.units) / sales60.units : 0
        });
      }
    }
  });
  
  return results.sort((a, b) => b.suggestedSend - a.suggestedSend);
}

// Completely rewritten SKU Trends Analysis with clear filtering logic
function processSKUTrendsAnalysis(data, priceMap, awdInventoryMap = new Map()) {
  console.log('=== Starting NEW processSKUTrendsAnalysis ===');
  console.log(`AWD inventory map has ${awdInventoryMap.size} SKUs`);
  
  // STEP 1: Get all ACTIVE FBA SKUs from All Listings
  const activeFbaSkus = new Set();
  const skuToAsinMap = new Map();
  
  if (!data.allListings || data.allListings.length === 0) {
    console.log('ERROR: No All Listings data available');
    return [];
  }
  
  console.log(`Total All Listings rows: ${data.allListings.length}`);
  
  // Build set of active FBA SKUs and their ASIN mappings
  let debugCount = 0;
  let statusFoundCount = 0;
  let fulfillmentFoundCount = 0;
  let activeFbaFoundCount = 0;

  data.allListings.forEach(listing => {
    const sku = getColumnValue(listing, 'sku');
    const status = getColumnValue(listing, 'status');
    const fulfillment = getColumnValue(listing, 'fulfillmentChannel');
    const asin = getColumnValue(listing, 'asin');

    debugCount++;
    if (status) statusFoundCount++;
    if (fulfillment) fulfillmentFoundCount++;

    // Debug first few rows
    if (debugCount <= 3) {
      console.log(`Row ${debugCount} Debug: SKU="${sku}", Status="${status}", Fulfillment="${fulfillment}", ASIN="${asin}"`);
    }

    // Skip invalid SKUs that contain ".found" or ".missing" patterns
    if (isInvalidSku(sku)) {
      return;
    }

    if (sku && status && fulfillment && asin) {
      // Must be ACTIVE and FBA (AMAZON_NA)
      if (status.toLowerCase() === 'active' && fulfillment === 'AMAZON_NA') {
        activeFbaSkus.add(sku);
        skuToAsinMap.set(sku, asin);
        activeFbaFoundCount++;
      }
    }
  });

  console.log(`All Listings Processing Summary:`);
  console.log(`- Total rows processed: ${debugCount}`);
  console.log(`- Rows with status found: ${statusFoundCount}`);
  console.log(`- Rows with fulfillment found: ${fulfillmentFoundCount}`);
  console.log(`- Active FBA SKUs found: ${activeFbaFoundCount}`);
  
  console.log(`Found ${activeFbaSkus.size} active FBA SKUs`);
  
  // STEP 2: Build ASIN conflict tracking and include ALL FBA SKUs
  const asinToSkusMap = new Map(); // Track which SKUs share each ASIN
  const skuDetailsMap = new Map(); // Store additional SKU details for matching
  const allFbaSkus = new Set(); // Track ALL FBA SKUs (active or not)
  
  // Build reverse mapping from All Listings (active FBA SKUs)
  data.allListings.forEach(listing => {
    const sku = getColumnValue(listing, 'sku');
    const asin = getColumnValue(listing, 'asin');
    const status = getColumnValue(listing, 'status');
    const fulfillment = getColumnValue(listing, 'fulfillmentChannel');
    const title = getColumnValue(listing, 'itemName') || '';
    const price = parseFloat(getColumnValue(listing, 'price') || 0);

    // Skip invalid SKUs that contain ".found" or ".missing" patterns
    if (isInvalidSku(sku)) {
      return;
    }

    if (sku && asin && status?.toLowerCase() === 'active' && fulfillment === 'AMAZON_NA') {
      // Track all SKUs per ASIN
      if (!asinToSkusMap.has(asin)) {
        asinToSkusMap.set(asin, []);
      }
      asinToSkusMap.get(asin).push(sku);

      // Store SKU details for better matching
      skuDetailsMap.set(sku, { title, price, asin });
      allFbaSkus.add(sku);
    }
  });
  
  // CRITICAL FIX: Add SKUs from FBA Inventory that may not be active in All Listings
  // EXCLUDE invalid SKUs with patterns like ".found" or ".missing"
  data.fbaInventory.forEach(item => {
    const sku = item['sku'] || item['SKU'];
    const asin = item['asin'] || item['ASIN'];
    const title = item['product-name'] || item['Product Name'] || '';
    const price = parseFloat(item['your-price'] || item['Price'] || 0);

    // Skip invalid SKUs that contain ".found" or ".missing" patterns
    if (isInvalidSku(sku)) {
      console.log(`Skipping invalid SKU with pattern: ${sku}`);
      return;
    }

    if (sku && asin && !allFbaSkus.has(sku)) {
      // Track this FBA SKU even if not active in All Listings
      if (!asinToSkusMap.has(asin)) {
        asinToSkusMap.set(asin, []);
      }
      asinToSkusMap.get(asin).push(sku);

      // Store SKU details for matching
      skuDetailsMap.set(sku, { title, price, asin });
      allFbaSkus.add(sku);

      console.log(`Added FBA-only SKU: ${sku} (${asin}) - ${title.substring(0, 50)}...`);
    }
  });
  
  console.log(`Total FBA SKUs for analysis: ${allFbaSkus.size} (Active: ${activeFbaSkus.size}, Additional: ${allFbaSkus.size - activeFbaSkus.size})`);
  
  // STEP 3: Build sales data map by SKU
  const skuSalesData = new Map();
  const sharedAsinWarnings = new Map(); // Track shared ASIN warnings
  
  // Helper function to find best matching SKU using title and price
  function findBestMatchingSku(childAsin, salesTitle, salesRevenue, salesUnits) {
    const candidateSkus = asinToSkusMap.get(childAsin) || [];
    
    if (candidateSkus.length === 0) return null;
    if (candidateSkus.length === 1) return candidateSkus[0];
    
    // Multiple SKUs share this ASIN - try to find best match
    let bestMatch = null;
    let bestScore = -1;
    
    // Calculate average price from sales data
    const avgPrice = salesUnits > 0 ? salesRevenue / salesUnits : 0;
    
    candidateSkus.forEach(sku => {
      const skuDetails = skuDetailsMap.get(sku);
      if (!skuDetails) return;
      
      let score = 0;
      
      // Title similarity (simple word matching)
      if (salesTitle && skuDetails.title) {
        const salesWords = salesTitle.toLowerCase().split(/\s+/);
        const skuWords = skuDetails.title.toLowerCase().split(/\s+/);
        const commonWords = salesWords.filter(word => skuWords.includes(word)).length;
        score += (commonWords / Math.max(salesWords.length, skuWords.length)) * 50;
      }
      
      // Price similarity (within 20% is considered a match)
      if (avgPrice > 0 && skuDetails.price > 0) {
        const priceDiff = Math.abs(avgPrice - skuDetails.price) / skuDetails.price;
        if (priceDiff <= 0.2) {
          score += (1 - priceDiff) * 50;
        }
      }
      
      // Default to first SKU if no clear winner
      if (score > bestScore || (score === bestScore && !bestMatch)) {
        bestScore = score;
        bestMatch = sku;
      }
    });
    
    // Track that this ASIN is shared
    if (candidateSkus.length > 1) {
      sharedAsinWarnings.set(childAsin, candidateSkus);
    }
    
    return bestMatch;
  }
  
  // Process T365 data (365 days)
  if (data.t365 && data.t365.length > 0) {
    console.log(`Processing ${data.t365.length} rows from T365...`);
    
    data.t365.forEach(row => {
      // Only use Child ASIN, skip parent-level aggregates
      const childAsin = row['(Child) ASIN'] || row['Child ASIN'];
      if (!childAsin) return;
      
      const units = parseInt(row['Units Ordered - Sales Channel'] || row['Units Ordered'] || 0);
      let revenue = parseFloat((row['Product Sales - Sales Channel'] || row['Ordered Product Sales'] || '0').toString().replace(/[$,]/g, ''));
      const title = row['Title'] || row['Product Name'] || '';
      
      // Fallback: Calculate revenue using price from All Listings if revenue is missing
      if (revenue === 0 && units > 0 && priceMap && childAsin) {
        const price = priceMap.get(childAsin);
        if (price) {
          revenue = units * price;
          console.log(`SKUTrendsAnalysis: Using price fallback for ASIN ${childAsin}: ${units} units × $${price} = $${revenue.toFixed(2)}`);
        }
      }
      
      // Find best matching SKU using enhanced logic
      const matchedSku = findBestMatchingSku(childAsin, title, revenue, units);
      
      if (matchedSku && units > 0) {
        if (!skuSalesData.has(matchedSku)) {
          skuSalesData.set(matchedSku, {
            sku: matchedSku,
            asin: childAsin,
            title: title,
            units365: 0,
            revenue365: 0,
            units90: 0,
            revenue90: 0,
            units60: 0,
            revenue60: 0,
            units30: 0,
            revenue30: 0
          });
        }
        
        const data = skuSalesData.get(matchedSku);
        data.units365 += units;
        data.revenue365 += revenue;
        // Keep the title from the entry with more units
        if (title && (!data.title || units > data.lastSeenUnits365)) {
          data.title = title;
          data.lastSeenUnits365 = units;
        }
      }
    });
  }
  
  // Process other time periods (30, 60, 90 days)
  const periods = [
    { name: 't30', unitField: 'units30', revenueField: 'revenue30' },
    { name: 't60', unitField: 'units60', revenueField: 'revenue60' },
    { name: 't90', unitField: 'units90', revenueField: 'revenue90' }
  ];
  
  periods.forEach(period => {
    if (data[period.name] && data[period.name].length > 0) {
      console.log(`Processing ${data[period.name].length} rows from ${period.name}...`);
      
      data[period.name].forEach(row => {
        // Only use Child ASIN
        const childAsin = row['(Child) ASIN'] || row['Child ASIN'];
        if (!childAsin) return;
        
        const units = parseInt(row['Units Ordered - Sales Channel'] || row['Units Ordered'] || 0);
        let revenue = parseFloat((row['Product Sales - Sales Channel'] || row['Ordered Product Sales'] || '0').toString().replace(/[$,]/g, ''));
        
        // Fallback: Calculate revenue using price from All Listings if revenue is missing
        if (revenue === 0 && units > 0 && priceMap && childAsin) {
          const price = priceMap.get(childAsin);
          if (price) {
            revenue = units * price;
            console.log(`SKUTrendsAnalysis (${period.name}): Using price fallback for ASIN ${childAsin}: ${units} units × $${price} = $${revenue.toFixed(2)}`);
          }
        }
        
        // Find best matching SKU using enhanced logic
        const matchedSku = findBestMatchingSku(childAsin, row['Title'] || row['Product Name'] || '', revenue, units);
        
        if (matchedSku && units > 0) {
          if (!skuSalesData.has(matchedSku)) {
            skuSalesData.set(matchedSku, {
              sku: matchedSku,
              asin: childAsin,
              title: '',
              units365: 0,
              revenue365: 0,
              units90: 0,
              revenue90: 0,
              units60: 0,
              revenue60: 0,
              units30: 0,
              revenue30: 0
            });
          }
          
          const data = skuSalesData.get(matchedSku);
          // Sum the values in case of duplicates (like in T365)
          data[period.unitField] = (data[period.unitField] || 0) + units;
          data[period.revenueField] = (data[period.revenueField] || 0) + revenue;
        }
      });
    }
  });
  
  console.log(`Found sales data for ${skuSalesData.size} active FBA SKUs`);
  
  // STEP 3: Build final results array
  const results = [];
  
  skuSalesData.forEach((salesData, sku) => {
    // Only include if has sales in 365 days
    if (salesData.units365 > 0) {
      // Calculate trend data
      const units1_30 = salesData.units30 || 0;
      const units31_60 = Math.max(0, (salesData.units60 || 0) - units1_30);
      const units61_90 = Math.max(0, (salesData.units90 || 0) - (salesData.units60 || 0));
      
      // Create sparkline data
      const sparklineData = [units61_90, units31_60, units1_30];
      
      // Calculate percent change for reference
      let percentChange = 0;

      if (units31_60 > 0) {
        percentChange = ((units1_30 - units31_60) / units31_60) * 100;
      } else if (units1_30 > 0) {
        percentChange = 100;
      }
      
      // Get inventory data from FBA report
      let totalInventory = 0;
      let projectedExcess = 0;
      
      if (data.fba) {
        const fbaItem = data.fba.find(item => {
          const fbaSku = item['sku'] || item['SKU'];
          return fbaSku === sku;
        });
        
        if (fbaItem) {
          // Use same calculation as Revenue at Risk - include all inbound inventory
          // Support multiple FBA report formats:
          // - Standard FBA reports: afn-warehouse-quantity, afn-total-quantity
          // - Manage FBA Inventory / Inventory Health reports: available, Inventory Supply at FBA
          const warehouseQuantity = parseInt(
            fbaItem['afn-warehouse-quantity'] ||
            fbaItem['afn-total-quantity'] ||
            fbaItem['available'] ||
            fbaItem['Inventory Supply at FBA'] ||
            0
          );

          // Support multiple inbound column formats
          const inboundWorking = parseInt(fbaItem['afn-inbound-working-quantity'] || fbaItem['inbound-working'] || 0);
          const inboundShipped = parseInt(fbaItem['afn-inbound-shipped-quantity'] || fbaItem['inbound-shipped'] || 0);
          const inboundReceiving = parseInt(fbaItem['afn-inbound-receiving-quantity'] || fbaItem['inbound-received'] || 0);

          // Total inventory includes warehouse + all inbound
          let totalInbound = inboundWorking + inboundShipped + inboundReceiving;

          // If individual inbound columns not found, try aggregate inbound-quantity column
          if (totalInbound === 0 && fbaItem['inbound-quantity']) {
            totalInbound = parseInt(fbaItem['inbound-quantity'] || 0);
          }

          const fbaInventory = warehouseQuantity + totalInbound;

          // Add AWD inventory if available
          const awdData = awdInventoryMap.get(sku);
          const awdInventory = awdData ? awdData.total : 0;

          totalInventory = fbaInventory + awdInventory;

          // Calculate daily velocity and projected excess
          const units = salesData.units90 || salesData.units365;
          const days = salesData.units90 ? 90 : 365;
          const dailyVelocity = units / days;

          const daysOfInventory = dailyVelocity > 0 ? totalInventory / dailyVelocity : 999;

          if (daysOfInventory > 180 && dailyVelocity > 0) {
            const inventoryFor180Days = dailyVelocity * 180;
            projectedExcess = Math.max(0, totalInventory - inventoryFor180Days);
          }
        }
      }

      // Calculate Days of Supply (based on 30-day sales velocity, includes both FBA and AWD)
      let daysOfSupply;
      let fbaOnlyInventory = 0;

      // Get FBA inventory for Days of Supply calculation
      if (data.fba) {
        const fbaItem = data.fba.find(item => {
          const fbaSku = item['sku'] || item['SKU'];
          return fbaSku === sku;
        });

        if (fbaItem) {
          // Support multiple FBA report formats (same as above)
          const warehouseQuantity = parseInt(
            fbaItem['afn-warehouse-quantity'] ||
            fbaItem['afn-total-quantity'] ||
            fbaItem['available'] ||
            fbaItem['Inventory Supply at FBA'] ||
            0
          );

          // EXCLUDED: afn-inbound-working-quantity - shipments created but NOT yet shipped (still at seller's warehouse)
          // Only count inventory that is actually in transit or at Amazon
          const inboundShipped = parseInt(fbaItem['afn-inbound-shipped-quantity'] || fbaItem['inbound-shipped'] || 0);
          const inboundReceiving = parseInt(fbaItem['afn-inbound-receiving-quantity'] || fbaItem['inbound-received'] || 0);

          let totalInbound = inboundShipped + inboundReceiving;

          // If individual inbound columns not found, try aggregate inbound-quantity column
          if (totalInbound === 0 && fbaItem['inbound-quantity']) {
            totalInbound = parseInt(fbaItem['inbound-quantity'] || 0);
          }

          fbaOnlyInventory = warehouseQuantity + totalInbound;
        }
      }

      // Get AWD inventory
      const awdData = awdInventoryMap.get(sku);
      const awdInventory = awdData ? awdData.total : 0;
      const combinedInventory = fbaOnlyInventory + awdInventory;

      const unitsSoldPerDayAverage = units1_30 > 0 ? units1_30 / 30 : 0;

      if (unitsSoldPerDayAverage > 0) {
        const dos = combinedInventory / unitsSoldPerDayAverage;
        daysOfSupply = Math.round(dos);
      } else if (combinedInventory > 0) {
        daysOfSupply = "∞"; // Infinite (no recent sales)
      } else {
        daysOfSupply = 0; // No stock/sales
      }
      
      // Get better title from All Listings if needed
      let finalTitle = salesData.title;
      if (!finalTitle || finalTitle.length < 10) {
        const listing = data.allListings.find(l => {
          const listingSku = getColumnValue(l, 'sku');
          return listingSku === sku;
        });
        if (listing) {
          const listingTitle = getColumnValue(listing, 'itemName');
          if (listingTitle) {
            finalTitle = listingTitle;
          }
        }
      }
      
      // Truncate title
      if (finalTitle && finalTitle.length > 50) {
        finalTitle = finalTitle.substring(0, 47) + '...';
      }
      
      // Check if this ASIN is shared with other SKUs
      const sharedSkus = sharedAsinWarnings.get(salesData.asin);
      const hasSharedAsin = sharedSkus && sharedSkus.length > 1;
      
      // FILTER: Only include active FBA SKUs in final results
      // (inactive SKUs were included for ASIN matching but should be excluded from display)
      const isActiveFba = activeFbaSkus.has(sku);
      if (!isActiveFba) {
        console.log(`Excluding inactive SKU from results: ${sku} (${salesData.asin})`);
        return; // Skip this SKU
      }
      
      results.push({
        sku: sku,
        asin: salesData.asin,
        title: finalTitle || 'No title available',
        units90: salesData.units90,
        units365: salesData.units365,
        revenue30: salesData.revenue30,
        revenue90: salesData.revenue90,
        revenue365: salesData.revenue365,
        sparklineData: sparklineData,
        daysOfSupply: daysOfSupply, // Days of Supply (FBA + AWD)
        percentChange: percentChange,
        fbaInventory: fbaOnlyInventory, // FBA inventory only (excludes AWD)
        totalInventory: totalInventory, // Total inventory (FBA + AWD)
        projectedExcess: projectedExcess,
        awdInventory: awdInventory, // AWD inventory only
        periodData: {
          '61-90 days': units61_90,
          '31-60 days': units31_60,
          '1-30 days': units1_30
        },
        // Add shared ASIN warning data
        hasSharedAsin: hasSharedAsin,
        sharedSkus: hasSharedAsin ? sharedSkus : null
      });
    }
  });
  
  // Sort by 90-day units sold (highest first)
  results.sort((a, b) => {
    const aUnits = a.units90 || a.units365 || 0;
    const bUnits = b.units90 || b.units365 || 0;
    return bUnits - aUnits;
  });
  
  // Calculate revenue percentiles
  let totalRevenue = 0;
  results.forEach(item => {
    const revenue = item.revenue90 || item.revenue365;
    totalRevenue += revenue;
  });
  
  let cumulativeRevenue = 0;
  results.forEach((item, index) => {
    const revenue = item.revenue90 || item.revenue365;
    cumulativeRevenue += revenue;
    item.isTop20Percent = cumulativeRevenue <= (totalRevenue * 0.8);
    item.rank = index + 1;
    
    // Add percentage contribution
    item.revenueContribution = totalRevenue > 0 ? (revenue / totalRevenue * 100) : 0;
    
    // Calculate velocity score (units per day)
    item.velocity90 = item.units90 / 90;
    item.velocity365 = item.units365 / 365;
    
    // Days of inventory remaining
    if (item.totalInventory > 0) {
      const dailyVelocity = item.velocity90 > 0 ? item.velocity90 : item.velocity365;
      item.daysOfInventory = dailyVelocity > 0 ? Math.round(item.totalInventory / dailyVelocity) : 999;
    } else {
      item.daysOfInventory = 0;
    }
    
    // Inventory health flags
    item.isLowStock = item.daysOfInventory < 30 && item.daysOfInventory > 0;
    item.isCriticalStock = item.daysOfInventory < 14 && item.daysOfInventory > 0;
    item.isOutOfStock = item.totalInventory === 0;
    item.isOverstocked = item.daysOfInventory > 180;
    
    // Revenue tier classification
    if (cumulativeRevenue <= (totalRevenue * 0.5)) {
      item.revenueTier = 'A'; // Top 50% of revenue
    } else if (cumulativeRevenue <= (totalRevenue * 0.8)) {
      item.revenueTier = 'B'; // Next 30% of revenue
    } else if (cumulativeRevenue <= (totalRevenue * 0.95)) {
      item.revenueTier = 'C'; // Next 15% of revenue
    } else {
      item.revenueTier = 'D'; // Bottom 5% of revenue
    }
  });
  
  console.log(`=== FINAL: Returning ${results.length} ACTIVE FBA SKUs with sales (inactive SKUs used for ASIN matching only) ===`);
  return results;
}


// Debug function for Reflux Gourmet ASIN conflicts

// Debug Red Dot trend calculations

// Process LILF Monitor
function processLILFMonitor(data) {
  const results = [];
  
  // Check if FBA Inventory data exists
  if (!data.fbaInventory || data.fbaInventory.length === 0) {
    return results;
  }
  
  // Check if the LILF column exists in the first row
  const firstRow = data.fbaInventory[0];
  const lilfColumnExists = firstRow.hasOwnProperty('Low-Inventory-Level fee applied in current week?') || 
                          firstRow.hasOwnProperty('low-inventory-level fee applied in current week?');
  
  // If LILF column doesn't exist, return empty results
  if (!lilfColumnExists) {
    return results;
  }
  
  data.fbaInventory.forEach(item => {
    const sku = item['sku'] || item['SKU'];

    // Skip invalid SKUs that contain ".found" or ".missing" patterns
    if (isInvalidSku(sku)) {
      return;
    }

    // Look for the LILF status column (case-insensitive)
    const lilfStatus = item['Low-Inventory-Level fee applied in current week?'] ||
                      item['low-inventory-level fee applied in current week?'] || '';

    // Only include SKUs where LILF fee is "Yes"
    if (lilfStatus.toLowerCase() === 'yes') {
      // Get inventory quantity
      const totalQuantity = parseInt(item['afn-fulfillable-quantity'] || item['afn-total-quantity'] || 0);
      const inboundQuantity = parseInt(item['afn-inbound-shipped-quantity'] || 0);

      results.push({
        sku: sku,
        asin: item['asin'] || item['ASIN'],
        title: item['product-name'] || item['Product Name'] || item['title'],
        parentAsin: item['parent-asin'] || item['Parent ASIN'] || item['asin'] || item['ASIN'],
        currentInventory: totalQuantity,
        inboundInventory: inboundQuantity,
        totalInventory: totalQuantity + inboundQuantity,
        lilfApplied: true
      });
    }
  });
  
  // Group by parent ASIN
  const grouped = {};
  results.forEach(item => {
    if (!grouped[item.parentAsin]) {
      grouped[item.parentAsin] = {
        parentAsin: item.parentAsin,
        title: item.title,
        skus: []
      };
    }
    grouped[item.parentAsin].skus.push(item);
  });
  
  return Object.values(grouped);
}

// Process Vendor Central Inventory with Actionable Insights
function processVendorCentralAnalysis(vendorData, priceMap) {
  console.log('=== Starting processVendorCentralAnalysis ===');

  if (!vendorData) {
    console.log('No Vendor Central data available');
    return null;
  }

  // Handle new structure with metadata
  let dataRows, metadata = null;
  if (vendorData.data && vendorData.metadata) {
    // New structure with metadata
    dataRows = vendorData.data;
    metadata = vendorData.metadata;
    console.log('Vendor metadata received:', metadata);
  } else if (Array.isArray(vendorData)) {
    // Legacy structure (just array)
    dataRows = vendorData;
  } else {
    console.log('Invalid vendor data structure');
    return null;
  }

  if (!dataRows || dataRows.length === 0) {
    console.log('No Vendor Central data rows available');
    return null;
  }

  console.log(`Processing ${dataRows.length} rows from Vendor Central report`);

  const results = [];
  const alerts = {
    critical: [], // Unfilled customer orders (lost sales NOW)
    urgent: [],   // Low stock based on velocity
    warning: [],  // Aged inventory or low sell-through
    processIssues: [] // Low confirmation % or receive fill %
  };

  let totalSellableValue = 0;
  let totalUnfilledOrders = 0;
  let totalAgedUnits = 0;
  let vendorConfirmationRates = [];
  let sellThroughRates = [];

  dataRows.forEach((row, index) => {
    const asin = row['ASIN'];
    if (!asin) return; // Skip rows without ASIN

    const title = row['Product Title'] || '';
    const brand = row['Brand'] || '';

    // Key inventory metrics
    const sellableUnits = parseInt(row['Sellable On Hand Units'] || 0);
    const sellableValue = parseFloat((row['Sellable On Hand Inventory'] || '0').toString().replace(/[$,]/g, ''));
    const openPOQuantity = parseInt(row['Open Purchase Order Quantity'] || 0);
    const netReceivedUnits = parseInt(row['Net Received Units'] || 0);
    const aged90Units = parseInt(row['Aged 90+ Days Sellable Units'] || 0);
    const unfilledOrders = parseInt(row['Unfilled Customer Ordered Units'] || 0);

    // Performance metrics - handle both string and number formats
    const vendorConfirmation = parseFloat((row['Vendor Confirmation %'] || '0').toString().replace(/%/g, ''));
    const sellThrough = parseFloat((row['Sell-Through %'] || '0').toString().replace(/%/g, ''));
    const receiveFill = parseFloat((row['Receive Fill %'] || '0').toString().replace(/%/g, ''));
    const leadTime = parseFloat(row['Overall Vendor Lead Time (days)'] || 0);

    // Calculate days of supply (rough estimate using net received as proxy for velocity)
    // Net Received Units over the reporting period (typically 7 days based on report header)
    const reportingDays = 6; // 10/1 to 10/6 = 6 days
    const dailyVelocity = reportingDays > 0 && netReceivedUnits > 0 ? netReceivedUnits / reportingDays : 0;
    let daysOfSupply = 0;
    let daysOfSupplyDisplay = 'N/A';

    if (dailyVelocity > 0 && sellableUnits > 0) {
      daysOfSupply = Math.round(sellableUnits / dailyVelocity);
      daysOfSupplyDisplay = daysOfSupply.toString();
    } else if (sellableUnits > 0) {
      daysOfSupplyDisplay = '∞'; // Has inventory but no recent receiving velocity
    } else {
      daysOfSupplyDisplay = '0'; // No inventory
    }

    // Estimate price from priceMap or sellableValue
    let estimatedPrice = 0;
    if (priceMap && priceMap.has(asin)) {
      estimatedPrice = priceMap.get(asin);
    } else if (sellableUnits > 0 && sellableValue > 0) {
      estimatedPrice = sellableValue / sellableUnits;
    }

    // Calculate unfilled order value
    const unfilledOrderValue = unfilledOrders * estimatedPrice;

    // Determine status flags
    const isCritical = unfilledOrders > 0; // Lost sales happening NOW
    const isUrgent = daysOfSupply > 0 && daysOfSupply < 30;
    const isAgedInventory = aged90Units > 0 || sellThrough < 20;
    const hasProcessIssues = vendorConfirmation < 80 || receiveFill < 95;

    // Determine overall status
    let status = 'Healthy';
    let statusColor = 'green';

    if (isCritical) {
      status = 'Critical';
      statusColor = 'red';
    } else if (isUrgent) {
      status = 'Urgent';
      statusColor = 'orange';
    } else if (isAgedInventory || hasProcessIssues) {
      status = 'Warning';
      statusColor = 'yellow';
    }

    const item = {
      asin: asin,
      title: title.length > 60 ? title.substring(0, 57) + '...' : title,
      brand: brand,
      sellableUnits: sellableUnits,
      sellableValue: sellableValue,
      openPOQuantity: openPOQuantity,
      netReceivedUnits: netReceivedUnits,
      aged90Units: aged90Units,
      unfilledOrders: unfilledOrders,
      unfilledOrderValue: unfilledOrderValue,
      vendorConfirmation: vendorConfirmation,
      sellThrough: sellThrough,
      receiveFill: receiveFill,
      leadTime: leadTime,
      daysOfSupply: daysOfSupplyDisplay,
      daysOfSupplyNumeric: daysOfSupply,
      estimatedPrice: estimatedPrice,
      status: status,
      statusColor: statusColor,
      isCritical: isCritical,
      isUrgent: isUrgent,
      isAgedInventory: isAgedInventory,
      hasProcessIssues: hasProcessIssues
    };

    results.push(item);

    // Track totals
    totalSellableValue += sellableValue;
    totalUnfilledOrders += unfilledOrders;
    totalAgedUnits += aged90Units;

    if (vendorConfirmation > 0) vendorConfirmationRates.push(vendorConfirmation);
    if (sellThrough > 0) sellThroughRates.push(sellThrough);

    // Add to alert categories
    if (isCritical) {
      alerts.critical.push({
        asin: asin,
        title: title.length > 50 ? title.substring(0, 47) + '...' : title,
        unfilledOrders: unfilledOrders,
        estimatedValue: unfilledOrderValue,
        message: `${unfilledOrders} unfilled customer orders (~$${unfilledOrderValue.toFixed(2)} potential revenue)`
      });
    }

    if (isUrgent && !isCritical) {
      alerts.urgent.push({
        asin: asin,
        title: title.length > 50 ? title.substring(0, 47) + '...' : title,
        daysOfSupply: daysOfSupply,
        sellableUnits: sellableUnits,
        message: `Only ${daysOfSupply} days of supply remaining (${sellableUnits} units)`
      });
    }

    if (isAgedInventory && !isCritical && !isUrgent) {
      const reasons = [];
      if (aged90Units > 0) reasons.push(`${aged90Units} units aged 90+ days`);
      if (sellThrough < 20) reasons.push(`${sellThrough.toFixed(1)}% sell-through rate`);

      alerts.warning.push({
        asin: asin,
        title: title.length > 50 ? title.substring(0, 47) + '...' : title,
        aged90Units: aged90Units,
        sellThrough: sellThrough,
        message: reasons.join(', ')
      });
    }

    if (hasProcessIssues) {
      const issues = [];
      if (vendorConfirmation < 80 && vendorConfirmation > 0) {
        issues.push(`${vendorConfirmation.toFixed(1)}% vendor confirmation`);
      }
      if (receiveFill < 95 && receiveFill > 0) {
        issues.push(`${receiveFill.toFixed(1)}% receive fill rate`);
      }

      if (issues.length > 0) {
        alerts.processIssues.push({
          asin: asin,
          title: title.length > 50 ? title.substring(0, 47) + '...' : title,
          vendorConfirmation: vendorConfirmation,
          receiveFill: receiveFill,
          message: issues.join(', ')
        });
      }
    }
  });

  // Calculate average metrics
  const avgVendorConfirmation = vendorConfirmationRates.length > 0
    ? vendorConfirmationRates.reduce((a, b) => a + b, 0) / vendorConfirmationRates.length
    : 0;

  const avgSellThrough = sellThroughRates.length > 0
    ? sellThroughRates.reduce((a, b) => a + b, 0) / sellThroughRates.length
    : 0;

  // Calculate unfilled order value
  const totalUnfilledValue = alerts.critical.reduce((sum, alert) => sum + (alert.estimatedValue || 0), 0);

  // Sort results by priority: Critical > Urgent > Warning > Healthy
  results.sort((a, b) => {
    const statusOrder = { 'Critical': 0, 'Urgent': 1, 'Warning': 2, 'Healthy': 3 };
    const aOrder = statusOrder[a.status] || 999;
    const bOrder = statusOrder[b.status] || 999;

    if (aOrder !== bOrder) return aOrder - bOrder;

    // Within same status, sort by unfilled orders (descending) then sellable value (descending)
    if (a.unfilledOrders !== b.unfilledOrders) return b.unfilledOrders - a.unfilledOrders;
    return b.sellableValue - a.sellableValue;
  });

  console.log(`Processed ${results.length} Vendor Central ASINs`);
  console.log(`Alerts: ${alerts.critical.length} critical, ${alerts.urgent.length} urgent, ${alerts.warning.length} warnings, ${alerts.processIssues.length} process issues`);

  // Generate detailed explanations and recommendations
  const explanations = generateVendorCentralExplanations(results, alerts, {
    totalUnfilledOrders,
    totalUnfilledValue,
    totalAgedUnits,
    avgVendorConfirmation,
    avgSellThrough
  });

  return {
    items: results,
    alerts: alerts,
    summary: {
      totalAsins: results.length,
      totalSellableValue: totalSellableValue,
      totalSellableUnits: results.reduce((sum, item) => sum + item.sellableUnits, 0),
      totalUnfilledOrders: totalUnfilledOrders,
      totalUnfilledValue: totalUnfilledValue,
      totalAgedUnits: totalAgedUnits,
      avgVendorConfirmation: avgVendorConfirmation,
      avgSellThrough: avgSellThrough,
      criticalCount: alerts.critical.length,
      urgentCount: alerts.urgent.length,
      warningCount: alerts.warning.length,
      processIssueCount: alerts.processIssues.length,
      healthyCount: results.filter(item => item.status === 'Healthy').length
    },
    explanations: explanations,
    metadata: metadata // Include report metadata (viewing range and update date)
  };
}

/**
 * Generate human-readable explanations for Vendor Central status alerts
 * Helps brand managers and clients understand what each alert means and how to fix it
 */
function generateVendorCentralExplanations(items, alerts, metrics) {
  const explanations = {
    statusDefinitions: {
      critical: {
        title: "🔴 Critical Status",
        meaning: "Unfilled Customer Orders - Lost Sales Happening NOW",
        description: "These ASINs have customers who have placed orders, but Amazon cannot fulfill them due to insufficient inventory. This represents immediate revenue loss and poor customer experience.",
        howToFix: [
          "Expedite shipments to Amazon warehouses immediately",
          "Review and confirm all pending Purchase Orders (POs) from Amazon",
          "Increase production if this is a recurring issue",
          "Contact your Amazon Vendor Manager to discuss emergency replenishment options"
        ],
        impact: "Direct revenue loss, potential Buy Box suppression, damaged customer trust"
      },
      urgent: {
        title: "🟠 Urgent Status",
        meaning: "Low Inventory - Will Stockout Within 30 Days",
        description: "These ASINs have less than 30 days of inventory remaining based on current sales velocity. If not replenished soon, they will become out of stock and generate unfilled orders.",
        howToFix: [
          "Submit shipments to Amazon within your lead time window",
          "Review Amazon's open Purchase Orders and confirm quantities",
          "Monitor daily sales velocity to adjust forecasts",
          "Consider increasing safety stock for high-velocity items"
        ],
        impact: "Imminent stockouts, potential lost sales, reduced visibility in search results"
      },
      warning: {
        title: "🟡 Warning Status",
        meaning: "Aged Inventory or Poor Performance",
        description: "These ASINs have inventory that has been sitting for 90+ days without selling, very low sell-through rates (under 20%), or process issues with vendor confirmations/receiving. This indicates overstocking or poor inventory management.",
        howToFix: [
          "For aged inventory: Consider running promotions, Lightning Deals, or price adjustments to move stock",
          "Review demand forecasting - Amazon may have over-ordered relative to actual customer demand",
          "For low sell-through: Analyze listing quality, pricing, reviews, and competitive positioning",
          "For process issues: Improve PO confirmation rates (target 80%+) and receiving accuracy (target 95%+)",
          "Work with Amazon to adjust future PO quantities based on actual performance"
        ],
        impact: "Storage fees, potential clearance requirements, reduced profitability, cash flow issues"
      },
      healthy: {
        title: "🟢 Healthy Status",
        meaning: "Optimal Inventory Health",
        description: "These ASINs have balanced inventory levels with no unfilled orders, adequate days of supply (30+ days), minimal aged inventory, and good sell-through rates.",
        howToFix: [
          "Maintain current replenishment practices",
          "Continue monitoring for velocity changes",
          "Use these as benchmarks for other products"
        ],
        impact: "Optimal performance and profitability"
      }
    },

    overallReport: generateOverallReport(items, alerts, metrics),

    actionableRecommendations: generateActionableRecommendations(items, alerts, metrics)
  };

  return explanations;
}

/**
 * Generate an overall narrative report of inventory health
 */
function generateOverallReport(items, alerts, metrics) {
  const criticalCount = alerts.critical.length;
  const urgentCount = alerts.urgent.length;
  const warningCount = alerts.warning.length;
  const healthyCount = items.filter(item => item.status === 'Healthy').length;
  const totalAsins = items.length;

  let report = `VENDOR CENTRAL INVENTORY HEALTH REPORT\n\n`;

  // Executive Summary
  report += `EXECUTIVE SUMMARY:\n`;
  report += `Out of ${totalAsins} total ASINs tracked in your Vendor Central account:\n`;
  report += `• ${criticalCount} ASINs (${((criticalCount/totalAsins)*100).toFixed(1)}%) are CRITICAL with unfilled customer orders\n`;
  report += `• ${urgentCount} ASINs (${((urgentCount/totalAsins)*100).toFixed(1)}%) are URGENT with low inventory (under 30 days supply)\n`;
  report += `• ${warningCount} ASINs (${((warningCount/totalAsins)*100).toFixed(1)}%) have WARNINGS due to aged inventory or performance issues\n`;
  report += `• ${healthyCount} ASINs (${((healthyCount/totalAsins)*100).toFixed(1)}%) are HEALTHY\n\n`;

  // Critical Issues
  if (criticalCount > 0) {
    report += `IMMEDIATE ACTION REQUIRED - CRITICAL ISSUES:\n`;
    report += `You currently have ${metrics.totalUnfilledOrders.toLocaleString()} unfilled customer orders worth approximately $${metrics.totalUnfilledValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}. `;
    report += `This means customers have already placed orders that Amazon cannot fulfill due to insufficient inventory. Every day these orders remain unfilled, you lose revenue and damage customer relationships. `;
    report += `Priority #1 is to expedite inventory shipments for these ${criticalCount} critical ASINs immediately.\n\n`;
  }

  // Urgent Issues
  if (urgentCount > 0) {
    report += `URGENT - IMPENDING STOCKOUTS:\n`;
    report += `${urgentCount} ASINs are running low on inventory and will stockout within the next 30 days based on current sales velocity. `;
    report += `Review Amazon's open Purchase Orders and ensure you can fulfill them within your lead time to prevent these from becoming critical stockouts. `;
    report += `If you cannot meet Amazon's requested quantities, partial confirmation is better than no confirmation.\n\n`;
  }

  // Warning Issues
  if (warningCount > 0) {
    report += `WARNINGS - INVENTORY OPTIMIZATION NEEDED:\n`;
    report += `${warningCount} ASINs have aged inventory (90+ days old) or poor performance metrics. `;
    if (metrics.totalAgedUnits > 0) {
      report += `You have ${metrics.totalAgedUnits.toLocaleString()} total units that have been sitting in Amazon's warehouses for over 90 days without selling. `;
      report += `This inventory ties up cash, incurs storage fees, and may be subject to Amazon's aged inventory surcharges or removal requirements. `;
    }
    if (metrics.avgSellThrough > 0 && metrics.avgSellThrough < 20) {
      report += `Your average sell-through rate of ${metrics.avgSellThrough.toFixed(1)}% is below the healthy threshold of 20%, indicating inventory is not moving efficiently. `;
    }
    report += `Consider promotions, pricing adjustments, or working with Amazon to reduce future order quantities for slow-moving products.\n\n`;
  }

  // Performance Metrics
  if (metrics.avgVendorConfirmation > 0 || alerts.processIssues.length > 0) {
    report += `VENDOR PERFORMANCE METRICS:\n`;
    if (metrics.avgVendorConfirmation > 0) {
      const vendorStatus = metrics.avgVendorConfirmation >= 80 ? "good" : "needs improvement";
      report += `• Vendor Confirmation Rate: ${metrics.avgVendorConfirmation.toFixed(1)}% (${vendorStatus} - target is 80%+)\n`;
    }
    if (alerts.processIssues.length > 0) {
      report += `• ${alerts.processIssues.length} ASINs have process issues with low confirmation or receive fill rates\n`;
      report += `  Low confirmation rates indicate you're unable to fulfill Amazon's requested quantities, which may lead to stockouts.\n`;
      report += `  Low receive fill rates suggest shipment or receiving issues that delay inventory availability.\n`;
    }
    report += `\n`;
  }

  // Positive Note
  if (healthyCount > 0) {
    report += `POSITIVE PERFORMANCE:\n`;
    report += `${healthyCount} ASINs are performing well with balanced inventory levels and good sell-through. `;
    report += `Continue current replenishment practices for these products and use them as benchmarks for optimization.\n\n`;
  }

  return report;
}

/**
 * Generate prioritized, actionable recommendations
 */
function generateActionableRecommendations(items, alerts, metrics) {
  const recommendations = [];

  // Priority 1: Critical stockouts
  if (alerts.critical.length > 0) {
    const topCritical = alerts.critical
      .sort((a, b) => b.estimatedValue - a.estimatedValue)
      .slice(0, 5);

    recommendations.push({
      priority: 1,
      category: "Critical Stockouts",
      action: "Expedite Inventory Shipments Immediately",
      details: `Focus on these top ${Math.min(5, alerts.critical.length)} ASINs by unfilled order value:`,
      items: topCritical.map(item =>
        `• ${item.asin}: ${item.unfilledOrders} orders (~$${item.estimatedValue.toFixed(2)}) - ${item.title}`
      )
    });
  }

  // Priority 2: Urgent low stock
  if (alerts.urgent.length > 0) {
    const topUrgent = alerts.urgent
      .sort((a, b) => a.daysOfSupply - b.daysOfSupply)
      .slice(0, 5);

    recommendations.push({
      priority: 2,
      category: "Impending Stockouts",
      action: "Confirm Amazon Purchase Orders Within Lead Time",
      details: `These ${Math.min(5, alerts.urgent.length)} ASINs will stockout soonest:`,
      items: topUrgent.map(item =>
        `• ${item.asin}: ${item.daysOfSupply} days of supply remaining - ${item.title}`
      )
    });
  }

  // Priority 3: Aged inventory
  const agedItems = items
    .filter(item => item.aged90Units > 0)
    .sort((a, b) => b.aged90Units - a.aged90Units)
    .slice(0, 5);

  if (agedItems.length > 0) {
    recommendations.push({
      priority: 3,
      category: "Aged Inventory",
      action: "Run Promotions or Adjust Pricing to Move Slow Stock",
      details: `These ${Math.min(5, agedItems.length)} ASINs have the most aged inventory:`,
      items: agedItems.map(item =>
        `• ${item.asin}: ${item.aged90Units} units aged 90+ days (${item.sellThrough.toFixed(1)}% sell-through) - ${item.title}`
      )
    });
  }

  // Priority 4: Process improvements
  if (alerts.processIssues.length > 0) {
    const topProcessIssues = alerts.processIssues.slice(0, 5);

    recommendations.push({
      priority: 4,
      category: "Process Improvements",
      action: "Improve Vendor Confirmation and Receiving Accuracy",
      details: `Address these process issues to prevent future stockouts:`,
      items: topProcessIssues.map(item =>
        `• ${item.asin}: ${item.message} - ${item.title}`
      )
    });
  }

  // Priority 5: Overall strategy
  recommendations.push({
    priority: 5,
    category: "Strategic Improvements",
    action: "Optimize Your Vendor Central Relationship",
    details: "Long-term actions to improve inventory health:",
    items: [
      "Schedule regular reviews with your Amazon Vendor Manager to align on forecasts",
      "Implement automated inventory monitoring to catch issues before they become critical",
      "Analyze historical data to identify seasonal patterns and adjust safety stock accordingly",
      "For chronic stockout issues: Increase production capacity or lead time buffers",
      "For chronic overstock issues: Work with Amazon to reduce PO quantities or adjust forecasting assumptions"
    ]
  });

  return recommendations;
}

// Quick focused debug for ASIN sales
// ===== HOLIDAY SEASONALITY FUNCTIONS =====

// Get holiday data from linked sheet
function getHolidayData(clientConfig) {
  if (!clientConfig || !clientConfig.sheets['holiday-data']) {
    console.log('No holiday data URL in config');
    return null;
  }
  
  const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const holidayData = {};
  
  try {
    const sheetUrl = clientConfig.sheets['holiday-data'];
    console.log('Opening holiday sheet:', sheetUrl);
    
    // Extract sheet ID
    const sheetIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!sheetIdMatch) {
      console.error('Invalid holiday data sheet URL');
      return null;
    }
    
    const spreadsheet = SpreadsheetApp.openById(sheetIdMatch[1]);
    console.log('Holiday sheet name:', spreadsheet.getName());
    
    months.forEach(month => {
      try {
        const sheet = spreadsheet.getSheetByName(month);
        if (sheet) {
          const data = sheet.getDataRange().getValues();
          const headers = data[0];
          const rows = data.slice(1);
          
          console.log(`${month} headers:`, headers);
          
          // Convert to objects
          holidayData[month] = rows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index];
            });
            return obj;
          });
          
          console.log(`Loaded ${rows.length} rows for ${month}`);
          
          // Log first row as sample
          if (rows.length > 0) {
            console.log(`${month} first row sample:`, holidayData[month][0]);
          }
        }
      } catch (e) {
        console.error(`Error loading ${month} data:`, e);
      }
    });
    
    return holidayData;
  } catch (error) {
    console.error('Error loading holiday data:', error);
    return null;
  }
}

// Process seasonality forecast
function processSeasonalityForecast(clientId, growthFactor = 1.0) {
  try {
    const clientConfig = loadClientConfig(clientId, true); // Force refresh
    if (!clientConfig) {
      throw new Error('Client configuration not found');
    }
    
    console.log('Client config loaded:', clientConfig);
    console.log('Holiday data URL:', clientConfig.sheets['holiday-data']);
    
    // Get holiday historical data
    const holidayData = getHolidayData(clientConfig);
    if (!holidayData) {
      return {
        error: 'No holiday data configured',
        configured: false,
        debug: {
          clientConfig: clientConfig,
          holidayUrl: clientConfig.sheets['holiday-data']
        }
      };
    }
    
    // Get current inventory data
    const currentData = {
      fba: getSheetData('fba', clientConfig),
      fbaInventory: getSheetData('fba-inventory', clientConfig),
      allListings: getSheetData('all-listings', clientConfig)
    };
    
    // Build ASIN to SKU mapping from current All Listings
    const asinToSkuMap = new Map();
    const skuDetailsMap = new Map();
    const activeFbaSkus = new Set();
    
    currentData.allListings.forEach(listing => {
      const sku = getColumnValue(listing, 'sku');
      const asin = getColumnValue(listing, 'asin');
      const status = getColumnValue(listing, 'status');
      const fulfillment = getColumnValue(listing, 'fulfillmentChannel');
      const title = getColumnValue(listing, 'itemName') || '';
      
      // Map ALL SKUs with ASINs for holiday planning (not just active FBA)
      if (sku && asin) {
        if (!asinToSkuMap.has(asin)) {
          asinToSkuMap.set(asin, []);
        }
        asinToSkuMap.get(asin).push(sku);
        skuDetailsMap.set(sku, { asin, title, status, fulfillment });
        
        // Track which ones are active FBA for filtering later
        if (status?.toLowerCase() === 'active' && fulfillment === 'AMAZON_NA') {
          activeFbaSkus.add(sku);
        }
      }
    });
    
    console.log(`Built ASIN to SKU map with ${asinToSkuMap.size} ASINs`);
    
    // Log a few sample mappings
    let sampleCount = 0;
    asinToSkuMap.forEach((skus, asin) => {
      if (sampleCount < 5) {
        console.log(`ASIN ${asin} maps to SKUs:`, skus);
        sampleCount++;
      }
    });
    
    // Build SKU sales aggregation from holiday data
    const skuHolidayTotals = new Map();
    const monthlyBreakdown = {};
    let unmatchedAsins = new Set();
    
    // Process each month
    ['Aug', 'Sep', 'Oct', 'Nov', 'Dec'].forEach(month => {
      monthlyBreakdown[month] = new Map();
      
      if (holidayData[month]) {
        console.log(`Processing ${month} with ${holidayData[month].length} rows`);
        
        holidayData[month].forEach(row => {
          const childAsin = row['(Child) ASIN'] || row['Child ASIN'];
          const units = parseInt(row['Units Ordered'] || row['Units Ordered - Sales Channel'] || 0);
          let revenue = parseFloat((row['Ordered Product Sales'] || row['Product Sales - Sales Channel'] || '0').toString().replace(/[$,]/g, ''));
          const title = row['Title'] || row['Product Name'] || '';
          
          // Build price map from All Listings if not already built
          if (!this._holidayPriceMap) {
            this._holidayPriceMap = buildAsinPriceMap(currentData.allListings);
          }
          
          // Fallback: Calculate revenue using price from All Listings if revenue is missing
          if (revenue === 0 && units > 0 && childAsin) {
            const price = this._holidayPriceMap.get(childAsin);
            if (price) {
              revenue = units * price;
              console.log(`Holiday ${month}: Using price fallback for ASIN ${childAsin}: ${units} units × $${price} = $${revenue.toFixed(2)}`);
            }
          }
          
          // Log first few rows to debug
          if (holidayData[month].indexOf(row) < 3) {
            console.log(`${month} sample row:`, {childAsin, units, revenue});
          }
          
          if (childAsin && units > 0) {
            // Find SKUs for this ASIN
            const skus = asinToSkuMap.get(childAsin) || [];
            
            if (skus.length > 0) {
              // If multiple SKUs share the ASIN, use the first one
              // In a more sophisticated system, we'd distribute proportionally
              const sku = skus[0];
              
              // Add to monthly breakdown
              if (!monthlyBreakdown[month].has(sku)) {
                monthlyBreakdown[month].set(sku, {
                  units: 0,
                  revenue: 0
                });
              }
              const monthData = monthlyBreakdown[month].get(sku);
              monthData.units += units;
              monthData.revenue += revenue;
              
              // Add to totals
              if (!skuHolidayTotals.has(sku)) {
                skuHolidayTotals.set(sku, {
                  sku: sku,
                  asin: childAsin,
                  title: title || skuDetailsMap.get(sku)?.title || '',
                  totalUnits: 0,
                  totalRevenue: 0,
                  augUnits: 0,
                  sepUnits: 0,
                  octUnits: 0,
                  novUnits: 0,
                  decUnits: 0
                });
              }
              
              const totals = skuHolidayTotals.get(sku);
              totals.totalUnits += units;
              totals.totalRevenue += revenue;
              totals[month.toLowerCase() + 'Units'] = (totals[month.toLowerCase() + 'Units'] || 0) + units;
            } else if (units > 0) {
              // Track unmatched ASINs
              unmatchedAsins.add(childAsin);
            }
          }
        });
      }
    });
    
    console.log(`Matched ${skuHolidayTotals.size} SKUs with holiday sales data`);
    console.log(`Unmatched ASINs: ${unmatchedAsins.size}`);
    
    // Get current inventory for each SKU
    const inventoryMap = new Map();
    currentData.fba.forEach(item => {
      const sku = item['sku'] || item['SKU'];
      if (sku) {
        const totalQuantity = parseInt(item['afn-total-quantity'] || 0);
        const inboundWorking = parseInt(item['afn-inbound-working-quantity'] || 0);
        const inboundShipped = parseInt(item['afn-inbound-shipped-quantity'] || 0);
        const inboundReceiving = parseInt(item['afn-inbound-receiving-quantity'] || 0);
        
        inventoryMap.set(sku, {
          currentOnHand: totalQuantity,
          inbound: inboundWorking + inboundShipped + inboundReceiving,
          totalAvailable: totalQuantity + inboundWorking + inboundShipped + inboundReceiving
        });
      }
    });
    
    // Sort SKUs by total holiday revenue to get top performers
    const sortedSkus = Array.from(skuHolidayTotals.entries())
      .sort((a, b) => b[1].revenue - a[1].revenue);
    
    // Take only top 10% of SKUs by revenue to ensure it fits in google.script.run limits
    const top10PercentCount = Math.max(20, Math.min(100, Math.ceil(sortedSkus.length * 0.1))); // Min 20, Max 100 SKUs
    const topSkus = sortedSkus.slice(0, top10PercentCount);
    
    console.log(`Processing top ${top10PercentCount} SKUs out of ${sortedSkus.length} total (top 10% by revenue, max 100)`);
    
    // Build forecast results
    const forecastResults = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    
    topSkus.forEach(([sku, historicalData]) => {
      const inventory = inventoryMap.get(sku) || {
        currentOnHand: 0,
        inbound: 0,
        totalAvailable: 0
      };
      
      // Get SKU details to check if it's currently active
      const skuDetails = skuDetailsMap.get(sku);
      const isActiveFba = activeFbaSkus.has(sku);
      const isMerchantFulfilled = skuDetails?.fulfillment === 'DEFAULT' || skuDetails?.fulfillment === 'Merchant';
      const isInactive = skuDetails?.status?.toLowerCase() !== 'active';
      
      // Calculate daily velocities for each month
      const dailyVelocities = {
        aug: historicalData.augUnits / 31,
        sep: historicalData.sepUnits / 30,
        oct: historicalData.octUnits / 31,
        nov: historicalData.novUnits / 30,
        dec: historicalData.decUnits / 31
      };
      
      // Calculate peak month and multiplier
      const maxUnits = Math.max(
        historicalData.augUnits,
        historicalData.sepUnits,
        historicalData.octUnits,
        historicalData.novUnits,
        historicalData.decUnits
      );
      
      let peakMonth = 'Dec';
      if (maxUnits === historicalData.novUnits) peakMonth = 'Nov';
      else if (maxUnits === historicalData.octUnits) peakMonth = 'Oct';
      else if (maxUnits === historicalData.sepUnits) peakMonth = 'Sep';
      else if (maxUnits === historicalData.augUnits) peakMonth = 'Aug';
      
      // Calculate forecasted demand with growth factor
      const forecastedDemand = {
        aug: Math.ceil(historicalData.augUnits * growthFactor),
        sep: Math.ceil(historicalData.sepUnits * growthFactor),
        oct: Math.ceil(historicalData.octUnits * growthFactor),
        nov: Math.ceil(historicalData.novUnits * growthFactor),
        dec: Math.ceil(historicalData.decUnits * growthFactor),
        total: Math.ceil(historicalData.totalUnits * growthFactor)
      };
      
      // Calculate cumulative demand and order recommendations
      let cumulativeDemand = 0;
      let remainingInventory = inventory.totalAvailable;
      const orderRecommendations = [];
      
      // Process each month to determine when to order
      const monthsToProcess = [
        { name: 'Aug', days: 31, demand: forecastedDemand.aug },
        { name: 'Sep', days: 30, demand: forecastedDemand.sep },
        { name: 'Oct', days: 31, demand: forecastedDemand.oct },
        { name: 'Nov', days: 30, demand: forecastedDemand.nov },
        { name: 'Dec', days: 31, demand: forecastedDemand.dec }
      ];
      
      monthsToProcess.forEach((month, index) => {
        cumulativeDemand += month.demand;
        
        // Check if we need to order for this month
        // We need inventory to arrive 45 days before the month starts
        const monthStartDate = new Date(currentYear, 7 + index, 1); // Aug = 7
        const orderByDate = new Date(monthStartDate);
        orderByDate.setDate(orderByDate.getDate() - 45);
        
        // Calculate if current inventory will last until this month
        if (remainingInventory < cumulativeDemand) {
          const orderQuantity = cumulativeDemand - remainingInventory;
          
          // Add some buffer (20% safety stock)
          const bufferedQuantity = Math.ceil(orderQuantity * 1.2);
          
          orderRecommendations.push({
            month: month.name,
            orderDate: orderByDate,
            orderQuantity: bufferedQuantity,
            arrivalDate: monthStartDate,
            reason: `Need ${cumulativeDemand} units by ${month.name}, have ${remainingInventory}`
          });
          
          // Update remaining inventory (assuming order arrives)
          remainingInventory += bufferedQuantity;
        }
      });
      
      // Calculate risk score (0-100)
      let riskScore = 0;
      if (inventory.totalAvailable === 0) riskScore += 30;
      if (orderRecommendations.length > 0 && orderRecommendations[0].orderDate < today) riskScore += 40;
      if (forecastedDemand.total > historicalData.totalUnits * 1.5) riskScore += 20;
      if (inventory.totalAvailable < forecastedDemand.aug) riskScore += 10;
      
      forecastResults.push({
        sku: sku,
        asin: historicalData.asin,
        title: historicalData.title,
        skuStatus: {
          isActive: !isInactive,
          isActiveFba: isActiveFba,
          isMerchantFulfilled: isMerchantFulfilled,
          fulfillmentChannel: skuDetails?.fulfillment || 'Unknown',
          status: skuDetails?.status || 'Unknown'
        },
        historical: {
          totalUnits: historicalData.totalUnits,
          totalRevenue: historicalData.totalRevenue,
          augUnits: historicalData.augUnits,
          sepUnits: historicalData.sepUnits,
          octUnits: historicalData.octUnits,
          novUnits: historicalData.novUnits,
          decUnits: historicalData.decUnits,
          peakMonth: peakMonth
        },
        currentInventory: inventory,
        forecast: forecastedDemand,
        dailyVelocities: dailyVelocities,
        orderRecommendations: orderRecommendations,
        riskScore: riskScore,
        growthFactor: growthFactor
      });
    });
    
    // Sort by risk score (highest risk first)
    forecastResults.sort((a, b) => b.riskScore - a.riskScore);
    
    return {
      configured: true,
      growthFactor: growthFactor,
      results: forecastResults,
      summary: {
        totalSkus: forecastResults.length,
        activeFbaSkus: forecastResults.filter(r => r.skuStatus.isActiveFba).length,
        merchantFulfilledSkus: forecastResults.filter(r => r.skuStatus.isMerchantFulfilled).length,
        inactiveSkus: forecastResults.filter(r => !r.skuStatus.isActive).length,
        skusNeedingOrders: forecastResults.filter(r => r.orderRecommendations.length > 0).length,
        criticalSkus: forecastResults.filter(r => r.riskScore >= 70).length,
        totalHistoricalUnits: Array.from(skuHolidayTotals.values()).reduce((sum, sku) => sum + sku.totalUnits, 0),
        totalForecastedUnits: forecastResults.reduce((sum, r) => sum + r.forecast.total, 0),
        unmatchedAsins: unmatchedAsins.size,
        matchedAsins: skuHolidayTotals.size
      }
    };
    
  } catch (error) {
    console.error('Error processing seasonality forecast:', error);
    return {
      error: error.message,
      configured: false
    };
  }
}

// Test holiday forecast
function getHolidayForecast(clientId, growthFactor) {
  console.log('getHolidayForecast called with clientId:', clientId, 'growthFactor:', growthFactor);
  
  try {
    const clientConfig = loadClientConfig(clientId, true);
    if (!clientConfig) {
      return { error: 'Client configuration not found', configured: false };
    }
    
    // Check if holiday data is configured
    if (!clientConfig.sheets['holiday-data']) {
      return { error: 'No holiday data configured', configured: false };
    }
    
    // Get holiday data
    const holidayData = getHolidayData(clientConfig);
    if (!holidayData) {
      return { error: 'Could not load holiday data', configured: false };
    }
    
    // Calculate simple summary metrics
    let totalRevenue2024 = 0;
    let totalUnits2024 = 0;
    let uniqueASINs = new Set();
    const topProductsMap = new Map();
    
    // Get current data for price map (will be expanded later)
    let currentData = {
      allListings: getSheetData('all-listings', clientConfig)
    };
    const priceMap = buildAsinPriceMap(currentData.allListings);
    
    // Focus on Nov-Dec for holiday season
    ['Nov', 'Dec'].forEach(month => {
      if (holidayData[month]) {
        holidayData[month].forEach(row => {
          const asin = row['(Child) ASIN'] || row['Child ASIN'];
          const units = parseInt(row['Units Ordered'] || 0);
          let revenue = parseFloat((row['Ordered Product Sales'] || '0').toString().replace(/[$,]/g, ''));
          const title = row['Title'] || row['Product Name'] || '';
          
          // Fallback: Calculate revenue using price from All Listings if revenue is missing
          if (revenue === 0 && units > 0 && asin && priceMap) {
            const price = priceMap.get(asin);
            if (price) {
              revenue = units * price;
              console.log(`Holiday Forecast ${month}: Using price fallback for ASIN ${asin}: ${units} units × $${price} = $${revenue.toFixed(2)}`);
            }
          }
          
          if (asin && units > 0) {
            uniqueASINs.add(asin);
            totalUnits2024 += units;
            totalRevenue2024 += revenue;
            
            // Track top products
            if (!topProductsMap.has(asin)) {
              topProductsMap.set(asin, { title, units: 0, revenue: 0 });
            }
            const product = topProductsMap.get(asin);
            product.units += units;
            product.revenue += revenue;
          }
        });
      }
    });
    
    // Get top 20% of products by revenue (minimum 20, max 200)
    const allProducts = Array.from(topProductsMap.entries())
      .map(([asin, data]) => ({ asin, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
    
    const top20PercentCount = Math.max(20, Math.min(200, Math.ceil(allProducts.length * 0.2)));
    const topProducts = allProducts.slice(0, top20PercentCount)
      .map(p => ({
        asin: p.asin,
        title: p.title.substring(0, 50) + (p.title.length > 50 ? '...' : ''),
        units2024: p.units,
        revenue2024: p.revenue,
        units2025: Math.ceil(p.units * growthFactor),
        revenue2025: p.revenue * growthFactor
      }));
    
    // Add FBA data to currentData for planning
    currentData.fba = getSheetData('fba', clientConfig);
    
    // Build inventory and SKU mappings
    const inventoryBySku = new Map();
    currentData.fba.forEach(item => {
      const sku = item['sku'];
      const available = parseInt(item['afn-fulfillable-quantity'] || 0);
      const inbound = parseInt(item['afn-inbound-shipped-quantity'] || 0) + 
                      parseInt(item['afn-inbound-receiving-quantity'] || 0);
      
      if (sku) {
        inventoryBySku.set(sku, {
          available: available,
          inbound: inbound,
          total: available + inbound
        });
      }
    });
    
    // Build ASIN to SKU mapping
    const asinToSku = new Map();
    currentData.allListings.forEach(listing => {
      const sku = getColumnValue(listing, 'sku');
      const asin = getColumnValue(listing, 'asin');
      const status = getColumnValue(listing, 'status');
      const fulfillment = getColumnValue(listing, 'fulfillmentChannel');
      
      if (sku && asin && status?.toLowerCase() === 'active' && fulfillment === 'AMAZON_NA') {
        asinToSku.set(asin, sku);
      }
    });
    
    // Calculate planning metrics for top products
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // Determine target date based on current date
    let targetDate;
    let targetDescription;
    
    if (currentMonth < 9) { // Before October
      targetDate = new Date(currentYear, 9, 31); // Oct 31 this year
      targetDescription = 'October 31';
    } else if (currentMonth === 9) { // October
      targetDate = new Date(currentYear, 10, 15); // Nov 15 this year
      targetDescription = 'November 15';
    } else if (currentMonth === 10) { // November
      targetDate = new Date(currentYear, 11, 1); // Dec 1 this year
      targetDescription = 'December 1';
    } else { // December or later
      targetDate = new Date(currentYear + 1, 9, 31); // Oct 31 next year
      targetDescription = 'October 31 (next year)';
    }
    
    const daysUntilTarget = Math.max(1, Math.ceil((targetDate - today) / (24 * 60 * 60 * 1000)));
    const weeksUntilTarget = Math.max(1, Math.ceil(daysUntilTarget / 7));
    
    const productsWithInventory = topProducts.map((product, index) => {
      const sku = asinToSku.get(product.asin);
      const inventory = sku ? inventoryBySku.get(sku) : null;
      const holidayDailyVelocity = product.units2024 / 61; // Nov + Dec days
      
      let currentInventory = 0;
      let coverage = 0;
      let unitsNeeded = 0;
      let weeklyRecommendation = 0;
      let status = 'unknown';
      
      if (inventory) {
        currentInventory = inventory.total;
        const projectedDaily = holidayDailyVelocity * growthFactor;
        coverage = projectedDaily > 0 ? currentInventory / projectedDaily : 999;
        const targetUnits = Math.ceil(projectedDaily * 60); // 60 days coverage
        unitsNeeded = Math.max(0, targetUnits - currentInventory);
        weeklyRecommendation = Math.ceil(unitsNeeded / weeksUntilTarget);
        
        if (coverage < 30) status = 'critical';
        else if (coverage < 50) status = 'warning';
        else status = 'good';
        
        // Log calculation details for first few products
        if (index < 3) {
          console.log(`\nProduct ${index + 1} Calculation Details:`);
          console.log(`- ASIN: ${product.asin}, SKU: ${sku}`);
          console.log(`- 2024 Holiday Units: ${product.units2024}`);
          console.log(`- Holiday Daily Velocity: ${holidayDailyVelocity.toFixed(2)}`);
          console.log(`- Current Inventory: ${currentInventory} (${inventory.available} available + ${inventory.inbound} inbound)`);
          console.log(`- Projected Daily (${growthFactor}x): ${projectedDaily.toFixed(2)}`);
          console.log(`- Coverage Days: ${coverage.toFixed(1)}`);
          console.log(`- Target Units (60d): ${targetUnits}`);
          console.log(`- Units Needed: ${unitsNeeded}`);
          console.log(`- Weekly Send: ${weeklyRecommendation}`);
        }
      }
      
      return {
        ...product,
        sku: sku || 'N/A',
        currentInventory: currentInventory,
        coverage: coverage,
        unitsNeeded: unitsNeeded,
        weeklyRecommendation: weeklyRecommendation,
        status: status
      };
    });
    
    // Return enhanced summary with inventory planning
    return {
      configured: true,
      summary: {
        totalProducts: uniqueASINs.size,
        totalUnits2024: totalUnits2024,
        totalRevenue2024: totalRevenue2024,
        forecastUnits2025: Math.ceil(totalUnits2024 * growthFactor),
        forecastRevenue2025: totalRevenue2024 * growthFactor,
        growthPercent: Math.round((growthFactor - 1) * 100),
        topProducts: productsWithInventory,
        weeksUntilTarget: weeksUntilTarget,
        daysUntilTarget: daysUntilTarget,
        targetDate: targetDate.toISOString().split('T')[0],
        targetDescription: targetDescription,
        criticalCount: productsWithInventory.filter(p => p.status === 'critical').length,
        warningCount: productsWithInventory.filter(p => p.status === 'warning').length
      }
    };
    
  } catch (error) {
    console.error('Error in getHolidayForecast:', error);
    return {
      error: error.toString(),
      configured: false
    };
  }
}

// Test holiday config
function getHolidayForecastMetadata(clientId, growthFactor = 1.0) {
  try {
    const result = processSeasonalityForecast(clientId, growthFactor);
    if (!result || result.error) {
      return { error: result?.error || 'Failed to process forecast' };
    }
    
    const chunkSize = 25; // Optimal chunk size for google.script.run
    const totalResults = result.results?.length || 0;
    const totalChunks = Math.ceil(totalResults / chunkSize);
    
    return {
      configured: result.configured,
      growthFactor: result.growthFactor,
      summary: result.summary,
      pagination: {
        totalResults: totalResults,
        chunkSize: chunkSize,
        totalChunks: totalChunks
      },
      dataAvailable: totalResults > 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Get a specific chunk of holiday forecast data
 * This enables loading large datasets in smaller pieces
 */
function getHolidayForecastChunked(clientId, growthFactor = 1.0, chunkIndex = 0, chunkSize = 25) {
  try {
    const result = processSeasonalityForecast(clientId, growthFactor);
    if (!result || result.error) {
      return { error: result?.error || 'Failed to process forecast' };
    }
    
    const totalResults = result.results?.length || 0;
    const totalChunks = Math.ceil(totalResults / chunkSize);
    const startIndex = chunkIndex * chunkSize;
    const endIndex = Math.min(startIndex + chunkSize, totalResults);
    
    const chunk = result.results.slice(startIndex, endIndex);
    
    return {
      configured: result.configured,
      growthFactor: result.growthFactor,
      results: chunk,
      pagination: {
        currentChunk: chunkIndex,
        chunkSize: chunkSize,
        totalChunks: totalChunks,
        totalResults: totalResults,
        startIndex: startIndex,
        endIndex: endIndex,
        hasMore: chunkIndex + 1 < totalChunks
      },
      // Include summary only in first chunk to avoid duplication
      summary: chunkIndex === 0 ? result.summary : undefined,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

/**
 * Enhanced getHolidayForecast function with automatic size detection and chunking
 * This replaces the original function to handle large datasets gracefully
 */
function getHolidayForecastSafe(clientId, growthFactor) {
  console.log('getHolidayForecastSafe called with clientId:', clientId, 'growthFactor:', growthFactor);
  
  try {
    // First, get metadata to check size
    const metadata = getHolidayForecastMetadata(clientId, growthFactor);
    if (metadata.error) {
      return metadata;
    }
    
    // If small enough, return full data
    if (metadata.pagination.totalResults <= 50) {
      const result = processSeasonalityForecast(clientId, growthFactor || 1.1);
      if (result && result.results) {
        result.isTop20Percent = true;
        result.totalSkusAnalyzed = result.results.length;
        result.deliveryMethod = 'full';
      }
      return result;
    }
    
    // For larger datasets, return metadata with chunking instructions
    return {
      configured: metadata.configured,
      growthFactor: metadata.growthFactor,
      summary: metadata.summary,
      pagination: metadata.pagination,
      deliveryMethod: 'chunked',
      message: 'Dataset too large for single delivery. Use chunked loading.',
      instructions: {
        useEndpoint: 'getHolidayForecastChunk',
        chunkSize: metadata.pagination.chunkSize,
        totalChunks: metadata.pagination.totalChunks
      }
    };
    
  } catch (error) {
    console.error('Error in getHolidayForecastSafe:', error);
    return {
      error: error.toString(),
      message: 'Error processing holiday forecast safely'
    };
  }
}

// Debug function to test each RTIC sheet individually
// DEBUG FUNCTION - Check AWD vs FBA inventory for refluxgourmet RG-11
