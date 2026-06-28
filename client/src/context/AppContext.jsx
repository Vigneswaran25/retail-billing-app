import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import Store, { Utils } from '../store/store';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [cart, setCart] = useState([]);
  const [posDiscount, setPosDiscount] = useState(0);
  const [posDiscountType, setPosDiscountType] = useState('%');
  const [modal, setModal] = useState({ open: false, title: '', body: null, footer: null, wide: false });
  const [toasts, setToasts] = useState([]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [storeName, setStoreName] = useState('RetailPro');
  const [settings, setSettings] = useState(null);
  
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('retailpro_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Refs for hidden file inputs
  const csvInputRef = useRef(null);
  const backupRestoreInputRef = useRef(null);
  const logoInputRef = useRef(null);

  // Load settings when user is authenticated
  useEffect(() => {
    if (user) {
      Store.getSettings().then(s => {
        if (s) {
          setStoreName(s.storeName || 'VD Softwares');
          setSettings(s);
          Utils.setCurrencySymbol(s.currency);
        }
      }).catch(() => {});
    }
  }, [user]);

  const navigate = useCallback((page) => {
    setCurrentPage(page);
    setSidebarMobileOpen(false);
  }, []);

  const openModal = useCallback((title, body, footer, wide = false) => {
    setModal({ open: true, title, body, footer, wide });
  }, []);

  const closeModal = useCallback(() => {
    setModal(m => ({ ...m, open: false }));
  }, []);

  const toast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3300);
  }, []);

  const addToCartById = useCallback(async (id) => {
    try {
      const p = await Store.getProduct(id);
      if (!p) return;
      setCart(prev => {
        const existing = prev.find(c => c.productId === String(id));
        if (existing) {
          if (existing.qty >= p.stock) return prev;
          return prev.map(c => c.productId === String(id) ? { ...c, qty: c.qty + 1 } : c);
        }
        return [...prev, { productId: String(p.id), name: p.name, price: p.price, taxRate: p.taxRate || 0, qty: 1, stock: p.stock }];
      });
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  }, []);

  const refreshStoreName = useCallback(() => {
    Store.getSettings().then(s => {
      if (s) {
        setStoreName(s.storeName || 'RetailPro');
        setSettings(s);
        Utils.setCurrencySymbol(s.currency);
      }
    }).catch(() => {});
  }, []);

  const value = {
    currentPage, navigate,
    cart, setCart,
    posDiscount, setPosDiscount,
    posDiscountType, setPosDiscountType,
    modal, openModal, closeModal,
    toasts,
    toast,
    sidebarCollapsed, setSidebarCollapsed,
    sidebarMobileOpen, setSidebarMobileOpen,
    storeName, refreshStoreName,
    settings,
    addToCartById,
    csvInputRef,
    backupRestoreInputRef,
    logoInputRef,
    user, setUser,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { Utils };
