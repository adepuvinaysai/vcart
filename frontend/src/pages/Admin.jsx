import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { BACKEND_URL } from '../config';

export default function Admin() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: 0, currency: 'usd', image: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, ordersRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/admin/products`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${BACKEND_URL}/api/admin/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (productsRes.ok) {
        setProducts(await productsRes.json());
      }
      if (ordersRes.ok) {
        setOrders(await ordersRes.json());
      }
    };

    fetchData().catch(console.error);
  }, [token]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description,
          price: Number(newProduct.price),
          currency: newProduct.currency,
          image: newProduct.image
        })
      });

      if (!response.ok) {
        const body = await response.json();
        setError(body.error || 'Unable to create product.');
        return;
      }

      const product = await response.json();
      setProducts((current) => [...current, product]);
      setNewProduct({ name: '', description: '', price: 0, currency: 'usd', image: '' });
    } catch (err) {
      console.error(err);
      setError('Unable to create product.');
    }
  };

  const handleDelete = async (productId) => {
    await fetch(`${BACKEND_URL}/api/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setProducts((current) => current.filter((product) => product.id !== productId));
  };

  return (
    <div className="admin-page">
      <section className="admin-panel">
        <div className="section-header">
          <h2>Admin dashboard</h2>
          <p>Manage products and review orders.</p>
        </div>

        {error && <div className="banner warning"><p>{error}</p></div>}

        <div className="admin-grid">
          <div className="admin-card">
            <h3>Add product</h3>
            <form onSubmit={handleCreate} className="admin-form">
              <label>
                Name
                <input value={newProduct.name} onChange={(event) => setNewProduct({ ...newProduct, name: event.target.value })} required />
              </label>
              <label>
                Description
                <textarea value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })} rows="3" />
              </label>
              <label>
                Price (cents)
                <input type="number" value={newProduct.price} onChange={(event) => setNewProduct({ ...newProduct, price: event.target.value })} required />
              </label>
              <label>
                Image URL
                <input value={newProduct.image} onChange={(event) => setNewProduct({ ...newProduct, image: event.target.value })} required />
              </label>
              <button type="submit">Create product</button>
            </form>
          </div>

          <div className="admin-card">
            <h3>Current products</h3>
            <div className="admin-list">
              {products.map((product) => (
                <div key={product.id} className="admin-list-item">
                  <div>
                    <strong>{product.name}</strong>
                    <p>{product.description}</p>
                  </div>
                  <button className="remove" onClick={() => handleDelete(product.id)}>Delete</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="order-panel">
        <div className="section-header">
          <h3>Orders</h3>
        </div>
        <div className="admin-list">
          {orders.map((order) => (
            <div key={order.id} className="admin-list-item order-item">
              <div>
                <p><strong>Order:</strong> {order.id}</p>
                <p><strong>Email:</strong> {order.email || 'Unknown'}</p>
                <p><strong>Status:</strong> {order.status}</p>
                <p><strong>Total:</strong> ${(order.amountTotal / 100).toFixed(2)}</p>
                <div className="order-items">
                  {order.items.map((item) => (
                    <p key={item.id}>• {item.quantity} × {item.productId}</p>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
