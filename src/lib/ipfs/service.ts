// IPFS Service for TangibleFi Asset Management
import axios from "axios";

export interface IPFSUploadResult {
    hash: string;
    url: string;
    size: number;
    name: string;
}

export interface AssetMetadata {
    name: string;
    description: string;
    image: string;
    external_url?: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
        display_type?: string;
    }>;
    properties: {
        asset_type: string;
        location: string;
        valuation: string;
        blockchain: string;
        verification_status: string;
        created_at: string;
        modified_at?: string;
        [key: string]: any; // Allow additional dynamic properties
    };
}

export class IPFSService {
    private pinataApiKey: string;
    private pinataSecretKey: string;
    private pinataGateway: string;

    constructor() {
        this.pinataApiKey = process.env.NEXT_PUBLIC_PINATA_API_KEY || "";
        this.pinataSecretKey = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY || "";
        this.pinataGateway = process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
            "https://gateway.pinata.cloud/ipfs/";
    }

    private validateConfig(): boolean {
        if (!this.pinataApiKey || !this.pinataSecretKey) {
            console.log("IPFS configuration missing, using development mode");
            return false;
        }
        return true;
    }

    async uploadFile(
        file: File,
        metadata?: { name?: string; description?: string },
    ): Promise<IPFSUploadResult> {
        if (!this.validateConfig()) {
            // Return mock data for development
            // Generate a realistic IPFS hash (46 characters total: "Qm" + 44 base58 chars)
            const mockHash = "Qm" + Array.from({ length: 44 }, () => {
                const chars =
                    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
                return chars[Math.floor(Math.random() * chars.length)];
            }).join("");

            return {
                hash: mockHash,
                url: `${this.pinataGateway}${mockHash}`,
                size: file.size,
                name: metadata?.name || file.name,
            };
        }

        const formData = new FormData();
        formData.append("file", file);

        const pinataMetadata = JSON.stringify({
            name: metadata?.name || file.name,
            keyvalues: {
                description: metadata?.description || "",
                uploaded_at: new Date().toISOString(),
                file_type: file.type,
                file_size: file.size.toString(),
            },
        });

        formData.append("pinataMetadata", pinataMetadata);

        const pinataOptions = JSON.stringify({
            cidVersion: 0,
        });

        formData.append("pinataOptions", pinataOptions);

        try {
            const response = await axios.post(
                "https://api.pinata.cloud/pinning/pinFileToIPFS",
                formData,
                {
                    maxBodyLength: Infinity,
                    headers: {
                        "Content-Type": `multipart/form-data`,
                        pinata_api_key: this.pinataApiKey,
                        pinata_secret_api_key: this.pinataSecretKey,
                    },
                },
            );

            return {
                hash: response.data.IpfsHash,
                url: `${this.pinataGateway}${response.data.IpfsHash}`,
                size: response.data.PinSize,
                name: metadata?.name || file.name,
            };
        } catch (error) {
            console.error("IPFS upload error:", error);
            throw new Error(`Failed to upload file to IPFS: ${error}`);
        }
    }

