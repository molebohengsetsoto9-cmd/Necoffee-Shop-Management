
const express = require("express");
const { randomUUID } = require("crypto");

const router = express.Router();

module.exports = (redis) => {

    // GET: View all menu items
    router.get("/", async (req, res) => {
        try {
            const keys = await redis.keys("menu:*");
            const menu = [];

            for (const key of keys) {
                const item = await redis.get(key);
                if (item) {
                    menu.push(JSON.parse(item));
                }
            }

            res.status(200).json({
                success: true,
                count: menu.length,
                menu
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // GET: View one menu item
    router.get("/:id", async (req, res) => {
        try {
            const item = await redis.get(`menu:${req.params.id}`);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: "Menu item not found"
                });
            }

            res.status(200).json({
                success: true,
                menuItem: JSON.parse(item)
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // POST: Add a menu item
    router.post("/", async (req, res) => {
        try {
            const { name, description, price, category, availability } = req.body;

            if (
                typeof name !== "string" || !name.trim() ||
                typeof description !== "string" ||
                typeof category !== "string" || !category.trim() ||
                typeof price !== "number" ||
                !Number.isFinite(price) || price < 0 ||
                typeof availability !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide valid name, description, price, category and availability."
                });
            }

            const id = randomUUID();

            const newItem = {
                id,
                name: name.trim(),
                description: description.trim(),
                price,
                category: category.trim(),
                availability
            };

            await redis.set(`menu:${id}`, JSON.stringify(newItem));

            res.status(201).json({
                success: true,
                message: "Menu item added successfully",
                menuItem: newItem
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // PUT: Update a menu item
    router.put("/:id", async (req, res) => {
        try {
            const key = `menu:${req.params.id}`;
            const existing = await redis.get(key);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: "Menu item not found"
                });
            }

            const oldItem = JSON.parse(existing);
            const { name, description, price, category, availability } = req.body;

            const updatedItem = {
                ...oldItem,
                ...(name !== undefined ? { name: name.trim() } : {}),
                ...(description !== undefined ? { description } : {}),
                ...(price !== undefined ? { price } : {}),
                ...(category !== undefined ? { category: category.trim() } : {}),
                ...(availability !== undefined ? { availability } : {})
            };

            if (
                typeof updatedItem.name !== "string" || !updatedItem.name.trim() ||
                typeof updatedItem.description !== "string" ||
                typeof updatedItem.category !== "string" || !updatedItem.category.trim() ||
                typeof updatedItem.price !== "number" ||
                !Number.isFinite(updatedItem.price) || updatedItem.price < 0 ||
                typeof updatedItem.availability !== "boolean"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid menu item details."
                });
            }

            await redis.set(key, JSON.stringify(updatedItem));

            res.status(200).json({
                success: true,
                message: "Menu item updated successfully",
                menuItem: updatedItem
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // DELETE: Remove a menu item
    router.delete("/:id", async (req, res) => {
        try {
            const key = `menu:${req.params.id}`;
            const result = await redis.del(key);

            if (result === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Menu item not found"
                });
            }

            res.status(200).json({
                success: true,
                message: "Menu item deleted successfully"
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    return router;
};
