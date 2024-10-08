const express = require('express');
const router = express.Router();
const Cart = require('../models/cart.model.js');
const Product = require('../models/product.model.js');
const mongoose = require('mongoose');

// Crear un nuevo carrito
router.post('/', async (req, res) => {
    try {
        const newCart = new Cart({ products: [] });
        await newCart.save();
        res.status(201).json(newCart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Obtener productos de un carrito específico
router.get('/:cid', async (req, res) => {
    const { cid } = req.params;

    if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res.status(400).json({ error: 'ID de carrito no válido' });
    }

    try {
        // Usa 'products.productId' en lugar de 'products.productId'
        const cart = await Cart.findById(cid).populate('products.productId');
        if (cart) {
            res.json(cart.products);
        } else {
            res.status(404).json({ error: 'Carrito no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Agregar un producto a un carrito específico
router.post('/:cid/product/:pid', async (req, res) => {
    const { cid, pid } = req.params;
    const { quantity } = req.body;

    // Validaciones de ID
    if (!mongoose.Types.ObjectId.isValid(cid)) {
        return res.status(400).json({ error: 'ID de carrito no válido' });
    }
    if (!mongoose.Types.ObjectId.isValid(pid)) {
        return res.status(400).json({ error: 'ID de producto no válido' });
    }
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
    }

    try {
        const productExists = await Product.findById(pid);

        if (!productExists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const cart = await Cart.findById(cid);

        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.toString() === pid);

        if (productIndex !== -1) {
            cart.products[productIndex].quantity += quantity;
        } else {
            cart.products.push({ productId: pid, quantity });
        }

        await cart.save();
        res.status(200).json(cart.products);
    } catch (err) {
        console.error('Error al agregar producto al carrito:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



module.exports = router;
