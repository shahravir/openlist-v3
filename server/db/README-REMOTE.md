# Setting up Database on Remote PostgreSQL Server

## Option 1: Using the Setup Script (Recommended)

1. Set your `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL='postgresql://username:password@host:port/database'
   ```
   
   For example:
   ```bash
   export DATABASE_URL='postgresql://myuser:mypass@db.example.com:5432/openlist'
   ```
   
   If you need SSL:
   ```bash
   export DATABASE_URL='postgresql://myuser:mypass@db.example.com:5432/openlist?sslmode=require'
   ```

2. Make the script executable:
   ```bash
   chmod +x server/db/setup-remote.sh
   ```

3. Run the setup script:
   ```bash
   cd server/db
   ./setup-remote.sh
   ```

## Option 2: Manual Setup with psql

1. Connect to your remote PostgreSQL server:
   ```bash
   psql -h your-host -p 5432 -U your-username -d postgres
   ```

2. Create the database:
   ```sql
   CREATE DATABASE openlist;
   ```

3. Exit psql and connect to the new database:
   ```bash
   psql -h your-host -p 5432 -U your-username -d openlist
   ```

4. Run the schema:
   ```bash
   psql -h your-host -p 5432 -U your-username -d openlist < server/db/schema.sql
   ```

   Or from within psql:
   ```sql
   \i server/db/schema.sql
   ```

## Option 3: Using Connection String Directly

If you have the full connection string, you can run:

```bash
psql "postgresql://user:password@host:port/openlist" < server/db/schema.sql
```

## Common Remote Database Providers

### Heroku Postgres
```bash
heroku pg:psql < server/db/schema.sql
```

### AWS RDS
```bash
psql -h your-rds-endpoint.region.rds.amazonaws.com -U admin -d postgres
```

### DigitalOcean Managed Database
```bash
psql "postgresql://doadmin:password@host:port/openlist?sslmode=require" < server/db/schema.sql
```

### Railway
```bash
railway run psql $DATABASE_URL < server/db/schema.sql
```

## Verify Setup

After running the schema, verify the tables were created:

```bash
psql "your-connection-string" -c "\dt"
```

You should see:
- `users` table
- `todos` table

## Update Server Configuration

After setting up the database, update your `server/.env` file:

```env
DATABASE_URL=postgresql://user:password@host:port/openlist
JWT_SECRET=your-secret-key
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

### Connection Issues
- Check firewall rules allow connections from your IP
- Verify SSL requirements (add `?sslmode=require` if needed)
- Ensure the database user has CREATE DATABASE permissions

### Permission Errors
- Make sure your database user has sufficient privileges
- You may need to connect as a superuser to create the database

### SSL/TLS Issues
- Add `?sslmode=require` to your connection string for secure connections
- Some providers require SSL by default

