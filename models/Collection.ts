import { default as mongoose, Schema } from 'mongoose'

const Collection = new Schema({
    totalSupply: {
        required: true,
        type: Number
    },
    currentIndex: {
        required: true,
        type: Number
    }, 
    mintIDs: [{
        type: Number,
        required: true
    }],

});

export default mongoose.model("collection", Collection);

