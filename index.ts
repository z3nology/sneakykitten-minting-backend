import express, { Express, Request, Response, Application } from 'express';
import cors from "cors";
import dotenv from 'dotenv';
import * as bodyParser from 'body-parser';
import userRoutes from './routes/userRoutes';
import mongoose from 'mongoose'
import cron from 'node-cron';
import Collection from './models/Collection';

// For env file
dotenv.config();

const whitelist = [
    '*', "http://localhost:3000","http://localhost:3001", "https://solgods.onrender.com/"
]

const corsOptions = {
    origin: whitelist,
    credentials: true,
    sameSite: 'none'
}

const app: Application = express();
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 8090;

app.get('/', (req: Request, res: Response) => {
    res.send(`Welcome to candy machine server 🍬🍭🍫`);
});

app.use("/user", userRoutes);

mongoose.set('strictQuery', true);
mongoose
    .connect(process.env.MONGO_URI || '')
    .then(async () => {
        console.log("Connected to the database! ❤️");

        app.listen(port, () => {
            console.log(`Server is Fire at http://localhost:${port}`);
        });
    })
    .catch((err) => {
        console.log("Cannot connect to the database! 😭", err);
        process.exit();
    });


    // function getRandomNumbers(min: number, max: number, count: number) {
    //     const numbers = Array.from({ length: max - min + 1 }, (_, index) => min + index);
    
    //     // Fisher-Yates shuffle algorithm
    //     for (let i = numbers.length - 1; i > 0; i--) {
    //         const j = Math.floor(Math.random() * (i + 1));
    //         [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    //     }
    
    //     return numbers.slice(0, count);
    // }
    
    // const rands = getRandomNumbers(1, 5000, 5000); // Adjust 10 to the desired count
    // const newCollection = async (rands: number[]) => {
    //     const collection = new Collection({ totalSupply: 5000, mintIDs: rands, currentIndex: 0 })
    //     collection.save();
    // }
    // newCollection(rands)
// Schedule the task to run every Sunday at 1:00 AM

