const express = require('express');
const fs = require('fs');
const router = express.Router();

const CARTS_FILE = __dirname + '/../carrito.json';

router.post('/', (req, res) => {
  fs.readFile(CARTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const carts = JSON.parse(data);
    const newId = (carts.length > 0 ? Math.max(...carts.map(c => Number(c.id))) + 1 : 1).toString();
    const newCart = { id: newId, products: [] };
    carts.push(newCart);
    fs.writeFile(CARTS_FILE, JSON.stringify(carts, null, 2), err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.status(201).json(newCart);
    });
  });
});

router.get('/:cid', (req, res) => {
  fs.readFile(CARTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const carts = JSON.parse(data);
    const cart = carts.find(c => c.id === req.params.cid);
    if (cart) {
      res.json(cart.products);
    } else {
      res.status(404).json({ error: 'Carrito no encontrado' });
    }
  });
});

router.post('/:cid/product/:pid', (req, res) => {
  const { cid, pid } = req.params;
  const { quantity } = req.body;
  fs.readFile(CARTS_FILE, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
    const carts = JSON.parse(data);
    const cart = carts.find(c => c.id === cid);
    if (cart) {
      const productIndex = cart.products.findIndex(p => p.product === pid);
      if (productIndex !== -1) {
        cart.products[productIndex].quantity += quantity;
      } else {
        cart.products.push({ product: pid, quantity });
      }
      fs.writeFile(CARTS_FILE, JSON.stringify(carts, null, 2), err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json(cart.products);
      });
    } else {
      res.status(404).json({ error: 'Carrito no encontrado' });
    }
  });
});

module.exports = router;

