const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const hubRoutes = require('./routes/hubs');
const pricingRoutes = require('./routes/pricing');
const driverRoutes = require('./routes/drivers');
const orderRoutes = require('./routes/orders');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'podalakur-transport-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/hubs', hubRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/orders', orderRoutes);

// NOTE: Live driver location tracking & order status push notifications should
// be added here using Socket.IO once you move to the mobile app stage:
//   const http = require('http').createServer(app);
//   const io = require('socket.io')(http);
//   io.on('connection', (socket) => { ... driver location updates, order events ... });
//   http.listen(...) instead of app.listen(...)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Podalakur Transport API running on port ${PORT}`);
});
