import { default as mongoose, Schema } from "mongoose";

const NftSchema = new Schema({
  nftId: {
    required: true,
    unique: true,
    type: String,
  },
  address: {
    required: true,
    type: String,
  },
  lastIndex: {
    type: Number,
    default: 1,
  },
  claimedAmount: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("nftdata", NftSchema);
