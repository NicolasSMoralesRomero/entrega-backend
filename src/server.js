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
    .catch(error => console.error("Error en la conexión a la base de datos", error));

// Configuración Handlebars
app.engine('handlebars', engine({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const getProducts = async (limit, page, category) => {
    const query = category ? { category } : {};
    const products = await Product.find(query)
        .limit(limit)
        .skip((page - 1) * limit);
    const total = await Product.countDocuments(query);

    return {
        products,
        hasPrevPage: page > 1,
        hasNextPage: (page * limit) < total,
        total
    };
};

app.get('/api/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const page = parseInt(req.query.page, 10) || 1;
        const category = req.query.category || '';

        const { products, hasPrevPage, hasNextPage, total } = await getProducts(limit, page, category);

        res.json({
            products,
            hasPrevPage,
            hasNextPage,
            total
        });
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

    if (!quantity || quantity <= 0) {
        return res.status(400).json({ error: 'Cantidad inválida' });
    }

    try {
        const cart = await Cart.findById(req.params.cid);
        if (!cart) {
            return res.status(404).json({ error: 'Carrito no encontrado' });
        }

        const productIndex = cart.products.findIndex(p => p.productId.toString() === req.params.pid);

        if (productIndex !== -1) {
            cart.products[productIndex].quantity += quantity;
        } else {
            cart.products.push({ productId: req.params.pid, quantity });
        }

        await cart.save();
        res.status(200).json(cart.products); // Devolver productos del carrito actualizado
    } catch (err) {
        console.error('Error al agregar producto al carrito:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Rutas para vistas
app.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        let cart = await Cart.findOne({});

        if (!cart) {
            cart = new Cart({ products: [] });
            await cart.save();
        }

        res.render('home', {
            title: 'Home',
            products,
            cartProducts: cart.products
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/products', async (req, res) => {
    const { limit = 10, page = 1 } = req.query;
    
    try {
        const products = await Product.find()
            .skip((page - 1) * limit)
            .limit(parseInt(limit));
        
        const totalProducts = await Product.countDocuments();
        const hasPrevPage = page > 1;
        const hasNextPage = (page * limit) < totalProducts;

        res.render('products', {
            title: 'Lista de Productos',
            products,
            hasPrevPage,
            hasNextPage,
            prevPage: page - 1,
            nextPage: page + 1,
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/products/:pid', async (req, res) => {
    try {
        const product = await Product.findById(req.params.pid);
        if (product) {
            res.render('productDetail', {
                title: product.title,
                product
            });
        } else {
            res.status(404).send('Producto no encontrado');
        }
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

    socket.on('getProducts', async ({ page, limit, category }) => {
        const { products, hasPrevPage, hasNextPage } = await getProducts(limit, page, category);
        
        socket.emit('updateProducts', {
            products,
            hasPrevPage,
            hasNextPage
        });
    });

    socket.on('filterProducts', async ({ category, page, limit }) => {
        const { products, hasPrevPage, hasNextPage } = await getProducts(limit, page, category);
        
        socket.emit('updateProducts', {
            products,
            hasPrevPage,
            hasNextPage
        });
    });

    socket.on('addProduct', async (product) => {
        try {
            const newProduct = new Product(product);
            await newProduct.save();
            const products = await Product.find().lean();
            io.emit('updateProducts', { products });
        } catch (err) {
            console.error(err);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
