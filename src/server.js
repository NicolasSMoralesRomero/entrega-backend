const express = require("express")
const productosRouter = require('./routes/products.js')
const cartsRouter = require('./routes/carts.js')

const app = express()
const PORT = 8080

app.use(express.json())
app.use(express.urlencoded({ extended:true }))

app.use('/api/products', productosRouter)
app.use('/api/carts', cartsRouter)


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
