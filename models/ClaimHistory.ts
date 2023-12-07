import { default as mongoose, Schema } from 'mongoose'

const claimHistory = new Schema(
    {
        address: { type: String, require: true },
        amount: { type: Number, require: true, default: 0},
    },
    {
        timestamps: {
            createdAt: "created_at", // Use `created_at` to store the created date
        },
    }
);

export default mongoose.model("claimHistory", claimHistory);
