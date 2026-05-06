import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { BACKEND_URL } from '../config';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const formatPrice = (cents) => currencyFormatter.format(cents / 100);

export default function Orders() {
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      const response = await fetch(`${BACKEND_URL}/api/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Unable to load orders.');
        return;
      }

      setOrders(await response.json());
    };

    fetchOrders().catch((err) => {
      console.error(err);
      setError('Failed to load orders.');
    });
  }, [token, user]);

  if (!user) {
    return (
      <main className="app-shell auth-page">
        <div className="auth-card">
          <h2>Your orders</h2>
          <p>Please log in to view your purchase history.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell orders-page">
      <div className="section-header">
        <h2>My Orders</h2>
        <p>Track shipping status, payments, and order details in one place.</p>
      </div>
      {error && <div className="banner warning"><p>{error}</p></div>}
      {orders.length ? (
        <div className="orders-grid">
          {orders.map((order) => (
            <article key={order.id} className="order-card">
              <div className="order-summary-header">
                <div>
                  <p className="label">Order ID</p>
                  <strong>{order.id}</strong>
                </div>
                <div className="order-status-row">
                  <span className={`status-pill ${order.status}`}>{order.status}</span>
                  <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="order-detail-row">
                <p><span className="label">Total</span> {formatPrice(order.amountTotal)}</p>
                <p><span className="label">Items</span> {order.items.length}</p>
              </div>
              <div className="order-items-list">
                {order.items.map((item) => (
                  <div key={item.productId} className="order-item-row">
                    <span>{item.productId}</span>
                    <span>{item.quantity} × {formatPrice(item.price)}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <p>No orders found yet. Complete a purchase to see your order history here.</p>
        </div>
      )}
    </main>
  );
}
