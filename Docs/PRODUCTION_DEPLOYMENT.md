# Production Deployment Checklist - Clerk Migration

This guide covers deploying the application to production after the Clerk authentication migration.

## Prerequisites

- [ ] Clerk account created at [clerk.com](https://clerk.com)
- [ ] Vercel project set up
- [ ] PostgreSQL database provisioned
- [ ] Vercel Blob storage configured

## Step 1: Configure Clerk for Production

### 1.1 Create Production Application in Clerk

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Click "Create Application" or select your existing application
3. Set up your application:
   - **Name**: `Intellisync Chatbot` (or your app name)
   - **Environment**: Production
   - **Sign-in options**: Email (enabled by default)

### 1.2 Configure Redirect URLs

In Clerk Dashboard → **Paths**:

- **Sign-in URL**: `/login`
- **Sign-up URL**: `/register`
- **After sign-in URL**: `/`
- **After sign-up URL**: `/`

### 1.3 Configure Allowed Domains

In Clerk Dashboard → **Domains**:

Add your production domain(s):
- `yourdomain.com`
- `www.yourdomain.com`
- `your-vercel-url.vercel.app`

### 1.4 Get Production API Keys

In Clerk Dashboard → **API Keys**:

1. Copy **Publishable Key** (starts with `pk_live_`)
2. Copy **Secret Key** (starts with `sk_live_`)

⚠️ **Important**: Never commit these keys to version control!

## Step 2: Configure Vercel Environment Variables

Go to your Vercel project → **Settings** → **Environment Variables**

Add the following variables for **Production** environment:

### Required Clerk Variables

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key
CLERK_SECRET_KEY=sk_live_your_secret_key
```

### Optional Clerk Configuration

```bash
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Other Required Variables

Ensure these are already configured:

- `POSTGRES_URL` - PostgreSQL connection string
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `AI_GATEWAY_API_KEY` - AI Gateway API key (if not using Vercel OIDC)

### Optional Variables

- `REDIS_URL` - Redis connection string (for resumable streams)
- `AI_GATEWAY_URL` - Custom AI Gateway URL

## Step 3: Database Migration

### 3.1 Verify Migration Status

The Clerk-related columns were added in migration `0008_worthless_umar.sql`:

- `clerkId` (varchar 255, unique, nullable)
- `clerkSynced` (boolean, default false)
- `createdAt` (timestamp)

### 3.2 Apply Migrations to Production

Migrations run automatically during build via `package.json`:

```json
"build": "tsx lib/db/migrate && next build"
```

No manual action needed - Vercel will run migrations on deploy.

### 3.3 Existing User Migration

When existing users (from NextAuth) log in with Clerk:

1. They sign in via Clerk with their email
2. `getAuthUser()` helper detects existing user by email
3. Automatically syncs their `clerkId` in the database
4. Sets `clerkSynced = true`

**No manual data migration required!** ✅

## Step 4: Deploy to Production

### 4.1 Pre-deployment Checklist

- [ ] All environment variables configured in Vercel
- [ ] Clerk production app configured
- [ ] Database accessible from Vercel
- [ ] Latest code pushed to main branch

### 4.2 Deploy

```bash
# Option 1: Deploy via Vercel Dashboard
# Click "Deploy" on your project

# Option 2: Deploy via CLI
vercel --prod
```

### 4.3 Post-deployment Verification

1. **Test Authentication**:
   - Visit `https://yourdomain.com`
   - Verify redirect to `/login`
   - Test sign up with new email
   - Test sign in with existing email

2. **Verify Database Sync**:
   - Check that new users have `clerkId` populated
   - Check that `clerkSynced = true` for synced users

3. **Test Chat Functionality**:
   - Create a new chat
   - Send messages
   - Verify artifacts work
   - Test document creation/updates

4. **Check User Menu**:
   - Verify user email displays correctly
   - Test sign out functionality
   - Verify theme toggle works

## Step 5: Monitor and Troubleshoot

### Check Vercel Logs

```bash
vercel logs --prod
```

Look for:
- ✅ Successful database connections
- ✅ Successful Clerk authentication
- ❌ Any authentication errors
- ❌ Database sync errors

### Check Clerk Dashboard

Go to **Users** section:
- Verify new users appear
- Check authentication events in **Events** tab

### Common Issues

**Issue**: Users can't sign in
- ✅ Check Clerk publishable key is correct
- ✅ Verify domain is in Clerk allowed domains
- ✅ Check Vercel environment variables are set

**Issue**: Database errors on login
- ✅ Verify `POSTGRES_URL` is correct
- ✅ Check migrations ran successfully
- ✅ Verify database user has proper permissions

**Issue**: Sign out doesn't work
- ✅ Check Clerk secret key is set
- ✅ Verify no middleware conflicts

## Step 6: Clean Up (Optional)

### Remove Old Migration Files

Once migration is verified successful, you can optionally:

1. Delete migration guide documents:
   ```bash
   rm CLERK_MIGRATION_GUIDE.md
   rm CLERK_MIGRATION_PLAN.md
   rm CLERK_MIGRATION_REVIEW.md
   ```

2. Remove `password` column from User table (optional, after all users synced):
   ```sql
   -- Create new migration
   ALTER TABLE "User" DROP COLUMN "password";
   ```

   Then generate migration:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

## Step 7: Update Documentation

Update your project documentation to reflect:

- [x] Clerk is now the authentication provider
- [x] Guest user functionality has been removed
- [x] Users must sign up/login via Clerk

## Support and Resources

- **Clerk Documentation**: https://clerk.com/docs
- **Clerk Support**: https://clerk.com/support
- **Vercel Documentation**: https://vercel.com/docs
- **Project Issues**: [Your GitHub repository]

---

## Quick Reference

### Environment Variables Summary

| Variable | Required | Environment | Description |
|----------|----------|-------------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | All | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | All | Clerk secret key (server-side only) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | ❌ | All | Custom sign-in page path |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | ❌ | All | Custom sign-up page path |
| `POSTGRES_URL` | ✅ | All | PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | ✅ | All | Vercel Blob storage token |
| `AI_GATEWAY_API_KEY` | ✅* | Production | AI Gateway API key (*if not using Vercel OIDC) |

### Deployment Commands

```bash
# Deploy to production
vercel --prod

# View production logs
vercel logs --prod

# Check environment variables
vercel env ls

# Run database migrations locally
pnpm db:migrate

# Generate new migration
pnpm db:generate
```

---

**Migration Status**: ✅ Complete

**Last Updated**: 2025-10-04
