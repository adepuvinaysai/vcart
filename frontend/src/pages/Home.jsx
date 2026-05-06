import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { BACKEND_URL } from '../config';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2
});

const formatPrice = (cents) => currencyFormatter.format(cents / 100);

const categoryHighlights = [
  { label: 'Fashion', subtitle: 'Trendy styles', color: '#f97316' },
  { label: 'Electronics', subtitle: 'Top gadgets', color: '#2563eb' },
  { label: 'Home & Living', subtitle: 'Daily essentials', color: '#0f766e' },
  { label: 'Beauty', subtitle: 'Fresh picks', color: '#be185d' }
];

export default function Home() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('vcart_cart') || '[]');
    } catch {
      return [];
    }
  });
  const [email, setEmail] = useState(user?.email || '');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('featured');
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');

  useEffect(() => {
    setSearchTerm(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/products`)
      .then((res) => res.json())
      .then(setProducts)
      .catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('vcart_cart', JSON.stringify(cart));
  }, [cart]);

  const categories = useMemo(
    () => ['All', ...new Set(products.map((product) => product.category || 'Uncategorized'))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = searchTerm
        ? product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          product.description.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const sortedProducts = useMemo(() => {
    const items = [...filteredProducts];
    if (sortBy === 'price_low') {
      return items.sort((a, b) => a.price - b.price);
    }
    if (sortBy === 'price_high') {
      return items.sort((a, b) => b.price - a.price);
    }
    if (sortBy === 'rating') {
      return items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    return items;
  }, [filteredProducts, sortBy]);

  const highlightedProducts = products.slice(0, 6);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addToCart = (product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setMessage(`${product.name} added to cart.`);
  };

  const updateQuantity = (productId, delta) => {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId) => {
    setCart((current) => current.filter((item) => item.id !== productId));
  };

  const createCheckout = async (items) => {
    setMessage('');
    if (!items.length) {
      setMessage('Add items to the cart before checkout.');
      return;
    }

    if (!user && !email) {
      setMessage('Please enter your email before checkout.');
      return;
    }

    setCheckoutLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ id, quantity }) => ({ id, quantity })),
          email: user?.email || email
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || 'Unable to create checkout session.');
        setCheckoutLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch (error) {
      console.error(error);
      setMessage('Checkout failed. Please refresh and try again.');
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = () => createCheckout(cart);
  const handleQuickBuy = (product) => createCheckout([{ id: product.id, quantity: 1 }]);

  return (
    <div className="home-shell">
      <section className="hero-banner">
        <div className="hero-copy">
          <p className="eyebrow">Discover Deals</p>
          <h1>Shop the latest collections, flash sales and top brands.</h1>
          <p>Browse categories, compare prices, and checkout instantly with Stripe.</p>
          <div className="hero-actions">
            <button onClick={() => window.scrollTo({ top: 650, behavior: 'smooth' })}>Shop now</button>
            <button className="secondary">See offers</button>
          </div>
        </div>
        <div className="hero-panels">
          {categoryHighlights.map((highlight) => (
            <article key={highlight.label} className="hero-panel" style={{ borderColor: highlight.color }}>
              <strong>{highlight.label}</strong>
              <p>{highlight.subtitle}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="category-strip">
        <div className="category-heading">
          <h2>Shop by category</h2>
          <p>Fast delivery | Great prices | Verified items</p>
        </div>
        <div className="category-chips">
          {categories.map((category) => (
            <button
              key={category}
              className={category === selectedCategory ? 'category-chip active' : 'category-chip'}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="home-layout">
        <main className="product-panel">
          <div className="product-toolbar">
            <div>
              <h2>{selectedCategory === 'All' ? 'Trending Products' : selectedCategory}</h2>
              <p>{filteredProducts.length} items matched</p>
            </div>
            <div className="sort-controls">
              <label>
                Sort by
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="price_low">Price: Low to high</option>
                  <option value="price_high">Price: High to low</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
            </div>
          </div>

          <div className="product-grid">
            {sortedProducts.map((product) => (
              <article key={product.id} className="product-card">
                <div className="product-image-wrap">
                  <img src={product.image} alt={product.name} />
                  {product.offer && <span className="offer-pill">{product.offer}</span>}
                </div>
                <div className="product-body">
                  <div className="product-meta">
                    <span className="product-category">{product.category}</span>
                    <strong>{product.name}</strong>
                  </div>
                  <p>{product.description}</p>
                  <div className="price-row">
                    <div>
                      <strong>{formatPrice(product.price)}</strong>
                      {product.originalPrice && (
                        <span className="original-price">{formatPrice(product.originalPrice)}</span>
                      )}
                    </div>
                    <span className="rating-pill">★ {product.rating?.toFixed(1) || '4.5'}</span>
                  </div>
                  <div className="card-actions">
                    <button onClick={() => addToCart(product)}>Add to cart</button>
                    <button className="secondary" onClick={() => handleQuickBuy(product)}>Buy now</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>

        <aside className="cart-panel">
          <div className="cart-header">
            <div>
              <h2>Shopping cart</h2>
              <p>{cartCount} item{cartCount === 1 ? '' : 's'}</p>
            </div>
            <span className="cart-badge">Best Prices</span>
          </div>

          <div className="cart-info">
            <p>Secure checkout, fast delivery and order tracking for every purchase.</p>
          </div>

          {!user && (
            <div className="auth-email-input">
              <label>
                Checkout email
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </label>
            </div>
          )}

          <div className="cart-items">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div>
                    <strong>{item.name}</strong>
                    <p>{formatPrice(item.price)} × {item.quantity}</p>
                  </div>
                  <div className="cart-actions">
                    <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                    <button className="remove" onClick={() => removeItem(item.id)}>Remove</button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-cart">
                <p>Your cart is empty. Add items to start shopping.</p>
              </div>
            )}
          </div>

          <div className="cart-footer">
            <div className="summary-row">
              <span>Estimated total</span>
              <strong>{formatPrice(cartTotal)}</strong>
            </div>
            <button className="checkout-button" disabled={!cart.length || checkoutLoading} onClick={handleCheckout}>
              {checkoutLoading ? 'Starting checkout...' : 'Checkout securely'}
            </button>
            <p className="checkout-note">Trusted Stripe payment. No hidden fees.</p>
          </div>
        </aside>
      </div>

      {message && (
        <div className="toast-banner">
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}
