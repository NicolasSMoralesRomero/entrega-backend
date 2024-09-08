const express = require('express');
const router = express.Router();
const fs = require('fs');

const PRODUCTS_FILE = __dirname + '/../productos.json';

router.get('/', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const products = JSON.parse(data);
    const limit = parseInt(req.query.limit, 10);
    if (!isNaN(limit)) {
      res.json(products.slice(0, limit));
    } else {
      res.json(products);
    }
  });
});

router.get('/:pid', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const products = JSON.parse(data);
    const product = products.find(p => p.id === req.params.pid);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: 'Producto no encontrado' });
    }
  });
});

router.post('/', (req, res) => {
  const { title, description, code, price, status = true, stock, category, thumbnails } = req.body;
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const products = JSON.parse(data);
    const newId = (products.length ? Math.max(...products.map(p => Number(p.id))) + 1 : 1).toString();
    const newProduct = { id: newId, title, description, code, price, status, stock, category, thumbnails };
    products.push(newProduct);
    fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.status(201).json(newProduct);
    });
  });
});

router.put('/:pid', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const products = JSON.parse(data);
    const index = products.findIndex(p => p.id === req.params.pid);
    if (index === -1) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    products[index] = { ...products[index], ...req.body };
    fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json(products[index]);
    });
  });
});

router.delete('/:pid', (req, res) => {
  fs.readFile(PRODUCTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const products = JSON.parse(data);
    const updatedProducts = products.filter(p => p.id !== req.params.pid);
    fs.writeFile(PRODUCTS_FILE, JSON.stringify(updatedProducts, null, 2), err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      console.log(`Se elimino el producto con id ${req.params.pid}`)
      res.status(204).end();
    });
  });
});

module.exports = router;

