const express = require('express');
const router = express.Router();
const Product = require('../models/product.model.js');

// Función de validación
const validateProduct = (product) => {
    const { title, price, category } = product;
    if (!title || !price || !category) {
        return { isValid: false, error: 'Faltan parámetros requeridos' };
    }
    return { isValid: true };
};

router.get('/', async (req, res) => {
    try {
        const { limit = 10, page = 1, sort, query } = req.query;
        const parsedLimit = parseInt(limit);
        const parsedPage = parseInt(page);
        const filter = {};
        
        if (query) {
            filter.title = { $regex: query, $options: 'i' };
        }

        const sortOptions = {};
        if (sort === 'asc') sortOptions.price = 1;
        else if (sort === 'desc') sortOptions.price = -1;

        const products = await Product.find(filter)
            .sort(sortOptions)
            .limit(parsedLimit)
            .skip((parsedPage - 1) * parsedLimit);

        const total = await Product.countDocuments(filter);
        const totalPages = Math.ceil(total / parsedLimit);

        res.json({
            status: 'success',
            payload: products,
            totalPages,
            prevPage: parsedPage > 1 ? parsedPage - 1 : null,
            nextPage: parsedPage < totalPages ? parsedPage + 1 : null,
            page: parsedPage,
            hasPrevPage: parsedPage > 1,
            hasNextPage: parsedPage < totalPages,
            prevLink: parsedPage > 1 ? `/api/products?page=${parsedPage - 1}&limit=${parsedLimit}` : null,
            nextLink: parsedPage < totalPages ? `/api/products?page=${parsedPage + 1}&limit=${parsedLimit}` : null,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Obtener un producto por ID
router.get('/:pid', async (req, res) => {
    try {
        const product = await Product.findById(req.params.pid);
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Crear un nuevo producto
router.post('/', async (req, res) => {
    const { isValid, error } = validateProduct(req.body);
    if (!isValid) {
        return res.status(400).json({ error });
    }

    try {
        const newProduct = new Product(req.body);
        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar el producto' });
    }
});

// Actualizar un producto por ID
router.put('/:pid', async (req, res) => {
    const { isValid, error } = validateProduct(req.body);
    if (!isValid) {
        return res.status(400).json({ error });
    }

    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.pid, req.body, { new: true });
        if (updatedProduct) {
            res.json(updatedProduct);
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Eliminar un producto por ID
router.delete('/:pid', async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.pid);
        if (deletedProduct) {
            res.status(204).end();
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;