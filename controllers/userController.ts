import { Request, Response } from "express";
import Joi, { allow } from "joi";
import {
  LAMPORTS_PER_SOL,
  ParsedInstruction,
  PublicKey,
} from "@solana/web3.js";
import { web3 } from "@project-serum/anchor";
import { getParsedNftAccountsByOwner } from "@nfteyez/sol-rayz";

import {
  mintNft,
  addAdminSignAndConfirm,
  getNextMintId,
  getUserNfts,
} from "../lib/utils";
import {
  BACKEND_ADDRESS,
  MINT_PRICE,
  connection,
  backendWallet,
  LOALTY_FEE,
} from "../lib/config";

import pkg from "bs58";
const { decode } = pkg;

import NftModel from "../models/nftModel";
import TxhashModel from "../models/txhashModel";
import Collection from "../models/Collection";
import ClaimHistory from "../models/ClaimHistory";

export const mintArtController = async function (req: Request, res: Response) {
  const { body } = req;

  // console.log("received request");
  // Validate form
  const UserSchema = Joi.object().keys({
    hash: Joi.string().required(),
  });

  const inputValidation = UserSchema.validate(body);
  if (!!inputValidation.error)
    return res
      .status(400)
      .json({ error: inputValidation.error.details[0].message });

  // console.log("trying mint");

  try {
    //  check deposit tx hash
    const hash = body.hash;
    const txdata = await TxhashModel.findOne({ hash });
    let currentIndex = (await Collection.find({}))[0].currentIndex;

    // console.log("verify tx hash");
    if (txdata) {
      console.log("already used hash");
      return res.status(400).json({ error: "Already used hash." });
    }

    const maxTryTime = 10;
    let transaction = null;

    for (let i = 0; i < maxTryTime; i++) {
      transaction = await connection.getParsedTransaction(
        body.hash,
        "confirmed"
      );
      if (transaction) break;

      console.log("try get sol tx, time: ", i);

      // Then, optionally fetch the NFT afterwards after sleeping for 2 seconds. 🤢
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (transaction == null)
      return res.status(400).json({ error: "Can not verify transaction" });

    // console.log("verify sol transfer");

    let amount = 0;
    let userWallet = "";
    const ixs = transaction?.transaction.message.instructions;

    // console.log(transaction);
    // console.log("ixs length: ", ixs?.length);

    if (ixs) {
      for (const ix of ixs) {
        console.log(ix.programId.toBase58());
        if (ix.programId.toBase58() != "11111111111111111111111111111111")
          continue;
        const destination = (ix as ParsedInstruction).parsed.info.destination;
        if (destination != BACKEND_ADDRESS.toBase58()) continue;

        console.log("found sol transfer ix");

        amount =
          (ix as ParsedInstruction).parsed.info.lamports / LAMPORTS_PER_SOL;
        userWallet = (ix as ParsedInstruction).parsed.info.source;
        break;
      }
      if (!userWallet) throw "Could not parse wallet & amount from deposit tx";

      // console.log("instruction verified");

      //  select random rarity

      const cnt = Math.floor(amount / MINT_PRICE + 0.000000001);
      if (cnt == 0)
        return res.status(400).json({ error: "Transfer amount is not ligit." });

      // console.log("minting ", cnt);

      // console.log("response sent");

      let minted = 0;
      const mindIds: any = await getNextMintId(cnt);
      res.status(200).send({
        message: `Minting NFTs, you'll get your nft in 5 min`,
        ids: mindIds,
        totalSupply: currentIndex + cnt,
      });
      for (let i = 0; i < cnt; i++) {
        currentIndex++;
        await mintNft(new PublicKey(userWallet), mindIds[i]);
        const newModel = new NftModel({
          address: new PublicKey(userWallet),
          nftId: mindIds[i],
          lastIndex: currentIndex,
        });
        await newModel.save();
      }

      // console.log("add tx record");

      //  save used tx
      const newData = new TxhashModel({ hash, amount });
      await newData.save();
      await Collection.findOneAndUpdate(
        { totalSupply: 2500 },
        {
          currentIndex: currentIndex,
        },
        {
          upsert: true,
          new: true,
        }
      );

      // console.log(`${minted} NFT minted`);
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ error: "Can not mint NFT" });
  }
};

