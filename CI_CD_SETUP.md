# CI/CD Setup - Auto-Deploy on Push

This guide will set up automatic deployment to Cloudflare Workers whenever you push to the `main` branch.

## 🚀 What This Does

Every time you push to GitHub:
1. GitHub Actions automatically triggers
2. Installs dependencies
3. Deploys to Cloudflare Workers
4. Your live site updates automatically

## 📋 Setup Steps

### Step 1: Get Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click **"Create Token"**
3. Use the **"Edit Cloudflare Workers"** template
4. Or create a custom token with these permissions:
   - Account > Cloudflare Workers Scripts > Edit
   - Account > D1 > Edit
5. Click **"Continue to summary"** → **"Create Token"**
6. **Copy the token** (you won't see it again!)

### Step 2: Get Cloudflare Account ID

1. Go to https://dash.cloudflare.com/
2. Select **Workers & Pages** from the left sidebar
3. Look for your Account ID on the right side
4. It looks like: `1234567890abcdef1234567890abcdef`
5. **Copy it**

### Step 3: Add Secrets to GitHub

1. Go to your repo: https://github.com/dogukanozdemir/fitibit-auto-meal
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add these **5 secrets**:

| Secret Name | Value | Where to Get It |
|-------------|-------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Your API token from Step 1 | Cloudflare dashboard |
| `CLOUDFLARE_ACCOUNT_ID` | Your account ID from Step 2 | Cloudflare dashboard |
| `FITBIT_CLIENT_ID` | Your Fitbit client ID | https://dev.fitbit.com/apps |
| `FITBIT_CLIENT_SECRET` | Your Fitbit client secret | https://dev.fitbit.com/apps |
| `API_KEY` | `e2ce1fde01b661729ad17b392bcb90b0cfe9be8b41b69c7ca70b4bf4b2cdb464` | Your API key |

**Important:** Click **"Add secret"** after entering each one!

### Step 4: Test the Workflow

```bash
# Make a small change (or just trigger a deploy)
cd /Users/dogukan/Documents/Code/fitbit-meal-logger
git add .
git commit -m "Test: Trigger auto-deploy"
git push
```

### Step 5: Watch It Deploy

1. Go to: https://github.com/dogukanozdemir/fitibit-auto-meal/actions
2. You'll see your workflow running
3. Click on it to see the logs
4. Wait ~1-2 minutes for deployment
5. ✅ Done! Your site is live

## 🎯 What Happens Now

From now on:
- **Every push to `main`** → Automatic deployment
- **Pull requests** → Won't deploy (safe for testing)
- **Failed deploys** → You'll get an email notification

## 📊 Monitoring Deployments

### View Deployment Status
- GitHub Actions: https://github.com/dogukanozdemir/fitibit-auto-meal/actions
- Cloudflare Dashboard: https://dash.cloudflare.com

### Check Deployment Logs
```bash
# In GitHub Actions, click on the workflow run
# Then click "Deploy" to see detailed logs
```

### Manual Deploy (if needed)
```bash
# You can still deploy manually anytime
npm run deploy
```

## 🔒 Security

✅ **All secrets are encrypted** in GitHub  
✅ **Secrets never appear in logs**  
✅ **Only you can see secret values**  
✅ **Tokens can be rotated anytime**

## 🛠️ Customization

### Deploy on Different Branches

Edit `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main
      - production  # Add more branches
```

### Deploy Only Specific Paths

Only deploy when certain files change:

```yaml
on:
  push:
    branches:
      - main
    paths:
      - 'src/**'
      - 'wrangler.toml'
      - 'package.json'
```

### Add Tests Before Deploy

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test  # Add your tests

  deploy:
    needs: test  # Only deploy if tests pass
    runs-on: ubuntu-latest
    # ... rest of deploy job
```

### Deploy to Staging First

```yaml
on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  deploy-staging:
    if: github.event_name == 'pull_request'
    # Deploy to staging environment

  deploy-production:
    if: github.event_name == 'push'
    # Deploy to production environment
```

## 🐛 Troubleshooting

### "Error: Invalid API token"
- Regenerate the token in Cloudflare
- Make sure it has Workers edit permissions
- Update the secret in GitHub

### "Error: Account ID not found"
- Double-check your Account ID in Cloudflare
- Make sure there are no extra spaces
- Update the secret in GitHub

### "Error: Secrets not found"
- Make sure all 5 secrets are added to GitHub
- Secret names must match EXACTLY (case-sensitive)
- No spaces in secret names

### Deployment fails but `npm run deploy` works locally
- Check that `wrangler.toml` is committed to git
- Ensure `schema.sql` is in the repo
- Verify all source files are committed

### "Error: Database not found"
- The D1 database must be created manually first
- Run: `wrangler d1 create fitbit-meal-logger-db`
- Initialize: `wrangler d1 execute fitbit-meal-logger-db --file=./schema.sql`
- GitHub Actions uses your existing D1 database

## 🔄 Workflow File Explained

```yaml
name: Deploy to Cloudflare Workers  # Workflow name

on:
  push:
    branches:
      - main  # Trigger only on main branch

jobs:
  deploy:
    runs-on: ubuntu-latest  # Use Ubuntu runner
    
    steps:
      - uses: actions/checkout@v4  # Clone repo
      
      - uses: actions/setup-node@v4  # Install Node.js 20
        with:
          node-version: '20'
          
      - run: npm ci  # Install dependencies (faster than npm install)
      
      - uses: cloudflare/wrangler-action@v3  # Deploy with Wrangler
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy  # Run wrangler deploy
          secrets: |  # Pass secrets to Workers
            FITBIT_CLIENT_ID
            FITBIT_CLIENT_SECRET
            API_KEY
```

## 📈 Best Practices

1. **Always test locally first**: `npm run dev` before pushing
2. **Use meaningful commit messages**: They appear in deployment logs
3. **Watch the first few deploys**: Make sure everything works
4. **Set up Slack/Discord notifications**: Get alerts on deploy status
5. **Keep secrets secure**: Never commit them to git

## 🎉 Success!

Once set up, you'll never need to manually deploy again. Just:

```bash
git add .
git commit -m "Add new feature"
git push
```

And boom! 🚀 Your changes are live in ~2 minutes.

---

**Need help?** Check the GitHub Actions logs or Cloudflare dashboard for detailed error messages.
