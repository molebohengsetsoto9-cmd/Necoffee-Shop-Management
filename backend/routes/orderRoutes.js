
const express = require("express");
const { randomUUID } = require("crypto");

const router = express.Router();

const ORDER_STATUSES = [
    "Pending",
    "Preparing",
    "Ready",
    "Collected"
];

module.exports = (redis) => {

    // GET all orders
    router.get("/", async (req, res) => {
        try {
            const keys = await redis.keys("order:*");
            const orders = [];

            for (const key of keys) {
                const data = await redis.get(key);
                if (data) orders.push(JSON.parse(data));
            }

            res.json({
                success: true,
                count: orders.length,
                orders
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // GET one order
    router.get("/:id", async (req, res) => {
        try {
            const order = await redis.get(`order:${req.params.id}`);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            res.json({
                success: true,
                order: JSON.parse(order)
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // POST: Place an order
    router.post("/", async (req, res) => {
        try {
            const { customerName, items } = req.body;

            if (
                typeof customerName !== "string" ||
                !customerName.trim() ||
                !Array.isArray(items) ||
                items.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Customer name and order items are required"
                });
            }

            let total = 0;
            const orderItems = [];

            for (const item of items) {
                if (
                    typeof item.menuItemId !== "string" ||
                    !Number.isInteger(item.quantity) ||
                    item.quantity < 1
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid product ID or quantity"
                    });
                }

                const product = await redis.get(
                    `menu:${item.menuItemId}`
                );

                if (!product) {
                    return res.status(404).json({
                        success: false,
                        message: "A selected menu item was not found"
                    });
                }

                const menuItem = JSON.parse(product);

                if (!menuItem.availability) {
                    return res.status(400).json({
                        success: false,
                        message: `${menuItem.name} is unavailable`
                    });
                }

                const subtotal = menuItem.price * item.quantity;

                total += subtotal;

                orderItems.push({
                    menuItemId: menuItem.id,
                    name: menuItem.name,
                    price: menuItem.price,
                    quantity: item.quantity,
                    subtotal
                });
            }

            const id = randomUUID();

            const order = {
                id,
                orderNumber: "ORD-" + id.slice(0, 8).toUpperCase(),
                customerName: customerName.trim(),
                items: orderItems,
                total,
                status: "Pending",
                createdAt: new Date().toISOString()
            };

            await redis.set(`order:${id}`, JSON.stringify(order));

            res.status(201).json({
                success: true,
                message: "Order placed successfully",
                order
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: error.message
            });
        }
    });

    // PATCH: Update order status
    router.patch("/:id/status", async (req, res) => {
        try {
            const key = `order:${req.params.id}`;
            const existing = await redis.get(key);

            if (!existing) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }

            const { status } = req.body;

            if (!ORDER_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order status"
                });
            }

            const order = JSON.parse(existing);
            order.status = status;

            await redis.set(key, JSON.stringify(order));

            res.json({
                success: true,
                message: "Order status updated successfully",
                order
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
