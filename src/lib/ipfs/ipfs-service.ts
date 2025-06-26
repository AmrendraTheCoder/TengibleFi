import { create, IPFSHTTPClient } from "ipfs-http-client";

export interface IPFSUploadResult {
    hash: string;
    path: string;
    size: number;
    url: string;
}

export interface AssetMetadata {
    name: string;
    description: string;
    image: string;
    attributes: Array<{
        trait_type: string;
        value: string | number;
    }>;
    properties: {
        assetType: string;
        valuation: number;
        location?: string;
        documents: string[];
        verificationStatus: string;
        tokenStandard: string;
    };
}

export interface DocumentMetadata {
    filename: string;
    size: number;
    type: string;
    uploadDate: string;
    hash: string;
}

class IPFSService {
    private client: IPFSHTTPClient | null = null;
    private readonly PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
    private readonly PINATA_SECRET_KEY =
        process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;
    private readonly INFURA_PROJECT_ID =
        process.env.NEXT_PUBLIC_INFURA_PROJECT_ID;
    private readonly INFURA_PROJECT_SECRET =
        process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET;
    private readonly IPFS_GATEWAY = process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
        "https://gateway.pinata.cloud/ipfs/";

    constructor() {
        this.initializeClient();
    }

    private async initializeClient() {
        try {
            // Try Infura first if credentials are available
            if (this.INFURA_PROJECT_ID && this.INFURA_PROJECT_SECRET) {
                const auth = "Basic " + Buffer.from(
                    this.INFURA_PROJECT_ID + ":" + this.INFURA_PROJECT_SECRET,
                ).toString("base64");

                this.client = create({
                    host: "ipfs.infura.io",
                    port: 5001,
                    protocol: "https",
                    headers: {
                        authorization: auth,
                    },
                });
            } else {
                // Fallback to local IPFS node
                this.client = create({
                    host: "localhost",
                    port: 5001,
                    protocol: "http",
                });
            }

            // Test connection
            await this.client.version();
            console.log("IPFS client initialized successfully");
        } catch (error) {
            console.error("Failed to initialize IPFS client:", error);
            this.client = null;
        }
    }

    async uploadFile(file: File): Promise<IPFSUploadResult> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            // Use Pinata API if available for reliable pinning
            if (this.PINATA_API_KEY && this.PINATA_SECRET_KEY) {
                return await this.uploadToPinata(file);
            }

            // Otherwise use IPFS client
            const fileBuffer = await file.arrayBuffer();
            const result = await this.client.add(new Uint8Array(fileBuffer), {
                pin: true,
                wrapWithDirectory: false,
            });

