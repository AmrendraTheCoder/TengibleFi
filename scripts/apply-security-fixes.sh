#!/bin/bash

# =============================================
# TangibleFi Security Fixes Application Script
# =============================================

echo "🔒 TangibleFi Security Fixes Application Script"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    echo "Please install it first:"
    echo "npm install -g supabase"
    echo "or visit: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✅ Supabase CLI found${NC}"

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo -e "${RED}❌ Not in a Supabase project directory${NC}"
    echo "Please run this script from your TangibleFi project root"
    exit 1
fi

echo -e "${GREEN}✅ Supabase project detected${NC}"

# 1. Apply the security migration
echo ""
echo -e "${BLUE}1️⃣ Applying Security Migration...${NC}"
echo "=================================="

if [ -f "supabase/migrations/20250615_fix_security_issues.sql" ]; then
    echo "Migration file found, applying..."
    
    # Start Supabase if not running
    supabase start
    
    # Apply the migration
    supabase db reset
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Security migration applied successfully${NC}"
    else
        echo -e "${RED}❌ Migration failed${NC}"
        echo "Please check the error messages above"
        exit 1
    fi
else
    echo -e "${RED}❌ Migration file not found${NC}"
    echo "Please ensure supabase/migrations/20250615_fix_security_issues.sql exists"
    exit 1
fi

# 2. Manual configuration instructions
echo ""
echo -e "${YELLOW}2️⃣ Manual Configuration Required${NC}"
echo "=================================="
echo ""
echo "The following settings need to be configured manually in your Supabase Dashboard:"
echo ""

echo -e "${BLUE}🔐 Authentication Security Settings:${NC}"
echo "1. Go to: https://supabase.com/dashboard/project/[YOUR_PROJECT_ID]/auth/settings"
echo "2. Under 'Security' section:"
echo "   ✅ Enable 'Leaked password protection'"
echo ""

echo -e "${BLUE}🔑 Multi-Factor Authentication:${NC}"
echo "1. Go to: Authentication > Settings > Multi-Factor Authentication"
echo "2. Enable these MFA methods:"
echo "   ✅ TOTP (Time-based One-Time Password)"
echo "   ✅ Email OTP"
echo "   ✅ SMS (if you have Twilio configured)"
echo ""

echo -e "${BLUE}⚙️ Configuration Variables:${NC}"
echo "1. Go to: Settings > API > Configuration"
echo "2. Add these settings:"
echo "   • Key: app.admin_wallet"
echo "   • Value: 0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17"
echo ""
echo "   • Key: app.admin_email"
echo "   • Value: admin@tangiblefi.com"
echo ""

# 3. Get project URL for easy access
PROJECT_REF=$(grep 'project_id' supabase/config.toml | cut -d'"' -f2)
if [ ! -z "$PROJECT_REF" ]; then
    echo -e "${GREEN}🚀 Quick Links:${NC}"
    echo "Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF"
    echo "Auth Settings: https://supabase.com/dashboard/project/$PROJECT_REF/auth/settings"
    echo "Policies: https://supabase.com/dashboard/project/$PROJECT_REF/auth/policies"
    echo ""
fi

# 4. Testing instructions
echo -e "${BLUE}🧪 Testing Instructions:${NC}"
echo "======================="
echo "1. Start your Next.js development server:"
echo "   npm run dev"
echo ""
echo "2. Open browser console and load the test script:"
echo "   Copy and paste scripts/test-security-fixes.js into browser console"
echo ""
echo "3. Run the test suite:"
echo "   testTangibleFiSecurity()"
echo ""
echo "4. Test wallet connection:"
echo "   testWalletConnection()"
echo ""

# 5. Verification checklist
echo -e "${YELLOW}📋 Verification Checklist:${NC}"
echo "=========================="
echo "□ Migration applied successfully"
echo "□ Leaked password protection enabled"
echo "□ MFA options configured"
echo "□ Admin wallet addresses set"
echo "□ RLS policies working"
echo "□ Wallet connection saves to profile"
echo "□ Admin functions accessible to admin wallets"
echo "□ Error handling working properly"
echo ""

# 6. Troubleshooting
echo -e "${RED}🔧 Troubleshooting:${NC}"
echo "=================="
echo "If you encounter issues:"
echo ""
echo "1. Check Supabase logs:"
echo "   Go to: Dashboard > Logs > Database"
echo ""
echo "2. Verify RLS policies:"
echo "   Go to: Authentication > Policies"
echo "   Ensure all tables have appropriate policies"
echo ""
echo "3. Test individual components:"
echo "   • testSupabaseConnection()"
echo "   • testWalletConnection()"
echo "   • testTangibleFiSecurity()"
echo ""
echo "4. Check browser console for detailed error messages"
echo ""

echo -e "${GREEN}✅ Security fixes application completed!${NC}"
echo "Please complete the manual configuration steps above."
echo ""

# Ask if user wants to open dashboard
read -p "🌐 Open Supabase Dashboard now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if [ ! -z "$PROJECT_REF" ]; then
        if command -v open &> /dev/null; then
            open "https://supabase.com/dashboard/project/$PROJECT_REF/auth/settings"
        elif command -v xdg-open &> /dev/null; then
            xdg-open "https://supabase.com/dashboard/project/$PROJECT_REF/auth/settings"
        else
            echo "Please open: https://supabase.com/dashboard/project/$PROJECT_REF/auth/settings"
        fi
    else
        echo "Please go to your Supabase Dashboard manually"
    fi
fi

echo ""
echo -e "${GREEN}🎉 All done! Your TangibleFi platform security is now enhanced.${NC}" 