    async uploadJSON(data: object, name: string): Promise<IPFSUploadResult> {
        if (!this.validateConfig()) {
            // Return mock data for development
            // Generate a realistic IPFS hash (46 characters total: "Qm" + 44 base58 chars)
            const mockHash = "Qm" + Array.from({ length: 44 }, () => {
                const chars =
                    "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
                return chars[Math.floor(Math.random() * chars.length)];
            }).join("");

            return {
                hash: mockHash,
                url: `${this.pinataGateway}${mockHash}`,
                size: JSON.stringify(data).length,
                name: name,
            };
        }

        const pinataMetadata = {
            name: name,
            keyvalues: {
                type: "json",
                uploaded_at: new Date().toISOString(),
            },
        };

        const pinataOptions = {
            cidVersion: 0,
        };

        try {
            const response = await axios.post(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                {
                    pinataContent: data,
                    pinataMetadata,
                    pinataOptions,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        pinata_api_key: this.pinataApiKey,
                        pinata_secret_api_key: this.pinataSecretKey,
                    },
                },
            );

            return {
                hash: response.data.IpfsHash,
                url: `${this.pinataGateway}${response.data.IpfsHash}`,
                size: response.data.PinSize,
                name: name,
            };
        } catch (error) {
            console.error("IPFS JSON upload error:", error);
            throw new Error(`Failed to upload JSON to IPFS: ${error}`);
        }
    }

    async uploadAssetDocuments(files: File[]): Promise<IPFSUploadResult[]> {
        const uploadPromises = files.map((file, index) =>
            this.uploadFile(file, {
                name: `document_${index + 1}_${file.name}`,
                description: `Asset verification document ${index + 1}`,
            })
        );

        try {
            return await Promise.all(uploadPromises);
        } catch (error) {
            console.error("Error uploading asset documents:", error);
            throw new Error(`Failed to upload asset documents: ${error}`);
        }
    }

    async createAssetMetadata(assetData: {
        name: string;
        description: string;
        asset_type: string;
        location: string;
        valuation: string;
        blockchain: string;
        imageHash?: string;
        documentHashes?: string[];
    }): Promise<IPFSUploadResult> {
        const metadata: AssetMetadata = {
            name: assetData.name,
            description: assetData.description,
            image: assetData.imageHash
                ? `${this.pinataGateway}${assetData.imageHash}`
                : "",
            external_url: `${process.env.NEXT_PUBLIC_APP_URL}/assets/${
                assetData.name.toLowerCase().replace(/\s+/g, "-")
            }`,
            attributes: [
                {
                    trait_type: "Asset Type",
                    value: assetData.asset_type,
                },
                {
                    trait_type: "Location",
                    value: assetData.location,
                },
                {
                    trait_type: "Valuation",
                    value: assetData.valuation,
                    display_type: "number",
                },
                {
                    trait_type: "Blockchain",
                    value: assetData.blockchain,
                },
                {
                    trait_type: "Verification Status",
                    value: "Pending",
                },
            ],
            properties: {
                asset_type: assetData.asset_type,
                location: assetData.location,
                valuation: assetData.valuation,
                blockchain: assetData.blockchain,
                verification_status: "pending",
                created_at: new Date().toISOString(),
            },
        };

        // Add document references if available
        if (assetData.documentHashes && assetData.documentHashes.length > 0) {
            metadata.attributes.push({
                trait_type: "Documents",
                value: assetData.documentHashes.length,
                display_type: "number",
            });

            // Add document URLs to properties
            (metadata.properties as any).documents = assetData.documentHashes
                .map(
                    (hash) => `${this.pinataGateway}${hash}`,
                );
        }

        return this.uploadJSON(metadata, `${assetData.name}_metadata`);
    }

    async getMetadata(hash: string): Promise<AssetMetadata> {
        try {
            const response = await axios.get(`${this.pinataGateway}${hash}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching metadata:", error);
            throw new Error(`Failed to fetch metadata: ${error}`);
        }
    }

    async updateAssetMetadata(
        originalHash: string,
        updates: Partial<AssetMetadata>,
    ): Promise<IPFSUploadResult> {
        try {
            const originalMetadata = await this.getMetadata(originalHash);
            const updatedMetadata = { ...originalMetadata, ...updates };

            // Update the modified timestamp
            updatedMetadata.properties = {
                ...updatedMetadata.properties,
                modified_at: new Date().toISOString(),
            };

            return this.uploadJSON(
                updatedMetadata,
                `${updatedMetadata.name}_metadata_updated`,
            );
        } catch (error) {
            console.error("Error updating metadata:", error);
            throw new Error(`Failed to update metadata: ${error}`);
        }
    }

    getIPFSUrl(hash: string): string {
        return `${this.pinataGateway}${hash}`;
    }

    extractHashFromUrl(url: string): string {
        const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
        return match ? match[1] : "";
    }

    async pinList(): Promise<any[]> {
        this.validateConfig();

        try {
            const response = await axios.get(
                "https://api.pinata.cloud/data/pinList",
                {
                    headers: {
                        pinata_api_key: this.pinataApiKey,
                        pinata_secret_api_key: this.pinataSecretKey,
                    },
                },
            );

            return response.data.rows || [];
        } catch (error) {
            console.error("Error fetching pin list:", error);
            throw new Error(`Failed to fetch pin list: ${error}`);
        }
    }

    async unpinFile(hash: string): Promise<void> {
        this.validateConfig();

        try {
            await axios.delete(
                `https://api.pinata.cloud/pinning/unpin/${hash}`,
                {
                    headers: {
                        pinata_api_key: this.pinataApiKey,
                        pinata_secret_api_key: this.pinataSecretKey,
                    },
                },
            );
        } catch (error) {
            console.error("Error unpinning file:", error);
            throw new Error(`Failed to unpin file: ${error}`);
        }
    }
}

// Export singleton instance
export const ipfsService = new IPFSService();
