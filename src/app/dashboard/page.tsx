"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "../../../supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Landmark,
  DollarSign,
  Wallet,
  Shield,
  InfoIcon,
  Users,
  FileText,
  PlusCircle,
  ChevronRight,
  Target,
  Clock,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle,
  Building,
  Home,
  Car,
  Coins,
  ArrowUpRight,
  Activity,
  Network,
  Link as LinkIcon,
  Percent,
  CreditCard,
  Banknote,
  Plus,
  Layers,
  Trophy,
  XCircle,
  FileCheck,
  ExternalLink,
  Send,
  ArrowUpDown,
  ShieldCheck,
  Smartphone,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useBlockchainData } from "@/hooks/useBlockchainData";
import { usePortfolioData } from "@/hooks/use-portfolio-data";
import { useMarketData } from "@/hooks/use-market-data";
import { toast } from "@/components/ui/use-toast";

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  current_value: number;
  original_value: number;
  verification_status: string;
  collateralization_status: string;
  location: string;
  blockchain: string;
  created_at: string;
}

interface Loan {
  id: string;
  loan_amount: number;
  outstanding_balance: number;
  interest_rate: number;
  monthly_payment: number;
  next_payment_date: string;
  loan_status: string;
  blockchain: string;
  created_at: string;
}

interface CrossChainPosition {
  id: string;
  blockchain: string;
  asset_symbol: string;
  balance: number;
  usd_value: number;
  position_type: string;
  updated_at: string;
}

