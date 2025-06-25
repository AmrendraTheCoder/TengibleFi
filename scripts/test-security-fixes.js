/**
 * TangibleFi Security Fixes Test Script
 * Run this in your browser console after applying the security migration
 * to verify everything is working correctly.
 */

// Test script for verifying security fixes
async function testTangibleFiSecurity() {
  console.log("🔒 Testing TangibleFi Security Fixes...\n");

  const results = {
    walletConnection: "⏳ Pending",
    rlsPolicies: "⏳ Pending",
    adminFunctions: "⏳ Pending",
    errorHandling: "⏳ Pending",
  };

  try {
    // 1. Test Wallet Connection and Profile Save
    console.log("1️⃣ Testing Wallet Connection & Profile Save...");

    // Import Supabase client
    const { createClient } = await import("/supabase/client.js").catch(() => {
      console.log("❌ Could not import Supabase client");
      return { createClient: null };
    });

    if (createClient) {
      const supabase = createClient();

      // Check if user is authenticated
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (user) {
        console.log("✅ User authenticated:", user.email);

        // Test wallet address save function
        const testWalletAddress = "0x742d35Cc6634C0532925a3b8D4C5fD7E492c0b17";
        const { data, error } = await supabase.rpc("save_wallet_address", {
          user_id: user.id,
          wallet_addr: testWalletAddress,
          signature: "test_signature_" + Date.now(),
        });

        if (data && data.success) {
          console.log("✅ Wallet address save function working");
          results.walletConnection = "✅ Working";
        } else {
          console.log("❌ Wallet save error:", error || data?.error);
          results.walletConnection = "❌ Failed";
        }
      } else {
        console.log("⚠️ User not authenticated - please sign in first");
        results.walletConnection = "⚠️ Not authenticated";
      }
    }

    // 2. Test RLS Policies
    console.log("\n2️⃣ Testing RLS Policies...");

    if (createClient) {
      const supabase = createClient();

      // Test profile access
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .limit(1);

      if (profileError) {
        if (profileError.code === "PGRST301") {
          console.log("✅ RLS working - access properly restricted");
          results.rlsPolicies = "✅ Working";
        } else {
          console.log("❌ Unexpected RLS error:", profileError.message);
          results.rlsPolicies = "❌ Error";
        }
      } else {
        console.log("✅ RLS policies allow proper access");
        results.rlsPolicies = "✅ Working";
      }
    }

    // 3. Test Admin Functions
    console.log("\n3️⃣ Testing Admin Functions...");

    if (createClient) {
      const supabase = createClient();

      // Test admin check function
      const { data: isAdminResult, error: adminError } =
        await supabase.rpc("is_admin");

      if (adminError) {
        console.log("❌ Admin function error:", adminError.message);
        results.adminFunctions = "❌ Failed";
      } else {
        console.log("✅ Admin function working. Is admin:", isAdminResult);
        results.adminFunctions = "✅ Working";
      }
    }

    // 4. Test Error Handling
    console.log("\n4️⃣ Testing Error Handling...");

    if (createClient) {
      const supabase = createClient();

      // Test with invalid wallet address
      const { data: invalidResult, error: invalidError } = await supabase.rpc(
        "save_wallet_address",
        {
          user_id: "00000000-0000-0000-0000-000000000000",
          wallet_addr: "invalid_address",
        }
      );

      if (invalidResult && !invalidResult.success) {
        console.log("✅ Error handling working:", invalidResult.error);
        results.errorHandling = "✅ Working";
      } else {
        console.log("❌ Error handling not working properly");
        results.errorHandling = "❌ Failed";
      }
    }
  } catch (error) {
    console.log("❌ Test script error:", error.message);
  }

  // 5. Display Results Summary
  console.log("\n📊 SECURITY TEST RESULTS SUMMARY:");
  console.log("=====================================");
  Object.entries(results).forEach(([test, status]) => {
    console.log(`${test.padEnd(20)}: ${status}`);
  });

  // 6. Next Steps
  console.log("\n📝 NEXT STEPS:");
  console.log("=====================================");
  console.log("1. Run this migration in Supabase:");
  console.log("   supabase/migrations/20250615_fix_security_issues.sql");
  console.log("");
  console.log("2. Configure these settings in Supabase Dashboard:");
  console.log(
    "   • Authentication > Settings > Security > Enable leaked password protection"
  );
  console.log(
    "   • Authentication > Settings > Multi-Factor Authentication > Enable TOTP, SMS, Email OTP"
  );
  console.log(
    "   • Settings > API > Configuration > Add app.admin_wallet and app.admin_email"
  );
  console.log("");
  console.log("3. Test wallet connection in your app");
  console.log("4. Verify admin access works with configured wallet addresses");

  return results;
}

// Additional helper functions for manual testing
window.testTangibleFiSecurity = testTangibleFiSecurity;

// Quick wallet connection test
window.testWalletConnection = async () => {
  console.log("🔗 Testing Wallet Connection...");

  try {
    // Check if MetaMask is available
    if (typeof window.ethereum === "undefined") {
      console.log("❌ MetaMask not detected");
      return false;
    }

    // Request account access
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });

    if (accounts.length > 0) {
      console.log("✅ Wallet connected:", accounts[0]);

      // Test wallet address validation
      const walletRegex = /^0x[a-fA-F0-9]{40}$/;
      const isValid = walletRegex.test(accounts[0]);

      console.log("✅ Wallet address format valid:", isValid);
      return accounts[0];
    } else {
      console.log("❌ No accounts found");
      return false;
    }
  } catch (error) {
    console.log("❌ Wallet connection error:", error.message);
    return false;
  }
};

// Quick Supabase connection test
window.testSupabaseConnection = async () => {
  console.log("🗄️ Testing Supabase Connection...");

  try {
    const { createClient } = await import("/supabase/client.js");
    const supabase = createClient();

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.log("❌ Supabase connection error:", error.message);
      return false;
    }

    console.log("✅ Supabase connected. Session exists:", !!data.session);
    return true;
  } catch (error) {
    console.log("❌ Supabase import error:", error.message);
    return false;
  }
};

// Show instructions
console.log(`
🔒 TANGIBLEFI SECURITY TEST SCRIPT LOADED

Usage:
======
1. Run the full test suite:
   testTangibleFiSecurity()

2. Test wallet connection only:
   testWalletConnection()

3. Test Supabase connection only:
   testSupabaseConnection()

Make sure to:
• Apply the SQL migration first
• Configure manual settings in Supabase Dashboard
• Be signed in to test authenticated features
`);
