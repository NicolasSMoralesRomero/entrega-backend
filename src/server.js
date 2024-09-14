const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');

const productosRouter = require('./routes/products.js');
const cartsRouter = require('./routes/carts.js');

const app = express();
const PORT = 8080;
const server = http.createServer(app);
const io = socketIo(server); // Configuració Socket.IO

// Configuración Handlebars
app.engine('handlebars', engine({
    defaultLayout: 'main',
}));
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/products', productosRouter);
app.use('/api/carts', cartsRouter);

const getProducts = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, 'productos.json'), 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(JSON.parse(data));
        });
    });
};

const getCart = (cartId) => {
    return new Promise((resolve, reject) => {
        fs.readFile(path.join(__dirname, 'carrito.json'), 'utf8', (err, data) => {
            if (err) {
                return reject(err);
            }
            const carts = JSON.parse(data);
            const cart = carts.find(c => c.id === cartId);
            resolve(cart ? cart.products : []);
        });
    });
};

// Rutas para vistas
app.get('/', async (req, res) => {
    try {
        const products = await getProducts();
        const cartProducts = await getCart('1');
        res.render('home', { 
            title: 'Home', 
            products, 
            cartProducts 
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

    getProducts().then(products => {
        socket.emit('updateProducts', products);
    }).catch(err => {
        console.error(err);
    });

    socket.on('addProduct', async (product) => {
        try {
            const products = await getProducts();
            const newId = (products.length ? Math.max(...products.map(p => Number(p.id))) + 1 : 1).toString();
            const newProduct = { id: newId, ...product };
            products.push(newProduct);

            fs.writeFile(path.join(__dirname, 'productos.json'), JSON.stringify(products, null, 2), (err) => {
                if (err) {
                    console.error(err);
                    return;
                }
                io.emit('updateProducts', products);
            });
        } catch (err) {
            console.error(err);
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
