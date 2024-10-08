const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const http = require('http');
const socketIo = require('socket.io');

const Product = require('./models/product.model.js');
const Cart = require('./models/cart.model.js');

const app = express();
const PORT = 8080;
const server = http.createServer(app);
const io = socketIo(server);

// Conexión con la base de datos
mongoose.connect("mongodb+srv://nicomorales:C0hsHN0Of0oXC5aq@cluster0.rqnge.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => { console.log("Conectado a la base de datos") })
    .catch(error => console.error("Error en la conexion a la base de datos", error));

// Configuración Handlebars
app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas para productos
app.get('/api/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 0;
        const products = await Product.find().limit(limit);
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/products/:pid', async (req, res) => {
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

app.post('/api/products', async (req, res) => {
    const { title, description, price, status, stock, category } = req.body;

    // Validar datos de entrada
    if (!title || !description || !price || !category) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    try {
        const newProduct = new Product(req.body);
        await newProduct.save();
        res.status(201).json(newProduct);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.put('/api/products/:pid', async (req, res) => {
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

app.delete('/api/products/:pid', async (req, res) => {
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

// Rutas para carritos
app.post('/api/carts', async (req, res) => {
    try {
        const newCart = new Cart({ products: [] });
        await newCart.save();
        res.status(201).json(newCart);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/carts/:cid', async (req, res) => {
    try {
        const cart = await Cart.findById(req.params.cid).populate('products.productId');
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

app.post('/api/carts/:cid/product/:pid', async (req, res) => {
    const { quantity } = req.body;

    // Validar la cantidad
    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
    }

    try {
        // Buscar el carrito
        const cart = await Cart.findById(req.params.cid);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        // Verificar si el producto ya está en el carrito
        const productIndex = cart.products.findIndex(p => p.productId.toString() === req.params.pid);

        if (productIndex !== -1) {
            // Si el producto ya está en el carrito, aumentar la cantidad
            cart.products[productIndex].quantity += quantity;
        } else {
            // Si no está en el carrito, agregarlo
            cart.products.push({ productId: req.params.pid, quantity });
        }

        // Guardar los cambios en el carrito
        await cart.save();

        // Devolver los productos del carrito
        res.status(200).json(cart.products);
    } catch (err) {
        console.error('Error al agregar producto al carrito:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Rutas para vistas
app.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        const cartProducts = await Cart.findById('1').populate('products.productId');
        res.render('home', {
            title: 'Home',
            products,
            cartProducts: cartProducts ? cartProducts.products : []
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/realtimeproducts', (req, res) => {
    res.render('realTimeProducts', { title: 'Real Time Products' });
});

// Configuración WebSocket
io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    Product.find().then(products => {
        socket.emit('updateProducts', products);
    }).catch(err => {
        console.error(err);
    });

    socket.on('addProduct', async (product) => {
        try {
            const newProduct = new Product(product);
            await newProduct.save();
            const products = await Product.find();
            io.emit('updateProducts', products);
        } catch (err) {
            console.error(err);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
