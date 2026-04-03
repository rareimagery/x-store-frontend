# RareImagery Creator Platform — Complete User Manual

**Version:** 1.0 | **Last Updated:** April 2, 2026
**Platform:** rareimagery.net | **Backend:** Drupal 11 | **Frontend:** Next.js 16

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Console Dashboard](#2-console-dashboard)
3. [Page Building (Wireframe Builder)](#3-page-building-wireframe-builder)
4. [Drag & Drop System](#4-drag--drop-system)
5. [Wireframe Blocks Reference](#5-wireframe-blocks-reference)
6. [Color Schemes](#6-color-schemes)
7. [Favorite Creators](#7-favorite-creators)
8. [X Articles](#8-x-articles)
9. [X Communities](#9-x-communities)
10. [Social Feeds (TikTok, Instagram, YouTube)](#10-social-feeds)
11. [Music Player](#11-music-player)
12. [Grok Gallery](#12-grok-gallery)
13. [Design Studio (Grok Imagine AI)](#13-design-studio)
14. [Store Management](#14-store-management)
15. [Public Pages](#15-public-pages)
16. [Admin Features](#16-admin-features)
17. [Mobile Usage](#17-mobile-usage)
18. [Drupal Backend](#18-drupal-backend)
19. [Troubleshooting](#19-troubleshooting)

---

## 1. Getting Started

### Creating Your Account

1. Go to **rareimagery.net**
2. Click **"Launch My Store with X"**
3. Sign in with your X (Twitter) account via OAuth
4. Your X profile data (avatar, banner, bio, followers, posts) is automatically imported into Drupal
5. A store and profile are created for you at `rareimagery.net/{your-x-username}`

### First Login

After signing in, you land at the **Console Dashboard** (`/console`). This is your command center for everything.

### Account Types

| Role | Access |
|------|--------|
| **Creator** | Manage their own store, page, products, content |
| **Admin** | Manage ALL stores, switch between any store, platform settings |

Admin accounts are set via the `ADMIN_X_USERNAMES` environment variable (comma-separated X handles).

---

## 2. Console Dashboard

**URL:** `/console`

The dashboard shows:

- **Store info** — name, status (approved/pending), slug
- **Quick cards** — Products, Music, Page Building, Design Studio
- **"Creating Your Safe Space"** — mini wireframe preview explaining the builder
- **Store dropdown** (under sidebar) — for managing store features

### Console Sidebar Navigation

| Section | Pages |
|---------|-------|
| **Workspace** | Page Building, Favorite Creators, X Articles, X Communities, Social Feeds, Music, Grok Gallery, Design Studio |
| **Store** (dropdown) | Products, Orders, Shipping, Accounting, Printful, Settings |
| **Platform Admin** (admin only) | All Stores, Users, X Subscribers |

### View Live Store

The "View Live Store" link at the bottom of the sidebar opens your public page at `rareimagery.net/{slug}`.

---

## 3. Page Building (Wireframe Builder)

**URL:** `/console/page-building`

This is the core of RareImagery — a visual drag-and-drop page builder.

### Layout Structure

Your page has a fixed structure:

```
┌─────────────────────────────────────┐
│          Profile Header             │
│  (Banner + Avatar + Name + Bio)     │
├─────────────────────────────────────┤
│  Home | Store | Favorites | Gallery │
│           Navigation Menu           │
├──────────┬───────────┬──────────────┤
│   LEFT   │  CENTER   │    RIGHT     │
│ SIDEBAR  │  CONTENT  │   SIDEBAR    │
│  (1/4)   │  (1/2)    │    (1/4)     │
│          │           │              │
│  Block   │  Block    │    Block     │
│  Block   │  Block    │    Block     │
│          │  Block    │    Block     │
└──────────┴───────────┴──────────────┘
```

- The **profile header** (banner, avatar, name, bio) renders automatically from your X profile
- The **navigation menu** (Home, Store, Favorites, Gallery, Articles, Share) is automatic
- You control what goes in the **3 columns** by placing blocks

### Admin Store Picker

Admins see an **"Editing store:"** dropdown at the top of the builder. Select any store (e.g., "xAI Official Store (xai)" or "Rare's Store (rareimagery)") to edit that store's wireframe.

### Save & Publish

Click the red **"Save & Publish"** button to save your wireframe and push it live immediately. The button shows:
- "Saving..." while in progress
- "Saved!" on success
- Red error text if something fails

### See Your Site

Click **"See Your Site"** (next to Save & Publish) to open your live public page in a new tab.

---

## 4. Drag & Drop System

The wireframe builder supports **two methods** for placing blocks:

### Method 1: Drag & Drop (Desktop)

1. In the **COMPONENTS** panel on the left, find the block you want
2. **Click and hold** the block, then **drag** it into a column (Left Sidebar, Main Content, or Right Sidebar)
3. **Drop** it in the column — it appears at the bottom
4. Drag blocks between columns or reorder within a column

### Method 2: Tap to Place (Touch / iPad)

Since HTML5 drag-and-drop doesn't work on touchscreens:

1. **Tap** a component in the palette — it highlights with an indigo ring
2. A blue banner appears: "Tap a column below to place **[Block Name]**"
3. All three columns glow to indicate they're drop targets
4. **Tap** a column — the block is placed there
5. Tap **Cancel** to deselect without placing

### Moving Blocks (Touch & Desktop)

When you **tap/click a placed block** to select it, a floating toolbar appears below it:

| Button | Action |
|--------|--------|
| ← | Move block to the left column |
| ↑ | Move block up within its column |
| ↓ | Move block down within its column |
| → | Move block to the right column |
| ✕ | Remove the block |

On desktop, you can also **drag** placed blocks between columns.

### Block Inspector

When a block is selected, an **inspector panel** appears on the right side. Each block has configurable properties:

- **Section Heading** — text displayed above the block
- **Max Items** — how many items to show (for lists)
- **Music URL** — for the music player block
- Other block-specific settings

### Removing Blocks

- **Desktop:** hover over a block and click the red **×** in the top-right corner
- **Touch:** tap the block, then tap the **✕** button in the move toolbar

---

## 5. Wireframe Blocks Reference

### Product Grid
- **What it shows:** Your store products with images, titles, descriptions, and prices
- **Inspector:** Heading, Max Items, Columns (1-3)
- **Behavior:** Each product links to its detail page at `/products/{slug}` where customers can purchase
- **Data source:** Drupal Commerce products linked to your store

### Social Feed
- **What it shows:** Your recent X posts with full text, images/video thumbnails, engagement stats
- **Inspector:** Heading, Max Items
- **Behavior:** Video posts show a play button overlay. Each post links to the original on X.
- **Data source:** Drupal `field_top_posts` (synced from X API)

### Pinned Post
- **What it shows:** Your pinned X post with special indigo "Pinned" badge
- **Inspector:** Heading
- **Behavior:** Shows image, text (4-line clamp), likes/reposts/views, links to X
- **Data source:** Drupal `field_pinned_post` (auto-synced from X)

### Music Player
- **What it shows:** Spotify or Apple Music embedded player
- **Inspector:** Heading, Music URL
- **Behavior:** If no URL set in inspector, plays the first track from your Music console page. Shows additional tracks below.
- **Data source:** Store's `field_music_player` or inspector URL

### My Favorites
- **What it shows:** Your favorite X creators with profile pictures, bios, follower counts
- **Inspector:** Heading, Max Items (up to 10)
- **Behavior:** Each card links to their X profile. "View all" link when there are more.
- **Data source:** Store's `field_my_favorites` (managed in Favorite Creators console page)

### X Articles
- **What it shows:** Your imported long-form X posts/articles
- **Inspector:** Heading, Max Items
- **Behavior:** Shows title, intro, image, date, engagement. Links to X.
- **Data source:** Store's `field_x_articles` (managed in X Articles console page)

### Grok Gallery
- **What it shows:** Your AI-generated images and videos (up to 5)
- **Inspector:** Heading, Max Items
- **Behavior:** First image spans full width, rest in 2-column grid. Videos supported. "View all" link to gallery page.
- **Data source:** Store's `field_grok_gallery` (auto-saved from Design Studio + manual uploads)

### X Communities
- **What it shows:** X Communities you belong to
- **Inspector:** Heading
- **Behavior:** Community cards with group icon, name, description, "Join" link
- **Data source:** Store's `field_x_communities` (managed in X Communities console page)

### TikTok / Instagram / YouTube
- **What it shows:** Your social media profile embed for the selected platform
- **Inspector:** Heading
- **Behavior:** Shows platform icon, @username, "Follow on [Platform]" link, embedded iframe
- **Data source:** Store's `field_social_feeds` (managed in Social Feeds console page)

---

## 6. Color Schemes

At the bottom of the page builder, choose from 5 color schemes:

| Scheme | Background | Accent | Feel |
|--------|-----------|--------|------|
| **Midnight** | Near-black (#09090b) | Indigo (#6366f1) | Default dark theme |
| **Ocean** | Deep navy (#0c1222) | Sky blue (#38bdf8) | Cool, tech-forward |
| **Forest** | Dark green (#0a0f0a) | Emerald (#4ade80) | Natural, organic |
| **Sunset** | Dark red (#1a0a0a) | Orange (#fb923c) | Warm, bold |
| **Royal** | Deep purple (#0f0a1a) | Violet (#a78bfa) | Premium, creative |

The color scheme affects:
- Page background
- Block card backgrounds and borders
- Nav menu active tab color
- Accent text (links, handles)
- Muted text colors
- Hover states

The scheme is saved with the wireframe and applies to the public page.

---

## 7. Favorite Creators

**Console:** `/console/favorite-creators`

Add X creators you recommend to your followers.

### How to Use

1. Type an **@username** in the search box
2. Click **"Look up"** — their profile picture, bio, and follower count appear
3. Click **"+ Add"** to add them to your favorites
4. **Reorder** with up/down arrows
5. **Remove** by hovering and clicking Remove

### Where They Appear

- In the **My Favorites** wireframe block on your public page
- On the dedicated **Favorites page** at `/{username}/favorites`

---

## 8. X Articles

**Console:** `/console/x-articles`

Import your long-form X posts and articles.

### How to Use

1. Click **"Import Articles"** — Drupal calls the X API to fetch your long-form posts (using `note_tweet` expansion)
2. New articles are deduped and merged with existing ones
3. **Remove** individual articles by hovering and clicking Remove

### What Gets Imported

- Posts with `note_tweet` (long-form, >280 characters)
- Posts with article URLs
- Title (first line of text), intro (first 280 chars), image, date, engagement stats

---

## 9. X Communities

**Console:** `/console/communities`

Link the X Communities you're part of.

### How to Use

1. Paste an **X Community URL** or just the community ID
2. Add a **name** and optional **description**
3. Click **"Add Community"**
4. Remove by hovering and clicking Remove

---

## 10. Social Feeds

**Console:** `/console/social-feeds`

Add your TikTok, Instagram, and YouTube accounts.

### How to Use

1. Select a **platform** (TikTok / Instagram / YouTube)
2. Type your **@username** or channel URL
3. Click **"Add"** — auto-generates profile and embed URLs
4. Remove by hovering and clicking Remove

### Wireframe Blocks

Each platform has its own wireframe block:
- **TikTok** — TikTok icon + username + embedded profile
- **Instagram** — Instagram icon + username + embedded profile
- **YouTube** — YouTube icon + handle + embedded channel

---

## 11. Music Player

**Console:** `/console/music`

Add Spotify and Apple Music tracks to your store.

### How to Use

1. Click the **Spotify** or **Apple Music** button to open the service and copy a link
2. **Paste** the link in the input field — auto-detects the provider
3. Live **preview** of the embedded player appears
4. Add optional **title** and **artist**
5. Click **"Add to Playlist"**
6. **Reorder** with up/down arrows
7. **Remove** by hovering

### Supported URL Formats

- Spotify: `https://open.spotify.com/track/...`, `https://open.spotify.com/playlist/...`, `spotify:track:...`
- Apple Music: `https://music.apple.com/...`

### Music Player Block

The wireframe block:
- Plays the first track from your playlist (or a URL set in the inspector)
- Shows up to 3 additional tracks below as links
- "+N more tracks" if the playlist is longer

---

## 12. Grok Gallery

**Console:** `/console/grok-gallery`

Your collection of AI-generated images and videos.

### How to Use

**Upload files:**
1. **Drag & drop** images or videos onto the upload zone
2. Or click **"Choose file"** to browse
3. Files upload to **Drupal** (permanent storage) — JPEG, PNG, WebP, GIF, MP4, WebM, max 20MB

**Add by URL:**
1. Expand **"Or add by URL"**
2. Paste an image or video URL
3. Add description, select type (Image/Video)
4. Click **"Add to Gallery"**

**Auto-saved from Design Studio:**
Every image you generate in the Design Studio is automatically saved to your gallery.

### Gallery Management

- Hover over items to see the prompt and **Remove** button
- Grid view with hover overlay showing metadata
- Link to **Design Studio** for creating new designs

---

## 13. Design Studio

**Console:** `/console/design-studio`

Generate AI-powered merch designs using Grok Imagine.

### Creating a Design

1. **Upload a reference image** (optional) — drag & drop logo, photo, sketch
2. **Type a prompt** — describe your design
3. **Select product type** — T-Shirt ($24.99), Hoodie ($44.99), or Ballcap ($29.99)
4. Click **"Generate Design"**

### Prompt Tips

- **Text-only:** "Cyberpunk samurai cat wearing neon sunglasses"
- **With PFP:** "use @rareimagery pfp to create shirt" — auto-fetches the X profile picture
- **"My PFP":** "use my pfp on a hoodie" — uses your own avatar
- **With upload:** Upload your logo + "make it cyberpunk on a hoodie"

### Publishing to Store

After generation:
1. Edit the **product title** and optional **description**
2. Click **"Publish to Printful"** (or just to your store if Printful isn't connected)
3. The product is created in **Drupal Commerce** with:
   - Product entity linked to your store
   - Variation with price and SKU
   - Design image attached
   - Printful sync (if connected)

### Printful Connection

At the bottom of the Design Studio:
1. Get your API key from [Printful Dashboard → Settings → API](https://www.printful.com/dashboard/developer/api)
2. Paste it and click **"Connect"**
3. Future designs auto-sync to Printful for print-on-demand fulfillment

### Your Store Products

The bottom section shows all products in your Drupal Commerce store. Each links to the product detail page.

---

## 14. Store Management

### Products (`/console/products`)

View, add, and manage products in your store.

### Orders (`/console/orders`)

View customer orders, track fulfillment status.

### Shipping (`/console/shipping`)

Configure shipping options and rates.

### Accounting (`/console/accounting`)

Revenue tracking and financial overview.

### Printful (`/console/printful`)

Manage your Printful print-on-demand connection.

### Settings (`/console/settings`)

Store settings, domain display, configuration.

---

## 15. Public Pages

Each creator gets multiple public pages:

| Page | URL | Content |
|------|-----|---------|
| **Profile / Home** | `/{username}` | Wireframe layout with all blocks |
| **Store** | `/{username}/store` | Full product grid (4-column) |
| **Favorites** | `/{username}/favorites` | Full list of favorite creators |
| **Gallery** | `/{username}/gallery` | Full AI art collection |
| **Product Detail** | `/products/{slug}` | Product page with buy buttons |

### Page Header

All pages (except the wireframe home) share a consistent header:
- **Banner image** from X profile
- **Avatar** overlapping the banner
- **Name** and **@handle**
- **Bio** snippet
- **Nav menu:** Home | Store | Favorites | Gallery | Articles | **Share**

### Share on X

Every page has a **Share** button that opens X's tweet composer with:
- Text: "Check out @{handle}'s page on RareImagery"
- URL to the page
- X auto-generates a link card preview using the creator's profile picture

---

## 16. Admin Features

### Admin Toolbar

When logged in as admin, a floating toolbar appears on every public creator page (bottom-right):

| Button | Action |
|--------|--------|
| **Edit Page** | Switches to that store and opens the wireframe builder |
| **Products** | Jump to product management |
| **Console** | Jump to console dashboard |

### Store Picker (Page Builder)

Admins see an **"Editing store:"** dropdown at the top of the page builder to switch between any store.

### All Stores (`/console/admin`)

View all stores on the platform with:
- Store name, slug (links to public page), X username
- Created date, status (approved/pending/rejected)
- **Manage** link to each store's settings

### Users (`/console/admin/users`)

Manage platform users.

### X Subscribers (`/console/admin/subscribers`)

View X subscription data.

---

## 17. Mobile Usage

### Public Pages

The wireframe is fully mobile-responsive:
- **Center column** (Main Content) shows by default on mobile
- A **hamburger menu** (☰) appears to switch between Left Sidebar, Main Content, and Right Sidebar
- Selected column fills full screen width
- Header, nav menu, and all blocks adapt to mobile width

### Console

The console sidebar collapses on mobile with a toggle drawer. Quick action buttons appear at the bottom for common tasks.

### Page Builder on iPad/Tablet

The wireframe builder works on touch devices:
- **Tap** palette items to select, **tap** columns to place
- **Tap** placed blocks to reveal move controls (arrows + delete)
- Full functionality without drag-and-drop

---

## 18. Drupal Backend

### Server Access

```
SSH: ssh root@72.62.80.155
User: su - rare
Drupal root: /var/www/html/mysite
Drush: vendor/bin/drush
```

### Key Content Types

| Type | Purpose |
|------|---------|
| `x_user_profile` | Creator X profile data (bio, followers, posts, images) |
| `commerce_store--online` | Creator store (slug, status, page builds, favorites, articles, music, gallery, communities, social feeds) |
| `commerce_product--clothing` | Products (t-shirt, hoodie, ballcap variations) |

### X Profile Sync

Drupal owns X data syncing via the `x_profile_sync` custom module:

```bash
# Sync a single profile
drush x-profile-sync:run --username=RareImagery

# Batch sync (cron runs this automatically every 30 min)
drush xps

# Configure sync settings
/admin/config/services/x-profile-sync
```

### Key Drupal Fields on Store

| Field | Content |
|-------|---------|
| `field_page_builds` | Wireframe layout JSON |
| `field_my_favorites` | Favorite creators JSON |
| `field_x_articles` | Imported articles JSON |
| `field_music_player` | Music playlist JSON |
| `field_grok_gallery` | AI gallery JSON |
| `field_x_communities` | Communities JSON |
| `field_social_feeds` | Social media accounts JSON |
| `field_printful_api_key` | Printful connection |

---

## 19. Troubleshooting

### Save & Publish fails with 403

**Cause:** Drupal API password mismatch or flood control.

**Fix:**
1. Update `DRUPAL_API_PASS` in Vercel env vars to match the Drupal admin password
2. Clear flood table: `drush php:eval "\Drupal::database()->truncate('flood')->execute();"`

### Products not showing

**Cause:** Products may be on a different store, or the JSON:API include is failing.

**Fix:** Check that products are linked to the correct store ID in Drupal.

### X profile data not updating

**Cause:** The sync hasn't run.

**Fix:** `drush x-profile-sync:run --username=YourUsername`

### Color scheme not applying

**Cause:** Cached page.

**Fix:** Hard refresh (Ctrl+Shift+R). The page uses `force-dynamic` but Vercel CDN may cache briefly.

### Images not downloading during sync

**Cause:** File permissions on Drupal server.

**Fix:** `chown -R www-data:www-data /var/www/html/mysite/web/sites/default/files/ && chmod -R 775 /var/www/html/mysite/web/sites/default/files/`

### Wireframe not rendering on public page

**Cause:** No published build, or the build format doesn't match.

**Fix:** Go to Page Building, make changes, click Save & Publish. Verify the build has `published: true`.

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Vercel     │────▶│  Drupal 11   │────▶│   X API v2  │
│  Next.js 16  │     │  Commerce    │     │  (Twitter)  │
│  App Router  │◀────│  JSON:API    │◀────│  OAuth 2.0  │
└──────┬───────┘     └──────┬───────┘     └─────────────┘
       │                    │
       │              ┌─────┴──────┐
       │              │ PostgreSQL │
       │              │    16      │
       │              └────────────┘
       │
  ┌────┴─────┐     ┌──────────────┐
  │ Printful │     │   Grok AI    │
  │   POD    │     │  (x.ai API)  │
  └──────────┘     └──────────────┘
```

---

*Built by RareImagery. Powered by X, Grok AI, Drupal Commerce, and Next.js.*
