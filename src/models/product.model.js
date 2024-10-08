const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    status: { type: Boolean, default: true },
    stock: { type: Number, required: true, min: 0 },
    category: { type: String, required: true }
});

const productModel = mongoose.model('productos', productSchema);

module.exports = productModel;