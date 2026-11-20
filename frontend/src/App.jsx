
import { useEffect, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const productImages = {
  "green tea":
    "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=800&q=80",
  cappuccino:
    "https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80",
  "chocolate muffin":
    "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?auto=format&fit=crop&w=800&q=80",
};

function getProductImage(name) {
  const key = name?.toLowerCase().trim();
  return productImages[key] || 
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80";
}

function App() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [page, setPage] = useState("home");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "Coffee",
    availability: true,
  });

  const [editingId, setEditingId] = useState(null);

  async function loadMenu() {
    try {
      const response = await fetch(`${API}/menu`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load menu");
      setMenu(Array.isArray(data) ? data : data.menu || []);
    } catch (error) {
      setMessage("Menu error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch(`${API}/orders`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not load orders");
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (error) {
      setMessage("Orders error: " + error.message);
    }
  }

  useEffect(() => {
    loadMenu();
    loadOrders();
  }, []);

  function addToCart(item) {
    if (!item.availability) {
      setMessage("This product is currently unavailable.");
      return;
    }

    setCart((previous) => {
      const found = previous.find((entry) => entry.id === item.id);

      if (found) {
        return previous.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry
        );
      }

      return [...previous, { ...item, quantity: 1 }];
    });

    setMessage(`${item.name} added to cart.`);
  }

  function changeQuantity(id, amount) {
    setCart((previous) =>
      previous
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + amount }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  async function checkout(event) {
    event.preventDefault();

    if (!customerName.trim() || cart.length === 0) {
      setMessage("Enter your name and add products to your cart.");
      return;
    }

    try {
      const response = await fetch(`${API}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          items: cart.map((item) => ({
            menuItemId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Order could not be placed.");
      }

      setMessage(
        `Order placed successfully! Your order number is ${
          data.orderNumber || data.order?.orderNumber || "confirmed"
        }`
      );

      setCart([]);
      setCustomerName("");
      loadOrders();
      setPage("home");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function saveMenuItem(event) {
    event.preventDefault();

    const url = editingId
      ? `${API}/menu/${editingId}`
      : `${API}/menu`;

    try {
      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save product.");
      }

      setMessage(editingId ? "Product updated." : "Product added.");
      setForm({
        name: "",
        description: "",
        price: "",
        category: "Coffee",
        availability: true,
      });
      setEditingId(null);
      loadMenu();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function editMenuItem(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      availability: item.availability,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteMenuItem(id) {
    if (!window.confirm("Are you sure you want to delete this product?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/menu/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Could not delete product.");
      }

      setMessage("Product deleted.");
      loadMenu();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateOrderStatus(id, status) {
    try {
      const response = await fetch(`${API}/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update order.");
      }

      setMessage("Order status updated.");
      loadOrders();
    } catch (error) {
      setMessage(error.message);
    }
  }

  const today = new Date().toLocaleDateString();

  const todaysOrders = orders.filter(
    (order) => new Date(order.createdAt).toLocaleDateString() === today
  );

  const dailySales = todaysOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  return (
    <div className="app">
      <header className="header">
        <div className="logo">☕ Coffee House</div>

        <nav>
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("menu")}>Menu</button>
          <button onClick={() => setPage("cart")}>
            Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
          <button onClick={() => setPage("staff")}>Staff Dashboard</button>
        </nav>
      </header>

      {message && (
        <div className="message">
          {message}
          <button onClick={() => setMessage("")}>×</button>
        </div>
      )}

      {page === "home" && (
        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">WELCOME TO COFFEE HOUSE</p>
            <h1>Your Favourite Coffee, Made Fresh</h1>
            <p>
              Enjoy delicious coffee, refreshing tea and freshly baked treats.
            </p>
            <button className="primary-button" onClick={() => setPage("menu")}>
              Explore Our Menu
            </button>
          </div>
        </section>
      )}

      {(page === "home" || page === "menu") && (
        <section className="section">
          <h2>{page === "home" ? "Our Popular Menu" : "Our Menu"}</h2>
          <p className="section-description">
            Freshly prepared drinks and delicious treats.
          </p>

          {loading ? (
            <p>Loading menu...</p>
          ) : menu.length === 0 ? (
            <p>No products available yet. Add products in the staff dashboard.</p>
          ) : (
            <div className="product-grid">
              {menu.map((item) => (
                <article className="product-card" key={item.id}>
                  <img
                    src={getProductImage(item.name)}
                    alt={item.name}
                    className="product-image"
                    onError={(event) => {
                      event.currentTarget.src =
                        "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80";
                    }}
                  />

                  <div className="product-info">
                    <span className="category">{item.category}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>

                    <div className="product-bottom">
                      <strong>M{Number(item.price).toFixed(2)}</strong>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.availability}
                      >
                        {item.availability ? "Add to Cart" : "Unavailable"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {page === "cart" && (
        <section className="section cart-section">
          <h2>Your Shopping Cart</h2>

          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <>
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <img src={getProductImage(item.name)} alt={item.name} />
                  <div className="cart-details">
                    <h3>{item.name}</h3>
                    <p>M{Number(item.price).toFixed(2)}</p>
                    <div className="quantity-controls">
                      <button onClick={() => changeQuantity(item.id, -1)}>
                        -
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => changeQuantity(item.id, 1)}>
                        +
                      </button>
                    </div>
                  </div>
                  <strong>
                    M{(Number(item.price) * item.quantity).toFixed(2)}
                  </strong>
                </div>
              ))}

              <h3 className="cart-total">Total: M{total.toFixed(2)}</h3>

              <form className="checkout-form" onSubmit={checkout}>
                <h3>Customer Details</h3>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  required
                />
                <button className="primary-button" type="submit">
                  Place Order
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {page === "staff" && (
        <section className="section">
          <h2>Staff Dashboard</h2>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>{menu.length}</h3>
              <p>Menu Products</p>
            </div>
            <div className="stat-card">
              <h3>{todaysOrders.length}</h3>
              <p>Today's Orders</p>
            </div>
            <div className="stat-card">
              <h3>M{dailySales.toFixed(2)}</h3>
              <p>Today's Sales</p>
            </div>
          </div>

          <div className="staff-form">
            <h3>{editingId ? "Update Product" : "Add New Product"}</h3>

            <form onSubmit={saveMenuItem}>
              <input
                type="text"
                placeholder="Product name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />

              <input
                type="text"
                placeholder="Description"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />

              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Price"
                value={form.price}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value })
                }
                required
              />

              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
              >
                <option>Coffee</option>
                <option>Tea</option>
                <option>Pastry</option>
                <option>Other</option>
              </select>

              <label className="availability-label">
                <input
                  type="checkbox"
                  checked={form.availability}
                  onChange={(e) =>
                    setForm({ ...form, availability: e.target.checked })
                  }
                />
                Available
              </label>

              <button className="primary-button" type="submit">
                {editingId ? "Update Product" : "Add Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm({
                      name: "",
                      description: "",
                      price: "",
                      category: "Coffee",
                      availability: true,
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </form>
          </div>

          <h3>Manage Menu</h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Category</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menu.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>M{Number(item.price).toFixed(2)}</td>
                    <td>{item.category}</td>
                    <td>{item.availability ? "Available" : "Unavailable"}</td>
                    <td>
                      <button onClick={() => editMenuItem(item)}>Edit</button>
                      <button
                        className="delete-button"
                        onClick={() => deleteMenuItem(item.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="orders-heading">Customer Orders</h3>
          <button onClick={loadOrders}>Refresh Orders</button>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td>M{Number(order.total || 0).toFixed(2)}</td>
                    <td>{order.status}</td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(e) =>
                          updateOrderStatus(order.id, e.target.value)
                        }
                      >
                        <option>Pending</option>
                        <option>Preparing</option>
                        <option>Ready</option>
                        <option>Collected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <footer className="footer">
        <h3>☕ Coffee House</h3>
        <p>Fresh coffee. Fresh moments. Every day.</p>
        <p>© 2026 Coffee House. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
