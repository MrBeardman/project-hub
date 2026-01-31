# Shoptet Integration Guide

## Overview

This guide explains how to migrate your Shoptet CSS/JS customizations to the Project Hub service.

## Step 1: Create Project in Dashboard

1. Go to `https://your-domain.vercel.app/admin`
2. Create new project:
   - **Key**: `gold-eshop-1` (use unique key for each eshop)
   - **Name**: Gold Eshop 1
   - **Client**: Gold s.r.o.
   - **Type**: Bundle (CSS + JS)

## Step 2: Upload Your CSS/JS

1. Click "Edit Assets" on the project card
2. Paste your current CSS into the CSS field
3. Paste your current JS into the JS field
4. Click "Save Assets"

## Step 3: Update Shoptet Admin

### Current Setup (in Shoptet admin):

**Header:**
```html
<link rel="stylesheet" href="https://660800.myshoptet.com/user/documents/upload/css/custom-style.css?v=3.32">
```

**Footer:**
```html
<script src="https://660800.myshoptet.com/user/documents/upload/js/custom-script.js?v=3.47"></script>
<script src="https://660800.myshoptet.com/user/documents/upload/js/kesia_jm.js?v=0.86"></script>
```

### New Setup (replace with):

**Header:**
```html
<link rel="stylesheet" href="https://your-domain.vercel.app/api/v1/assets/style?key=gold-eshop-1">
```

**Footer:**
```html
<script src="https://your-domain.vercel.app/api/v1/assets/script?key=gold-eshop-1"></script>
```

## Managing Multiple Eshops

Create separate projects for each eshop:

| Eshop | Project Key | CSS/JS |
|-------|-------------|--------|
| Eshop 1 | `gold-eshop-1` | Custom styles for eshop 1 |
| Eshop 2 | `gold-eshop-2` | Custom styles for eshop 2 |
| Eshop 3 | `gold-eshop-3` | Custom styles for eshop 3 |

Each eshop uses its own URL:
```
https://your-domain.vercel.app/api/v1/assets/style?key=gold-eshop-1
https://your-domain.vercel.app/api/v1/assets/style?key=gold-eshop-2
https://your-domain.vercel.app/api/v1/assets/style?key=gold-eshop-3
```

## Centralized Management Benefits

1. **Single dashboard** - manage all eshops from one place
2. **Version control** - update CSS/JS without FTP access
3. **Quick updates** - changes deploy instantly
4. **Kill switch** - toggle projects on/off as needed
5. **Statistics** - see how many requests each eshop makes

## What Happens When Disabled

When you toggle a project to "INACTIVE":

- CSS endpoint returns: `/* Service temporarily unavailable */`
- JS endpoint returns: `// Service temporarily unavailable`
- The eshop will load, but without your custom styles/scripts
- Original Shoptet functionality remains intact

## Combining Multiple JS Files

If you currently have multiple JS files (like `custom-script.js` and `kesia_jm.js`), 
combine them into one in the dashboard:

```javascript
// ==========================================
// custom-script.js content
// ==========================================

// ... your custom-script.js code here ...

// ==========================================
// kesia_jm.js content
// ==========================================

// ... your kesia_jm.js code here ...
```

## Cache Behavior

- CSS/JS responses are cached for 5 minutes (300 seconds)
- After toggling inactive, it may take up to 5 minutes for change to take effect
- To force immediate update, you can change the cache header in the API code

## Troubleshooting

**Styles not loading:**
1. Check browser console for errors
2. Verify the project key is correct
3. Ensure project is set to "ACTIVE" in dashboard

**CORS errors:**
- The API includes proper CORS headers
- Should work from any domain

**500 errors:**
- Check Vercel logs for details
- Ensure KV storage is properly connected
