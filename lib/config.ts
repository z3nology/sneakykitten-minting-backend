import * as anchor from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import bs58 from 'bs58'
import { Connection, PublicKey } from "@solana/web3.js"
import dotenv from 'dotenv';
import { KeypairIdentityDriver } from "@metaplex-foundation/js";

dotenv.config();

export const backendKp = anchor.web3.Keypair.fromSecretKey(bs58.decode(process.env.BACKEND_KEY || ''));
export const backendWallet = new NodeWallet(backendKp);
export const BACKEND_ADDRESS = backendKp.publicKey;

export const NETWORK = "devnet";
export const RPC = "https://api.devnet.solana.com";
// export const NETWORK = "mainnet-beta";
// export const RPC = "https://solana-mainnet.g.alchemy.com/v2/4WmRJhT5Nwi23AvjbrBFuyNSny85-Ar2";
export const connection = new Connection(RPC);

// export const BUNDLR_ADDR = "https://devnet.bundlr.network";
export const BUNDLR_ADDR = "https://node1.bundlr.network";

export const MINT_PRICE = 0.25;
export const MINIMUM_LAMPORTS = 2000000;
export const LOALTY_FEE = 15;
export const LAMPORTS = 1000000000;


export const TEVO_ADDR = new PublicKey("HRDyfgYCTCkgtGbkYJkLQiRexZmp8KgEY1L8MCj9fMGa");
export const ROYALTY_ADDR = new PublicKey("DH8ozTSc4ZxeHTw15MyLUGCdfytSBTSvYP4erXw1P8wk");
export const COLLECTION_ADDR = new PublicKey("82FVfTXDuChHW34jCqRXGnHt3sBFc9tPBe1ySLgDevpr");


export const COLLECTION_NAME = "solanagods";
export const COLLECTION_SYMBOL = "SGODS";
export const COLLECTION_URI = "https://bafybeig7uybug5uaxaiggodgaygoubz2monbjw7nlfnjwbaab5tclfqxra.ipfs.nftstorage.link/";
