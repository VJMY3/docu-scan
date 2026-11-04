# Photo Gallery Management System - User Guide

## 🚀 Getting Started

### First Time Setup

1. **Start the Application**
   ```bash
   npm install
   npm run dev
   ```
   Open https://localhost:5173/ in your browser

2. **Unlock the App**
   - Default PIN: `1234`
   - Can be changed in Settings

3. **Configure Supabase Database**
   - Click "Database Settings" button
   - Enter your Supabase Project URL
   - Enter your Supabase Anon Key
   - Click "Copy SQL Script"
   - Open Supabase SQL Editor
   - Paste and run the script
   - Click "Test Connection"
   - Click "Save Settings"

4. **Add Folder Column (For Existing Databases)**
   - If you already have an `inventory_scans` table
   - Run the `DATABASE_MIGRATION.sql` script in Supabase SQL Editor
   - This adds folder support to your existing data

## 📸 Taking Photos

### Automatic Mode
1. Click "Launch Automatic Mode"
2. Camera opens
3. Press **Space**, **Enter**, or click **Capture** button
4. Photo saves instantly to Supabase
5. Celebration animation plays! 🎉

### Manual Mode
1. Click "Launch Manual Mode"
2. Camera opens
3. Press **Space**, **Enter**, or click **Capture** button
4. Enter a name for your photo
5. Photo saves to Supabase

### Upload from Device
1. Scroll to "Upload Photo Directly to Supabase"
2. Drag and drop an image OR click to browse
3. Enter a name for the photo
4. Photo uploads instantly

## 📁 Folder Management

### Creating a New Folder
1. Click "New Folder" button in the gallery
2. Enter password: `8899`
3. Enter folder name
4. Click "Create Folder"
5. Folder appears immediately

### Deleting a Folder
1. Switch to "Folders" view
2. Click trash icon next to folder name
3. Enter password: `8899`
4. Confirm deletion
5. Photos in folder move to "Uncategorized"

### Organizing Photos into Folders
_Note: This feature can be extended in the DocumentEditForm component_

## 🖼️ Gallery Views

### All Photos View
- Shows all photos in a grid
- Search by title or folder
- Select individual photos
- Quick actions on each photo

### Monthly View
- Photos grouped by month and year
- Download entire month as ZIP
- Automatic chronological organization
- Only shows months with photos

### Folders View
- Photos organized by folders
- "Uncategorized" for photos without folders
- Delete folder option
- Shows photo count per folder

## 🔽 Downloading Photos

### Single Photo Download
1. Find the photo you want
2. Click **Download** button on photo card
3. Photo downloads to your device

### Multiple Photos Download
1. Select photos using checkboxes
2. Click **"Download (X)"** button at top
3. Enter password: `8899` (for bulk operations)
4. Wait for ZIP creation
5. ZIP file downloads automatically
6. Filename: `Selected_Photos_[timestamp].zip`

### Monthly Download
1. Switch to **Monthly** view
2. Find the month you want
3. Click **"Download Month"** button
4. Wait for ZIP creation
5. ZIP file downloads automatically
6. Filename: `Photos_[Month]_[Year].zip`

### Download Progress
- Loading indicator shows during ZIP creation
- Current/Total counter displays
- Success notification when complete

## 🗑️ Deleting Photos

### Delete Single Photo
1. Find the photo
2. Click red **trash** icon
3. Enter password: `8899`
4. Confirm deletion
5. Photo removed from gallery and storage

### Delete Multiple Photos
1. Select photos using checkboxes
2. Click red **"Delete (X)"** button at top
3. Enter password: `8899`
4. Confirm bulk deletion
5. All selected photos deleted

## ✅ Selection System

### Select Individual Photos
- Click checkbox in top-left corner of any photo
- Checkbox turns blue when selected
- Selection count updates at top

### Select All Photos
- Click **"Select All"** button at top
- Selects all visible photos in current view
- Only selects photos you can see

### Deselect All
- Click **"Deselect All"** button
- Clears entire selection
- Button appears when photos are selected