export const claimNftsRewardController = async function (
  req: Request,
  res: Response
) {
  const { body } = req;
  const claimUser: string = body.address;
  if (!claimUser) return res.status(403).send("Missing user address!");
  try {
    const nfts = await getUserNfts(claimUser.toString());
    if (nfts) {
      // claim reward logic here

      const currentIndex = (await Collection.find({}))[0].currentIndex;
      let totalAmount: any = 0;
      await Promise.all(
        nfts.map(async (nft) => {
          let nftId = nft.split("#")[1];
          const res = await NftModel.findOne({ nftId: nftId });
          if (res) {
            let lastClaimedId = res.lastIndex;
            for (let j = lastClaimedId; j < currentIndex; j++) {
              totalAmount += (MINT_PRICE * LOALTY_FEE) / ((j + 1) * 100);
            }
          }
        })
      );

      if (totalAmount === 0) {
        res.status(200).send("No reward to claim");
        return;
      }

      // send sol amount to user address
      let transaction = new web3.Transaction();
      transaction = transaction.add(
        web3.SystemProgram.transfer({
          fromPubkey: new PublicKey(process.env.ADMIN_ADDR || ""),
          toPubkey: new PublicKey(claimUser),
          lamports: Math.ceil(totalAmount.toFixed(9) * 10 ** 9),
        })
      );

      let claimedAmount =
        (await ClaimHistory.findOne({ address: claimUser }))?.amount || 0;
      await ClaimHistory.findOneAndUpdate(
        { address: claimUser },
        {
          amount: totalAmount + claimedAmount,
        },
        {
          upsert: true,
          new: true,
        }
      );
      let blockhash = (await connection.getLatestBlockhash("confirmed"))
        .blockhash;
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(process.env.ADMIN_ADDR || "");
      await addAdminSignAndConfirm(transaction);

      await Promise.all(
        nfts.map(async (nft) => {
          let nftId = nft.split("#")[1];
          const res = await NftModel.findOne({ nftId: nftId });
          if (res) {
            await NftModel.findOneAndUpdate(
              { nftId: nft.split("#")[1] },
              {
                lastIndex: currentIndex,
              },
              { upsert: true, new: true }
            );
          }
        })
      );
      res.status(200).send("Successfully Claimed");
    } else {
      res.status(400).send("Bad request: nft not found!");
    }
  } catch (error) {
    res.status(500).send("Internal server error!");
    console.log(error);
  }
};

export const getClaimAmount = async (req: Request, res: Response) => {
  const address = req.query.address;
  if (!address)
    return res.status(403).send("Bad request: user address missing!");

  try {
    const nfts = await getUserNfts(address.toString());
    const currentIndex = (await Collection.find({}))[0].currentIndex;
    let totalAmount = 0;
    let totalClaimedAmount =
      (await ClaimHistory.findOne({ address: address }))?.amount || 0;
    await Promise.all(
      nfts.map(async (nft) => {
        let nftId = nft.split("#")[1];
        const res = await NftModel.findOne({ nftId: nftId });
        if (res) {
          let lastClaimedId = res.lastIndex;

          for (let j = lastClaimedId; j < currentIndex; j++) {
            totalAmount += (MINT_PRICE * LOALTY_FEE) / ((j + 1) * 100);
          }
        }
      })
    );

    res.status(200).send({
      totalAmount: totalAmount,
      count: nfts.length,
      currentIndex: currentIndex,
      totalClaimedAmount: totalClaimedAmount,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal server error!");
  }
};

export const getCurrentIndex = async (req: Request, res: Response) => {
  const currentIndex = (await Collection.find({}))[0].currentIndex;
  console.log(currentIndex);
  try {
    res.status(200).send({ totalSupply: currentIndex });
  } catch (e) {
    res.status(500).send("Internal server error!");
    console.log(e);
  }
};

export const getAdminWalletInfo = async (req: Request, res: Response) => {
  const balance = await connection.getBalance(
    new PublicKey(process.env.ADMIN_ADDR || "")
  );
  res
    .status(200)
    .send({ allowWallet: process.env.ALLOW_WALLET, treasuryVault: balance });
};

export const claimTreasuryVault = async (req: Request, res: Response) => {
  const { body } = req;
  const allowAddr: string = body.address;
  const balance = await connection.getBalance(
    new PublicKey(process.env.ADMIN_ADDR || "")
  );
  if (allowAddr === process.env.ALLOW_WALLET) {
    // send sol amount to admin
    let transaction = new web3.Transaction();
    transaction = transaction.add(
      web3.SystemProgram.transfer({
        fromPubkey: new PublicKey(process.env.ADMIN_ADDR || ""),
        toPubkey: new PublicKey(allowAddr),
        lamports: Math.floor(balance / 2),
      })
    );

    let { blockhash, lastValidBlockHeight } =
      await connection.getLatestBlockhash("confirmed");
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = new PublicKey(process.env.ADMIN_ADDR || "");
    await addAdminSignAndConfirm(transaction, blockhash, lastValidBlockHeight);

    res.status(200).send("Successfully Claimed");
  } else {
    res.status(400).send("You are not a admin!");
  }
};
