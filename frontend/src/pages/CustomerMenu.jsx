import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom'; // ✅ react-router-dom থেকে ইমপোর্ট করুন
import { useSocket } from '../context/SocketContext';
import API from '../services/api';
import { ShoppingBag, Bell } from 'lucide-react';

const CustomerMenu = () => {
  const { tableId } = useParams();
  const socket = useSocket();
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);

  useEffect(() => {
    // 1. Fetch Menu Items
    API.get('/menu')
      .then((res) => setCategories(res.data))
      .catch((err) => console.error(err));

    // 2. Join Socket Room for this specific table
    if (socket) {
      socket.emit('join_table', tableId);

      // Listen for order status updates from Kitchen/Admin
      socket.on('order_status_updated', (data) => {
        setOrderStatus(data.status);
      });
    }
  }, [socket, tableId]);

  // Cart Handler
  const addToCart = (item) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === item.id);
      if (existing) {
        return prevCart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
  };

  // Service Request Handler (Call Waiter / Water / Bill)
  const sendServiceRequest = async (type) => {
    try {
      await API.post('/service-requests', { tableId, type });
      alert('Request sent to waiter!');
    } catch (err) {
      alert('Failed to send request');
    }
  };

  // Place Order Handler
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    const totalAmount = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const orderData = {
      tableId,
      items: cart.map((i) => ({ menuItemId: i.id, quantity: i.quantity, unitPrice: i.price })),
      totalAmount,
    };

    try {
      await API.post('/orders', orderData);
      setCart([]);
      setIsCartOpen(false);
      setOrderStatus('PENDING');
      alert('Order placed successfully!');
    } catch (err) {
      alert('Failed to place order');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-orange-600 text-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold">Restaurant Menu</h1>
          <p className="text-sm opacity-90">Table No: <span className="font-bold underline">{tableId}</span></p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => sendServiceRequest('CALL_WAITER')}
            className="bg-orange-700 p-2 rounded-full hover:bg-orange-800 transition"
            title="Call Waiter"
          >
            <Bell size={20} />
          </button>
        </div>
      </div>

      {/* Order Status Banner */}
      {orderStatus && (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 m-4 rounded shadow-sm">
          <p className="font-bold">Order Status: <span className="uppercase">{orderStatus}</span></p>
        </div>
      )}

      {/* Categories & Items */}
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {categories.map((cat) => (
          <div key={cat.id} className="space-y-3">
            <h2 className="text-lg font-bold text-gray-800 border-b pb-1">{cat.name}</h2>
            <div className="grid grid-cols-1 gap-3">
              {cat.menuItems?.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-800">{item.name}</h3>
                    <p className="text-sm text-gray-500">{item.description}</p>
                    <p className="text-orange-600 font-bold mt-1">৳{item.price}</p>
                  </div>
                  <button
                    onClick={() => addToCart(item)}
                    className="bg-orange-50 text-orange-600 border border-orange-200 px-4 py-2 rounded-lg font-semibold hover:bg-orange-600 hover:text-white transition"
                  >
                    + Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-11/12 max-w-md">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-orange-600 text-white p-4 rounded-xl font-bold shadow-lg flex justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag />
              <span>{cart.reduce((a, c) => a + c.quantity, 0)} Items</span>
            </div>
            <span>View Cart (৳{cart.reduce((a, c) => a + c.price * c.quantity, 0)})</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white w-full max-w-md rounded-t-2xl p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-bold">Your Order</h2>
              <button onClick={() => setIsCartOpen(false)} className="text-gray-500 font-bold text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-gray-500">৳{item.price} x {item.quantity}</p>
                  </div>
                  <p className="font-bold">৳{item.price * item.quantity}</p>
                </div>
              ))}
            </div>
              <button
              onClick={handlePlaceOrder}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-700 transition"
            >
              Confirm & Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;