            return {
                hash: result.cid.toString(),
                path: result.path,
                size: result.size,
                url: `${this.IPFS_GATEWAY}${result.cid.toString()}`,
            };
        } catch (error) {
            console.error("Failed to upload file to IPFS:", error);
            throw new Error("Failed to upload file to IPFS");
        }
    }

    async uploadJSON(data: any): Promise<IPFSUploadResult> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            const jsonString = JSON.stringify(data, null, 2);

            // Use Pinata API if available
            if (this.PINATA_API_KEY && this.PINATA_SECRET_KEY) {
                return await this.uploadJSONToPinata(data);
            }

            // Otherwise use IPFS client
            const result = await this.client.add(jsonString, {
                pin: true,
                wrapWithDirectory: false,
            });

            return {
                hash: result.cid.toString(),
                path: result.path,
                size: result.size,
                url: `${this.IPFS_GATEWAY}${result.cid.toString()}`,
            };
        } catch (error) {
            console.error("Failed to upload JSON to IPFS:", error);
            throw new Error("Failed to upload JSON to IPFS");
        }
    }

    async uploadMultipleFiles(files: File[]): Promise<IPFSUploadResult[]> {
        const uploadPromises = files.map((file) => this.uploadFile(file));
        return Promise.all(uploadPromises);
    }

    async createAssetMetadata(
        name: string,
        description: string,
        imageFile: File,
        documents: File[],
        assetType: string,
        valuation: number,
        location?: string,
    ): Promise<IPFSUploadResult> {
        try {
            // Upload image
            const imageResult = await this.uploadFile(imageFile);

            // Upload documents
            const documentResults = await this.uploadMultipleFiles(documents);

            // Create metadata object
            const metadata: AssetMetadata = {
                name,
                description,
                image: imageResult.url,
                attributes: [
                    { trait_type: "Asset Type", value: assetType },
                    { trait_type: "Valuation", value: valuation },
                    { trait_type: "Document Count", value: documents.length },
                ],
                properties: {
                    assetType,
                    valuation,
                    location,
                    documents: documentResults.map((doc) => doc.url),
                    verificationStatus: "pending",
                    tokenStandard: "ERC721",
                },
            };

            if (location) {
                metadata.attributes.push({
                    trait_type: "Location",
                    value: location,
                });
            }

            // Upload metadata JSON
            return await this.uploadJSON(metadata);
        } catch (error) {
            console.error("Failed to create asset metadata:", error);
            throw new Error("Failed to create asset metadata");
        }
    }

    async getFile(hash: string): Promise<Uint8Array> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            const chunks: Uint8Array[] = [];
            for await (const chunk of this.client.cat(hash)) {
                chunks.push(chunk);
            }

            // Concatenate all chunks
            const totalLength = chunks.reduce(
                (sum, chunk) => sum + chunk.length,
                0,
            );
            const result = new Uint8Array(totalLength);
            let offset = 0;

            for (const chunk of chunks) {
                result.set(chunk, offset);
                offset += chunk.length;
            }

            return result;
        } catch (error) {
            console.error(`Failed to get file from IPFS: ${hash}`, error);
            throw new Error("Failed to get file from IPFS");
        }
    }

    async getJSON(hash: string): Promise<any> {
        try {
            const data = await this.getFile(hash);
            const jsonString = new TextDecoder().decode(data);
            return JSON.parse(jsonString);
        } catch (error) {
            console.error(`Failed to get JSON from IPFS: ${hash}`, error);
            throw new Error("Failed to get JSON from IPFS");
        }
    }

    async pinFile(hash: string): Promise<void> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            await this.client.pin.add(hash);
        } catch (error) {
            console.error(`Failed to pin file: ${hash}`, error);
            throw new Error("Failed to pin file");
        }
    }

    async unpinFile(hash: string): Promise<void> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            await this.client.pin.rm(hash);
        } catch (error) {
            console.error(`Failed to unpin file: ${hash}`, error);
            throw new Error("Failed to unpin file");
        }
    }

    // Pinata integration for reliable pinning
    private async uploadToPinata(file: File): Promise<IPFSUploadResult> {
        const formData = new FormData();
        formData.append("file", file);

        const metadata = JSON.stringify({
            name: file.name,
            keyvalues: {
                uploadedAt: new Date().toISOString(),
                fileType: file.type,
            },
        });
        formData.append("pinataMetadata", metadata);

        const options = JSON.stringify({
            cidVersion: 0,
        });
        formData.append("pinataOptions", options);

        const response = await fetch(
            "https://api.pinata.cloud/pinning/pinFileToIPFS",
            {
                method: "POST",
                headers: {
                    "pinata_api_key": this.PINATA_API_KEY!,
                    "pinata_secret_api_key": this.PINATA_SECRET_KEY!,
                },
                body: formData,
            },
        );

        if (!response.ok) {
            throw new Error(`Pinata upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return {
            hash: result.IpfsHash,
            path: result.IpfsHash,
            size: result.PinSize,
            url: `${this.IPFS_GATEWAY}${result.IpfsHash}`,
        };
    }

    private async uploadJSONToPinata(data: any): Promise<IPFSUploadResult> {
        const response = await fetch(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "pinata_api_key": this.PINATA_API_KEY!,
                    "pinata_secret_api_key": this.PINATA_SECRET_KEY!,
                },
                body: JSON.stringify({
                    pinataContent: data,
                    pinataMetadata: {
                        name: "metadata.json",
                        keyvalues: {
                            uploadedAt: new Date().toISOString(),
                            type: "metadata",
                        },
                    },
                }),
            },
        );

        if (!response.ok) {
            throw new Error(
                `Pinata JSON upload failed: ${response.statusText}`,
            );
        }

        const result = await response.json();
        return {
            hash: result.IpfsHash,
            path: result.IpfsHash,
            size: result.PinSize,
            url: `${this.IPFS_GATEWAY}${result.IpfsHash}`,
        };
    }

    // Get pinned files from Pinata
    async getPinnedFiles(): Promise<
        Array<{
            ipfs_pin_hash: string;
            size: number;
            user_id: string;
            date_pinned: string;
            metadata: any;
        }>
    > {
        if (!this.PINATA_API_KEY || !this.PINATA_SECRET_KEY) {
            return [];
        }

        try {
            const response = await fetch(
                "https://api.pinata.cloud/data/pinList",
                {
                    method: "GET",
                    headers: {
                        "pinata_api_key": this.PINATA_API_KEY,
                        "pinata_secret_api_key": this.PINATA_SECRET_KEY,
                    },
                },
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to get pinned files: ${response.statusText}`,
                );
            }

            const result = await response.json();
            return result.rows || [];
        } catch (error) {
            console.error("Failed to get pinned files from Pinata:", error);
            return [];
        }
    }

    // Utility methods
    formatIPFSUrl(hash: string): string {
        return `${this.IPFS_GATEWAY}${hash}`;
    }

    extractHashFromUrl(url: string): string {
        const match = url.match(/\/ipfs\/([a-zA-Z0-9]+)/);
        return match ? match[1] : "";
    }

    isIPFSHash(hash: string): boolean {
        // Basic validation for IPFS hash (CID)
        return /^Qm[a-zA-Z0-9]{44}$/.test(hash) ||
            /^bafy[a-zA-Z0-9]+$/.test(hash);
    }

    async validateFile(hash: string): Promise<boolean> {
        try {
            await this.getFile(hash);
            return true;
        } catch (error) {
            return false;
        }
    }

    // Convert file to base64 for preview
    async fileToBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
    }

    // Get file info without downloading
    async getFileInfo(hash: string): Promise<{
        hash: string;
        size: number;
        type: string;
    }> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            const stat = await this.client.files.stat(`/ipfs/${hash}`);
            return {
                hash,
                size: stat.size,
                type: stat.type,
            };
        } catch (error) {
            console.error(`Failed to get file info: ${hash}`, error);
            throw new Error("Failed to get file info");
        }
    }

    // Batch operations
    async batchUpload(files: File[]): Promise<IPFSUploadResult[]> {
        const results: IPFSUploadResult[] = [];

        for (const file of files) {
            try {
                const result = await this.uploadFile(file);
                results.push(result);
            } catch (error) {
                console.error(`Failed to upload file ${file.name}:`, error);
                // Continue with other files
            }
        }

        return results;
    }

    // Check IPFS connectivity
    async isConnected(): Promise<boolean> {
        if (!this.client) return false;

        try {
            await this.client.version();
            return true;
        } catch (error) {
            return false;
        }
    }

    // Get node info
    async getNodeInfo(): Promise<any> {
        if (!this.client) {
            throw new Error("IPFS client not initialized");
        }

        try {
            const [version, id] = await Promise.all([
                this.client.version(),
                this.client.id(),
            ]);

            return {
                version,
                id,
                connected: true,
            };
        } catch (error) {
            console.error("Failed to get IPFS node info:", error);
            return {
                connected: false,
                error: typeof error === "object" && error !== null && "message" in error ? (error as { message: string }).message : String(error),
            };
        }
    }
}

// Create and export singleton instance
export const ipfsService = new IPFSService();

// Utility functions
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || "";
}

export function isImageFile(filename: string): boolean {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg"];
    return imageExtensions.includes(getFileExtension(filename));
}

export function isDocumentFile(filename: string): boolean {
    const docExtensions = ["pdf", "doc", "docx", "txt", "rtf"];
    return docExtensions.includes(getFileExtension(filename));
}