### Bulk Actions
When photos are selected:
- **Download (X)**: Download selected photos as ZIP
- **Delete (X)**: Delete selected photos (requires password)
- Both show count of selected photos

## 🔒 Password Protected Operations

### Password: `8899`

#### Protected Actions:
- ✅ Create new folder
- ✅ Delete folder  
- ✅ Delete single image
- ✅ Delete multiple images

#### How It Works:
1. Click a protected action
2. Password modal appears
3. Enter: `8899`
4. Click "Verify"
5. Action proceeds if correct
6. Error message if incorrect

## ⚙️ Settings

### Opening Settings
- Click **"Database Settings"** button in sidebar
- Or click from error banner if connection fails

### Supabase Credentials
- **Project URL**: Your Supabase project URL
- **Anon Key**: Your public anon key (not service_role!)
- **Test Connection**: Verify credentials work
- **Reload from .env**: Load values from environment file

### SQL Setup Script
- Click **"Copy SQL Script"**
- Open Supabase Dashboard → SQL Editor
- Paste and run script
- Creates table, storage bucket, and policies

### Security Passcode
- **App Lock PIN**: Change login passcode
- Default: `1234`
- Must be exactly 4 digits
- Used to unlock app on startup

### Saving Settings
- Click **"Save Settings"** button
- Green success message appears
- Settings persist after refresh
- Modal closes automatically

## 🔍 Search Functionality

### How to Search
1. Use search box at top of gallery
2. Type photo title or folder name
3. Results filter in real-time
4. Search works in all view modes

## 📱 Mobile Support

All features work on mobile devices:
- ✅ Responsive photo grid
- ✅ Touch-friendly selection
- ✅ Mobile downloads work
- ✅ Password modal optimized
- ✅ Gallery views adapt to screen size

## 🎨 UI Features

### Visual Feedback
- **Hover Effects**: Photos lift on hover
- **Selection Highlight**: Selected photos have blue border
- **Loading States**: Spinners during operations
- **Progress Indicators**: Show download progress
- **Success Notifications**: Green alerts
- **Error Notifications**: Red alerts
- **Confirmation Dialogs**: Prevent accidents

### Photo Cards Show:
- ✅ Thumbnail preview
- ✅ Photo title
- ✅ Date taken
- ✅ Folder badge (if assigned)
- ✅ Selection checkbox
- ✅ Download button
- ✅ Delete button

## ❓ Troubleshooting

### Photos Not Loading
1. Check Supabase connection in Settings
2. Click "Test Connection"
3. Ensure SQL script was run
4. Check browser console for errors

### Downloads Not Working
1. Check browser download settings
2. Allow downloads from localhost
3. Ensure sufficient disk space
4. Try downloading single photo first

### Password Not Working
- Password is: `8899`
- Must be entered exactly
- Case sensitive
- No spaces

### Folder Not Appearing
1. Refresh page
2. Check folder list in Folders view
3. Ensure password was correct during creation

### Cannot Delete Items
1. Verify password: `8899`
2. Check internet connection
3. Verify Supabase credentials
4. Check Supabase storage policies

## 🎯 Tips & Best Practices

### Organization Tips
- Create folders before uploading
- Use descriptive photo names
- Regularly download monthly backups
- Delete unwanted photos promptly

### Security Tips
- Change default PIN (1234) in Settings
- Don't share password (8899) publicly
- Keep Supabase credentials secure
- Regular backups recommended

### Performance Tips
- Large selections may take time to download
- ZIP creation requires memory
- Consider downloading in batches
- Clear browser cache if sluggish

## 📞 Support

### Common Issues
- **Connection errors**: Check Supabase status
- **Upload failures**: Verify storage policies
- **Download issues**: Check browser permissions
- **Password issues**: Remember it's `8899`

### Files Included
- `FEATURES_IMPLEMENTED.md`: Technical documentation
- `DATABASE_MIGRATION.sql`: Database update script
- `USER_GUIDE.md`: This file

---

**Enjoy your new Photo Gallery Management System! 📸✨**
