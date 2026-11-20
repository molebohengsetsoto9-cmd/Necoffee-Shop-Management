
const express = require("express");
const cors = require("cors");
const { createClient } = require("redis");
require("dotenv").config();

const orderRoutes = require("./routes/orderRoutes");
const menuRoutes = require("./routes/menuRoutes");
const app = express();

app.use(cors());
app.use(express.json());

const redis = createClient({
    url: process.env.REDIS_URL
});

redis.on("error", (error) => {
    console.error("Redis error:", error);
});

// Home route
app.get("/", (req, res) => {
    res.send("Coffee Shop Management Backend is running!");
});

// Health check
app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Coffee Shop API is working",
        database: redis.isReady ? "Connected" : "Disconnected"
    });
});

// Redis test
app.get("/api/test-redis", async (req, res) => {
    try {
        await redis.set("coffeeShopTest", "Setsoto");

        const result = await redis.get("coffeeShopTest");

        res.json({
            success: true,
            message: "Redis is working!",
            savedData: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Menu routes
app.use("/api/menu", menuRoutes(redis));
app.use("/api/orders", orderRoutes(redis));
// Not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found"
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await redis.connect();

        console.log("Connected to Redis successfully!");

        app.listen(PORT, () => {
            console.log(`Coffee Shop backend running at http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error("Failed to connect to Redis:", error.message);
        process.exit(1);
    }
}

startServer();
