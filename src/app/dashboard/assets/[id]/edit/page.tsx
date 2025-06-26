"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../../../supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building,
  MapPin,
  DollarSign,
  Calendar,
  Save,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Globe,
  Shield,
  X,
  Edit,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { toast } from "@/components/ui/use-toast";
interface Asset {
  id: string;
  name: string;
  asset_type: string;
  description: string;
  current_value: number;
  original_value: number;
  verification_status: string;
  collateralization_status: string;
  location: string;
  blockchain: string;
  created_at: string;
}

export default function EditAssetPage({ params }: { params: { id: string } }) {
  // Get the id from params directly
  const { id } = params;
  const router = useRouter();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadAsset = async () => {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/sign-in");
        return;
      }

      setUser(user);

      const { data: asset, error } = await supabase
        .from("assets")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (error || !asset) {
        router.push("/dashboard/assets");
        return;
      }

      setAsset(asset);
      setLoading(false);
    };

    loadAsset();
  }, [id, router]);

  const handleSubmit = async (formData: FormData) => {
    if (!asset || !user) return;

    setSaving(true);
    const supabase = createClient();

    const name = formData.get("name") as string;
    const assetType = formData.get("asset_type") as string;
    const description = formData.get("description") as string;
    const location = formData.get("location") as string;
    const currentValue = parseFloat(formData.get("current_value") as string);
    const blockchain = formData.get("blockchain") as string;

    const { error } = await supabase
      .from("assets")
      .update({
        name,
        asset_type: assetType,
        description,
        location,
        current_value: currentValue,
        blockchain,
      })
      .eq("id", asset.id)
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update asset. Please try again.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Asset updated successfully.",
    });

    router.push(`/dashboard/assets/${asset.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading asset...</p>
          </div>
        </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/dashboard/assets/${asset.id}`}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Asset
                </Link>
              </Button>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Edit className="h-4 w-4" />
            Editing: {asset.name}
          </div>
        </div>
              </div>

      {/* Header Card */}
      <Card className="bg-gradient-to-br from-blue-600 to-purple-700 text-white border-0 shadow-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Edit className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">Edit Asset</h1>
              <p className="text-blue-100">
                Update information for {asset.name}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form action={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-600" />
                  Basic Information
                  </CardTitle>
                <CardDescription>
                  Update the fundamental details of your asset
                  </CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Asset Name</Label>
                          <Input
                            id="name"
                            name="name"
                            defaultValue={asset.name}
                      placeholder="Enter asset name"
                            required
                      className="focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset_type">Asset Type</Label>
                    <Select name="asset_type" defaultValue={asset.asset_type}>
                      <SelectTrigger className="focus:ring-blue-500 focus:border-blue-500">
                              <SelectValue placeholder="Select asset type" />
                            </SelectTrigger>
                            <SelectContent>
                        <SelectItem value="real_estate">Real Estate</SelectItem>
                        <SelectItem value="art">Art</SelectItem>
                        <SelectItem value="collectibles">
                          Collectibles
                              </SelectItem>
                        <SelectItem value="commodities">Commodities</SelectItem>
                        <SelectItem value="equipment">Equipment</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          defaultValue={asset.description}
                    placeholder="Describe your asset..."
                          rows={4}
                    className="focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
              </CardContent>
            </Card>

            {/* Location & Blockchain */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Location & Network
                </CardTitle>
                <CardDescription>
                  Specify the location and blockchain network
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            name="location"
                            defaultValue={asset.location}
                      placeholder="Enter location"
                            required
                      className="focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                  <div className="space-y-2">
                    <Label htmlFor="blockchain">Blockchain Network</Label>
                    <Select name="blockchain" defaultValue={asset.blockchain}>
                      <SelectTrigger className="focus:ring-green-500 focus:border-green-500">
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ethereum">Ethereum</SelectItem>
                        <SelectItem value="polygon">Polygon</SelectItem>
                        <SelectItem value="arbitrum">Arbitrum</SelectItem>
                        <SelectItem value="optimism">Optimism</SelectItem>
                        <SelectItem value="bnb">BNB Chain</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Valuation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                  Valuation
                </CardTitle>
                <CardDescription>
                  Update the current market value of your asset
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="current_value">Current Value ($)</Label>
                          <Input
                            id="current_value"
                            name="current_value"
                            type="number"
                            step="0.01"
                            defaultValue={asset.current_value}
                      placeholder="0.00"
                            required
                      className="focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="original_value">Original Value ($)</Label>
                    <Input
                      id="original_value"
                      name="original_value"
                      type="number"
                      step="0.01"
                      defaultValue={asset.original_value}
                      disabled
                      className="bg-gray-50 text-gray-600"
                          />
                          <p className="text-xs text-gray-500">
                      Original value cannot be changed
                          </p>
                        </div>
                      </div>
              </CardContent>
            </Card>
                    </div>

          {/* Sidebar */}
          <div className="space-y-6">
                    {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                        Save Changes
                    </>
                  )}
                </Button>
                      <Button
                        type="button"
                        variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
                      >
                  <X className="h-4 w-4 mr-2" />
                          Cancel
                      </Button>
                </CardContent>
              </Card>

            {/* Asset Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                  Asset Status
                  </CardTitle>
                </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Verification</span>
                    <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                        asset.verification_status === "verified"
                        ? "bg-green-100 text-green-800"
                          : asset.verification_status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                    {asset.verification_status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Collateral Status</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      asset.collateralization_status === "available"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {asset.collateralization_status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Network</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                    {asset.blockchain}
                    </span>
                  </div>
              </CardContent>
            </Card>

            {/* Asset Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-600" />
                  Asset Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Asset ID</span>
                    <span
                      className="font-mono text-xs bg-gray-100 px-2 py-1 rounded max-w-32 truncate"
                      title={asset.id}
                    >
                      {asset.id.slice(-12)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Created</span>
                    <span className="text-sm font-medium">
                      {new Date(asset.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  </div>
                </CardContent>
              </Card>

            {/* Help */}
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
                <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                <h3 className="font-bold mb-2 text-gray-900">Need Help?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Contact our support team for assistance with asset management.
                  </p>
                  <Button
                    variant="outline"
                  size="sm"
                  className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                  Get Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
      </form>
        </div>
  );
}