function getStatusBadge(status: string) {
  const statusConfig = {
    verified: {
      variant: "default" as const,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    pending: {
      variant: "secondary" as const,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    },
    rejected: {
      variant: "destructive" as const,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
    },
    active: {
      variant: "default" as const,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    },
    collateralized: {
      variant: "default" as const,
      icon: Shield,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    available: {
      variant: "secondary" as const,
      icon: Activity,
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-200",
    },
  };

  const config =
    statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={`flex items-center gap-1 ${config.bgColor} ${config.borderColor} border`}
    >
      <Icon className={`h-3 w-3 ${config.color}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

function calculateHealthRatio(
  totalCollateral: number,
  totalDebt: number
): number {
  if (totalDebt === 0) return 5.0;
  return totalCollateral / totalDebt;
}

function getHealthStatus(ratio: number) {
  if (ratio >= 2.0)
    return {
      status: "Excellent",
      color: "text-green-600",
      icon: CheckCircle,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
    };
  if (ratio >= 1.5)
    return {
      status: "Good",
      color: "text-blue-600",
      icon: TrendingUp,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    };
  if (ratio >= 1.2)
    return {
      status: "Warning",
      color: "text-yellow-600",
      icon: AlertTriangle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
    };
  return {
    status: "Critical",
    color: "text-red-600",
    icon: TrendingDown,
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  };
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function formatCompactNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
  }

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showRefreshed, setShowRefreshed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Supabase client
  const supabase = createClient();

  // Use our custom hooks for real-time data
  const {
    portfolio,
    portfolioLoading,
    portfolioError,
    market,
    marketLoading,
    marketError,
    transactions,
    transactionsLoading,
    wallet,
    isConnected,
    refreshAll,
    connectWallet,
  } = useBlockchainData();

  const portfolioData = usePortfolioData(user);
  const marketData = useMarketData();

  // Get user authentication
  useEffect(() => {
    const getUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
        redirect("/sign-in");
        return;
      }

      setUser(user);
      setIsLoading(false);
    };

    getUser();
  }, [supabase]);

  // Handle refresh action
  const handleRefresh = async () => {
    try {
      await Promise.all([
        refreshAll(),
        portfolioData.refreshData(),
        marketData.refreshData(),
      ]);
      setShowRefreshed(true);
      toast({
        title: "Portfolio Synced",
        description:
          "Your portfolio data has been updated across all networks.",
      });
      setTimeout(() => setShowRefreshed(false), 3000);
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync portfolio data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (isLoading) {
  return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Filter data based on search query
  const filteredAssets =
    portfolioData.assets?.filter(
      (asset) =>
        asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.asset_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.location.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const filteredLoans =
    portfolioData.loans?.filter(
      (loan) =>
        loan.blockchain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.loan_status.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  // Calculate portfolio metrics with real data
  const totalCollateralValue = portfolioData.metrics.totalAssetValue || 0;
  const totalLoanBalance = portfolioData.metrics.totalLoanBalance || 0;
  const totalCryptoValue = portfolio?.totalValue || 0;
  const netWorth = totalCollateralValue + totalCryptoValue - totalLoanBalance;
  const healthRatio = calculateHealthRatio(
    totalCollateralValue,
    totalLoanBalance
  );
  const healthStatus = getHealthStatus(healthRatio);
  const HealthIcon = healthStatus.icon;

  // Calculate recent activity metrics
  const recentAssetsCount =
    portfolioData.assets?.filter((asset) => {
      const createdDate = new Date(asset.created_at);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return createdDate > thirtyDaysAgo;
    }).length || 0;

  const upcomingPayments =
    portfolioData.loans?.filter((loan) => {
      const paymentDate = new Date(loan.next_payment_date);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
      return paymentDate <= sevenDaysFromNow && loan.loan_status === "active";
    }).length || 0;

  // Improved verification status calculation
  const verifiedAssetsCount = filteredAssets.filter((asset) => {
    // More strict verification - check if asset has proper documentation and is actually verified
  return (
      asset.verification_status === "verified" &&
      asset.current_value > 0 &&
      asset.name &&
      asset.asset_type
    );
  }).length;

  const collateralizedAssetsCount = filteredAssets.filter((asset) => {
    // Check if asset is both verified and actively used as collateral
    return (
      asset.collateralization_status === "collateralized" &&
      asset.verification_status === "verified"
    );
  }).length;

  // Calculate portfolio performance metrics
  const portfolioGrowth =
    portfolioData.assets?.reduce((total, asset) => {
      if (asset.original_value && asset.current_value > asset.original_value) {
        return (
          total +
          ((asset.current_value - asset.original_value) /
            asset.original_value) *
            100
        );
      }
      return total;
    }, 0) || 0;

  const averageGrowth = portfolioData.assets?.length
    ? portfolioGrowth / portfolioData.assets.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
          {/* Enhanced Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">TangibleFi Dashboard</h1>
            <p className="text-blue-100">
              Manage your tokenized real-world assets and lending activities
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-white/20 text-white border-white/30">
              <Activity className="h-3 w-3 mr-1" />
              Live Data
            </Badge>
            <Button
              onClick={handleRefresh}
                  variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              disabled={portfolioLoading || marketLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${portfolioLoading || marketLoading ? "animate-spin" : ""}`}
              />
              Sync Portfolio
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-300" />
              <span className="text-sm text-blue-100">Net Worth</span>
            </div>
            <div className="text-2xl font-bold">
              ${netWorth.toLocaleString()}
            </div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-5 w-5 text-blue-300" />
              <span className="text-sm text-blue-100">Total Assets</span>
            </div>
            <div className="text-2xl font-bold">{filteredAssets.length}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-300" />
              <span className="text-sm text-blue-100">Verified</span>
            </div>
            <div className="text-2xl font-bold">{verifiedAssetsCount}</div>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <HealthIcon className="h-5 w-5 text-yellow-300" />
              <span className="text-sm text-blue-100">Health</span>
            </div>
            <div className="text-2xl font-bold">{healthStatus.status}</div>
          </div>
        </div>
      </div>

              {/* Search and Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search assets, loans, positions..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
                  />
        </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Last 30 days
                  </Button>
                  {searchQuery && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery("")}
            >
              Clear Search
                    </Button>
                  )}
                </div>
              </div>

              {/* Search Results Indicator */}
              {searchQuery && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Search results for "{searchQuery}"
                      </span>
                    </div>
                    <div className="text-sm text-blue-700">
                {filteredAssets.length + filteredLoans.length} items found
                    </div>
                  </div>
          </CardContent>
        </Card>
              )}

              {/* Success Message */}
              {showRefreshed && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
                    <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                <h3 className="font-semibold text-green-900">
                          Portfolio Synced!
                        </h3>
                <p className="text-green-700 text-sm">
                  Your portfolio data has been updated across all connected
                  networks.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Multi-Chain Info Banner */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="p-6">
                <div className="flex gap-4">
                  <InfoIcon className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-blue-900">
                      TangibleFi: RWA Tokenization & NFT Lending
                    </p>
                    <p className="text-sm text-blue-700">
                      Upload documentation for real estate, commodities, and
                      equipment. Our verification team tokenizes them on the
                      blockchain as NFTs for collateralized lending.
                    </p>
                    <div className="flex items-center gap-4 mt-3">
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {recentAssetsCount} NFTs minted this month
                      </Badge>
                      {upcomingPayments > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-50 text-yellow-700 border-yellow-200"
                        >
                          {upcomingPayments} EMI payments due soon
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        Multi-Chain Ready
                      </Badge>
                    </div>
                  </div>
                </div>
        </CardContent>
      </Card>

      {/* Quick Actions Bar */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/dashboard/assets/new">
              <Button className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </Link>
            <Link href="/dashboard/loans/new">
              <Button className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white">
                <Landmark className="h-4 w-4 mr-2" />
                Apply Loan
              </Button>
            </Link>
            <Link href="/dashboard/cross-chain">
              <Button className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white">
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Cross-Chain
              </Button>
            </Link>
            <Link href="/dashboard/market">
              <Button className="w-full bg-white/20 hover:bg-white/30 border-white/30 text-white">
                <TrendingUp className="h-4 w-4 mr-2" />
                Market
              </Button>
            </Link>
              </div>
        </CardContent>
      </Card>

      {/* Achievement/Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-900">
                  Portfolio Milestone
                </h4>
                <p className="text-sm text-yellow-700">
                  {verifiedAssetsCount >= 5
                    ? "Expert Investor!"
                    : `${5 - verifiedAssetsCount} more assets to Expert level`}
                </p>
              </div>
            </div>
            <Progress
              value={(verifiedAssetsCount / 5) * 100}
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <ShieldCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">
                  Verification Score
                </h4>
                <p className="text-sm text-green-700">
                  {Math.round(
                    (verifiedAssetsCount / Math.max(filteredAssets.length, 1)) *
                      100
                  )}
                  % of assets verified
                </p>
              </div>
            </div>
            <Progress
              value={
                (verifiedAssetsCount / Math.max(filteredAssets.length, 1)) * 100
              }
              className="mt-3 h-2"
            />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Network className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">
                  Multi-Chain Status
                </h4>
                <p className="text-sm text-blue-700">
                  Connected to {Object.keys(portfolio?.networks || {}).length}{" "}
                  networks
                </p>
              </div>
            </div>
            <div className="flex gap-1 mt-3">
              {["ETH", "MATIC", "BNB", "ARB"].map((chain, i) => (
                <div
                  key={chain}
                  className={`h-2 flex-1 rounded ${i < Object.keys(portfolio?.networks || {}).length ? "bg-blue-500" : "bg-gray-200"}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Portfolio Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
                      Portfolio Performance
                      <Badge
                        variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
                      >
                        LIVE
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Real-time asset value tracking across all networks
                    </CardDescription>
                  </CardHeader>
          <CardContent>
            {/* Portfolio Chart Visualization */}
            <div className="relative h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border border-green-200 overflow-hidden">
                      {/* Chart Grid */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="grid grid-cols-12 grid-rows-8 h-full">
                          {Array.from({ length: 96 }).map((_, i) => (
                    <div key={i} className="border border-gray-300/30"></div>
                          ))}
                        </div>
                      </div>

                      {/* Animated Chart Line */}
                      <svg className="absolute inset-0 w-full h-full">
                        <defs>
                          <linearGradient
                            id="chartGradient"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                          >
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
                          </linearGradient>
                        </defs>

                        <path
                          d="M 0 180 Q 60 120 120 100 T 240 80 T 360 90 T 480 70"
                          stroke="#10b981"
                          strokeWidth="3"
                          fill="none"
                          strokeLinecap="round"
                          className="opacity-100"
                        />

                        <path
                          d="M 0 180 Q 60 120 120 100 T 240 80 T 360 90 T 480 70 L 480 256 L 0 256 Z"
                          fill="url(#chartGradient)"
                  className="opacity-60"
                        />

                        {[120, 240, 360, 480].map((x, i) => (
                          <circle
                            key={i}
                            cx={x}
                            cy={[100, 80, 90, 70][i]}
                            r="4"
                            fill="#10b981"
                          />
                        ))}
                      </svg>

                      {/* Chart Labels */}
                      <div className="absolute bottom-4 left-4 right-4 flex justify-between text-xs text-gray-600">
                        <span>7d</span>
                        <span>30d</span>
                        <span>90d</span>
                        <span>1y</span>
                      </div>

                      {/* Current Value Display */}
                      <div className="absolute top-4 left-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-3 border border-green-200 shadow-md">
                  <p className="text-2xl font-bold text-green-600">
                            ${netWorth.toLocaleString()}
                          </p>
                  <p className="text-sm text-green-700 flex items-center gap-1">
                    {averageGrowth >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                            Portfolio Value
                          </p>
                  {averageGrowth !== 0 && (
                    <p
                      className={`text-xs ${averageGrowth >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {averageGrowth >= 0 ? "+" : ""}
                      {averageGrowth.toFixed(1)}% avg growth
                    </p>
                  )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-600 font-medium">
                          Total Assets
                        </p>
                        <p className="text-lg font-bold text-blue-900 flex items-center justify-center gap-1">
                          <Building className="h-4 w-4" />
                          {filteredAssets.length}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-600 font-medium">Verified</p>
                        <p className="text-lg font-bold text-purple-900">
                  {verifiedAssetsCount}
                        </p>
                      </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium">
                          Collateralized
                        </p>
                <p className="text-lg font-bold text-green-900">
                  {collateralizedAssetsCount}
                        </p>
                      </div>
                    </div>
          </CardContent>
        </Card>

        {/* Real-time Market Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              Market Overview
                        <Badge
                          variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
                        >
                LIVE
                        </Badge>
            </CardTitle>
            <CardDescription>
              Real-time cryptocurrency and RWA market data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : marketError ? (
              <div className="text-center text-red-600 p-4">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                <p>Failed to load market data</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Market Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-medium">
                      Market Cap
                    </p>
                    <p className="text-lg font-bold text-green-900">
                      $
                      {formatCompactNumber(
                        marketData.overview?.total_market_cap || 0
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">
                      24h Volume
                    </p>
                    <p className="text-lg font-bold text-blue-900">
                      $
                      {formatCompactNumber(
                        marketData.overview?.total_volume_24h || 0
                      )}
                    </p>
                  </div>
                      </div>

                {/* Top Crypto Markets */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900">
                    Top Cryptocurrencies
                  </h4>
                  {marketData.crypto_markets &&
                  marketData.crypto_markets.length > 0 ? (
                    marketData.crypto_markets.slice(0, 5).map((crypto) => (
                            <div
                        key={crypto.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                            >
                        <div className="flex items-center gap-2">
                          <img
                            src={crypto.image}
                            alt={crypto.name}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder-coin.png";
                            }}
                          />
                                <div>
                            <p className="font-medium text-sm">
                              {crypto.symbol}
                                  </p>
                                  <p className="text-xs text-gray-600">
                              {crypto.name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                          <p className="font-medium text-sm">
                            ${crypto.current_price.toFixed(2)}
                                </p>
                          <p
                            className={`text-xs ${crypto.price_change_percentage_24h >= 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            {crypto.price_change_percentage_24h >= 0 ? "+" : ""}
                            {crypto.price_change_percentage_24h.toFixed(2)}%
                          </p>
                              </div>
                            </div>
                          ))
                        ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">
                        No market data available
                            </p>
                      <p className="text-xs text-gray-400">
                        Check your internet connection
                            </p>
                          </div>
                        )}
                      </div>
                      </div>
            )}
                  </CardContent>
                </Card>

        {/* Wallet Connection & Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-purple-600" />
              Wallet & Actions
                    </CardTitle>
                    <CardDescription>
              Connect your wallet and manage your portfolio
                    </CardDescription>
                  </CardHeader>
          <CardContent className="space-y-4">
            {/* Wallet Status */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Wallet Status</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Connected" : "Disconnected"}
                      </Badge>
                          </div>
              {isConnected ? (
                <div>
                  <p className="text-sm text-gray-600">Address:</p>
                  <p className="font-mono text-xs bg-white p-2 rounded border">
                    {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                            </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Balance: {parseFloat(wallet.balance || "0").toFixed(4)}{" "}
                    {wallet.network}
                            </p>
                          </div>
              ) : (
                <Button onClick={connectWallet} className="w-full">
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              )}
                      </div>

                      {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900">Quick Actions</h4>
                          <Button
                            asChild
                className="w-full justify-start"
                variant="outline"
                          >
                            <Link href="/dashboard/assets/new">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Asset
                            </Link>
                          </Button>
                          <Button
                            asChild
                className="w-full justify-start"
                            variant="outline"
                          >
                <Link href="/dashboard/loans">
                  <CreditCard className="h-4 w-4 mr-2" />
                  View Loans
                            </Link>
                          </Button>
                          <Button
                            asChild
                className="w-full justify-start"
                variant="outline"
                          >
                            <Link href="/dashboard/cross-chain">
                  <Network className="h-4 w-4 mr-2" />
                  Cross-Chain Bridge
                            </Link>
                          </Button>
              </div>

            {/* Health Status */}
            <div
              className={`p-4 rounded-lg border ${healthStatus.bgColor} ${healthStatus.borderColor}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <HealthIcon className={`h-5 w-5 ${healthStatus.color}`} />
                <span className="font-medium">Portfolio Health</span>
                      </div>
              <p className={`text-lg font-bold ${healthStatus.color}`}>
                {healthStatus.status}
              </p>
              <p className="text-sm text-gray-600">
                Health Ratio: {healthRatio.toFixed(2)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                      </div>

      {/* Recent Assets & Loans */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Recent Assets
                      </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/assets">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
            {portfolioLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-8">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No assets found</p>
                <Button asChild className="mt-4">
                  <Link href="/dashboard/assets/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Asset
                          </Link>
                        </Button>
                      </div>
            ) : (
              <div className="space-y-3">
                {filteredAssets.slice(0, 5).map((asset) => (
                        <div
                          key={asset.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building className="h-5 w-5 text-blue-600" />
                            </div>
                      <div>
                        <p className="font-medium text-sm">{asset.name}</p>
                        <p className="text-xs text-gray-600">
                              {asset.asset_type} • {asset.location}
                            </p>
                            </div>
                          </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                              ${asset.current_value.toLocaleString()}
                            </p>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(asset.verification_status)}
                          </div>
                        </div>
                  </div>
                ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

        {/* Recent Loans */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Active Loans
              </div>
              <Button asChild variant="outline" size="sm">
                          <Link href="/dashboard/loans">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      </div>
            ) : filteredLoans.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No active loans</p>
                <p className="text-sm text-gray-500 mt-2">
                  Use your verified assets as collateral to get loans
                </p>
                    </div>
            ) : (
              <div className="space-y-3">
                {filteredLoans.slice(0, 5).map((loan) => (
                          <div
                            key={loan.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-green-600" />
                                </div>
                      <div>
                        <p className="font-medium text-sm">
                          Loan #{loan.id.slice(-8)}
                        </p>
                        <p className="text-xs text-gray-600">
                          {loan.interest_rate}% APR • {loan.blockchain}
                                </p>
                              </div>
                              </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        ${loan.outstanding_balance.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-1">
                        {getStatusBadge(loan.loan_status)}
                              </div>
                              </div>
                            </div>
                ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Recent Transactions
            <Badge
              variant="outline"
              className="bg-purple-50 text-purple-700 border-purple-200"
            >
              LIVE
            </Badge>
                  </CardTitle>
          <CardDescription>
            Latest blockchain transactions across all networks
                  </CardDescription>
                </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent transactions</p>
              <p className="text-sm text-gray-500 mt-2">
                Connect your wallet to see transaction history
                          </p>
                        </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.hash}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tx.type === "receive" ? "bg-green-100" : "bg-blue-100"
                      }`}
                    >
                      {tx.type === "receive" ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <Send className="h-5 w-5 text-blue-600" />
                      )}
                        </div>
                        <div>
                      <p className="font-medium text-sm capitalize">
                        {tx.type}
                        </p>
                        <p className="text-xs text-gray-600">
                        {tx.network} •{" "}
                        {formatTimeAgo(
                          new Date(tx.timestamp * 1000).toISOString()
                        )}
                        </p>
                      </div>
                        </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {tx.type === "receive" ? "+" : "-"}
                      {parseFloat(tx.amount).toFixed(4)} {tx.symbol}
                                  </p>
                              <Badge
                      variant={
                        tx.status === "confirmed" ? "default" : "secondary"
                      }
                      className="text-xs"
                              >
                      {tx.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
                  </div>
  );
}
