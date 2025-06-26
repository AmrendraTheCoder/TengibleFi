"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdmin } from "@/hooks/useAdmin";
import {
  Users,
  Building2,
  FileText,
  Activity,
  DollarSign,
  AlertTriangle,
  Shield,
  TrendingUp,
  Network,
  Zap,
  Database,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Play,
  Pause,
  RefreshCw,
} from "lucide-react";

const AdminDashboard: React.FC = () => {
  const {
    isAdmin,
    isVerified,
    verifying,
    metrics,
    users,
    assets,
    contracts,
    actions,
    networkStats,
    isLoading,
    hasError,
    verifyAdmin,
    refreshAll,
    updateUserStatus,
    updateKYCStatus,
    verifyAsset,
    pauseContract,
    unpauseContract,
    exportData,
  } = useAdmin();

  const [activeTab, setActiveTab] = useState("overview");

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">Access Denied</CardTitle>
            <CardDescription>
              Admin access required. Please connect with an admin wallet.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // If admin but not verified, show verification prompt
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <CardTitle>Admin Verification Required</CardTitle>
            <CardDescription>
              Please verify your admin access to continue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={verifyAdmin}
              disabled={verifying}
              className="w-full"
            >
              {verifying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verify Admin Access
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
      case "active":
      case "healthy":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
      case "suspended":
      case "banned":
      case "critical":
        return "bg-red-100 text-red-800";
      case "warning":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              TangibleFi System Administration
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={refreshAll} disabled={isLoading}>
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button onClick={() => exportData("all")} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {hasError && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-600">
              Some data failed to load. Please refresh the page or check your
              connection.
            </AlertDescription>
          </Alert>
        )}

        {/* System Metrics Overview */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Users
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(metrics.totalUsers)}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Assets
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatNumber(metrics.totalAssets)}
                    </p>
                  </div>
                  <Building2 className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Total Value Locked
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(metrics.totalValueLocked)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      System Health
                    </p>
                    <div className="flex items-center mt-1">
                      <Badge className={getStatusColor(metrics.systemHealth)}>
                        {metrics.systemHealth}
                      </Badge>
                    </div>
                  </div>
                  <Activity className="w-8 h-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {actions.slice(0, 5).map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {action.action.replace("_", " ")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(action.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          className={
                            action.result === "success"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {action.result}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Network Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Network className="w-5 h-5 mr-2" />
                    Network Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {networkStats && (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Supported Networks
                        </span>
                        <span className="font-medium">
                          {networkStats.supportedNetworks}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">
                          Active Contracts
                        </span>
                        <span className="font-medium">
                          {networkStats.activeContracts}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            {metrics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Loans</p>
                        <p className="text-xl font-bold">
                          {formatNumber(metrics.activeLoans)}
                        </p>
                      </div>
                      <TrendingUp className="w-6 h-6 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          Pending Verifications
                        </p>
                        <p className="text-xl font-bold">
                          {formatNumber(metrics.pendingVerifications)}
                        </p>
                      </div>
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">
                          24h Transactions
                        </p>
                        <p className="text-xl font-bold">
                          {formatNumber(metrics.transactionCount24h)}
                        </p>
                      </div>
                      <Zap className="w-6 h-6 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage user accounts, KYC status, and account status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">User</th>
                        <th className="text-left py-3 px-4">Wallet</th>
                        <th className="text-left py-3 px-4">KYC Status</th>
                        <th className="text-left py-3 px-4">Account Status</th>
                        <th className="text-left py-3 px-4">Assets</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">
                                {user.fullName || "Unknown"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {user.email || "No email"}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                              {user.walletAddress}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={getStatusColor(user.kycStatus)}>
                              {user.kycStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={getStatusColor(user.accountStatus)}
                            >
                              {user.accountStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <p>{user.totalAssets} assets</p>
                              <p className="text-gray-500">
                                {user.totalLoans} loans
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              {user.kycStatus === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateKYCStatus(user.id, "verified")
                                    }
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateKYCStatus(user.id, "rejected")
                                    }
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {user.accountStatus === "active" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateUserStatus(user.id, "suspended")
                                  }
                                >
                                  <Pause className="w-3 h-3 mr-1" />
                                  Suspend
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2" />
                  Asset Management
                </CardTitle>
                <CardDescription>
                  Verify assets and manage asset values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Asset</th>
                        <th className="text-left py-3 px-4">Type</th>
                        <th className="text-left py-3 px-4">Value</th>
                        <th className="text-left py-3 px-4">Status</th>
                        <th className="text-left py-3 px-4">Blockchain</th>
                        <th className="text-left py-3 px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assets.map((asset) => (
                        <tr
                          key={asset.id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{asset.name}</p>
                              <p className="text-sm text-gray-500">
                                {asset.location}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">{asset.type}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">
                                {formatCurrency(asset.currentValue)}
                              </p>
                              <p className="text-sm text-gray-500">
                                Original: {formatCurrency(asset.originalValue)}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={getStatusColor(
                                asset.verificationStatus
                              )}
                            >
                              {asset.verificationStatus}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className="bg-blue-100 text-blue-800">
                              {asset.blockchain}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-2">
                              {asset.verificationStatus === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      verifyAsset(asset.id, "verified")
                                    }
                                  >
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Verify
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      verifyAsset(asset.id, "rejected")
                                    }
                                  >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Smart Contract Management
                </CardTitle>
                <CardDescription>
                  Monitor and control smart contracts across all networks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contracts.map((contract) => (
                    <Card
                      key={`${contract.address}-${contract.network}`}
                      className="border"
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <h3 className="font-medium">{contract.name}</h3>
                            <p className="text-sm text-gray-500">
                              {contract.network}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-400">Address</p>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                              {contract.address}
                            </code>
                          </div>

                          <div className="flex items-center justify-between">
                            <Badge
                              className={
                                contract.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }
                            >
                              {contract.isActive ? "Active" : "Paused"}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              v{contract.version}
                            </span>
                          </div>

                          <div className="flex gap-2 pt-2">
                            {contract.isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  pauseContract(
                                    contract.address,
                                    contract.network
                                  )
                                }
                                className="flex-1"
                              >
                                <Pause className="w-3 h-3 mr-1" />
                                Pause
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  unpauseContract(
                                    contract.address,
                                    contract.network
                                  )
                                }
                                className="flex-1"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                Unpause
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Actions Tab */}
          <TabsContent value="actions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="w-5 h-5 mr-2" />
                  Admin Action Log
                </CardTitle>
                <CardDescription>
                  Track all administrative actions and system changes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {actions.map((action) => (
                    <div key={action.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium capitalize">
                          {action.action.replace("_", " ")}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge
                            className={
                              action.result === "success"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {action.result}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(action.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Target: <code>{action.target}</code>
                      </p>
                      <p className="text-sm text-gray-600">
                        Admin:{" "}
                        <code className="text-xs">{action.adminAddress}</code>
                      </p>
                      {action.details && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-500 cursor-pointer">
                            Details
                          </summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(action.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
 