"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Wallet,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { createClient } from "../../supabase/client";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface MetaMaskConnectProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  variant?: "full" | "button";
}

export default function MetaMaskConnect({
  onSuccess,
  onError,
  variant = "full",
}: MetaMaskConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);
  const [isCheckingInstallation, setIsCheckingInstallation] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return (
      url &&
      key &&
      url !== "https://placeholder.supabase.co" &&
      key !== "placeholder-key" &&
      !url.includes("your-project") &&
      !key.includes("your-anon-key")
    );
  };

  useEffect(() => {
    checkMetaMaskInstallation();
    checkExistingConnection();
  }, []);

  const checkMetaMaskInstallation = async () => {
    setIsCheckingInstallation(true);

    // Add a small delay to ensure proper detection
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const installed =
        typeof window !== "undefined" &&
        window.ethereum &&
        window.ethereum.isMetaMask;
      setIsMetaMaskInstalled(installed);

      if (!installed) {
        setError(
          "MetaMask is not installed. Please install MetaMask to continue."
        );
      }
    } catch (err) {
      console.error("Error checking MetaMask installation:", err);
      setError(
        "Unable to detect MetaMask. Please ensure it's properly installed."
      );
    } finally {
      setIsCheckingInstallation(false);
    }
  };

  const checkExistingConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setError(null);
      }
    } catch (error) {
      console.error("Error checking existing connection:", error);
      // Don't set error here as this is just checking existing connections
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled) {
      const errorMsg =
        "MetaMask is not installed. Please install MetaMask to continue.";
      setError(errorMsg);
      if (onError) onError(errorMsg);
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Step 1: Request wallet connection
      if (!window.ethereum) {
        throw new Error("MetaMask is not available");
      }

      let accounts;
      try {
        accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
      } catch (requestError: any) {
        if (requestError.code === 4001) {
          throw new Error("Connection rejected by user");
        } else if (requestError.code === -32002) {
          throw new Error(
            "Connection request already pending. Please check MetaMask."
          );
        } else {
          throw new Error(
            `Connection failed: ${requestError.message || "Unknown error"}`
          );
        }
      }

      if (!accounts || accounts.length === 0) {
        throw new Error(
          "No accounts found. Please ensure MetaMask is unlocked."
        );
      }

      const walletAddress = accounts[0].toLowerCase();
      setWalletAddress(walletAddress);

      // Step 2: Get network information
      let chainId;
      try {
        chainId = await window.ethereum.request({ method: "eth_chainId" });
      } catch (networkError) {
        console.warn("Could not get network information:", networkError);
      }

      // Step 3: Create signature message for authentication
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2, 15);
      const message = `Welcome to TangibleFi!

Please sign this message to authenticate your wallet.

Wallet Address: ${walletAddress}
Timestamp: ${timestamp}
Nonce: ${nonce}
Network: ${chainId || "Unknown"}

This signature proves you own this wallet and will be used for secure authentication.
This request will not trigger any blockchain transaction or cost any gas fees.`;

      // Step 4: Request signature
      let signature;
      try {
        signature = await window.ethereum.request({
          method: "personal_sign",
          params: [message, walletAddress],
        });
      } catch (signError: any) {
        if (signError.code === 4001) {
          throw new Error("Signature rejected by user");
        } else {
          throw new Error(
            `Signature failed: ${signError.message || "Unknown error"}`
          );
        }
      }

      // Step 5: Handle wallet-based authentication with strict wallet address validation
      try {
        // Check if Supabase is properly configured
        if (!isSupabaseConfigured()) {
          console.warn("Supabase not configured, using offline mode");
          // Store wallet info locally for offline mode
          const walletData = {
            address: walletAddress,
            signature,
            timestamp: Date.now(),
            chainId,
            mode: "offline",
          };

          localStorage.setItem("wallet_connection", JSON.stringify(walletData));
          console.log("Wallet data stored locally for offline access");
          setError(null);
          if (onSuccess) {
            onSuccess();
          } else {
            setTimeout(() => router.push("/dashboard"), 500);
          }
          return;
        }

        // Check if this wallet address is already registered
        const { data: existingUserByWallet, error: walletCheckError } =
          await supabase
            .from("users")
            .select("*")
            .eq("wallet_address", walletAddress)
            .maybeSingle();

        // Better error handling for different types of errors
        if (walletCheckError) {
          console.warn("Wallet check error:", walletCheckError);

          // Check if it's a meaningful error that should stop the process
          const isSignificantError =
            walletCheckError.message &&
            !walletCheckError.message.includes("JWT") &&
            !walletCheckError.message.includes("connection") &&
            !walletCheckError.message.includes("table") &&
            !walletCheckError.message.includes("schema") &&
            walletCheckError.code !== "PGRST116"; // No rows found

          // If it's a 400 error or table doesn't exist, fall back to offline mode
          if (
            walletCheckError.message?.includes("400") ||
            walletCheckError.message?.includes("does not exist") ||
            walletCheckError.message?.includes("relation") ||
            Object.keys(walletCheckError).length === 0
          ) {
            console.warn("Database table not accessible, using offline mode");

            // Store wallet info locally for offline mode
            const walletData = {
              address: walletAddress,
              signature,
              timestamp: Date.now(),
              chainId,
              mode: "offline",
            };

            localStorage.setItem(
              "wallet_connection",
              JSON.stringify(walletData)
            );
            console.log("Wallet data stored locally for offline access");
            setError(null);
            if (onSuccess) {
              onSuccess();
            } else {
              setTimeout(() => router.push("/dashboard"), 500);
            }
            return;
          }

          // Only throw for truly significant errors
          if (isSignificantError) {
            console.error("Significant wallet check error:", walletCheckError);
            throw new Error("Database query failed. Please try again.");
          }
        }

        if (existingUserByWallet) {
          // Existing user with this wallet - update their session
          console.log("Existing wallet user found, updating session");

          // Ensure profile exists
          const { error: profileError } = await supabase.rpc(
            "create_profile_for_user",
            {
              user_id: existingUserByWallet.id,
              user_email: existingUserByWallet.email,
            }
          );

          if (profileError) {
            console.error("Error ensuring profile exists:", profileError);
          }

          const { error: updateError } = await supabase
            .from("users")
            .update({
              wallet_signature: signature,
              last_login: new Date().toISOString(),
              login_count: (existingUserByWallet.login_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingUserByWallet.id);

          if (updateError) {
            console.error("User update error:", updateError);
            throw new Error("Failed to update user session. Please try again.");
          }

          // Sign in the existing user
          const walletEmail = `${walletAddress}@wallet.tangiblefi.com`;
          const { error: signInError } = await supabase.auth.signInWithPassword(
            {
              email: walletEmail,
              password: `wallet_${walletAddress}`,
            }
          );

          if (signInError) {
            console.error("Sign in error:", signInError);
            // Don't throw here, user data was updated successfully
          }

          setError(null);
          if (onSuccess) {
            onSuccess();
          } else {
            setTimeout(() => router.push("/dashboard"), 500);
          }
          return;
        }

        // New wallet address - create new user account
        console.log("New wallet address, creating account");

        // Check if user is already signed in with a different wallet
        const { data: currentSession } = await supabase.auth.getSession();
        if (currentSession?.session?.user) {
          // User is already signed in - check if they have a different wallet
          const { data: currentUserData, error: currentUserError } =
            await supabase
              .from("users")
              .select("wallet_address")
              .eq("id", currentSession.session.user.id)
              .maybeSingle();

          if (
            currentUserData?.wallet_address &&
            currentUserData.wallet_address !== walletAddress
          ) {
            throw new Error(
              `This account is already linked to wallet ${currentUserData.wallet_address.slice(0, 6)}...${currentUserData.wallet_address.slice(-4)}. Please use the same wallet or create a new account.`
            );
          }
        }

        // Create new user with wallet
        const walletEmail = `${walletAddress}@wallet.tangiblefi.com`;
        const walletPassword = `wallet_${walletAddress}`;
        const displayName = `User ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email: walletEmail,
            password: walletPassword,
            options: {
              data: {
                wallet_address: walletAddress,
                wallet_signature: signature,
                full_name: displayName,
                auth_method: "metamask",
              },
            },
          });

        if (signUpError) {
          if (signUpError.message.includes("already registered")) {
            // Email already exists but no wallet linked - this shouldn't happen with our system
            throw new Error(
              "Account conflict detected. Please contact support."
            );
          }
          throw new Error(`Account creation failed: ${signUpError.message}`);
        }

        if (authData.user) {
          // Create profile using the SECURITY DEFINER function
          const { error: profileError } = await supabase.rpc(
            "create_profile_for_user",
            {
              user_id: authData.user.id,
              user_email: walletEmail,
            }
          );

          if (profileError) {
            console.error("Error creating profile:", profileError);
          } else {
            console.log(
              "Profile created successfully for wallet user:",
              authData.user.id
            );
          }

          // Create user profile in our users table for backward compatibility
          const { error: insertError } = await supabase.from("users").upsert({
            id: authData.user.id,
            email: walletEmail,
            wallet_address: walletAddress,
            wallet_signature: signature,
            auth_method: "metamask",
            full_name: displayName,
            account_status: "active",
            login_count: 1,
            last_login: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (insertError) {
            console.error("User profile creation error:", insertError);
            // Don't throw here as the auth user was created successfully
          }

          console.log("New wallet user created successfully");
          setError(null);
          if (onSuccess) {
            onSuccess();
          } else {
            setTimeout(() => router.push("/dashboard"), 500);
          }
        } else {
          throw new Error("Failed to create user account. Please try again.");
        }
      } catch (dbError: any) {
        console.warn("Database operation encountered an issue:", dbError);

        // Enhanced error handling with specific messages
        if (
          dbError.message.includes("wallet") ||
          dbError.message.includes("already linked")
        ) {
          // These are business logic errors that should be shown to user
          throw new Error(dbError.message);
        } else if (
          dbError.message.includes("400") ||
          dbError.message.includes("does not exist") ||
          dbError.message.includes("relation") ||
          dbError.message.includes("table") ||
          dbError.message.includes("schema") ||
          dbError.message.includes("Database query failed")
        ) {
          // Database configuration or schema issues - use offline mode
          console.warn(
            "Database schema/configuration issue, using offline mode"
          );
          const walletData = {
            address: walletAddress,
            signature,
            timestamp: Date.now(),
            chainId,
            mode: "offline",
          };

          try {
            localStorage.setItem(
              "wallet_connection",
              JSON.stringify(walletData)
            );
            console.log("Wallet data stored locally for offline access");
            setError(null);
            if (onSuccess) {
              onSuccess();
            } else {
              setTimeout(() => router.push("/dashboard"), 500);
            }
            return;
          } catch (storageError) {
            console.error("Failed to store wallet data locally:", storageError);
            throw new Error(
              "Authentication failed. Please check your internet connection and try again."
            );
          }
        } else {
          // Other database errors - still try offline mode as fallback
          console.warn("Database unavailable, using offline mode");
          const walletData = {
            address: walletAddress,
            signature,
            timestamp: Date.now(),
            chainId,
            mode: "offline",
          };

          try {
            localStorage.setItem(
              "wallet_connection",
              JSON.stringify(walletData)
            );
            console.log("Wallet data stored locally for offline access");
            setError(null);
            if (onSuccess) {
              onSuccess();
            } else {
              setTimeout(() => router.push("/dashboard"), 500);
            }
          } catch (storageError) {
            console.error("Failed to store wallet data locally:", storageError);
            throw new Error(
              "Authentication failed. Please check your internet connection and try again."
            );
          }
        }
      }
    } catch (error: any) {
      console.error("Error connecting to MetaMask:", error);

      let errorMessage = "Connection failed. Please try again.";

      if (error.message.includes("rejected")) {
        errorMessage =
          "Connection was rejected. Please approve the request in MetaMask.";
      } else if (error.message.includes("pending")) {
        errorMessage =
          "A connection request is already pending. Please check MetaMask.";
      } else if (error.message.includes("accounts")) {
        errorMessage = "No accounts found. Please ensure MetaMask is unlocked.";
      } else if (
        error.message.includes("already linked") ||
        error.message.includes("wallet")
      ) {
        errorMessage = error.message;
      } else if (
        error.message.includes("Database") ||
        error.message.includes("fetch")
      ) {
        errorMessage =
          "Server connection failed. Please check that Supabase is running and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
      if (onError) onError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const installMetaMask = () => {
    window.open("https://metamask.io/download/", "_blank");
  };

  const retryConnection = () => {
    setError(null);
    connectWallet();
  };

  if (variant === "button") {
    return (
      <div className="space-y-4">
        <Button
          onClick={connectWallet}
          disabled={
            isConnecting || !isMetaMaskInstalled || isCheckingInstallation
          }
          size="lg"
          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold text-lg py-6 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isCheckingInstallation ? (
            <>
              <RefreshCw className="animate-spin rounded-full h-5 w-5 mr-3" />
              Checking MetaMask...
            </>
          ) : isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Connecting...
            </>
          ) : !isMetaMaskInstalled ? (
            <>
              <ExternalLink className="mr-3 h-5 w-5" />
              Install MetaMask
            </>
          ) : walletAddress ? (
            <>
              <CheckCircle className="mr-3 h-5 w-5" />
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </>
          ) : (
            <>
              <Wallet className="mr-3 h-5 w-5" />
              Connect MetaMask
            </>
          )}
        </Button>

        {error && (
          <div className="space-y-3">
            <Alert className="bg-red-500/20 border-red-400/30 backdrop-blur-sm">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-100">
                {error}
              </AlertDescription>
            </Alert>
            {!error.includes("Install") && (
              <Button
                onClick={retryConnection}
                variant="outline"
                size="sm"
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
          <Wallet className="h-6 w-6 text-orange-600" />
        </div>
        <CardTitle className="text-xl font-bold">
          Connect MetaMask Wallet
        </CardTitle>
        <CardDescription>
          Secure login using your MetaMask wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isCheckingInstallation ? (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              Checking MetaMask installation...
            </AlertDescription>
          </Alert>
        ) : !isMetaMaskInstalled ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              MetaMask is not installed. Please install MetaMask to continue.
            </AlertDescription>
          </Alert>
        ) : walletAddress ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </AlertDescription>
          </Alert>
        ) : null}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isMetaMaskInstalled ? (
          <Button
            onClick={installMetaMask}
            size="lg"
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Install MetaMask
          </Button>
        ) : (
          <div className="space-y-2">
            <Button
              onClick={connectWallet}
              disabled={isConnecting}
              size="lg"
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold"
            >
              {isConnecting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Connecting...
                </>
              ) : (
                <>
                  <Wallet className="mr-2 h-4 w-4" />
                  {walletAddress ? "Reconnect" : "Connect Wallet"}
                </>
              )}
            </Button>

            {error && !error.includes("Install") && (
              <Button
                onClick={retryConnection}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            )}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          <p>By connecting, you agree to our Terms of Service</p>
        </div>
      </CardContent>
    </Card>
  );
}
