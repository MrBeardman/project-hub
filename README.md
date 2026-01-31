# Project Hub

Configuration management service for client projects.

## Setup

### 1. Deploy to Vercel

Connect this repository to Vercel and deploy.

### 2. Add Vercel KV Storage

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → **KV**
4. Name it `project-hub-kv`
5. Connect it to your project

### 3. Set Environment Variables

In Vercel project settings → Environment Variables, add:

```
ADMIN_SECRET=your-secret-password-here
```

Use a strong, random password. This protects your admin dashboard.

### 4. Access Admin Dashboard

Visit `https://your-domain.vercel.app/admin` and enter your admin secret.

## API Endpoints

### Configuration API

```
GET /api/v1/config?key=PROJECT_KEY
```

Returns configuration object. Client apps check `config.features.core` to determine if they should run.

### Asset Delivery

```
GET /api/v1/assets/style?key=PROJECT_KEY  (CSS)
GET /api/v1/assets/script?key=PROJECT_KEY (JS)
```

Returns CSS/JS content when project is active, empty content when inactive.

## Client Integration

### For PHP Applications (Gold Dashboard)

Add this at the start of your main PHP file:

```php
<?php
// Configuration loader - required for app functionality
function loadAppConfig() {
    $configUrl = 'https://your-domain.vercel.app/api/v1/config?key=YOUR_PROJECT_KEY';
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $configUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200 || !$response) {
        return false;
    }
    
    $config = json_decode($response, true);
    return isset($config['config']['features']['core']) && $config['config']['features']['core'] === true;
}

// Initialize
if (!loadAppConfig()) {
    http_response_code(503);
    die('Service temporarily unavailable. Please contact support.');
}
?>
```

### For Shoptet (CSS/JS)

Replace your current script/style includes in Shoptet admin with:

**Header (before </head>):**
```html
<link rel="stylesheet" href="https://your-domain.vercel.app/api/v1/assets/style?key=YOUR_PROJECT_KEY">
```

**Footer (before </body>):**
```html
<script src="https://your-domain.vercel.app/api/v1/assets/script?key=YOUR_PROJECT_KEY"></script>
```

Then upload your CSS/JS content via the admin dashboard.

## Security Notes

- Keep your `ADMIN_SECRET` secure
- The admin dashboard URL is `/admin` - consider this when sharing URLs
- API responses are designed to look like normal configuration services
