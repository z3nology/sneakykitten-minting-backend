import { default as mongoose, Schema } from 'mongoose'

const txhashSchema = new Schema(
    {
        hash: { type: String, require: true },
        amount: { type: Number, require: true },
    },
    {
        timestamps: {
            createdAt: "created_at", // Use `created_at` to store the created date
        },
    }
);

export default mongoose.model("txhash", txhashSchema);
