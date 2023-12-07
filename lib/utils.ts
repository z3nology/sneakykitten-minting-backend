import { web3 } from "@project-serum/anchor";
import NftModel from "../models/nftModel";
import Collection from "../models/Collection";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import { getParsedNftAccountsByOwner } from "@nfteyez/sol-rayz";

import {
  BACKEND_ADDRESS,
  COLLECTION_SYMBOL,
  ROYALTY_ADDR,
  backendKp,
  backendWallet,
  connection,
  COLLECTION_NAME,
  COLLECTION_URI,
} from "./config";

import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";

const year2000 = new Date("2000-01-02T12:00:00Z").getTime();

export const mintNft = async (user: PublicKey, nftData: number) => {
  try {
    // initialize a keypair for the user
    console.log("Backend address: ", backendKp.publicKey.toBase58());

    const balance = await connection.getBalance(backendKp.publicKey);
    console.log("Current balance: ", balance / web3.LAMPORTS_PER_SOL);

    // metaplex set up
    // const metaplex = Metaplex.make(connection).use(keypairIdentity(backendKp)).use(bundlrStorage({
    //     address: BUNDLR_ADDR,
    //     providerUrl: RPC,
    //     timeout: 60000,
    // }));

    // create an NFT using the helper function
    const nft = await mintMasterEdition(connection, user, nftData);

    return nft;
  } catch (e) {
    console.log("Failed to mint NFT");
    console.log(e);
    return "";
  }
};

const mintMasterEdition = async (
  connection: Connection,
  user: PublicKey,
  nftData: any
) => {
  const metaplex = new Metaplex(connection);
  metaplex.use(keypairIdentity(backendKp));

  const transactionBuilder = await metaplex
    .nfts()
    .builders()
    .create({
      uri: COLLECTION_URI + "/" + nftData + ".json",
      name: COLLECTION_NAME + " #" + nftData,
      symbol: COLLECTION_SYMBOL,
      sellerFeeBasisPoints: 500,
      creators: [
        {
          address: BACKEND_ADDRESS,
          authority: backendKp,
          share: 0,
        },
        {
          address: ROYALTY_ADDR,
          share: 100,
        },
      ],
      tokenStandard: 4,
      tokenOwner: user,
    });

  // const tx = transactionBuilder.toTransaction(await connection.getLatestBlockhash());
  // console.log(tx);
  // tx.feePayer = BACKEND_ADDRESS;

  // console.log("Sigining transaction");
  // // const signedTx = await backendWallet.signTransaction(tx);
  // console.log("Transaction signed");
  // // console.log(signedTx);
  // const serializeTx = tx.serialize();

  // console.log("Transaction serialized");

  // const signature = await connection.sendRawTransaction(serializeTx);

  // const lastestBlock = await connection.getLatestBlockhash();

  // console.log("Confirming transaction");
  // await connection.confirmTransaction({
  //     signature: signature,
  //     blockhash: lastestBlock.blockhash,
  //     lastValidBlockHeight: lastestBlock.lastValidBlockHeight
  // }, "confirmed");

  // console.log("Transaction confirmed.");

  // const sig = await connection.sendTransaction(tx, [backendKp]);
  // await connection.confirmTransaction({signature: sig, blockhash: lastestBlock.blockhash, lastValidBlockHeight: lastestBlock.lastValidBlockHeight}, "confirmed");

  const maxTryTime = 10;

  for (let i = 0; i < maxTryTime; i++) {
    let confirmed = null;
    try {
      confirmed = await metaplex
        .rpc()
        .sendAndConfirmTransaction(transactionBuilder, {
          commitment: "confirmed",
          maxRetries: 10,
        });
    } catch (e) {
      console.log(e);
    }
    if (confirmed != null && confirmed.confirmResponse.value.err == null) break;

    console.log("failed get confirm transaction, time: ", i);
    // Then, optionally fetch the NFT afterwards after sleeping for 3 seconds. 🤢
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  const { mintAddress } = transactionBuilder.getContext();

  let nft = null;

  for (let i = 0; i < maxTryTime; i++) {
    try {
      nft = await metaplex
        .nfts()
        .findByMint({ mintAddress }, { commitment: "confirmed" });
    } catch (e) {
      console.log("failed get mint account, time: ", i);
    }

    if (nft) break;

    // Then, optionally fetch the NFT afterwards after sleeping for 3 seconds. 🤢
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  if (nft) {
    console.log(`Minted Master Edition: ${nft.address.toString()}`);
  } else {
    console.log("Can not get created mint account");
  }
  return nft;
};

export const getNextMintId = async (count: number) => {
  try {
    let collectionInfo = (await Collection.find({}))[0];
    let randomIds = collectionInfo.mintIDs;
    let currentIndex = collectionInfo.currentIndex;
    return randomIds.slice(currentIndex, currentIndex + count);
  } catch (error) {
    return;
  }
};

//  Add admin sign and confirm transaction
export const addAdminSignAndConfirm = async (
  tx: Transaction,
  blockhash?: string,
  lastValidBlockHeight?: number
) => {
  // Sign the transaction with admin's Keypair
  tx = await backendWallet.signTransaction(tx);

  const sTx = tx.serialize();

  // Send the raw transaction
  const options = {
    commitment: "confirmed",
    skipPreflight: false,
  };

  const maxTryTime = 10;
  let ret = false;

  for (let i = 0; i < maxTryTime; i++) {
    let confirmed = null;
    let signature = null;
    try {
      // Confirm the transaction
      signature = await connection.sendRawTransaction(sTx, options);
      const newBlockHash = await connection.getLatestBlockhash();

      confirmed = await connection.confirmTransaction(
        {
          signature,
          blockhash: blockhash || newBlockHash.blockhash,
          lastValidBlockHeight:
            lastValidBlockHeight || newBlockHash.lastValidBlockHeight,
        },
        "confirmed"
      );
    } catch (e) {
      console.log(e);
    }

    if (confirmed != null && confirmed.value.err == null) {
      console.log("Transaction confirmed:", signature);
      ret = true;
      break;
    }

    console.log("failed get confirm transaction, time: ", i);
    // Then, optionally fetch the NFT afterwards after sleeping for 3 seconds. 🤢
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  return ret;
};

export const getUserNfts = async (pubkey: string) => {
  const nftList = await getParsedNftAccountsByOwner({
    publicAddress: pubkey,
    connection: connection,
  });
  const nfts: string[] = []; // Initialize with a reasonable capacity

  nftList.map((item) => {
    if (
      item.data.creators &&
      item.data.creators[0]?.verified === 1 &&
      item.data.creators[0]?.address === process.env.ADMIN_ADDR
    ) {
      nfts.push(item.data.name);
    }
  });
  return nfts;
};
