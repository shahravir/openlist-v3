# Deploying to Render

This guide walks you through deploying the OpenList V3 backend server to Render's free tier.

## Prerequisites

- A GitHub account (for connecting your repository)
- Your code pushed to a GitHub repository
- A Render account (sign up at [render.com](https://render.com))

## Step 1: Create a Render Account

1. Go to [render.com](https://render.com) and sign up for a free account
2. Connect your GitHub account when prompted
3. Verify your email address

## Step 2: Create PostgreSQL Database

1. In the Render dashboard, click **"New +"** and select **"PostgreSQL"**
2. Configure the database:
   - **Name**: `openlist-db` (or your preferred name)
   - **Database**: `openlist`
   - **User**: `openlist_user` (or your preferred username)
   - **Region**: Choose the closest region to your users
   - **PostgreSQL Version**: Latest stable version
   - **Plan**: Select **"Free"** (1 GB storage, 90 days retention)
3. Click **"Create Database"**
4. Wait for the database to be provisioned (usually 1-2 minutes)
5. **Important**: Note down the **Internal Database URL** - you'll need this later

## Step 3: Create Web Service

### Option A: Using render.yaml (Recommended)

1. In the Render dashboard, click **"New +"** and select **"Blueprint"**
2. Connect your GitHub repository
3. Select the repository containing this code
4. Render will detect the `render.yaml` file automatically
5. Review the services it will create and click **"Apply"**
6. Render will create both the database and web service

### Option B: Manual Setup

1. In the Render dashboard, click **"New +"** and select **"Web Service"**
2. Connect your GitHub repository if you haven't already
3. Select the repository and branch containing your code
4. Configure the service:
   - **Name**: `openlist-v3-server` (or your preferred name)
   - **Region**: Same region as your database
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `server` (since the server code is in the server folder)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Click **"Advanced"** and set:
   - **Health Check Path**: `/health`
6. Click **"Create Web Service"**

## Step 4: Link Database to Web Service

1. In your web service settings, go to **"Environment"** tab
2. Click **"Link Database"** or **"Add Environment Variable"**
3. Select your PostgreSQL database (`openlist-db`)
4. Render will automatically add the `DATABASE_URL` environment variable

## Step 5: Configure Environment Variables

In your web service's **"Environment"** tab, add the following environment variables:

### Required Variables

- **`DATABASE_URL`**: Automatically set when you link the database (don't change this)
- **`JWT_SECRET`**: Generate a secure random string. You can use:
  ```bash
  openssl rand -base64 32
  ```
  Or use an online generator. **Keep this secret!**
- **`NODE_ENV`**: Set to `production`
- **`PORT`**: Leave this unset - Render automatically sets it
- **`FRONTEND_URL`**: Your frontend application URL (e.g., `https://your-frontend.vercel.app`)

### Optional Variables

- **`RENDER_SERVICE_URL`**: Your Render service URL (e.g., `https://openlist-v3-server.onrender.com`) - helps with CORS

### Example Environment Variables

```
DATABASE_URL=postgresql://user:password@host:5432/openlist (auto-set)
JWT_SECRET=your-generated-secret-key-here
NODE_ENV=production
FRONTEND_URL=https://your-frontend-app.vercel.app
RENDER_SERVICE_URL=https://openlist-v3-server.onrender.com
```

## Step 6: Initialize Database

After your web service is deployed, you need to initialize the database schema:

### Method 1: Using Render Shell (Recommended)

1. In your web service dashboard, click on **"Shell"** tab
2. Run the initialization script:
   ```bash
   cd /opt/render/project/src/server
   chmod +x db/init-render.sh
   ./db/init-render.sh
   ```
3. The script will create all necessary tables and indexes

### Method 2: Using Local psql

1. Get your database connection string from Render dashboard (under your database service)
2. Set it as an environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:5432/openlist?sslmode=require"
   ```
3. Run the initialization script:
   ```bash
   cd server
   ./db/init-render.sh
   ```

### Method 3: Manual SQL Execution

1. In Render dashboard, go to your PostgreSQL database
2. Click on **"Connect"** or use the **"psql"** command shown
3. Copy the contents of `db/schema.sql`
4. Execute the SQL in the database console

## Step 7: Verify Deployment

1. Wait for the deployment to complete (check the **"Events"** tab)
2. Test the health endpoint:
   ```bash
   curl https://your-service-name.onrender.com/health
   ```
   Should return: `{"status":"ok"}`

3. Test the API endpoints:
   ```bash
   # Register a user
   curl -X POST https://your-service-name.onrender.com/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

## Step 8: Update Frontend Configuration

Update your frontend application to use the new backend URL:

```typescript
// Example: Update your API base URL
const API_URL = 'https://your-service-name.onrender.com';
```

Make sure to update CORS settings if needed.

## Troubleshooting

### Service Won't Start

- Check the **"Logs"** tab for error messages
- Verify all environment variables are set correctly
- Ensure `DATABASE_URL` is linked properly
- Check that the build completed successfully

### Database Connection Errors

- Verify `DATABASE_URL` is set and correct
- Ensure the database is running (check database status in dashboard)
- Check that SSL is enabled (Render requires SSL connections)

### CORS Errors

- Verify `FRONTEND_URL` is set to your frontend's actual URL
- Check that `RENDER_SERVICE_URL` is set if needed
- Review CORS configuration in `server/index.ts`

### Service Sleeps After Inactivity

- Render's free tier services sleep after 15 minutes of inactivity
- The first request after sleep may take 30-60 seconds (cold start)
- This is normal for free tier - consider upgrading for production use

### Database Initialization Fails

- Ensure you're using the correct `DATABASE_URL`
- Check that SSL mode is set: `?sslmode=require`
- Verify you have the correct permissions on the database
- Try running the SQL manually from `db/schema.sql`

## Monitoring

- **Logs**: View real-time logs in the **"Logs"** tab
- **Metrics**: Check CPU, memory, and request metrics in the dashboard
- **Events**: View deployment and service events

## Next Steps

- Set up automatic deployments from your main branch
- Configure custom domain (requires paid plan)
- Set up monitoring and alerts
- Consider upgrading to a paid plan for production workloads

## Support

- Render Documentation: [https://render.com/docs](https://render.com/docs)
- Render Community: [https://community.render.com](https://community.render.com)

