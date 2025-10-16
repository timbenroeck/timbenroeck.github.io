# 🚀 GitHub Pages Deployment Guide

Follow these simple steps to deploy your Snowflake vs Databricks game to GitHub Pages:

## Step 1: Create a GitHub Repository

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name your repository (e.g., `snowflake-vs-databricks-game`)
5. Make it public (required for free GitHub Pages)
6. Don't initialize with README (we already have files)
7. Click "Create repository"

## Step 2: Upload Your Files

### Option A: Using GitHub Web Interface
1. In your new repository, click "uploading an existing file"
2. Drag and drop all the files from your project folder:
   - `index.html`
   - `styles.css`
   - `script.js`
   - `README.md`
3. Add a commit message like "Initial commit: Snowflake vs Databricks game"
4. Click "Commit changes"

### Option B: Using Git Command Line
```bash
# Navigate to your project folder
cd /path/to/snowflake-game

# Initialize git repository
git init

# Add all files
git add .

# Commit files
git commit -m "Initial commit: Snowflake vs Databricks game"

# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

## Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on "Settings" tab
3. Scroll down to "Pages" section in the left sidebar
4. Under "Source", select "Deploy from a branch"
5. Choose "main" branch and "/ (root)" folder
6. Click "Save"

## Step 4: Access Your Game

1. GitHub will provide you with a URL like: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`
2. It may take a few minutes for the site to be available
3. You can find the URL in the "Pages" section of your repository settings

## 🎉 You're Done!

Your Snowflake vs Databricks game is now live on the internet! Share the URL with friends and colleagues to show off Snowflake's superiority in a fun, interactive way.

## 🔧 Customization Tips

- **Change the repository name** to something more memorable
- **Add a custom domain** in the Pages settings if you have one
- **Update the README** with your specific deployment URL
- **Add more features** to the game and redeploy by pushing new commits

## 📱 Mobile Friendly

The game is fully responsive and works great on mobile devices, so your audience can play it anywhere!

---

**Happy gaming!** 🎮❄️
