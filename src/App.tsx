import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  ShoppingCart,
  Leaf,
  Menu, 
  X, 
  MapPin, 
  Phone, 
  Mail, 
  ArrowRight,
  TrendingUp,
  Instagram,
  Facebook,
  Twitter,
  ChevronRight,
  Plus,
  Minus,
  Package,
  History,
  Trash2,
  Edit,
  Save,
  LogOut,
  Upload,
  Gamepad2,
  Settings,
  Link,
  Share2,
  Image as ImageIcon,
  Activity,
  BarChart3
} from 'lucide-react';
import { auth, loginWithGoogle, loginAnonymously, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getProducts, getProductsOnce, getProductById, addProduct, updateProduct, deleteProduct, Product } from './services/productService';
import { addOrder, getOrders, getOrdersOnce, getUserOrders, getUserOrdersOnce, updateOrderStatus, deleteOrder, Order } from './services/orderService';
import { trackEvent } from './services/trackingService';
import { SpeedInsights } from '@vercel/speed-insights/react';
import iqraLogo from './assets/images/iqra_logo_1781455341020.jpg';

// Ultra-fast product identification for immediate data fetching before React lifecycle
const getInitialProductId = () => {
  if (typeof window === 'undefined') return null;
  
  const href = window.location.href;
  const search = window.location.search;
  const hash = window.location.hash;

  // 1. Primary: Standard URLSearchParams
  const params = new URLSearchParams(search);
  const qId = params.get('product');
  if (qId) return qId.trim();
  
  // 2. Secondary: Hash detection
  if (hash.startsWith('#product-')) {
    return hash.replace('#product-', '').split('?')[0].trim();
  }
  
  // 3. Tertiary: Robust regex fallback for complex/redirected URLs (like Facebook)
  // Handles cases where product ID might be encoded or moved
  const match = href.match(/[?&]product=([a-zA-Z0-9_\-]+)/);
  if (match && match[1]) return match[1].trim();
  
  const hashMatch = href.match(/#product-([a-zA-Z0-9_\-]+)/);
  if (hashMatch && hashMatch[1]) return hashMatch[1].trim();

  // 4. Quaternary: Search anywhere in the URL string (last resort)
  if (href.includes('product=')) {
    const parts = href.split('product=');
    if (parts.length > 1) {
      const idPart = parts[1].split(/[?&#]/)[0];
      if (idPart && idPart.length > 5) return idPart.trim();
    }
  }

  return null;
};

const initialProductId = getInitialProductId();
let globalProductPromise: Promise<Product | null> | null = null;
let prefetchedProduct: Product | null = null;

if (initialProductId) {
  globalProductPromise = getProductById(initialProductId);
  globalProductPromise.then(p => {
    prefetchedProduct = p;
    if (p && p.image) {
      // Immediate image pre-kick using a link element for browser-level priority
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = p.image;
      link.fetchPriority = 'high';
      document.head.appendChild(link);
      
      // Legacy image pre-kick
      const img = new Image();
      img.src = p.image;
    }
  });
}

const INITIAL_PRODUCTS_SEED: Omit<Product, 'id'>[] = [
  {
    name: "Exclusive Pakistani Georgette Three-Piece",
    price: 3250,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "Georgette",
    description: "আমাদের এই এক্সক্লুসিভ জর্জেট থ্রিপিসটি অত্যন্ত জমকালো কারুকাজ ও আধুনিক ডিজাইনে তৈরি। যেকোনো পার্টি বা উৎসবে পরার জন্য একদম পারফেক্ট।",
    stock: 15,
    features: ["Premium Georgette", "Heavy Embroidery & Sequence Work", "Comes with Inner & Chunri Dupatta", "Durable & Elegant Design"],
    order: 1
  },
  {
    name: "Exclusive Digital Print Cotton Three-Piece",
    price: 1850,
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "Cotton",
    description: "১০০% পিওর সুতি কাপড়ের উপর গর্জিয়াস ডিজিটাল প্রিন্ট করা থ্রিপিস। এটি দৈনন্দিন ব্যবহার বা সাধারণ ঘরোয়া অনুষ্ঠানের জন্য অত্যন্ত আরামদায়ক ও টেকসই।",
    stock: 20,
    features: ["100% Pure Organic Cotton", "Fast Color Guarantee", "Soft & Breathable Fabric", "Dupatta: 5 Cubit long (পাঁচ হাত)"],
    order: 2
  },
  {
    name: "Pure Silk Hand-Embroidery Three-Piece",
    price: 4500,
    image: "https://images.unsplash.com/photo-1610030469668-93535c17b6b3?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "Silk",
    description: "অভিজাত লুকে তৈরি আকর্ষণীয় পিওর সিল্ক থ্রিপিস। হ্যান্ড এমব্রয়ডারি ও সুক্ষ সুতার কাজের জন্য এটি যেকোনো পার্টি বা উৎসবে আপনার সৌন্দর্য দ্বিগুণ করে তুলবে।",
    stock: 10,
    features: ["Pure Premium Silk", "Exquisite Hand Stitch Details", "Comfortable Cotton Lining", "Aesthetic Dupatta Design"],
    order: 3
  },
  {
    name: "Designer Linen Elegant Print Three-Piece",
    price: 1650,
    image: "https://images.unsplash.com/photo-1608748010899-18f300247112?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "Linen",
    description: "গার্মেন্টস কোয়ালিটি লিনেন কাপড়ের প্রিমিয়াম এই থ্রিপিসটি আপনাকে দিবে স্টাইলিশ লুক এবং সর্বোচ্চ আরামদায়ক অনুভূতি। নিখুঁত সেলাই ও আধুনিক ডিজাইন।",
    stock: 18,
    features: ["High-quality Imported Linen", "Trendy Digital Print", "Easy to wash & iron", "Complete 3-piece set"],
    order: 4
  },
  {
    name: "Exclusive Organza Party Wear Three-Piece",
    price: 4800,
    image: "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "Party Wear",
    description: "বর্তমানে অত্যন্ত ট্রেন্ডি অরগাঞ্জা থ্রিপিস কালেকশন। জমকালো হাতের কাজ এবং দৃষ্টিনন্দন ডিজাইন যা আপনাকে যেকোনো পার্টি বা গেট-টুগেদারে অনন্য লুক দেবে।",
    stock: 12,
    features: ["Premium Organza Tissue", "Hand embroidery & Stonework", "Matching premium Trouser piece", "Vibrant colors available"],
    order: 5
  },
  {
    name: "Traditional Block Print Handloom Cotton Three-Piece",
    price: 1450,
    image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
    category: "Cotton",
    description: "দেশীয় ঐতিহ্যে তৈরি আকর্ষণীয় হ্যান্ডলুম কটন ব্লক প্রিন্ট থ্রিপিস। এটি অত্যন্ত আরামদায়ক এবং কালার ফাস্টনেস শতভাগ গ্যারান্টি।",
    stock: 25,
    features: ["100% Handloom Cotton", "Traditional Block Print", "Minimalist Elegant Design", "Eco-friendly natural dyes"],
    order: 6
  }
];

const BrandLogo = ({ size = 'md', light = false }: { size?: 'sm' | 'md' | 'lg', light?: boolean }) => {
  const sizes = {
    sm: { h: 'w-10 h-10', text: 'text-xl', subtext: 'text-[9px]' },
    md: { h: 'w-16 h-16', text: 'text-3xl', subtext: 'text-[11px]' },
    lg: { h: 'w-24 h-24', text: 'text-5xl', subtext: 'text-base' }
  };
  const s = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center cursor-pointer group select-none transition-all duration-500 active:scale-95">
      <div className="relative flex items-center justify-center">
        {/* Animated circular logo wrapper with scale hover & gold border */}
        <div className={`relative rounded-full overflow-hidden border-2 ${light ? 'border-gold-500/80 shadow-gold-500/20' : 'border-gold-600 shadow-gold-600/10'} shadow-lg transition-transform duration-500 group-hover:scale-105 ${s.h}`}>
          <img 
            src={iqraLogo} 
            alt="Iqra Fashion Logo" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        {/* Outer Shine / Aura */}
        <div className="absolute inset-0 bg-gold-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
      </div>

      {/* Brand Text */}
      <div className="flex flex-col items-center mt-2">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tighter ${light ? 'text-white' : 'text-slate-900'} ${s.text}`}>ইকরা</span>
          <span className={`font-black tracking-tighter text-gold-500 ${s.text}`}>ফ্যাশন</span>
        </div>
        <div className="flex flex-col items-center mt-1">
          <span className={`font-bold tracking-[0.25em] text-gold-600/90 uppercase ${s.subtext}`}>Iqra Fashion</span>
          <span className={`font-medium text-slate-500 ${size === 'lg' ? 'text-sm' : 'text-[8px]'} italic mt-0.5 opacity-80`}>আপনার বিশ্বস্ত শপিং সঙ্গী</span>
        </div>
      </div>
    </div>
  );
};

// Memoized Product Card to prevent unnecessary re-renders
const ProductCard = React.memo(({ 
  product, 
  index, 
  onViewProduct, 
  rotatingText 
}: { 
  product: Product, 
  index: number, 
  onViewProduct: (p: Product) => void,
  rotatingText: string
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay: (index % 8) * 0.05 }} // Intelligent staggering
      className="group relative"
    >
      <div 
        className="aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200 relative cursor-pointer"
        onClick={() => onViewProduct(product)}
      >
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading={index < 4 ? "eager" : "lazy"}
            fetchPriority={index < 4 ? "high" : "auto"}
            decoding="async"
          />
        ) : null}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="bg-white text-navy-900 px-6 py-3 rounded-full font-bold text-sm transform translate-y-4 group-hover:translate-y-0 transition-transform shadow-xl flex items-center gap-2 min-w-[120px] justify-center">
             {rotatingText}
          </span>
        </div>
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-sm text-navy-900 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
            {product.category}
          </span>
        </div>
        <div className="absolute bottom-4 left-4">
          <span className="bg-navy-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-[11px] font-bold tracking-wide flex items-center gap-2 border border-white/20 shadow-lg">
            <div className="w-1.5 h-1.5 bg-gold-500 rounded-full animate-pulse"></div>
            ক্রয় করতে ক্লিক করুন
          </span>
        </div>
      </div>
      <div className="mt-6 flex flex-col items-start">
        <h3 
          onClick={() => onViewProduct(product)}
          className="text-xl font-bold text-navy-900 mb-1 cursor-pointer hover:text-gold-500 transition-colors"
        >
          {product.name}
        </h3>
        <p className="text-gold-500 font-bold">৳ {product.price.toLocaleString()}</p>
      </div>
    </motion.div>
  );
});

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState<{product: Product, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(prefetchedProduct);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Admin States
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeContactItem, setActiveContactItem] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string, name: string } | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [showUserOrders, setShowUserOrders] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderSuccess, setShowOrderSuccess] = useState(false);
  const [deliveryArea, setDeliveryArea] = useState<'inside' | 'outside' | null>(null);
  const [adminTab, setAdminTab] = useState<'products' | 'orders' | 'confirmed'>('products');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBusinessHealth, setShowBusinessHealth] = useState(false);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  const ADMIN_EMAIL = "emonhasanriyad@gmail.com";

  const rotatingTexts = ["View Details", "বিস্তারিত দেখুন"];
  const [rotatingTextIndex, setRotatingTextIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setRotatingTextIndex(prev => (prev + 1) % rotatingTexts.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const [visibleCount, setVisibleCount] = useState(12);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  // Listen for quota exceeded events from services
  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
      setLoading(false);
      setLoadingProduct(false);
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  // Reset image index when product changes
  useEffect(() => {
    setActiveImgIndex(0);
  }, [selectedProduct?.id]);

  // Auto-rotate images in product details
  useEffect(() => {
    if (selectedProduct && selectedProduct.images && selectedProduct.images.length > 0) {
      const allImages = [selectedProduct.image, ...selectedProduct.images];
      const timer = setInterval(() => {
        setActiveImgIndex((prev) => (prev + 1) % allImages.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [selectedProduct]);

  // Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsAdmin(currentUser.email === ADMIN_EMAIL);
      } else {
        // Auto sign-in anonymously for guests if no user is present
        // This allows them to see data without being prompted for Google Login
        loginAnonymously().catch(err => console.error("Auto-login failed:", err));
      }
    });
    return unsub;
  }, []);

  // Orders Listener (Admin - only when panel is open)
  useEffect(() => {
    if (isAdmin && showAdminPanel) {
      const unsub = getOrders((fetchedOrders) => {
        setOrders(fetchedOrders);
      });
      return unsub;
    } else if (isAdmin && !showAdminPanel && orders.length === 0) {
      // Fetch once for initial stats even if panel isn't open
      getOrdersOnce().then(setOrders);
    }
  }, [isAdmin, showAdminPanel]);

  // User Orders Listener (Real-time updates)
  useEffect(() => {
    if (user && !isAdmin) {
      const unsub = getUserOrders(user.uid, (fetchedOrders) => {
        setUserOrders(fetchedOrders);
      });
      return unsub;
    } else if (!user) {
      setUserOrders([]);
    }
  }, [user, isAdmin]);

  const fetchProducts = async () => {
    try {
      let fetchedProducts = await getProductsOnce();
      
      // Auto-transition old toy products or empty DB to Three-Pieces
      const hasOldToys = fetchedProducts.some(p => 
        p.name.toLowerCase().includes("tablet") || 
        p.name.toLowerCase().includes("robot") || 
        p.name.toLowerCase().includes("toy") || 
        p.name.toLowerCase().includes("keyboard") || 
        p.name.toLowerCase().includes("wooden play") || 
        p.name.toLowerCase().includes("science kit") || 
        p.name.toLowerCase().includes("magnetic building") || 
        p.category === "Education" || 
        p.category === "Learning" || 
        p.category === "Creative"
      );
      const isEmpty = fetchedProducts.length === 0;

      if (hasOldToys || isEmpty) {
        // Suppress manual confirmation, auto-update the database for the user seamlessly!
        console.log("Old products detected or database is empty. Migrating/seeding Three-Piece products...");
        for (const p of fetchedProducts) {
          try {
            await deleteProduct(p.id);
          } catch (err) {
            console.error("Failed to delete old product during transition:", err);
          }
        }
        
        const seededList: Product[] = [];
        for (const p of INITIAL_PRODUCTS_SEED) {
          try {
            const newId = await addProduct(p);
            if (newId) {
              seededList.push({ ...p, id: newId });
            }
          } catch (err) {
            console.error("Failed to seed new product:", err);
          }
        }
        fetchedProducts = seededList;
      }

      // Logic to sort products by order (newest first - descending order)
      const sorted = [...fetchedProducts].sort((a, b) => {
        return (b.order || 0) - (a.order || 0);
      });
      setProducts(sorted);
      if (!initialProductId) {
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setLoading(false);
    }
  };

  // Products Listener (Fetch once)
  useEffect(() => {
    fetchProducts();
  }, []);

  // Correct hero index if products change
  useEffect(() => {
    if (products.length > 0 && activeHeroIndex >= products.length) {
      setActiveHeroIndex(0);
    }
  }, [products.length]);

  // Auto-slide hero products
  useEffect(() => {
    if (products.length === 0) return;
    const timer = setInterval(() => {
      setActiveHeroIndex((prev) => (prev + 1) % products.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [products.length]);

  useEffect(() => {
    trackEvent('PageView');
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const [deepLinkId, setDeepLinkId] = useState<string | null>(initialProductId);

  // Performance Optimized Deep Linking - High Priority for external traffic (Facebook/Ads)
  useEffect(() => {
    if (!deepLinkId) return;
    
    // If we already have the correct product selected, just ensure loading is off
    if (selectedProduct && selectedProduct.id === deepLinkId) {
      setLoading(false);
      return;
    }

    const fetchDeepLink = async () => {
      setLoadingProduct(true);
      try {
        // 1. Check if we already have it from the local products array (most efficient)
        const localProduct = products.find(p => p.id === deepLinkId);
        if (localProduct) {
          setSelectedProduct(localProduct);
          window.scrollTo({ top: 0, behavior: 'instant' });
          return;
        }

        // 2. Check if we already have it from the early fetch
        if (prefetchedProduct && prefetchedProduct.id === deepLinkId) {
          setSelectedProduct(prefetchedProduct);
          window.scrollTo({ top: 0, behavior: 'instant' });
          return;
        }

        // 3. Otherwise fetch it
        // Use the global promise if it's the same ID to avoid double work
        const directProduct = globalProductPromise && deepLinkId === initialProductId 
          ? await globalProductPromise 
          : await getProductById(deepLinkId);

        if (directProduct) {
          setSelectedProduct(directProduct);
          window.scrollTo({ top: 0, behavior: 'instant' });
          
          trackEvent('ViewContent', {
            content_name: directProduct.name,
            content_ids: [directProduct.id],
            content_type: 'product',
            value: directProduct.price,
            currency: 'BDT'
          });
        }
      } catch (err) {
        console.error("Critical deep link fetch failed:", err);
      } finally {
        setLoadingProduct(false);
        setLoading(false);
      }
    };

    fetchDeepLink();
  }, [deepLinkId]);

  // Secondary Listener for navigation events
  useEffect(() => {
    const handleUrlChange = () => {
      const pId = getInitialProductId();
      setDeepLinkId(pId);
      
      // If URL is cleared, close product view
      if (!pId) {
        setSelectedProduct(null);
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  const addToCart = (product: Product) => {
    trackEvent('AddToCart', {
      content_name: product.name,
      content_ids: [product.id],
      content_type: 'product',
      value: product.price,
      currency: 'BDT'
    });
    setCartItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    setCartCount(prev => prev + 1);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCartItems(prev => {
      const itemAction = prev.find(i => i.product.id === productId);
      if (!itemAction) return prev;
      setCartCount(c => c - itemAction.quantity);
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }
    
    setCartItems(prev => {
      const itemAction = prev.find(i => i.product.id === productId);
      if (!itemAction) return prev;
      const quantityDiff = newQuantity - itemAction.quantity;
      setCartCount(c => c + quantityDiff);
      return prev.map(item => 
        item.product.id === productId ? { ...item, quantity: newQuantity } : item
      );
    });
  };

  const seedData = async () => {
    if (!window.confirm("Seed default products? This will add to existing.")) return;
    for (const p of INITIAL_PRODUCTS_SEED) {
      await addProduct(p);
    }
    alert("Seeding complete!");
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    setProductToDelete({ id, name });
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      await fetchProducts();
    } catch (error) {
      alert("পণ্যটি মুছে ফেলতে সমস্যা হয়েছে।");
    }
  };

  const handleDeleteOrder = async (id: string) => {
    if (window.confirm('অর্ডারটি ডিলেট করবেন?')) {
      try {
        await deleteOrder(id);
      } catch (error) {
        alert("অর্ডারটি মুছে ফেলতে সমস্যা হয়েছে।");
      }
    }
  };

  const totalPrice = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const deliveryCharge = deliveryArea === 'inside' ? 120 : deliveryArea === 'outside' ? 150 : 0;
  const grandTotal = totalPrice + deliveryCharge;

  const handleCopyLink = (productId: string) => {
    // 1. Determine base URL
    let baseUrl = (process.env as any).APP_URL || (import.meta as any).env?.VITE_APP_URL || window.location.origin;
    
    // 2. AI Studio Environment Check: If this is a 'dev' URL, point to the public 'pre' URL
    if (baseUrl.includes('ais-dev-')) {
      baseUrl = baseUrl.replace('ais-dev-', 'ais-pre-');
    }

    // 3. Clean up the URL format
    try {
      const urlObj = new URL(baseUrl);
      // Remove AI Studio internal params
      ['ais-ide', 'ais-dev', 'ais-preview'].forEach(p => urlObj.searchParams.delete(p));
      
      let path = urlObj.pathname;
      if (path.endsWith('index.html')) path = path.replace('index.html', '');
      if (!path.endsWith('/')) path += '/';
      
      baseUrl = urlObj.origin + path;
    } catch(e) {
      baseUrl = baseUrl.split('?')[0].split('#')[0];
      if (!baseUrl.endsWith('/')) baseUrl += '/';
    }
    
    // 4. Construct final shared URL
    const url = `${baseUrl}?product=${productId}`;
    
    navigator.clipboard.writeText(url);
    setCopyMessage("লিংক কপি করা হয়েছে!");
    setTimeout(() => setCopyMessage(null), 3000);
  };

  const businessStats = {
    totalOrders: orders.length,
    newOrders: orders.filter(o => o.status === 'pending').length,
    confirmedOrders: orders.filter(o => o.status === 'confirmed' || o.status === 'shipped' || o.status === 'delivered').length,
    rejectedOrders: orders.filter(o => o.status === 'cancelled').length,
    newOrders24h: orders.filter(o => new Date(o.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000).length
  };

  if (quotaExceeded) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
          <Activity size={48} />
        </div>
        <h1 className="text-3xl font-serif text-navy-900 mb-4 tracking-tight">আপনার প্রতিদিনের ব্যবহারের সীমা অতিক্রম হয়েছে</h1>
        <p className="text-slate-600 max-w-md mx-auto mb-10 leading-relaxed font-medium">
          দুঃখিত, আমাদের ফ্রি সার্ভার লিমিট আজকের জন্য শেষ হয়ে গিয়েছে। 
          আগামীকাল আবার চেষ্টা করুন অথবা আমাদের সাথে সরাসরি যোগাযোগ করুন।
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <a 
            href="tel:+8801911475734" 
            className="flex-1 bg-navy-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
          >
            <Phone size={20} /> কল করুন
          </a>
          <a 
            href="https://wa.me/8801911475734" 
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
          >
            WhatsApp
          </a>
        </div>
        <div className="mt-12 text-slate-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          Quota Resets in 24 Hours
        </div>
      </div>
    );
  }

  if (loading && !selectedProduct) {
    return (
      <div className="min-h-screen bg-white">
        {/* Skeleton Header */}
        <div className="h-20 bg-white border-b border-gray-100 flex items-center px-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="w-24 h-8 bg-gray-100 rounded-lg animate-pulse" />
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
              <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {/* Skeleton Hero */}
          <div className="w-full h-48 sm:h-72 bg-gray-100 rounded-3xl mb-12 animate-pulse" />

          {/* Skeleton Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[4/5] bg-gray-100 rounded-2xl animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded w-1/2 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-gold-100 rounded-full"></div>
          <div className="w-20 h-20 border-4 border-gold-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
        </div>
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <p className="text-navy-900 font-black text-xl italic mb-1 tracking-tighter">ইকরা ফ্যাশন</p>
          <p className="text-slate-400 text-sm font-medium">পণ্যটি আপনার জন্য লোড করা হচ্ছে...</p>
        </motion.div>
      </div>
    );
  }

  if (selectedProduct) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="fixed w-full z-50 glass-nav py-3">
          <div className="container mx-auto px-6 flex justify-between items-center text-white">
            <button onClick={() => {
              setSelectedProduct(null);
              // Clear product ID from URL
              window.history.pushState(null, '', window.location.pathname);
            }} className="flex items-center gap-2 hover:text-gold-500 transition-colors">
              <X size={20} /> Back to Store
            </button>
            <div className="text-2xl font-bold tracking-tighter flex items-center gap-2">
              <span className="text-white">ইকরা</span>
              <span className="text-gold-500">ফ্যাশন</span>
            </div>
          </div>
        </nav>

        <div className="pt-32 pb-20 container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl overflow-hidden shadow-2xl border border-gray-100 aspect-square relative bg-gray-50"
            >
              <AnimatePresence mode="wait">
                <motion.img 
                  key={activeImgIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.5 }}
                  src={(selectedProduct.images && selectedProduct.images.length > 0) 
                    ? [selectedProduct.image, ...selectedProduct.images][activeImgIndex]
                    : selectedProduct.image} 
                  alt={selectedProduct.name} 
                  className="w-full h-full object-cover"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                />
              </AnimatePresence>
              
              {selectedProduct.images && selectedProduct.images.length > 0 && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                  {[selectedProduct.image, ...selectedProduct.images].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveImgIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === activeImgIndex ? 'bg-gold-500 w-6' : 'bg-white/50 hover:bg-white'}`}
                    />
                  ))}
                </div>
              )}
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <div>
                <h1 className="text-4xl md:text-5xl font-serif text-navy-900 mb-4">{selectedProduct.name}</h1>
                <div className="flex items-center gap-6">
                  <p className="text-3xl font-bold text-gold-600">৳ {selectedProduct.price.toLocaleString()}</p>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Availability</span>
                    <span className={`text-sm font-bold ${selectedProduct.stock < 5 ? 'text-red-500' : 'text-navy-900'}`}>{selectedProduct.stock} pcs in stock</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                    setShowCheckout(true);
                  }}
                  className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-10 py-5 rounded-full font-bold w-full transition-all shadow-xl shadow-gold-500/20"
                >
                  Buy Now & Checkout
                </button>
                <button 
                  onClick={() => addToCart(selectedProduct)}
                  className="bg-navy-900 text-white hover:bg-navy-800 px-10 py-5 rounded-full font-bold w-full transition-all shadow-xl shadow-navy-900/10 flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={20} /> Add to Cart
                </button>
              </div>

              <div className="prose prose-slate max-w-none">
                <p className="text-slate-600 text-lg leading-relaxed">
                  {selectedProduct.description}
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => {
                    addToCart(selectedProduct);
                    setSelectedProduct(null);
                    setShowCheckout(true);
                  }}
                  className="bg-gold-500 hover:bg-gold-600 text-navy-900 px-10 py-5 rounded-full font-bold w-full transition-all shadow-xl shadow-gold-500/20"
                >
                  Buy Now & Checkout
                </button>
              </div>

              {/* Premium Trust Section */}
              <div className="pt-8 mt-4 border-t border-gray-100 space-y-6">
                <div className="bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-gold-100 text-gold-600 rounded-2xl flex items-center justify-center mb-4">
                    <History size={24} />
                  </div>
                  <p className="text-navy-900 font-bold leading-relaxed mb-1">
                    সেরা ও আকর্ষণীয় প্রিমিয়াম থ্রিপিস কালেকশন নিয়ে ইকরা ফ্যাশন আপনার নির্ভরযোগ্য ও বিশ্বস্ত প্রতিষ্ঠান।
                  </p>
                  <div className="h-1 w-12 bg-gold-500 rounded-full mt-2 opacity-50"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-600 group-hover:bg-navy-900 group-hover:text-white transition-colors">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                      <p className="text-sm font-bold text-navy-900">Vhulta Gawchiya, Dhaka, Bangladesh</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-600 group-hover:bg-navy-900 group-hover:text-white transition-colors">
                      <Phone size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Call Us</p>
                      <p className="text-sm font-bold text-navy-900">+8801731062722</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-all group">
                    <div className="w-10 h-10 rounded-full bg-navy-50 flex items-center justify-center text-navy-600 group-hover:bg-navy-900 group-hover:text-white transition-colors">
                      <Mail size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</p>
                      <p className="text-sm font-bold text-navy-900">support@iqrafashion.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Copy Success Toast */}
      <AnimatePresence>
        {copyMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[300] bg-navy-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10"
          >
            <div className="w-2 h-2 bg-gold-500 rounded-full animate-pulse" />
            <span className="text-sm font-bold">{copyMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-navy-900 text-white">
                <h3 className="text-xl font-bold font-serif">আপনার শপিং ব্যাগ ({cartCount})</h3>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                      <ShoppingBag size={40} />
                    </div>
                    <p className="text-gray-400 font-medium">আপনার ব্যাগটি খালি আছে।</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-gold-600 font-bold uppercase tracking-widest text-xs hover:underline"
                    >
                      কেনাকাটা শুরু করুন
                    </button>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item.product.id} className="flex gap-4 group">
                      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                        {item.product.image && (
                          <img 
                        src={item.product.image} 
                        alt={item.product.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-navy-900 leading-tight">{item.product.name}</h4>
                        <p className="text-xs text-slate-400 mb-2">{item.product.category}</p>
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1 px-2">
                            <button 
                              onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors ${
                                item.quantity <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-navy-900 hover:bg-white'
                              }`}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-bold text-sm text-navy-900 min-w-[20px] text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center text-navy-900 hover:bg-white rounded-md transition-colors"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="text-gold-600 font-bold text-sm">৳ {(item.product.price * item.quantity).toLocaleString()}</p>
                        </div>
                        <div className="flex justify-start mt-2">
                          <button 
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-[10px] text-red-400 font-bold uppercase tracking-widest hover:text-red-600 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {cartItems.length > 0 && (
                <div className="p-8 bg-gray-50 border-t border-gray-100 space-y-4">
                  <div className="flex justify-between items-center text-navy-900">
                    <span className="font-bold">সর্বমোট:</span>
                    <span className="text-2xl font-serif font-bold italic">৳ {totalPrice.toLocaleString()}</span>
                  </div>
                  <button 
                    onClick={() => {
                      setShowCheckout(true);
                      setIsCartOpen(false);
                    }}
                    className="w-full bg-navy-900 text-white font-bold py-5 rounded-full hover:bg-navy-800 transition-all shadow-xl shadow-navy-900/10 flex items-center justify-center gap-3"
                  >
                    Proceed to Checkout <ArrowRight size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout Page Overal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div 
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col"
          >
            {/* Header */}
            <div className="bg-navy-900 text-white py-6 px-6 shrink-0 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => {
                    setShowCheckout(false);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <ChevronRight className="rotate-180" size={24} />
                </button>
                <h2 className="text-xl font-bold font-serif">চেকআউট</h2>
              </div>
              <button 
                onClick={() => {
                  setShowCheckout(false);
                }} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="container mx-auto max-w-5xl py-6 sm:py-12 px-4 sm:px-6">
                <div className="grid lg:grid-cols-12 gap-6 lg:gap-12">
                  {/* Left Column: Form */}
                  <div className="lg:col-span-7">
                    <div className="bg-white rounded-3xl p-5 sm:p-8 border border-gray-100 shadow-sm">
                      <CheckoutForm 
                        deliveryArea={deliveryArea}
                        setDeliveryArea={setDeliveryArea}
                        cartItems={cartItems}
                        updateCartQuantity={updateCartQuantity}
                        onSubmit={async (data) => {
                          let currentUserId = auth.currentUser?.uid;
                          
                          if (!currentUserId) {
                            try {
                              const anonymousUser = await loginAnonymously();
                              currentUserId = anonymousUser.uid;
                            } catch (err) {
                              console.error("Anonymous login failed during checkout:", err);
                              alert("অর্ডার প্রসেস করতে সমস্যা হচ্ছে। দয়া করে আবার চেষ্টা করুন।");
                              return;
                            }
                          }

                          const orderData: Omit<Order, 'id'> = {
                            ...data,
                            userId: currentUserId,
                            items: cartItems.map(item => ({
                              productId: item.product.id,
                              productName: item.product.name,
                              quantity: item.quantity,
                              price: item.product.price
                            })),
                            deliveryArea: deliveryArea!,
                            deliveryCharge: deliveryCharge,
                            total: grandTotal,
                            status: 'pending',
                            createdAt: new Date().toISOString()
                          };
                          
                          try {
                            await addOrder(orderData);
                            
                            trackEvent('Purchase', {
                              value: grandTotal,
                              currency: 'BDT',
                              content_ids: cartItems.map(item => item.product.id),
                              content_type: 'product',
                              num_items: cartItems.reduce((acc, item) => acc + item.quantity, 0)
                            });

                            setCartItems([]);
                            setCartCount(0);
                            setShowCheckout(false);
                            setDeliveryArea(null);
                            setShowOrderSuccess(true);
                          } catch (error) {
                            console.error("Order completion failed", error);
                            alert("অর্ডারটি সম্পন্ন করা সম্ভব হয়নি। দয়া করে আবার চেষ্টা করুন।");
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Order Summary */}
                  <div className="lg:col-span-5">
                    <div className="bg-gray-50 rounded-3xl p-5 sm:p-8 sticky top-8">
                      <h3 className="text-xl font-bold font-serif text-navy-900 mb-8">অর্ডার সারাংশ</h3>
                      
                      <div className="space-y-4 pt-8 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">সাবটোটাল</span>
                          <span className="font-bold text-navy-900">৳ {totalPrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-slate-500">ডেলিভারি চার্জ</span>
                          <span className={`${deliveryCharge > 0 ? 'text-navy-900' : 'text-slate-400'} font-bold`}>
                            {deliveryArea ? `৳ ${deliveryCharge}` : 'সিলেক্ট করুন'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                          <span className="text-navy-900 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                          <span className="text-3xl font-serif text-gold-600 italic">৳ {grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order Success Modal */}
      <AnimatePresence>
        {showOrderSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-navy-900/90 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[3rem] p-12 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gold-400 via-gold-600 to-gold-400"></div>
              <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8 text-green-500">
                <ShoppingBag size={48} />
              </div>
              <h3 className="text-3xl font-serif text-navy-900 mb-4 italic">ধন্যবাদ!</h3>
              <p className="text-slate-600 leading-relaxed mb-8">
                আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। আমরা শীঘ্রই আপনার ঠিকানায় পণ্যটি পৌঁছে দেব।
              </p>
              <div className="space-y-4">
                <button 
                  onClick={() => {
                    setShowOrderSuccess(false);
                    setShowUserOrders(true);
                  }}
                  className="w-full bg-navy-900 text-white font-bold py-4 rounded-2xl hover:bg-navy-800 transition-all flex items-center justify-center gap-2"
                >
                  ট্র্যাক করুন <ArrowRight size={18} />
                </button>
                <button 
                  onClick={() => setShowOrderSuccess(false)}
                  className="w-full text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-navy-900 transition-colors"
                >
                  কেনাকাটা চালিয়ে যান
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'glass-nav py-3 shadow-xl' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <BrandLogo size="md" light={true} />
          </div>

          <ul className="hidden md:flex space-x-10 text-sm uppercase tracking-widest font-medium text-white/90">
            <li><a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-gold-500 transition-colors">Home</a></li>
            <li><a href="#products" onClick={(e) => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-gold-500 transition-colors">Three-Piece Collection</a></li>
            <li><a href="#contact" onClick={(e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="hover:text-gold-500 transition-colors">Contact</a></li>
          </ul>

          <div className="flex items-center gap-4">
            {user ? (
               <div className="relative">
                 <button 
                   onClick={() => setShowProfileMenu(!showProfileMenu)}
                   className="flex items-center gap-2 bg-white/10 hover:bg-white/20 p-2 pl-4 pr-3 rounded-full border border-white/10 transition-all"
                 >
                   <span className="text-white text-[10px] font-bold uppercase tracking-wider hidden sm:block">
                     {isAdmin ? 'অ্যাডমিন' : 'প্রোফাইল'}
                   </span>
                   <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-navy-900 font-bold text-xs">
                     {isAdmin ? <Settings size={14} /> : <Package size={14} />}
                   </div>
                 </button>

                 <AnimatePresence>
                   {showProfileMenu && (
                     <>
                       <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                       <motion.div 
                         initial={{ opacity: 0, y: 10, scale: 0.95 }}
                         animate={{ opacity: 1, y: 0, scale: 1 }}
                         exit={{ opacity: 0, y: 10, scale: 0.95 }}
                         className="absolute right-0 mt-4 w-64 bg-white rounded-2xl shadow-2xl z-50 overflow-hidden border border-gray-100"
                       >
                         <div className="p-4 bg-gray-50 border-b border-gray-100">
                           <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1">
                             {isAdmin ? 'Signed in as Admin' : 'Guest Session Active'}
                           </p>
                         </div>
                         <div className="p-2">
                           <button 
                             onClick={() => { setShowUserOrders(true); setShowProfileMenu(false); }}
                             className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-gray-50 rounded-xl transition-colors text-sm"
                           >
                             <History size={18} className="text-gold-500" /> আমার অর্ডারসমূহ
                             {userOrders.length > 0 && <span className="ml-auto bg-navy-900 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{userOrders.length}</span>}
                           </button>
                           {isAdmin && (
                             <button 
                               onClick={() => { setShowAdminPanel(true); setShowProfileMenu(false); }}
                               className="w-full flex items-center gap-3 p-3 text-slate-600 hover:bg-gray-50 rounded-xl transition-colors text-sm"
                             >
                               <Settings size={18} className="text-gold-500" /> অ্যাডমিন প্যানেল
                             </button>
                           )}
                           <div className="h-px bg-gray-100 my-2" />
                           <button 
                             onClick={logout}
                             className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors text-sm"
                           >
                             <LogOut size={18} /> সেশন শেষ করুন (Logout)
                           </button>
                         </div>
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>
            ) : (
              <div className="w-10 h-10" />
            )}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-white hover:text-gold-500 transition-colors"
            >
              <ShoppingBag size={24} />
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-gold-500 text-navy-900 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
            <button 
              className="md:hidden text-white p-2"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-40 bg-navy-900 flex flex-col items-center justify-center space-y-8 md:hidden"
          >
            <a href="#" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-2xl text-white uppercase tracking-widest font-light hover:text-gold-500">Home</a>
            <a href="#products" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-2xl text-white uppercase tracking-widest font-light hover:text-gold-500">Three-Piece Collection</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); }} className="text-2xl text-white uppercase tracking-widest font-light hover:text-gold-500">Contact</a>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section with Auto-Featured Products */}
      <section className="relative h-[35vh] flex items-center bg-navy-900 overflow-hidden pt-20">
        <AnimatePresence mode="wait">
          {products.length > 0 && (
            <motion.div 
              key={activeHeroIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0"
            >
              <div className="absolute top-0 right-0 w-full lg:w-1/2 h-full overflow-hidden block">
                <div className="absolute inset-0 bg-navy-900/60 lg:bg-navy-900/0 z-10"></div>
                  {products[activeHeroIndex]?.image ? (
                    <motion.img 
                      initial={{ scale: 1.2 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 5 }}
                      src={products[activeHeroIndex].image} 
                      alt={products[activeHeroIndex]?.name || "Product"}
                      className="w-full h-full object-cover opacity-40 lg:opacity-100"
                      fetchPriority="high"
                      loading="eager"
                    />
                  ) : null}
                <div className="absolute inset-0 bg-gradient-to-l from-navy-900/0 via-navy-900/40 to-navy-900 z-10 hidden lg:block"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="container mx-auto px-6 relative z-20">
          <div className="max-w-2xl">
            {/* Slider Dots */}
            <div className="flex gap-3 mt-12">
              {products.map((_, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveHeroIndex(i)}
                  className={`h-1.5 transition-all duration-300 rounded-full ${activeHeroIndex === i ? "w-12 bg-gold-500" : "w-4 bg-white/20"}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Floating Accents removed */}
      </section>


      {/* Product Grid */}
      <section id="products" className="pt-10 pb-20 bg-gray-50 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="flex flex-col items-center justify-center text-center mb-12 gap-6">
            <div>
              <h2 className="text-4xl md:text-5xl font-serif text-navy-900">Exclusive Three-Piece</h2>
            </div>
            <a href="#products" className="flex items-center gap-2 text-navy-900 font-bold uppercase tracking-widest text-sm hover:text-gold-500 transition-colors">
              View All Collection <ArrowRight size={18} />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {products.length > 0 ? (
              <>
                {products.slice(0, visibleCount).map((product, index) => (
                  <ProductCard 
                    key={product.id}
                    product={product}
                    index={index}
                    rotatingText={rotatingTexts[rotatingTextIndex]}
                    onViewProduct={(p) => {
                      setSelectedProduct(p);
                      // Unified URL format with shared links
                      const newUrl = `${window.location.pathname}?product=${p.id}`;
                      window.history.pushState({ productId: p.id }, '', newUrl);
                      window.scrollTo({ top: 0, behavior: 'instant' });
                      
                      trackEvent('ViewContent', {
                        content_name: p.name,
                        content_ids: [p.id],
                        content_type: 'product',
                        value: p.price,
                        currency: 'BDT'
                      });
                    }}
                  />
                ))}
              </>
            ) : (
              <div className="col-span-full py-10 text-center text-slate-400 italic">
                পণ্যের তালিকা লোড হচ্ছে...
              </div>
            )}
          </div>

          {products.length > visibleCount && (
            <div className="mt-16 flex justify-center">
              <button 
                onClick={() => setVisibleCount(prev => prev + 12)}
                className="bg-white border-2 border-navy-900 text-navy-900 px-10 py-4 rounded-full font-bold hover:bg-navy-900 hover:text-white transition-all flex items-center gap-3 group"
              >
                আরো পণ্য দেখুন
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Decorative text banner */}
      <div className="bg-navy-900 py-4 overflow-hidden relative border-y border-white/5">
        <div className="whitespace-nowrap flex animate-[marquee_20s_linear_infinite]">
          {Array(10).fill(" ").map((_, i) => (
            <div key={i} className="flex items-center mx-4">
              <span className="text-white/10 text-2xl font-serif uppercase tracking-tighter">Learn with Joy</span>
              <div className="mx-4 w-2 h-2 rounded-full border-2 border-gold-500"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer id="contact" className="bg-navy-900 text-white pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-20">
            <div className="lg:col-span-1">
              <div 
                className="mb-8 cursor-pointer select-none"
                onDoubleClick={() => {
                  // Admin entry hidden on brand logo double click
                  // Only triggers if email is already known or manually triggered via console
                  if (isAdmin) {
                    setShowAdminPanel(true);
                  }
                }}
              >
                <BrandLogo size="lg" light={true} />
              </div>
              <p className="text-slate-400 leading-relaxed mb-8 max-w-sm">
                বাংলাদেশের সেরা ও আকর্ষণীয় প্রিমিয়াম থ্রিপিস কালেকশন নিয়ে ইকরা ফ্যাশন আপনার নির্ভরযোগ্য বিশ্বস্ত প্রতিষ্ঠান।
              </p>
              <div className="flex flex-col gap-6">
                <div className="flex gap-4">
                  <div className="relative group">
                    <button 
                      onClick={() => setActiveContactItem(activeContactItem === 'location' ? null : 'location')}
                      className={`p-3 rounded-full transition-all ${activeContactItem === 'location' ? 'bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/20' : 'bg-white/5 text-white hover:bg-white/10 hover:text-gold-500'}`}
                    >
                      <MapPin size={20} />
                    </button>
                    <AnimatePresence>
                      {activeContactItem === 'location' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute bottom-full left-0 mb-4 w-64 bg-white text-navy-900 p-4 rounded-2xl shadow-2xl z-50 after:content-[''] after:absolute after:top-full after:left-5 after:border-8 after:border-transparent after:border-t-white"
                        >
                          <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-1">Store Location</p>
                          <p className="text-sm font-medium">Vhulta Gawchiya, Dhaka, Bangladesh</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative group">
                    <button 
                      onClick={() => setActiveContactItem(activeContactItem === 'phone' ? null : 'phone')}
                      className={`p-3 rounded-full transition-all ${activeContactItem === 'phone' ? 'bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/20' : 'bg-white/5 text-white hover:bg-white/10 hover:text-gold-500'}`}
                    >
                      <Phone size={20} />
                    </button>
                    <AnimatePresence>
                      {activeContactItem === 'phone' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute bottom-full left-0 mb-4 w-48 bg-white text-navy-900 p-4 rounded-2xl shadow-2xl z-50 after:content-[''] after:absolute after:top-full after:left-5 after:border-8 after:border-transparent after:border-t-white"
                        >
                          <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-1">Call Support</p>
                          <p className="text-sm font-medium">+8801731062722</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="relative group">
                    <button 
                      onClick={() => setActiveContactItem(activeContactItem === 'email' ? null : 'email')}
                      className={`p-3 rounded-full transition-all ${activeContactItem === 'email' ? 'bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/20' : 'bg-white/5 text-white hover:bg-white/10 hover:text-gold-500'}`}
                    >
                      <Mail size={20} />
                    </button>
                    <AnimatePresence>
                      {activeContactItem === 'email' && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.9 }}
                          className="absolute bottom-full left-0 mb-4 w-56 bg-white text-navy-900 p-4 rounded-2xl shadow-2xl z-50 after:content-[''] after:absolute after:top-full after:left-5 after:border-8 after:border-transparent after:border-t-white"
                        >
                          <p className="font-bold text-xs uppercase tracking-widest text-slate-400 mb-1">Email Us</p>
                          <p className="text-sm font-medium">support@iqrafashion.com</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>


          </div>

          <div className="border-t border-white/5 pt-12 flex flex-col md:flex-row justify-between items-center gap-6">
            <p 
              className="text-slate-500 text-sm italic cursor-pointer"
              onClick={() => isAdmin && setShowAdminPanel(true)}
            >
              &copy; 2026 ইকরা ফ্যাশন (Iqra Fashion). All Rights Reserved.
              {isAdmin && <span className="ml-2 text-gold-500 font-bold bg-gold-500/10 px-2 py-0.5 rounded text-[10px]">ADMIN ACTIVE</span>}
            </p>
            <div className="flex gap-8 text-slate-500 text-xs uppercase tracking-widest font-bold">
              <a href="#" className="hover:text-gold-500">Refund Policy</a>
              <a href="#" className="hover:text-gold-500">Privacy</a>
              <a href="#" className="hover:text-gold-500">Cookies</a>
              <button 
                onClick={() => {
                  if (isAdmin) {
                    setShowAdminPanel(true);
                  } else {
                    loginWithGoogle().then((u) => {
                      if (u?.email === ADMIN_EMAIL) {
                        setShowAdminPanel(true);
                      }
                    });
                  }
                }}
                className="hover:text-gold-500 flex items-center gap-1 transition-colors"
              >
                <Settings size={12} /> Admin Panel
              </button>
              {isAdmin && (
                <button onClick={() => logout()} className="text-red-400 hover:text-red-600 flex items-center gap-1">
                  <LogOut size={12} /> Sign Out
                </button>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Admin Panel Overlay */}
      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white overflow-y-auto"
          >
            <div className="p-8 bg-navy-900 text-white flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-6">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-4">
                  <Settings size={24} className="text-gold-500 animate-[spin_8s_linear_infinite]" />
                  <h2 className="text-2xl font-bold font-display uppercase tracking-wider">অ্যাডমিন কন্ট্রোল</h2>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => setAdminTab('products')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${adminTab === 'products' ? 'bg-gold-500 text-navy-900 border-gold-500 shadow-lg shadow-gold-500/20' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'} border`}
                  >
                    <Package size={14} />
                    পণ্যসমূহ
                  </button>
                  <button 
                    onClick={() => setAdminTab('orders')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${adminTab === 'orders' ? 'bg-gold-500 text-navy-900 border-gold-500 shadow-lg shadow-gold-500/20' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'} border`}
                  >
                    <ShoppingCart size={14} />
                    নতুন অর্ডার
                    {businessStats.newOrders > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] ${adminTab === 'orders' ? 'bg-navy-900 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                        {businessStats.newOrders}
                      </span>
                    )}
                  </button>
                  <button 
                    onClick={() => setAdminTab('confirmed')}
                    className={`px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2 ${adminTab === 'confirmed' ? 'bg-gold-500 text-navy-900 border-gold-500 shadow-lg shadow-gold-500/20' : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/60'} border`}
                  >
                    <History size={14} />
                    অর্ডার হিস্ট্রি
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {adminTab === 'products' && (
                  <>
                    {showBulkDeleteConfirm ? (
                      <div className="flex items-center gap-2">
                        <button 
                          disabled={isBulkDeleting}
                          onClick={async () => {
                            setIsBulkDeleting(true);
                            try {
                              const productsToDelete = [...products];
                              let deletedCount = 0;
                              for (const p of productsToDelete) {
                                try {
                                  await deleteProduct(p.id);
                                  deletedCount++;
                                } catch (err) {
                                  console.error(`Failed to delete ${p.name}:`, err);
                                }
                              }
                              // Update local state without reload to be faster
                              setProducts([]);
                              setShowBulkDeleteConfirm(false);
                            } catch (err) {
                              console.error("Bulk delete failed:", err);
                            } finally {
                              setIsBulkDeleting(false);
                            }
                          }}
                          className="flex items-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                        >
                          {isBulkDeleting ? 'ডিলিট হচ্ছে...' : 'হ্যাঁ, ডিলিট করুন'}
                        </button>
                        <button 
                          disabled={isBulkDeleting}
                          onClick={() => setShowBulkDeleteConfirm(false)}
                          className="flex items-center gap-2 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl transition-all font-bold text-xs uppercase tracking-widest"
                        >
                          না
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-all font-bold border border-red-100 text-xs uppercase tracking-widest whitespace-nowrap"
                      >
                        <Trash2 size={18} />
                        সকল পণ্য ডিলিট করুন
                      </button>
                    )}
                    <button 
                      onClick={() => setEditingProduct({ name: '', price: 0, image: '', category: 'Cotton', description: '', stock: 0, saleCount: 0 })}
                      className="flex items-center gap-3 px-6 py-3 bg-gold-500 hover:bg-gold-600 text-navy-900 rounded-xl transition-all font-bold shadow-xl shadow-gold-500/20 group text-xs uppercase tracking-widest"
                    >
                      <Plus size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                      নতুন পণ্য যোগ করুন
                    </button>
                  </>
                )}
                
                <button 
                  onClick={() => setShowAdminPanel(false)}
                  className="flex items-center gap-3 px-6 py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-xl border border-white/10 transition-all font-bold group text-xs uppercase tracking-widest whitespace-nowrap"
                >
                  <X size={18} className="group-hover:rotate-90 transition-transform duration-500" />
                </button>
              </div>
            </div>
            
            <div className="container mx-auto px-6 py-12">
              {/* Products Tab */}
              {adminTab === 'products' && (
                <div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
                    <div>
                      <h3 className="text-4xl font-bold text-navy-900 mb-2">স্টক ইনভেন্টরি</h3>
                      <p className="text-slate-500 font-medium">আপনার স্টোরে মোট <span className="text-gold-600 font-bold">{products.length}টি</span> পণ্য রয়েছে।</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {products.map((product) => (
                      <div key={product.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                        <div className="aspect-video rounded-2xl overflow-hidden mb-6 bg-gray-100 relative shadow-inner">
                          {product.image && (
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                              loading="lazy"
                            />
                          )}
                          <div className="absolute top-4 left-4">
                            <span className="text-[9px] bg-white/90 backdrop-blur-md text-navy-900 px-3 py-1.5 rounded-full font-black tracking-widest uppercase shadow-sm">
                              {product.category}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Stock Available</span>
                              <span className={`text-sm font-black ${product.stock < 5 ? 'text-red-500 animate-pulse' : 'text-navy-900'}`}>{product.stock} pcs</span>
                          </div>
                          <div className="flex gap-2">
                            <button 
                                onClick={() => handleCopyLink(product.id)}
                                className="flex items-center gap-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all text-[10px] font-bold uppercase tracking-widest border border-blue-100"
                                title="পণ্য লিংক কপি করুন"
                            >
                              <Link size={12} />
                              Copy Link
                            </button>
                            <button 
                                onClick={() => setEditingProduct(product)}
                                className="p-2.5 text-slate-400 hover:text-gold-600 hover:bg-gold-50 rounded-xl transition-all border border-transparent hover:border-gold-100"
                                title="পরিবর্তন করুন"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteProduct(product.id, product.name); }}
                                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100"
                                title="মুছে ফেলুন"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <h3 className="font-bold text-navy-900 text-lg mb-1 leading-tight">{product.name}</h3>
                        <p className="text-gold-600 font-bold mb-4 font-serif italic text-xl">৳ {product.price.toLocaleString()}</p>
                        <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
                          {product.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Orders Tab (Pending) */}
              {adminTab === 'orders' && (
                <div className="space-y-6">
                  <div className="mb-10">
                    <h3 className="text-4xl font-bold text-navy-900 mb-2">নতুন অর্ডারসমূহ ({businessStats.newOrders})</h3>
                    <p className="text-slate-500">অপেক্ষমান কাস্টমারদের তালিকা নিচে দেখুন।</p>
                  </div>
                  {orders.filter(o => o.status === 'pending').length === 0 ? (
                    <div className="py-24 text-center bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                      <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 text-slate-200 shadow-sm">
                        <ShoppingBag size={40} />
                      </div>
                      <p className="text-slate-400 font-display italic">এখনও কোনো নতুন অর্ডার আসেনি।</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {orders.filter(o => o.status === 'pending').map((order) => (
                        <div key={order.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all duration-300">
                          <div className="flex flex-col lg:flex-row justify-between gap-8">
                            <div className="space-y-4 flex-1">
                              <div className="flex flex-wrap items-center gap-4">
                                <span className="text-[10px] uppercase font-black tracking-[0.2em] px-4 py-1.5 rounded-full bg-orange-100 text-orange-600">
                                  Pending Order
                                </span>
                                <span className="text-xs text-slate-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                                <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</span>
                              </div>
                              <h3 className="text-3xl font-bold text-navy-900">{order.customerName}</h3>
                              <div className="flex flex-wrap gap-6 text-sm text-slate-600">
                                <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl"><Phone size={14} className="text-gold-500" /> {order.customerPhone}</span>
                                <span className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl"><MapPin size={14} className="text-gold-500" /> {order.customerAddress}</span>
                              </div>
                              {order.customerNote && (
                                <p className="bg-indigo-50/50 p-5 rounded-2xl text-sm italic text-indigo-900 border-l-4 border-indigo-500">
                                  " {order.customerNote} "
                                </p>
                              )}
                            </div>
                            
                            <div className="flex flex-col items-center lg:items-end justify-between border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-12">
                              <div className="text-center lg:text-right mb-6">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Bill</p>
                                <p className="text-4xl font-serif text-navy-900 font-black italic">৳ {order.total.toLocaleString()}</p>
                                <p className="text-[11px] font-bold text-gold-600 mt-2 uppercase tracking-wide">
                                  Payment: {order.paymentMethod.toUpperCase()} {order.transactionId && `(${order.transactionId})`}
                                </p>
                              </div>
                              <div className="flex flex-wrap justify-center gap-3">
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'confirmed')} 
                                  className="bg-green-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-green-700 shadow-xl shadow-green-600/20 transition-all hover:-translate-y-1"
                                >
                                  এপ্রুভ করুন
                                </button>
                                <button 
                                  onClick={() => updateOrderStatus(order.id, 'cancelled')} 
                                  className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-all border border-red-100"
                                >
                                  ক্যান্সেল
                                </button>
                                <button 
                                  onClick={() => handleDeleteOrder(order.id)} 
                                  className="p-4 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all"
                                >
                                  <Trash2 size={20} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Order History Tab */}
              {adminTab === 'confirmed' && (
                <div className="space-y-6">
                  <div className="mb-10">
                    <h3 className="text-4xl font-bold text-navy-900 mb-2">অর্ডার হিস্ট্রি</h3>
                    <p className="text-slate-500">প্রক্রিয়াধীন এবং ডেলিভারড অর্ডারগুলোর তালিকা।</p>
                  </div>
                  {orders.filter(o => o.status !== 'pending' && o.status !== 'cancelled').length === 0 ? (
                    <div className="py-24 text-center text-slate-300 italic">এখনও কোনো কনফার্ম অর্ডার নেই।</div>
                  ) : (
                    <div className="grid gap-6">
                      {orders.filter(o => o.status !== 'pending' && o.status !== 'cancelled').map((order) => (
                        <div key={order.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                          <div className="flex flex-col lg:flex-row justify-between gap-8">
                            <div className="space-y-4 flex-1">
                              <div className="flex flex-wrap items-center gap-4">
                                <span className={`text-[10px] uppercase font-black tracking-[0.2em] px-4 py-1.5 rounded-full ${
                                  order.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                                  order.status === 'shipped' ? 'bg-indigo-100 text-indigo-600' : 'bg-green-100 text-green-600'
                                }`}>
                                  {order.status}
                                </span>
                                <span className="text-xs text-slate-400 font-mono">#{order.id.slice(-6).toUpperCase()}</span>
                                <span className="text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</span>
                              </div>
                              <h3 className="text-2xl font-bold text-navy-900">{order.customerName}</h3>
                              <p className="text-sm text-slate-500 flex items-center gap-2"><MapPin size={14} /> {order.customerAddress}</p>
                            </div>
                            
                            <div className="flex flex-col items-center lg:items-end justify-between">
                              <div className="text-center lg:text-right mb-4">
                                <p className="text-2xl font-serif text-navy-900 font-black italic">৳ {order.total.toLocaleString()}</p>
                              </div>
                              <div className="flex gap-3">
                                {order.status === 'confirmed' && (
                                  <button onClick={() => updateOrderStatus(order.id, 'shipped')} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all">শিপ করুন</button>
                                )}
                                {order.status === 'shipped' && (
                                  <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="bg-navy-900 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">ডেলিভারড</button>
                                )}
                                <button onClick={() => handleDeleteOrder(order.id)} className="p-3.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded-2xl transition-all">
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Business Health Modal */}
            <AnimatePresence>
              {showBusinessHealth && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowBusinessHealth(false)}
                    className="absolute inset-0 bg-navy-900/80 backdrop-blur-sm"
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white rounded-[2rem] w-full max-w-2xl relative z-10 overflow-hidden shadow-2xl"
                  >
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-navy-900 text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500 rounded-xl text-navy-900">
                          <BarChart3 size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold font-serif uppercase tracking-wider">Business Health</h3>
                          <p className="text-xs text-slate-400">ব্যবসায়িক পরিস্থিতি একনজরে দেখুন</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowBusinessHealth(false)}
                        className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-95"
                        title="বন্ধ করুন"
                      >
                        <X size={28} />
                      </button>
                    </div>

                    <div className="p-8 max-h-[75vh] overflow-y-auto">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-navy-900">
                            <ShoppingBag size={20} />
                          </div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">মোট অর্ডার</p>
                          <div className="text-4xl font-black text-navy-900">{businessStats.totalOrders}</div>
                        </div>

                        <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-green-600">
                            <TrendingUp size={20} />
                          </div>
                          <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">কনফার্ম অর্ডার</p>
                          <div className="text-4xl font-black text-green-700">{businessStats.confirmedOrders}</div>
                        </div>

                        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-red-600">
                            <X size={20} />
                          </div>
                          <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-1">রিজেক্টেড অর্ডার</p>
                          <div className="text-4xl font-black text-red-700">{businessStats.rejectedOrders}</div>
                        </div>

                        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100 flex flex-col items-center text-center">
                          <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4 text-orange-600">
                            <ShoppingCart size={20} />
                          </div>
                          <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mb-1">অপেক্ষমান অর্ডার (নতুন)</p>
                          <div className="text-4xl font-black text-orange-700">{businessStats.newOrders}</div>
                        </div>
                      </div>

                      <div className="mt-8 p-6 bg-navy-900 text-white rounded-2xl border border-gold-500/30 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 blur-3xl group-hover:bg-gold-500/20 transition-all"></div>
                        <div className="flex items-center gap-4 relative z-10">
                          <div className="w-14 h-14 bg-gold-500 rounded-xl flex items-center justify-center text-navy-900 shadow-lg shadow-gold-500/20">
                            <BarChart3 size={28} />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gold-500 uppercase tracking-[0.2em] mb-1">Business Summary</p>
                            <p className="text-slate-200 leading-relaxed text-sm">
                              আপনার স্টোরে বর্তমানে <span className="text-gold-500 font-bold">{businessStats.newOrders} টি</span> নতুন অর্ডার অপেক্ষায় আছে। গত ২৪ ঘন্টায় <span className="text-gold-500 font-bold">{businessStats.newOrders24h} টি</span> অর্ডার এসেছে।
                            </p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => setShowBusinessHealth(false)}
                        className="w-full mt-8 bg-navy-900 text-white font-bold py-5 rounded-2xl hover:bg-navy-800 transition-all shadow-xl shadow-navy-900/10 active:scale-[0.98]"
                      >
                        ফিরে যান (Close)
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Add/Edit Product Modal */}
            <AnimatePresence>
              {(isAddingProduct || editingProduct) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl"
                  >
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-navy-900 text-white">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gold-500 rounded-xl text-navy-900">
                          {(editingProduct && (editingProduct as any).id) ? <Edit size={20} /> : <Plus size={20} />}
                        </div>
                        <h3 className="text-xl font-bold font-display uppercase tracking-wider">{(editingProduct && (editingProduct as any).id) ? 'পণ্য এডিট করুন' : 'নতুন পণ্য যোগ করুন'}</h3>
                      </div>
                      <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="p-3 hover:bg-white/10 rounded-full transition-all active:scale-95">
                        <X size={24} />
                      </button>
                    </div>
                    <div className="p-8 max-h-[70vh] overflow-y-auto">
                      <ProductForm 
                        initialData={editingProduct || undefined} 
                        onDelete={async (id) => {
                          await deleteProduct(id);
                          setEditingProduct(null);
                          await fetchProducts();
                        }}
                        onSubmit={async (data) => {
                          if (editingProduct && (editingProduct as any).id) {
                            await updateProduct((editingProduct as any).id, data);
                          } else {
                            await addProduct({ ...data, order: products.length + 1 });
                          }
                          await fetchProducts();
                          setIsAddingProduct(false);
                          setEditingProduct(null);
                        }}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Delete Confirmation Modal */}
            <AnimatePresence>
              {productToDelete && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl"
                  >
                    <div className="p-6 bg-red-600 text-white flex items-center gap-3">
                      <Trash2 size={24} />
                      <h3 className="text-lg font-bold">পণ্য ডিলিট কনফার্মেশন</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <p className="text-slate-600 font-medium">
                        আপনি কি নিশ্চিতভাবে <span className="font-bold text-navy-900">"{productToDelete.name}"</span> পণ্যটি স্থায়ীভাবে মুছে ফেলতে চান? এটি আর ফিরিয়ে আনা যাবে না।
                      </p>
                      <div className="flex gap-3 justify-end pt-2">
                        <button 
                          type="button"
                          onClick={() => setProductToDelete(null)}
                          className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all text-sm active:scale-95"
                        >
                          বাতিল
                        </button>
                        <button 
                          type="button"
                          onClick={confirmDeleteProduct}
                          className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-red-600/20 active:scale-95"
                        >
                          হ্যাঁ, মুছে ফেলুন
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* User Orders History Modal */}
      <AnimatePresence>
        {showUserOrders && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh]"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-navy-900 text-white">
                <div className="flex items-center gap-4">
                  <Package size={24} className="text-gold-500" />
                  <div>
                    <h3 className="text-xl font-bold font-serif italic text-white leading-none">আপনার পূর্ববর্তী অর্ডারসমূহ</h3>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Track your premium three-piece order status</p>
                  </div>
                </div>
                <button onClick={() => setShowUserOrders(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
                {userOrders.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-gray-200 shadow-sm">
                      <ShoppingBag size={48} />
                    </div>
                    <div>
                      <p className="text-navy-900 font-bold text-lg">এখনও কোনো অর্ডার করেননি?</p>
                      <p className="text-slate-400 text-sm mt-2">আপনার পছন্দের আকর্ষনীয় থ্রিপিস কালেকশন কিনুন আজই!</p>
                    </div>
                    <button 
                      onClick={() => { setShowUserOrders(false); window.scrollTo({ top: document.getElementById('products')?.offsetTop || 0, behavior: 'smooth' }); }}
                      className="bg-navy-900 text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-gold-500 hover:text-navy-900 transition-all shadow-lg"
                    >
                      কেনাকাটা শুরু করুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {userOrders.map((order) => (
                      <div key={order.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row justify-between mb-6 pb-6 border-b border-gray-50 gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                               <span className={`text-[10px] uppercase font-bold tracking-widest px-3 py-1 rounded-full ${
                                 order.status === 'pending' ? 'bg-orange-100 text-orange-600' :
                                 order.status === 'confirmed' ? 'bg-blue-100 text-blue-600' :
                                 order.status === 'shipped' ? 'bg-purple-100 text-purple-600' :
                                 order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                                 'bg-red-100 text-red-600'
                               }`}>
                                 {order.status === 'pending' ? 'Pending' :
                                  order.status === 'confirmed' ? 'Approved' :
                                  order.status === 'shipped' ? 'Shipped' :
                                  order.status === 'delivered' ? 'Delivered' :
                                  'Cancelled'}
                               </span>
                               <span className="text-xs text-slate-400 font-medium">#{order.id.slice(-6).toUpperCase()}</span>
                            </div>
                            <p className="text-xs text-slate-400 font-bold italic mb-1">{new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}</p>
                            <h4 className="font-bold text-navy-900 truncate">{order.customerAddress}</h4>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Payment</p>
                             <p className="text-xs font-bold text-navy-900">
                               {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 
                                order.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'}
                             </p>
                             {order.transactionId && (
                               <p className="text-[10px] text-gold-600 font-mono font-bold mt-0.5">{order.transactionId}</p>
                             )}
                             <p className="text-2xl font-serif text-navy-900 font-bold italic mt-2">৳ {order.total.toLocaleString()}</p>
                          </div>
                        </div>

                        {order.items && order.items.length > 0 && (
                          <div className="space-y-3">
                            <h5 className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em] mb-2">অর্ডারকৃত প্রোডাক্ট সমুহ:</h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                               {order.items.map((item, idx) => (
                                 <div key={idx} className="flex gap-4 items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center font-bold text-navy-900 shadow-sm text-sm">
                                      {item.quantity}x
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-navy-900 truncate">{item.productName}</p>
                                      <p className="text-xs text-slate-400">৳ {(item.price * item.quantity).toLocaleString()}</p>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="mt-6 pt-4 flex justify-between items-center text-xs">
                           <div className="flex items-center gap-2 text-slate-400">
                             <MapPin size={12} className="text-gold-500" />
                             <span>Home Delivery</span>
                           </div>
                             <div className="font-bold text-gold-600 uppercase tracking-widest text-[10px]">
                               {order.status === 'pending' ? 'অর্ডারটি প্রক্রিয়াধীন (Processing)' : 
                                order.status === 'confirmed' ? 'অর্ডারটি এপ্রুভ হয়েছে (Approved)' :
                                order.status === 'shipped' ? 'অর্ডারটি শিপড করা হয়েছে (In Transit)' :
                                order.status === 'delivered' ? 'অর্ডারটি ডেলিভারড হয়েছে (Success!)' : 'অর্ডারটি ক্যান্সেল করা হয়েছে'}
                             </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <SpeedInsights />
    </div>
  );
}

function ProductForm({ initialData, onSubmit, onDelete }: { initialData?: Product, onSubmit: (data: Omit<Product, 'id' | 'order'>) => Promise<void>, onDelete?: (id: string) => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    price: initialData?.price || 0,
    image: initialData?.image || '',
    images: initialData?.images || [] as string[],
    category: initialData?.category || '',
    description: initialData?.description || '',
    stock: initialData?.stock || 0,
    features: initialData?.features?.join(', ') || ''
  });
  const [loading, setLoading] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState('');

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>, isGallery = false) => {
    if (isGallery && formData.images.length >= 6) {
      alert("সর্বোচ্চ ৬টি গ্যালারি ছবি যোগ করা যাবে।");
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Maintain aspect ratio, max dimension 1000px
        const maxDim = 1000;
        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Export as JPEG with 0.6 quality to save space
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        
        if (isGallery) {
          setFormData(prev => ({ ...prev, images: [...prev.images, dataUrl] }));
        } else {
          setFormData(prev => ({ ...prev, image: dataUrl }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addGalleryUrl = () => {
    if (formData.images.length >= 6) {
      alert("সর্বোচ্চ ৬টি গ্যালারি ছবি যোগ করা যাবে।");
      return;
    }
    if (newImageUrl.trim()) {
      setFormData(prev => ({ ...prev, images: [...prev.images, newImageUrl.trim()] }));
      setNewImageUrl('');
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        ...formData,
        features: formData.features.split(',').map(f => f.trim()).filter(Boolean)
      });
    } catch (e) {
      alert("Error saving product.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {initialData && initialData.id && (
        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <Share2 size={12} /> Product Share Link
            </h4>
            <span className="text-[9px] text-blue-400 font-bold uppercase italic border-b border-blue-200">Public Link</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input 
                readOnly
                value={`${(window.location.origin + window.location.pathname).replace('ais-dev-', 'ais-pre-').split('?')[0].split('#')[0]}?product=${initialData.id}`}
                className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-[10px] text-blue-900 font-mono outline-none shadow-inner"
              />
            </div>
            <button 
              type="button"
              onClick={() => {
                let baseUrl = (window.location.origin + window.location.pathname).replace('ais-dev-', 'ais-pre-').split('?')[0].split('#')[0];
                if (!baseUrl.endsWith('/')) baseUrl += '/';
                const url = `${baseUrl}?product=${initialData.id}`;
                navigator.clipboard.writeText(url);
                alert("সঠিক প্রোডাক্ট লিংকটি কপি করা হয়েছে!");
              }}
              className="bg-blue-600 text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-blue-600/20 active:scale-95"
            >
              <Link size={14} /> Copy Link
            </button>
          </div>
          <p className="text-[9px] text-blue-500 font-medium italic">* কাস্টমার এই লিংকে ক্লিক করলে অন্য কোথাও না গিয়ে সরাসরি এই পন্যটি দেখতে পাবে।</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-500">পণ্যের নাম</label>
          <input 
            required
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-500">ক্যাটাগরি</label>
          <select 
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none bg-white"
          >
            <option value="">Select Category</option>
            <option value="Cotton">Cotton (সুতি)</option>
            <option value="Georgette">Georgette (জর্জেট)</option>
            <option value="Silk">Silk (সিল্ক)</option>
            <option value="Linen">Linen (লিনেন)</option>
            <option value="Viscose">Viscose (ভিসকস)</option>
            <option value="Party Wear">Party Wear (পার্টি ওয়্যার)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-500">মূল্য (৳)</label>
          <input 
            type="number"
            required
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-widest font-bold text-slate-500">স্টক পরিমাণ (Stock Quantity)</label>
          <input 
            type="number"
            required
            value={formData.stock}
            onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none"
          />
        </div>
      </div>
      
      <div className="space-y-4 border border-gray-100 p-6 rounded-2xl bg-gray-50/50">
        <label className="text-xs uppercase tracking-widest font-bold text-slate-500 block">পণ্যের ছবি (Product Image)</label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Image URL</label>
              <input 
                value={formData.image.startsWith('data:') ? '' : formData.image}
                onChange={e => setFormData({ ...formData, image: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none bg-white text-sm"
                placeholder="https://..."
              />
            </div>
            
            <div className="relative">
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Or Upload from Gallery</label>
              <div className="flex items-center gap-3">
                <label className="flex-1 border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-gold-500 transition-colors cursor-pointer bg-white flex items-center justify-center gap-2">
                  <Upload size={16} className="text-gray-400" />
                  <span className="text-sm font-bold text-navy-900/60">Choose File</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="aspect-video bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center relative group">
            {formData.image ? (
              <>
                <img 
                  src={formData.image} 
                  alt="Preview" 
                  className="w-full h-full object-cover" 
                  loading="lazy"
                />
                <button 
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-300">
                <ImageIcon size={40} />
                <span className="text-xs font-bold font-serif italic">Preview Area</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 border border-gray-100 p-6 rounded-2xl bg-gold-50/10">
        <label className="text-xs uppercase tracking-widest font-bold text-slate-500 block flex items-center justify-between">
          <span>অতিরিক্ত গ্যালারি ছবিসমূহ (সর্বোচ্চ ৬টি)</span>
          <span className="bg-gold-500/10 text-gold-600 px-2 py-0.5 rounded text-[10px] font-bold">{formData.images.length}/6 added</span>
        </label>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <input 
              value={newImageUrl}
              onChange={e => setNewImageUrl(e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none bg-white text-sm"
              placeholder="পণ্যর অতিরিক্ত ছবির লিংক এখানে দিন..."
            />
            <button 
              type="button"
              onClick={addGalleryUrl}
              className="bg-navy-900 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-gold-500 hover:text-navy-900 transition-all whitespace-nowrap"
            >
              Add URL
            </button>
          </div>

          <div className="relative">
            <label className="flex w-full border border-dashed border-gray-300 rounded-xl px-4 py-3 hover:border-gold-500 transition-colors cursor-pointer bg-white flex items-center justify-center gap-2">
              <Upload size={16} className="text-gray-400" />
              <span className="text-sm font-bold text-navy-900/60">গ্যালারি থেকে ছবি আপলোড করুন</span>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
            </label>
          </div>

          {formData.images.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {formData.images.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                  <img 
                    src={img} 
                    alt="Gallery" 
                    className="w-full h-full object-cover" 
                    loading="lazy"
                  />
                  <button 
                    type="button"
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest font-bold text-slate-500">বিবরণ (Description)</label>
        <textarea 
          required
          rows={4}
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs uppercase tracking-widest font-bold text-slate-500">বৈশিষ্ট্যসমূহ (Features - কমা দিয়ে আলাদা করুন)</label>
        <input 
          value={formData.features}
          onChange={e => setFormData({ ...formData, features: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-gold-500 outline-none"
          placeholder="Safe material, STEM, Ages 5+"
        />
      </div>

      <div className="flex gap-4">
        {initialData && (initialData as any).id && onDelete && (
          showDeleteConfirm ? (
            <div className="flex-1 flex gap-2 border border-red-200 bg-red-50/50 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  onDelete(initialData.id);
                  setShowDeleteConfirm(false);
                }}
                className="flex-1 bg-red-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-red-700 transition-all text-sm flex items-center justify-center gap-1 shadow-lg shadow-red-600/10 active:scale-95"
              >
                হ্যাঁ
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-white text-slate-600 font-bold py-3 px-4 rounded-xl hover:bg-slate-50 transition-all border border-slate-200 text-sm flex items-center justify-center active:scale-95"
              >
                বাতিল
              </button>
            </div>
          ) : (
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 border border-red-100"
            >
              <Trash2 size={18} /> মুছে ফেলুন
            </button>
          )
        )}
        <button 
          disabled={loading}
          className={`${(initialData && (initialData as any).id) ? 'flex-[2]' : 'w-full'} bg-gold-500 text-navy-900 font-bold py-4 rounded-2xl hover:bg-gold-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-gold-500/20 active:scale-[0.98] disabled:opacity-50`}
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-navy-900 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Save size={18} />
              {(initialData && (initialData as any).id) ? 'আপডেট করুন (Update)' : 'পণ্যটি যোগ করুন (Add Product)'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function CheckoutForm({ 
  onSubmit, 
  deliveryArea,
  setDeliveryArea,
  cartItems,
  updateCartQuantity
}: { 
  onSubmit: (data: { customerName: string, customerPhone: string, customerAddress: string, customerNote: string, paymentMethod: 'cod' | 'bkash' | 'nagad', transactionId?: string }) => Promise<void>,
  deliveryArea: 'inside' | 'outside' | null,
  setDeliveryArea: (area: 'inside' | 'outside' | null) => void,
  cartItems: { product: Product, quantity: number }[],
  updateCartQuantity: (productId: string, newQuantity: number) => void
}) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerNote: '',
    paymentMethod: 'cod' as 'cod' | 'bkash' | 'nagad',
    transactionId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!deliveryArea) {
      alert("দয়াকরে ডেলিভারি এলাকা সিলেক্ট করুন।");
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (e) {
      alert("Error placing order.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">আপনার নাম</label>
            <input 
              required
              value={formData.customerName}
              onChange={e => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all text-sm"
              placeholder="যেমন: রহিম আহমেদ"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">ফোন নম্বর</label>
            <input 
              required
              type="tel"
              value={formData.customerPhone}
              onChange={e => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all text-sm"
              placeholder="017xxxxxxxx"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">সম্পূর্ণ ঠিকানা</label>
          <textarea 
            required
            rows={3}
            value={formData.customerAddress}
            onChange={e => setFormData({ ...formData, customerAddress: e.target.value })}
            className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all text-sm resize-none"
            placeholder="বাসা নং, রোড নং, এলাকা, জেলা..."
          />
        </div>

        {/* Quantity Selection Section */}
        <div className="space-y-4">
          <label className="text-xs uppercase font-bold text-slate-500 tracking-wider block">পণ্য এবং পরিমাণ</label>
          <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            {cartItems.map((item) => (
              <div key={item.product.id} className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-white border border-gray-100 overflow-hidden shrink-0 shadow-sm">
                  {item.product.image && (
                    <img 
                      src={item.product.image} 
                      className="w-full h-full object-cover" 
                      alt={item.product.name}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-navy-900 leading-tight">{item.product.name}</p>
                  <p className="text-[10px] text-slate-400">৳ {item.product.price.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-xl p-1.5 border border-gray-200 shadow-sm">
                  <button 
                    type="button"
                    onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      item.quantity <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-navy-900 hover:bg-gray-100'
                    }`}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="font-bold text-sm text-navy-900 min-w-[24px] text-center">{item.quantity}</span>
                  <button 
                    type="button"
                    onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                    className="w-7 h-7 flex items-center justify-center text-navy-900 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs uppercase font-bold text-slate-500 tracking-wider block">ডেলিভারি এলাকা সিলেক্ট করুন</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label 
              className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                deliveryArea === 'inside' ? 'border-gold-500 bg-gold-50 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <input type="radio" name="area" className="hidden" onChange={() => setDeliveryArea('inside')} checked={deliveryArea === 'inside'} />
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${deliveryArea === 'inside' ? 'border-gold-500' : 'border-gray-300'}`}>
                {deliveryArea === 'inside' && <div className="w-2 h-2 rounded-full bg-gold-500" />}
              </div>
              <div>
                <p className="font-bold text-sm text-navy-900">ঢাকার ভিতরে</p>
                <p className="text-[10px] text-slate-500">চার্জ: ১২০ টাকা</p>
              </div>
            </label>
            <label 
              className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:scale-[1.02] active:scale-95 ${
                deliveryArea === 'outside' ? 'border-gold-500 bg-gold-50 shadow-md' : 'border-gray-100 hover:border-gray-200 bg-white'
              }`}
            >
              <input type="radio" name="area" className="hidden" onChange={() => setDeliveryArea('outside')} checked={deliveryArea === 'outside'} />
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${deliveryArea === 'outside' ? 'border-gold-500' : 'border-gray-300'}`}>
                {deliveryArea === 'outside' && <div className="w-2 h-2 rounded-full bg-gold-500" />}
              </div>
              <div>
                <p className="font-bold text-sm text-navy-900">ঢাকার বাহিরে</p>
                <p className="text-[10px] text-slate-500">চার্জ: ১৫০ টাকা</p>
              </div>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs uppercase font-bold text-slate-500 tracking-wider block font-bold">পেমেন্ট মেথড</label>
          <div className="grid grid-cols-1 gap-3">
            <label 
              className="relative flex items-center gap-3 p-4 rounded-xl border-2 border-navy-900 bg-navy-50/50 ring-2 ring-navy-900/10 shadow-sm cursor-default"
            >
              <div className="flex-1">
                <p className="font-bold text-xs text-navy-900">Cash on Delivery</p>
                <div className="text-[8px] text-slate-400 mt-0.5">পণ্য হাতে পেয়ে টাকা পরিশোধ করুন</div>
              </div>
              <Activity size={14} className="text-navy-900" />
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase font-bold text-slate-500 tracking-wider">বিশেষ নোট (ঐচ্ছিক)</label>
          <input 
            value={formData.customerNote}
            onChange={e => setFormData({ ...formData, customerNote: e.target.value })}
            className="w-full border border-gray-200 rounded-2xl px-5 py-4 focus:border-gold-500 focus:ring-4 focus:ring-gold-500/5 outline-none transition-all text-sm"
            placeholder="যেমন: বিকেলে ডেলিভারি দিন"
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900 font-bold py-5 rounded-2xl transition-all shadow-xl shadow-gold-500/20 mt-4 flex items-center justify-center gap-2"
        >
          {loading ? 'প্রসেসিং হচ্ছে...' : <><ShoppingBag size={20} /> অর্ডার সম্পন্ন করুন</>}
        </button>
      </div>
    </form>
  );
}
