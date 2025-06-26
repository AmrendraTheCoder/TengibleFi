import { NextRequest, NextResponse } from "next/server";
import { blockchainDataService } from "@/lib/web3/blockchain-data-service";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const walletAddress = searchParams.get("address");
        const refreshCache = searchParams.get("refresh") === "true";

        // Validate wallet address
        if (!walletAddress) {
            return NextResponse.json(
                { error: "Wallet address is required" },
                { status: 400 },
            );
        }

        // Refresh cache if requested
        if (refreshCache) {
            await blockchainDataService.refreshAll();
        }

        // Get portfolio data
        const portfolioData = await blockchainDataService.getPortfolioData();

        return NextResponse.json({
            success: true,
            data: portfolioData,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error("Portfolio API error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch portfolio data",
                details: error instanceof Error
                    ? error.message
                    : "Unknown error",
            },
            { status: 500 },
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, walletAddress } = body;

        switch (action) {
            case "refresh":
                await blockchainDataService.refreshAll();
                const refreshedData = await blockchainDataService
                    .getPortfolioData();
                return NextResponse.json({
                    success: true,
                    data: refreshedData,
                    message: "Portfolio data refreshed successfully",
                });

            case "subscribe":
                // In a real implementation, you'd set up WebSocket or Server-Sent Events
                return NextResponse.json({
                    success: true,
                    message:
                        "Subscription endpoint - implement WebSocket connection",
                });

            default:
                return NextResponse.json(
                    { error: "Invalid action" },
                    { status: 400 },
                );
        }
    } catch (error) {
        console.error("Portfolio API POST error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to process request",
                details: error instanceof Error
                    ? error.message
                    : "Unknown error",
            },
            { status: 500 },
        );
    }
}
 