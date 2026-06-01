import React, { useState, useMemo, useEffect } from "react";

// ============================================================================
// DINE 99 — neon retro-diner food finder, as a responsive website.
// Pick a craving → nearby spots ranked by price. Neon + checkerboard + chrome.
// Photos via LoremFlickr (CC, no key) — swap buildImg(). Restaurant rows are
// sample data — swap generateRestaurants() for a live places + pricing feed.
// ============================================================================

const FOODS = [
  { id: "hamburger", name: "Hamburger", kw: "hamburger", base: 8.5, cat: "Burgers" },
  { id: "cheeseburger", name: "Cheeseburger", kw: "cheeseburger", base: 9.5, cat: "Burgers" },
  { id: "grilled-chicken-sandwich", name: "Grilled Chicken", kw: "grilledchicken", base: 9.5, cat: "Chicken" },
  { id: "fried-chicken-sandwich", name: "Fried Chicken", kw: "friedchicken", base: 9.75, cat: "Chicken" },
  { id: "chicken-wings", name: "Chicken Wings", kw: "chickenwings", base: 12.0, cat: "Chicken" },
  { id: "italian-beef", name: "Italian Beef", kw: "sandwich", base: 9.95, cat: "Classics" },
  { id: "philly-cheesesteak", name: "Philly Cheesesteak", kw: "cheesesteak", base: 11.5, cat: "Classics" },
  { id: "hot-dog", name: "Hot Dog", kw: "hotdog", base: 4.5, cat: "Classics" },
  { id: "pizza-slice", name: "Pizza Slice", kw: "pizza", base: 4.25, cat: "Pizza" },
  { id: "pizza-14", name: '14" Pizza', kw: "pizza", base: 17.0, cat: "Pizza" },
  { id: "tacos", name: "Tacos", kw: "tacos", base: 3.75, cat: "Mexican" },
  { id: "burrito", name: "Burrito", kw: "burrito", base: 10.5, cat: "Mexican" },
  { id: "shawarma", name: "Shawarma", kw: "shawarma", base: 9.75, cat: "Mediterranean" },
  { id: "gyros", name: "Gyros", kw: "gyro", base: 9.5, cat: "Mediterranean" },
  { id: "french-fries", name: "French Fries", kw: "frenchfries", base: 4.5, cat: "Sides" },
  { id: "onion-rings", name: "Onion Rings", kw: "onionrings", base: 5.25, cat: "Sides" },
];
const CATS = ["All", "Burgers", "Chicken", "Classics", "Pizza", "Mexican", "Mediterranean", "Sides"];

// Soft pastel gradient per category — warm, designed, on-brand.
const CAT_GRAD = {
  Burgers: ["#ffe6c2", "#ffcf9e"],
  Chicken: ["#fff0bf", "#ffe08a"],
  Classics: ["#ffd9d6", "#ffbcb5"],
  Pizza: ["#ffd7c2", "#ffc0a3"],
  Mexican: ["#d8f0c2", "#bce3a0"],
  Mediterranean: ["#c7eee8", "#a5e0d6"],
  Sides: ["#ffe2cc", "#ffd0ad"],
};
const gradFor = (food) => {
  const c = CAT_GRAD[food?.cat] || ["#ffe6c2", "#ffcf9e"];
  return `linear-gradient(135deg, ${c[0]}, ${c[1]})`;
};

const NAME_PREFIX = [
  "Lucky", "Star", "Golden", "Route 66", "Sunset", "Liberty", "Capitol",
  "Maple", "Cherry", "Blue Moon", "Coral", "Highway", "Main St.", "Riverside",
  "Corner", "Uptown", "Vintage", "Rosie's", "Hank's", "Della's", "Aviation",
];
const NAME_SUFFIX = {
  default: ["Diner", "Grill", "Kitchen", "Eatery", "Co.", "Counter", "House", "Drive-In"],
  "pizza-slice": ["Pizzeria", "Pizza Co.", "Slice House", "Brick Oven"],
  "pizza-14": ["Pizzeria", "Pizza Co.", "Brick Oven", "Pie Co."],
  tacos: ["Taqueria", "Cantina", "Tacos"],
  burrito: ["Taqueria", "Cantina", "Burrito Bar"],
  gyros: ["Gyros", "Mediterranean", "Taverna"],
  shawarma: ["Kebab House", "Mediterranean", "Grill House"],
  "italian-beef": ["Beef & Sausage", "Italian Deli", "Beef Stand"],
  "philly-cheesesteak": ["Cheesesteaks", "Steaks & Hoagies", "Philly's"],
  "hot-dog": ["Red Hots", "Dog House", "Hot Dog Stand"],
  "chicken-wings": ["Wing Co.", "Wings & Things", "Wing Shack"],
  "grilled-chicken-sandwich": ["Chicken Shack", "Grill", "Coop"],
  "fried-chicken-sandwich": ["Chicken Shack", "Fry House", "Coop"],
  "french-fries": ["Drive-In", "Snack Shack", "Fry Stand"],
  "onion-rings": ["Drive-In", "Snack Shack", "Burger Stand"],
};
const STREETS = ["Ogden Ave", "Main St", "Maple Ave", "Curtiss St", "Warren Ave", "Highland Ave", "Burlington Ave", "Prince St", "Grove St", "Saratoga Ave", "Belmont Rd"];

function buildImg(kw, w, h, lock) { return `https://loremflickr.com/${w}/${h}/${kw}?lock=${lock}`; }
function seeded(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function hashStr(str) { let h = 0; for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; } return Math.abs(h); }
const lockFor = (id) => (hashStr(id) % 92) + 1;

// --- Real-data helpers ---
function haversine(lat1, lng1, lat2, lng2) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return +(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

// Maps Google price_level (0–4) to an estimated item price
function estimatePrice(level, base) {
  const mult = [0.7, 0.85, 1.0, 1.4, 2.0];
  return +(base * (mult[level ?? 1] ?? 1.0)).toFixed(2);
}

function photoUrl(ref) {
  return `/api/photo?ref=${encodeURIComponent(ref)}&w=400`;
}

function generateRestaurants(foodId) {
  const food = FOODS.find((f) => f.id === foodId);
  const rand = seeded(hashStr(foodId) + 7);
  const count = 16 + Math.floor(rand() * 8);
  const suffixes = NAME_SUFFIX[foodId] || NAME_SUFFIX.default;
  const used = new Set();
  const list = [];
  for (let i = 0; i < count; i++) {
    let name, guard = 0;
    do {
      const p = NAME_PREFIX[Math.floor(rand() * NAME_PREFIX.length)];
      const s = suffixes[Math.floor(rand() * suffixes.length)];
      name = `${p} ${s}`; guard++;
    } while (used.has(name) && guard < 20);
    used.add(name);
    const distance = +(0.2 + rand() * 11.8).toFixed(1);
    const wobble = (rand() - 0.45) * food.base * 0.55;
    const price = Math.max(2.5, +(food.base + wobble).toFixed(2));
    const rating = +(3.4 + rand() * 1.6).toFixed(1);
    const reviews = 12 + Math.floor(rand() * 1800);
    const open = rand() > 0.16;
    const addr = `${100 + Math.floor(rand() * 1800)} ${STREETS[Math.floor(rand() * STREETS.length)]}`;
    const closes = `${9 + Math.floor(rand() * 3)}:00 PM`;
    list.push({ id: `${foodId}-${i}`, foodId, name, distance, price, rating, reviews, open, addr, closes });
  }
  return list;
}

function FoodImg({ kw, w, h, lock, cls, label }) {
  const [err, setErr] = useState(false);
  if (err) return <div className={`fimg fb ${cls}`} style={{ "--g": hashStr(label || kw) % 360 }}><span>{label}</span></div>;
  return <img className={`fimg ${cls}`} loading="lazy" alt={label || kw} src={buildImg(kw, w, h, lock)} onError={() => setErr(true)} />;
}

const Star = () => (<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 17.3 6.2 20.5l1.1-6.5L2.5 9.4l6.5-1L12 2.5l3 5.9 6.5 1-4.8 4.6 1.1 6.5z" /></svg>);
const Pin = () => (<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" /><circle cx="12" cy="10" r="3" /></svg>);
const Heart = ({ filled }) => (<svg viewBox="0 0 24 24" width="20" height="20" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.5 1-1a5.5 5.5 0 0 0 0-7.9z" /></svg>);
const SearchI = () => null;
const Back = () => (<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>);

// Clean line icons per category — replace emoji until real photos load.
const ICON_PATHS = {
  Burgers: <><path d="M5 10a7 7 0 0 1 14 0H5z"/><path d="M4 13.2h16"/><path d="M6 16h12a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/></>,
  Chicken: <><circle cx="14.5" cy="9.5" r="4.5"/><path d="M11.3 12.7 6 18m0 0-2.2.6L4.4 21 6 18zm0 0 .6 2.2"/></>,
  Pizza: <><path d="M12 21 4.5 7.5a17 17 0 0 1 15 0L12 21z"/><circle cx="10" cy="10.5" r=".9" fill="currentColor" stroke="none"/><circle cx="13.5" cy="13" r=".9" fill="currentColor" stroke="none"/></>,
  Mexican: <><path d="M3.5 17a8.5 8.5 0 0 1 17 0H3.5z"/><path d="M3.5 17h17"/></>,
  Mediterranean: <><line x1="5.5" y1="18.5" x2="18.5" y2="5.5"/><circle cx="9.5" cy="12.5" r="1.8"/><circle cx="13" cy="9" r="1.8"/></>,
  Sides: <><path d="M7 9l.7-3 2 .6M10 8.5 11.8 5l2 .8M14 8.2 16.5 6l1.6 1.6"/><path d="M5.5 9h13l-1.4 9.3a2 2 0 0 1-2 1.7H8.9a2 2 0 0 1-2-1.7z"/></>,
  default: <><path d="M7 3v8M9.5 3v8M7 11v8M9.5 11v8M8.25 3v16"/><path d="M16 3c-1.6 1-2.2 3-2.2 5.2 0 1.7 1 2.8 2.2 2.8v8"/></>,
};
// Per-item icon from Iconify's fluent-emoji-high-contrast set (verified to exist).
const FOOD_ICON = {
  hamburger: "hamburger", cheeseburger: "hamburger",
  "grilled-chicken-sandwich": "poultry-leg", "fried-chicken-sandwich": "poultry-leg", "chicken-wings": "poultry-leg",
  "italian-beef": "sandwich", "philly-cheesesteak": "sandwich", "hot-dog": "hot-dog",
  "pizza-slice": "pizza", "pizza-14": "pizza", tacos: "taco", burrito: "burrito",
  shawarma: "flatbread", gyros: "flatbread", "french-fries": "french-fries", "onion-rings": "onion",
};
function FoodIcon({ id, cat, size = 52 }) {
  const [err, setErr] = useState(false);
  const name = FOOD_ICON[id];
  if (name && !err) {
    return (
      <img className="food-ic" width={size} height={size} alt="" aria-hidden="true"
        src={`https://api.iconify.design/fluent-emoji-high-contrast:${name}.svg?color=%23704826`}
        onError={() => setErr(true)} />
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICON_PATHS[cat] || ICON_PATHS.default}
    </svg>
  );
}

const MAPS_EMBED_KEY = process.env.NEXT_PUBLIC_MAPS_EMBED_KEY;

const NeonBig = () => <span className="neon"><span className="neon-d">DINE</span><span className="neon-99">99</span></span>;
const NeonSm = () => <span className="neon sm"><span className="neon-d">DINE</span><span className="neon-99">99</span></span>;

export default function Dine99() {
  const [tab, setTab] = useState("menu");
  const [selectedFood, setSelectedFood] = useState(null);
  const [cat, setCat] = useState("All");
  const [range, setRange] = useState(5);
  const [sort, setSort] = useState("price");
  const [openOnly, setOpenOnly] = useState(false);
  const [favs, setFavs] = useState({});

  // Real-location state
  const [userLoc, setUserLoc] = useState(null); // { lat, lng, city }
  const [apiResults, setApiResults] = useState(null); // null = use sample data
  const [loading, setLoading] = useState(false);

  // Location picker popover
  const [locOpen, setLocOpen] = useState(false);
  const [locInput, setLocInput] = useState("");
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState("");

  // Restaurant detail + price-report
  const [spot, setSpot] = useState(null);           // the clicked restaurant row
  const [detail, setDetail] = useState(null);        // Google place details
  const [detailLoading, setDetailLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPrice, setReportPrice] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [reportState, setReportState] = useState(""); // "" | sending | done | error

  // Curated stock photo per food (from Pexels, cached in Supabase)
  const [tilePhotos, setTilePhotos] = useState({});
  useEffect(() => {
    fetch("/api/foodphotos").then((r) => r.json()).then((d) => { if (d.photos) setTilePhotos(d.photos); }).catch(() => {});
  }, []);
  // Reviews expand + photo lightbox
  const [expanded, setExpanded] = useState({});
  const [lightbox, setLightbox] = useState(null);

  // Submit-a-restaurant
  const [subOpen, setSubOpen] = useState(false);
  const [sub, setSub] = useState({ food_id: "", maps_url: "", name: "", location: "", price: "" });
  const [subState, setSubState] = useState(""); // "" | sending | done | error
  function openSubmit() {
    setSub({ food_id: selectedFood || "", maps_url: "", name: "", location: "", price: "" });
    setSubState(""); setSubOpen(true);
  }
  async function submitRestaurant(e) {
    e.preventDefault();
    const hasLink = /^https?:\/\//i.test(sub.maps_url);
    const hasManual = sub.name.trim() && sub.location.trim();
    if (!sub.food_id || (!hasLink && !hasManual)) { setSubState("error"); return; }
    setSubState("sending");
    try {
      const food = FOODS.find((f) => f.id === sub.food_id);
      const res = await fetch("/api/submit-restaurant", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sub, food_name: food?.name, user_city: userLoc?.city }),
      });
      if (!res.ok) throw new Error();
      setSubState("done");
    } catch { setSubState("error"); }
  }

  function openSpot(r) {
    setSpot(r); setDetail(null); setReportOpen(false); setReportPrice(""); setReportNote(""); setReportState("");
    setDetailLoading(true);
    fetch(`/api/place?id=${encodeURIComponent(r.id)}`)
      .then((res) => res.json())
      .then((d) => { if (d.place) setDetail(d.place); })
      .catch(() => {})
      .finally(() => setDetailLoading(false));
  }
  function closeSpot() { setSpot(null); }

  async function submitReport(e) {
    e.preventDefault();
    const price = parseFloat(reportPrice);
    if (!(price > 0)) { setReportState("error"); return; }
    setReportState("sending");
    try {
      const food = FOODS.find((f) => f.id === spot.foodId);
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          place_id: spot.id, place_name: spot.name,
          food_id: spot.foodId, food_name: food?.name,
          reported_price: price, shown_price: spot.price,
          note: reportNote, city: userLoc?.city,
        }),
      });
      if (!res.ok) throw new Error();
      setReportState("done");
    } catch { setReportState("error"); }
  }

  async function applyNearMe() {
    if (!navigator.geolocation) { setLocError("Geolocation not supported"); return; }
    setLocLoading(true); setLocError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        try {
          const r = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`);
          const d = await r.json();
          setUserLoc({ lat, lng, city: d.city });
        } catch { setUserLoc({ lat, lng, city: "Your location" }); }
        setLocLoading(false); setLocOpen(false); setApiResults(null);
      },
      () => { setLocError("Location access denied"); setLocLoading(false); }
    );
  }

  async function applyCity(e) {
    e.preventDefault();
    if (!locInput.trim()) return;
    setLocLoading(true); setLocError("");
    try {
      const r = await fetch(
        `/api/geocode?address=${encodeURIComponent(locInput.trim())}`
      );
      const d = await r.json();
      if (!d.lat) { setLocError("City not found — try again"); setLocLoading(false); return; }
      setUserLoc({ lat: d.lat, lng: d.lng, city: d.city });
      setLocInput(""); setLocOpen(false); setApiResults(null);
    } catch { setLocError("Something went wrong"); }
    setLocLoading(false);
  }

  // Fetch real places whenever food or location changes
  useEffect(() => {
    if (!selectedFood || !userLoc) return;
    const food = FOODS.find((f) => f.id === selectedFood);
    setLoading(true);
    setApiResults(null);
    fetch(`/api/search?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=32187&keyword=${encodeURIComponent(food.name)}`)
      .then((r) => r.json())
      .then((d) => {
        const mapped = (d.places || []).map((p) => ({
          ...p,
          foodId: selectedFood,
          distance: haversine(userLoc.lat, userLoc.lng, p.lat, p.lng),
          price: estimatePrice(p.priceLevel, food.base),
          closes: null,
          imgUrl: p.photoRef ? photoUrl(p.photoRef) : null,
        }));
        setApiResults(mapped);
      })
      .catch(() => setApiResults([]))
      .finally(() => setLoading(false));
  }, [selectedFood, userLoc]);

  const toggleFav = (r) => setFavs((p) => { const n = { ...p }; if (n[r.id]) delete n[r.id]; else n[r.id] = r; return n; });

  const results = useMemo(() => {
    if (!apiResults) return [];
    let r = apiResults.filter((x) => x.distance <= range);
    if (openOnly) r = r.filter((x) => x.open);
    return [...r].sort((a, b) => sort === "price" ? a.price - b.price : sort === "distance" ? a.distance - b.distance : b.rating - a.rating);
  }, [apiResults, range, sort, openOnly]);

  const foodObj = FOODS.find((f) => f.id === selectedFood);
  const cheapest = results.length ? Math.min(...results.map((r) => r.price)) : null;
  const avg = results.length ? results.reduce((s, r) => s + r.price, 0) / results.length : null;

  const filteredFoods = FOODS.filter((f) => cat === "All" || f.cat === cat);
  const favList = Object.values(favs);
  const goHome = () => { setTab("menu"); setSelectedFood(null); };
  const openFood = (id) => { setTab("menu"); setSelectedFood(id); setSort("price"); };

  return (
    <div className="d99">
      <style>{CSS}</style>

      {/* ============ SITE HEADER ============ */}
      <header className="site-hdr">
        <div className="hdr-in">
          <button className="brand" onClick={goHome}><span className="sign sign-sm"><NeonSm /></span></button>
          <nav className="site-nav">
            <div className="loc-wrap">
              <button className="loc-pill" onClick={() => { setLocOpen((o) => !o); setLocError(""); }}>
                <Pin /> {userLoc ? userLoc.city : "Set location"}
                <span className="loc-caret">{locOpen ? "▲" : "▼"}</span>
              </button>
              {locOpen && (
                <div className="loc-popover">
                  <button className="near-me-btn" onClick={applyNearMe} disabled={locLoading}>
                    <Pin /> {locLoading ? "Locating…" : "Use my location"}
                  </button>
                  <div className="loc-divider"><span>or enter a city</span></div>
                  <form className="loc-form" onSubmit={applyCity}>
                    <input
                      className="loc-input"
                      placeholder="Chicago, IL"
                      value={locInput}
                      onChange={(e) => setLocInput(e.target.value)}
                      autoFocus
                    />
                    <button className="loc-go" type="submit" disabled={locLoading}>Go</button>
                  </form>
                  {locError && <p className="loc-err">{locError}</p>}
                </div>
              )}
            </div>
            <button className={`nav-link ${tab === "menu" ? "on" : ""}`} onClick={goHome}>Menu</button>
            <button className={`nav-link saved ${tab === "saved" ? "on" : ""}`} onClick={() => setTab("saved")}>
              <Heart filled={favList.length > 0} /> Saved{favList.length ? ` (${favList.length})` : ""}
            </button>
          </nav>
        </div>
      </header>

      {/* ============ MENU / HOME ============ */}
      {tab === "menu" && !selectedFood && (
        <div className="page fade">
          <section className="hero">
            <div className="hero-glow" />
            <div className="hero-in">
              <div className="sign"><NeonBig /></div>
              <h1 className="hero-tag">Food you crave at a price that helps you save</h1>
              <span className="hero-open">Real prices · real places · near you</span>
            </div>
          </section>

          {/* Location gate — shown until user sets a location */}
          {!userLoc ? (
            <div className="loc-gate">
              <div className="loc-gate-box">
                <Pin />
                <h2>Where are you?</h2>
                <p>We need your location to find real restaurants near you.</p>
                <button className="near-me-btn wide" onClick={applyNearMe} disabled={locLoading}>
                  <Pin /> {locLoading ? "Locating…" : "Use my location"}
                </button>
                <div className="loc-divider"><span>or enter a city</span></div>
                <form className="loc-form" onSubmit={applyCity}>
                  <input
                    className="loc-input"
                    placeholder="Chicago, IL"
                    value={locInput}
                    onChange={(e) => setLocInput(e.target.value)}
                  />
                  <button className="loc-go" type="submit" disabled={locLoading}>Go</button>
                </form>
                {locError && <p className="loc-err">{locError}</p>}
              </div>
            </div>
          ) : (
            <div className="container">
              <div className="cats">
                {CATS.map((c) => (
                  <button key={c} className={`cat ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>{c}</button>
                ))}
              </div>

              <h2 className="sec">What sounds good?</h2>

              <div className="grid">
                {filteredFoods.map((f, i) => (
                  <button key={f.id} className="fcard" style={{ animationDelay: `${i * 22}ms` }} onClick={() => openFood(f.id)}>
                    <div className="fcard-img" style={{ backgroundImage: gradFor(f) }}>
                      {tilePhotos[f.id]
                        ? <img className="fimg tile-photo" loading="lazy" alt={f.name} src={tilePhotos[f.id]} />
                        : <span className="tile-icon"><FoodIcon id={f.id} cat={f.cat} /></span>}
                    </div>
                    <div className="fcard-txt">
                      <span className="fcard-name">{f.name}</span>
                      <span className="fcard-from">from ${f.base.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
                {filteredFoods.length === 0 && <div className="nores">Nothing in this category yet.</div>}
              </div>
            </div>
          )}

          <footer className="foot">
            <div className="foot-in">
              <span className="sign sign-sm"><NeonSm /></span>
              <div className="foot-cols">
                <p className="foot-disc">Prices are estimates and may not be current or available at all locations. Always confirm with the restaurant. Listings via Google Places · food photos via <a href="https://www.pexels.com" target="_blank" rel="noreferrer">Pexels</a>.</p>
                <div className="foot-links">
                  <a href="mailto:report@dine99.app?subject=DINE%2099%20issue%20report">Report an issue</a>
                  <span className="foot-dot">·</span>
                  <a href="mailto:hello@dine99.app">Contact</a>
                </div>
                <p className="foot-copy">© {new Date().getFullYear()} DINE 99 · A prototype, not affiliated with any restaurant shown.</p>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* ============ RESULTS ============ */}
      {tab === "menu" && selectedFood && (
        <div className="container results slide">
          <div className="reshead">
            <button className="circ" onClick={() => setSelectedFood(null)}><Back /></button>
            <div className="reshead-img" style={{ backgroundImage: gradFor(foodObj) }}><span className="tile-icon"><FoodIcon id={foodObj.id} cat={foodObj.cat} size={30} /></span></div>
            <div className="reshead-t">
              <h2>{foodObj.name}</h2>
              <span>{loading ? "Searching nearby…" : `${results.length} spot${results.length === 1 ? "" : "s"} within ${range} mi · avg $${avg ? avg.toFixed(2) : "—"}`}</span>
            </div>
          </div>

          <div className="controls">
            <div className="chips">
              {[["price", "Cheapest"], ["distance", "Closest"], ["rating", "Top rated"]].map(([v, l]) => (
                <button key={v} className={`chip ${sort === v ? "on" : ""}`} onClick={() => setSort(v)}>{l}</button>
              ))}
              <button className={`chip ${openOnly ? "on" : ""}`} onClick={() => setOpenOnly((o) => !o)}>Open now</button>
            </div>
            <div className="dist">
              <span className="dist-lbl">Distance</span>
              {[1, 3, 5, 10, 20].map((v) => (
                <button key={v} className={`dchip ${range === v ? "on" : ""}`} onClick={() => setRange(v)}>{v} mi</button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="rlist">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="vspot skel">
                  <div className="vspot-img skel-box" />
                  <div className="vspot-body">
                    <div className="skel-line w70" /><div className="skel-line w40" /><div className="skel-line w50" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 ? (
            <div className="empty">
              <h3>No {foodObj.name.toLowerCase()} spots within {range} mi</h3>
              <p>Try a bigger distance — tap “{range < 20 ? "20 mi" : "a wider area"}” above.</p>
              <button className="add-spot-btn" onClick={openSubmit}>+ Know a spot? Add it</button>
            </div>
          ) : !loading && (
            <div className="rlist">
              {results.map((r) => {
                const best = r.price === cheapest && r.open;
                const pct = avg ? Math.round(((avg - r.price) / avg) * 100) : 0;
                return (
                  <div key={r.id} className={`vspot ${best ? "best" : ""}`} onClick={() => openSpot(r)}>
                    <div className="vspot-img">
                      {r.imgUrl
                        ? <img className="fimg" loading="lazy" alt={r.name} src={r.imgUrl} />
                        : <div className="fimg tile" style={{ backgroundImage: gradFor(foodObj) }}><span className="tile-icon"><FoodIcon id={foodObj.id} cat={foodObj.cat} size={40} /></span></div>
                      }
                      {best && <span className="v-badge">★ BEST PRICE</span>}
                      <span className={`v-heart ${favs[r.id] ? "on" : ""}`} onClick={(e) => { e.stopPropagation(); toggleFav(r); }}><Heart filled={!!favs[r.id]} /></span>
                    </div>
                    <div className="vspot-body">
                      <span className="v-name">{r.name}</span>
                      <span className="v-meta"><span className="sstar"><Star /> {r.rating}</span><span className="mdot">•</span>{r.distance} mi<span className="mdot">•</span><em className={r.open ? "op" : "cl"}>{r.open ? "Open" : "Closed"}</em></span>
                      <div className="v-foot">
                        <span className="v-price">${r.price.toFixed(2)}</span>
                        {pct > 0 && <span className="v-save">{pct}% under avg</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div className="add-spot-row">
                <span>Don’t see a spot that serves {foodObj.name.toLowerCase()}?</span>
                <button className="add-spot-btn" onClick={openSubmit}>+ Add it</button>
              </div>
              <p className="rfoot">Real spots via Google · prices estimated by restaurant tier</p>
            </div>
          )}
        </div>
      )}

      {/* ============ SAVED ============ */}
      {tab === "saved" && (
        <div className="container saved-page fade">
          <h2 className="sec big">Saved spots</h2>
          {favList.length === 0 ? (
            <div className="empty"><span className="empty-heart"><Heart /></span><h3>Nothing saved yet</h3><p>Tap the heart on any spot to keep it here.</p></div>
          ) : (
            <div className="rlist">
              {favList.map((r) => {
                const food = FOODS.find((f) => f.id === r.foodId);
                return (
                  <div key={r.id} className="vspot">
                    <div className="vspot-img" onClick={() => openFood(r.foodId)} style={{ cursor: "pointer" }}>
                      {r.imgUrl
                        ? <img className="fimg" loading="lazy" alt={r.name} src={r.imgUrl} />
                        : <div className="fimg tile" style={{ backgroundImage: gradFor(food) }}><span className="tile-icon"><FoodIcon id={food.id} cat={food.cat} size={40} /></span></div>
                      }
                      <span className="v-heart on" onClick={(e) => { e.stopPropagation(); toggleFav(r); }}><Heart filled /></span>
                    </div>
                    <div className="vspot-body">
                      <span className="v-name">{r.name}</span>
                      <span className="v-meta"><span className="sstar"><Star /> {r.rating}</span><span className="mdot">•</span>{food.name}<span className="mdot">•</span>{r.distance} mi</span>
                      <div className="v-foot"><span className="v-price">${r.price.toFixed(2)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ RESTAURANT DETAIL — FLOATING PANEL ============ */}
      {spot && (() => {
        const food = FOODS.find((f) => f.id === spot.foodId);
        const q = encodeURIComponent(`${spot.name} ${userLoc?.city || ""}`.trim());
        const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${detail?.lat && detail?.lng ? `${detail.lat},${detail.lng}` : encodeURIComponent(spot.name)}&destination_place_id=${spot.id}`;
        const goSec = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return (
        <div className="sheet-bg" onClick={closeSpot}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-x" onClick={closeSpot} aria-label="Close">✕</button>
            <div className="sheet-hero">
              {(detail?.photoRef || spot.imgUrl)
                ? <img className="sheet-hero-img" alt="" src={detail?.photoRef ? `/api/photo?ref=${encodeURIComponent(detail.photoRef)}&w=800` : spot.imgUrl} />
                : <div className="sheet-hero-img tile" style={{ backgroundImage: gradFor(food) }}><FoodIcon id={spot.foodId} cat={food?.cat} size={64} /></div>}
              <div className="sheet-hero-grad" />
              <div className="sheet-hero-txt">
                <h2>{spot.name}</h2>
                <span className="sheet-sub"><span className="sstar"><Star /> {spot.rating || "—"}</span>
                  {detail?.reviews?.length ? <><span className="mdot">•</span>{detail.reviews.length}+ reviews</> : null}
                  <span className="mdot">•</span>{spot.distance} mi
                  {detail?.open != null && <><span className="mdot">•</span><em className={detail.open ? "op" : "cl"}>{detail.open ? "Open" : "Closed"}</em></>}
                </span>
              </div>
            </div>
            <nav className="sheet-nav">
              {[["sec-info","Info"],["sec-map","Map"],["sec-order","Order"],["sec-reviews","Reviews"],["sec-photos","Photos"]].map(([id,l]) => (
                <button key={id} onClick={() => goSec(id)}>{l}</button>
              ))}
            </nav>

            <div className="sheet-scroll">
              {/* INFO */}
              <section id="sec-info" className="sec-pane">
                <h3 className="pane-h">Details</h3>
                <div className="md-price-row">
                  <span className="md-price">${spot.price.toFixed(2)}</span>
                  <span className="md-price-lbl">est. for {food?.name}</span>
                </div>
                {detailLoading && <p className="md-loading">Loading details…</p>}
                <div className="md-info">
                  {detail?.address && <div className="md-row"><Pin /> <span>{detail.address}</span></div>}
                  {detail?.phone && <div className="md-row"><span className="md-ic">☎</span> <a href={`tel:${detail.phone}`}>{detail.phone}</a></div>}
                  {detail?.website && <div className="md-row"><span className="md-ic">↗</span> <a href={detail.website} target="_blank" rel="noreferrer">Visit website</a></div>}
                  {detail?.hours && (
                    <details className="md-hours"><summary>Opening hours</summary>
                      <ul>{detail.hours.map((h, i) => <li key={i}>{h}</li>)}</ul>
                    </details>
                  )}
                </div>
                <div className="md-actions">
                  <a className="md-btn primary" href={dirUrl} target="_blank" rel="noreferrer"><Pin /> Directions</a>
                  <button className="md-btn ghost" onClick={() => { setReportOpen((o) => !o); setReportState(""); }}>Report a price</button>
                </div>
                {reportOpen && (reportState === "done" ? (
                  <div className="report done">✓ Thanks! Your price report was submitted for review.</div>
                ) : (
                  <form className="report" onSubmit={submitReport}>
                    <p className="report-q">What price did you see for {food?.name.toLowerCase()}?</p>
                    <div className="report-row">
                      <span className="report-dollar">$</span>
                      <input className="report-price" type="number" step="0.01" min="0" placeholder="0.00" value={reportPrice} onChange={(e) => setReportPrice(e.target.value)} autoFocus />
                      <button className="md-btn primary sm" type="submit" disabled={reportState === "sending"}>{reportState === "sending" ? "…" : "Submit"}</button>
                    </div>
                    <input className="report-note" placeholder="Note (optional) — size, special…" value={reportNote} onChange={(e) => setReportNote(e.target.value)} />
                    {reportState === "error" && <p className="report-err">Enter a valid price and try again.</p>}
                  </form>
                ))}
                <div className="pane-deco" aria-hidden="true">
                  <FoodIcon id={spot.foodId} cat={food?.cat} size={108} />
                  <span className="deco-word"><span className="deco-d">DINE</span><span className="deco-9">99</span></span>
                </div>
              </section>

              {/* MAP */}
              <section id="sec-map" className="sec-pane">
                <h3 className="pane-h">Map</h3>
                {MAPS_EMBED_KEY ? (
                  <iframe className="sheet-map" title="map" loading="lazy" allowFullScreen
                    src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_EMBED_KEY}&q=place_id:${spot.id}`} />
                ) : (
                  <a className="map-fallback" href={detail?.mapsUrl || dirUrl} target="_blank" rel="noreferrer">
                    <Pin /><span>Open in Google Maps</span>
                  </a>
                )}
              </section>

              {/* ORDER */}
              <section id="sec-order" className="sec-pane">
                <h3 className="pane-h">Order &amp; contact</h3>
                <div className="order-grid">
                  <a className="order-btn" href={`https://www.doordash.com/search/store/${q}`} target="_blank" rel="noreferrer"><b>DoorDash</b><span>Search</span></a>
                  <a className="order-btn" href={`https://www.ubereats.com/search?q=${q}`} target="_blank" rel="noreferrer"><b>Uber Eats</b><span>Search</span></a>
                  <a className="order-btn" href={`https://www.toasttab.com/local?q=${q}`} target="_blank" rel="noreferrer"><b>Toast</b><span>Search</span></a>
                  {detail?.phone
                    ? <a className="order-btn" href={`tel:${detail.phone}`}><b>Call</b><span>{detail.phone}</span></a>
                    : <span className="order-btn off"><b>Call</b><span>—</span></span>}
                </div>
                <p className="order-note">Links open a search for this restaurant on each platform — availability varies.</p>
              </section>

              {/* REVIEWS */}
              <section id="sec-reviews" className="sec-pane">
                <h3 className="pane-h">Reviews <span className="pane-src">via Google</span></h3>
                {detailLoading && <p className="md-loading">Loading…</p>}
                {detail && (!detail.reviews || detail.reviews.length === 0) && <p className="md-loading">No reviews available.</p>}
                <div className="rev-list">
                  {detail?.reviews?.map((rv, i) => {
                    const long = rv.text && rv.text.length > 180;
                    const isOpen = expanded[i];
                    return (
                      <div key={i} className="rev">
                        <div className="rev-top">
                          {rv.avatar ? <img className="rev-av" src={rv.avatar} alt="" referrerPolicy="no-referrer" /> : <span className="rev-av ph">{rv.author?.[0] || "?"}</span>}
                          <div><div className="rev-name">{rv.author}</div><div className="rev-when">{rv.when}</div></div>
                          <span className="rev-rating"><Star /> {rv.rating}</span>
                        </div>
                        <p className={`rev-text ${long && !isOpen ? "clamp" : ""}`}>{rv.text}</p>
                        {long && (
                          <button className="rev-more" onClick={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}>
                            {isOpen ? "Show less" : "Read more…"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* PHOTOS */}
              <section id="sec-photos" className="sec-pane">
                <h3 className="pane-h">Photos <span className="pane-src">via Google</span></h3>
                {detail && (!detail.photos || detail.photos.length === 0) && <p className="md-loading">No photos available.</p>}
                <div className="photo-grid">
                  {detail?.photos?.map((ref, i) => (
                    <img key={i} className="photo-cell" loading="lazy" alt="" src={`/api/photo?ref=${encodeURIComponent(ref)}&w=500`}
                      onClick={() => setLightbox(`/api/photo?ref=${encodeURIComponent(ref)}&w=1000`)} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ADD A RESTAURANT */}
      {subOpen && (
        <div className="add-bg" onClick={() => setSubOpen(false)}>
          <div className="add-modal" onClick={(e) => e.stopPropagation()}>
            <button className="sheet-x" onClick={() => setSubOpen(false)} aria-label="Close">✕</button>
            {subState === "done" ? (
              <div className="add-done">
                <h3>Thanks! 🎉</h3>
                <p>Your suggestion was submitted for review. We’ll verify and add it soon.</p>
                <button className="md-btn primary" onClick={() => setSubOpen(false)}>Done</button>
              </div>
            ) : (
              <form className="add-form" onSubmit={submitRestaurant}>
                <h3 className="add-h">Suggest a restaurant</h3>
                <p className="add-sub">Know a spot we’re missing? Tell us and we’ll verify it.</p>

                <label className="add-lbl">What do they serve?</label>
                <select className="add-input" value={sub.food_id} onChange={(e) => setSub({ ...sub, food_id: e.target.value })}>
                  <option value="">Choose a food…</option>
                  {FOODS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>

                <label className="add-lbl">Google Maps link</label>
                <input className="add-input" placeholder="Paste a Google Maps / Places link" value={sub.maps_url}
                  onChange={(e) => setSub({ ...sub, maps_url: e.target.value })} />

                <div className="add-or"><span>or enter it manually</span></div>

                <label className="add-lbl">Restaurant name</label>
                <input className="add-input" placeholder="e.g. Charleys Cheesesteaks" value={sub.name}
                  onChange={(e) => setSub({ ...sub, name: e.target.value })} />
                <label className="add-lbl">City &amp; state or ZIP</label>
                <input className="add-input" placeholder="e.g. Lombard, IL or 60148" value={sub.location}
                  onChange={(e) => setSub({ ...sub, location: e.target.value })} />

                <label className="add-lbl">Price <span className="add-opt">(optional)</span></label>
                <div className="report-row">
                  <span className="report-dollar">$</span>
                  <input className="report-price" type="number" step="0.01" min="0" placeholder="0.00" value={sub.price}
                    onChange={(e) => setSub({ ...sub, price: e.target.value })} />
                </div>

                {subState === "error" && <p className="report-err">Pick a food and add either a Maps link or a name + location.</p>}
                <button className="md-btn primary add-submit" type="submit" disabled={subState === "sending"}>
                  {subState === "sending" ? "Submitting…" : "Submit for review"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="sheet-x lb-x" aria-label="Close">✕</button>
          <img src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Inter:wght@400;500;600;700;800&display=swap');

.d99 {
  --bg: #fbf6ee;
  --surface: #ffffff;
  --surface2: #f4ece0;
  --border: rgba(40,30,20,.1);
  --border-hi: rgba(40,30,20,.17);
  --white: #ffffff;
  --text: #241f1a;
  --text2: #6f6557;
  --muted: #a99d8b;
  --red: #e23b3b;
  --red-dk: #c62f2f;
  --teal: #0e8f86;
  --teal-dk: #0b756e;
  --yellow: #e0900c;
  --pink: #ff4d9d;
  --plaque: #130f20;
  --night: #130f20;
  --night2: #1f1733;

  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: var(--text);
  min-height: 100vh;
  background-color: var(--bg);
  -webkit-font-smoothing: antialiased;
}
.d99 * { box-sizing: border-box; }
.d99 button { font-family: inherit; }

/* ---------- NEON SIGN PLAQUE (the one dark object) ---------- */
.sign { display: inline-flex; align-items: center; justify-content: center; background: radial-gradient(circle at 50% 30%, var(--night2), var(--plaque) 80%); border: 1px solid rgba(255,255,255,.08); border-radius: 22px; padding: 22px 40px; box-shadow: 0 18px 50px rgba(19,15,32,.35), inset 0 1px 0 rgba(255,255,255,.06); position: relative; }
.sign::after { content:''; position:absolute; inset:6px; border:1px solid rgba(255,255,255,.06); border-radius: 16px; pointer-events:none; }
.sign-sm { padding: 6px 13px; border-radius: 11px; box-shadow: 0 4px 14px rgba(19,15,32,.28); }
.sign-sm::after { inset: 3px; border-radius: 8px; }
.brand .neon.sm { font-size: 20px; }
.foot .neon.sm { font-size: 18px; }

/* ---------- ICON TILES ---------- */
.tile-icon { display: grid; place-items: center; color: rgba(90,55,25,.5); }
.food-ic { display: block; opacity: .85; }
.fcard-img, .vspot-img .tile, .reshead-img, .md-img.tile { display: grid; place-items: center; }

.fimg { display: block; object-fit: cover; width: 100%; height: 100%; background: var(--surface2); }
.fimg.fb { display: grid; place-items: center; background: linear-gradient(135deg, hsl(calc(var(--g) * 1deg) 60% 88%), hsl(calc(var(--g) * 1deg + 40) 55% 80%)); }
.fimg.fb span { font-family: 'Inter'; color: rgba(0,0,0,.55); font-weight: 600; font-size: 15px; padding: 8px; text-align: center; }

/* ---------- NEON WORDMARK ---------- */
.neon { font-family: 'Monoton', cursive; font-size: 54px; line-height: .9; letter-spacing: .02em; }
.neon.sm { font-size: 26px; }
.neon-d { color: #fff0f6; text-shadow: 0 0 6px #ff8fc4, 0 0 14px #ff4d9d, 0 0 30px #ff4d9d, 0 0 54px rgba(255,77,157,.7); }
.neon-99 { color: #d8fffb; margin-left: .06em; text-shadow: 0 0 6px #7df5ec, 0 0 14px #15c5bd, 0 0 32px #15c5bd, 0 0 56px rgba(21,197,189,.7); }
.neon.sm .neon-d { text-shadow: 0 0 4px #ff8fc4, 0 0 10px #ff4d9d, 0 0 18px rgba(255,77,157,.7); }
.neon.sm .neon-99 { text-shadow: 0 0 4px #7df5ec, 0 0 10px #15c5bd, 0 0 18px rgba(21,197,189,.7); }

/* ---------- LOCATION PICKER ---------- */
.loc-wrap { position: relative; }
.loc-pill { display: inline-flex; align-items: center; gap: 6px; font-family: 'Inter'; font-weight: 600; font-size: 13.5px; color: var(--text); background: var(--surface); border: 1px solid var(--border-hi); padding: 7px 13px; border-radius: 10px; cursor: pointer; transition: all .15s; box-shadow: 0 1px 2px rgba(40,30,20,.04); }
.loc-pill:hover { border-color: var(--text2); }
.loc-pill svg { width: 14px; height: 14px; color: var(--red); }
.loc-caret { font-size: 8px; opacity: .5; margin-left: 2px; }
.loc-popover { position: absolute; top: calc(100% + 10px); left: 0; width: 280px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 16px; box-shadow: 0 20px 50px rgba(40,30,20,.2); z-index: 50; animation: fade .15s ease; }
.near-me-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--red); color: #fff; border: none; border-radius: 10px; padding: 11px; font-family: 'Inter'; font-weight: 600; font-size: 14px; cursor: pointer; transition: background .15s; }
.near-me-btn:hover { background: var(--red-dk); }
.near-me-btn:disabled { opacity: .6; cursor: default; }
.near-me-btn svg { width: 15px; height: 15px; color: #fff; }
.loc-divider { display: flex; align-items: center; gap: 10px; margin: 14px 0; }
.loc-divider::before,.loc-divider::after { content:''; flex:1; height:1px; background: var(--border); }
.loc-divider span { font-family:'Inter'; font-size:11.5px; color:var(--muted); white-space:nowrap; }
.loc-form { display: flex; gap: 8px; }
.loc-input { flex: 1; min-width: 0; background: var(--bg); border: 1px solid var(--border-hi); border-radius: 9px; padding: 10px 12px; font-family: 'Inter'; font-size: 14px; color: var(--text); outline: none; transition: border-color .15s; }
.loc-input::placeholder { color: var(--muted); }
.loc-input:focus { border-color: var(--teal); }
.loc-go { background: transparent; color: var(--text); border: 1px solid var(--border-hi); border-radius: 9px; padding: 10px 16px; font-family: 'Inter'; font-weight: 600; font-size: 14px; cursor: pointer; transition: all .15s; }
.loc-go:hover { background: rgba(127,127,127,.1); }
.loc-go:disabled { opacity: .6; cursor: default; }
.loc-err { font-family: 'Inter'; font-size: 12.5px; color: var(--red); margin-top: 10px; text-align: center; }

/* ---------- SITE HEADER ---------- */
.site-hdr { position: sticky; top: 0; z-index: 30; background: rgba(251,246,238,.82); backdrop-filter: saturate(180%) blur(16px); border-bottom: 1px solid var(--border); }
.hdr-in { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 11px 24px; }
.brand { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; }
.site-nav { display: flex; align-items: center; gap: 4px; }
.nav-link { display: inline-flex; align-items: center; gap: 7px; font-family: 'Inter'; font-weight: 500; font-size: 14px; color: var(--text2); background: none; border: none; border-radius: 10px; padding: 8px 14px; cursor: pointer; transition: all .15s; }
.nav-link:hover { color: var(--text); background: rgba(40,30,20,.05); }
.nav-link.on { color: var(--text); background: rgba(40,30,20,.07); }
.nav-link.saved svg { width: 17px; height: 17px; color: var(--text2); }
.nav-link.saved.on svg, .nav-link.saved:hover svg { color: var(--red); }

/* ---------- HERO ---------- */
.page.fade { animation: fade .32s ease both; }
@keyframes fade { from { opacity: 0; transform: translateY(7px); } }
.hero { position: relative; overflow: hidden; padding: 64px 24px 56px; text-align: center; }
.hero-glow { position: absolute; inset: 0; background: radial-gradient(ellipse 60% 50% at 50% 22%, rgba(255,77,157,.14) 0%, transparent 60%), radial-gradient(ellipse 55% 45% at 78% 80%, rgba(14,143,134,.1) 0%, transparent 55%); pointer-events: none; }
.hero-in { position: relative; z-index: 2; max-width: 680px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; }
.neon { display: inline-block; }
.hero-tag { margin: 30px 0 0; font-family: 'Inter'; font-weight: 700; font-size: 28px; line-height: 1.2; letter-spacing: -.02em; color: var(--text); max-width: 560px; }
.hero-open { font-family: 'Inter'; font-weight: 600; letter-spacing: .14em; font-size: 11px; text-transform: uppercase; color: var(--teal); display: inline-block; margin-top: 16px; }

/* ---------- CONTAINER ---------- */
.container { max-width: 1120px; margin: 0 auto; padding: 28px 24px 40px; }

/* ---------- CATEGORY CHIPS ---------- */
.cats { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 18px; scrollbar-width: none; }
.cats::-webkit-scrollbar { display: none; }
.cat { flex: 0 0 auto; border: 1px solid var(--border); background: var(--surface); color: var(--text2); border-radius: 999px; padding: 7px 16px; font-family: 'Inter'; font-weight: 500; font-size: 13.5px; cursor: pointer; transition: all .15s; }
.cat:hover { color: var(--text); border-color: var(--border-hi); }
.cat:active { transform: scale(.96); }
.cat.on { background: var(--text); color: var(--bg); border-color: var(--text); font-weight: 600; }

.sec { font-family: 'Inter'; font-weight: 700; font-size: 22px; letter-spacing: -.02em; color: var(--text); margin: 8px 0 18px; }
.sec.big { font-size: 28px; }

/* ---------- FOOD CARDS ---------- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(216px, 1fr)); gap: 16px; }
.fcard { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; cursor: pointer; padding: 0; text-align: left; box-shadow: 0 1px 2px rgba(80,50,20,.05); transition: transform .18s, box-shadow .18s, border-color .18s; animation: pop .4s ease both; }
@keyframes pop { from { opacity: 0; transform: translateY(12px); } }
.fcard:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(80,50,20,.14); border-color: var(--border-hi); }
.fcard:active { transform: translateY(0); }
.fcard-img { height: 130px; overflow: hidden; position: relative; }
.fcard-img .fimg { transition: transform .45s; }
.fcard:hover .fcard-img .fimg { transform: scale(1.07); }
.fcard-txt { padding: 13px 15px 15px; display: flex; flex-direction: column; gap: 7px; }
.fcard-name { font-family: 'Inter'; font-weight: 600; font-size: 15.5px; letter-spacing: -.01em; line-height: 1.2; color: var(--text); }
.fcard-from { align-self: flex-start; font-family: 'Inter'; font-weight: 500; font-size: 12px; color: var(--text2); }
.nores { grid-column: 1/-1; text-align: center; color: var(--muted); padding: 44px 0; font-family: 'Inter'; font-size: 17px; }

/* ---------- FOOTER ---------- */
.foot { margin-top: 56px; background: var(--surface2); border-top: 1px solid var(--border); }
.foot-floor { display: none; }
.foot-in { max-width: 1120px; margin: 0 auto; padding: 28px 24px 40px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.foot-in .neon.sm { font-size: 18px; }
.foot-in p { margin: 0; color: var(--text2); font-size: 13px; max-width: 480px; font-family: 'Inter'; font-weight: 500; line-height: 1.5; }

/* ---------- RESULTS ---------- */
.results { max-width: 1120px; }
.slide { animation: slide .3s cubic-bezier(.2,.7,.2,1) both; }
@keyframes slide { from { opacity: 0; transform: translateY(10px); } }
.reshead { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding-top: 8px; }
.circ { flex: 0 0 auto; width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid var(--border-hi); background: var(--surface); color: var(--text); display: grid; place-items: center; cursor: pointer; transition: background .15s; }
.circ:hover { background: var(--surface2); }
.circ:active { transform: scale(.93); }
.reshead-img { width: 54px; height: 54px; border-radius: 12px; border: 1px solid var(--border); flex: 0 0 auto; overflow: hidden; }
.reshead-t { min-width: 0; }
.reshead-t h2 { font-family: 'Inter'; font-weight: 700; font-size: 26px; letter-spacing: -.02em; margin: 0 0 2px; line-height: 1.1; color: var(--text); }
.reshead-t span { font-family: 'Inter'; font-weight: 500; font-size: 13.5px; color: var(--text2); }

.controls { position: sticky; top: 64px; z-index: 6; background: linear-gradient(var(--bg) 80%, transparent); padding: 6px 0 14px; margin-bottom: 6px; }
.chips, .dist { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 10px; align-items: center; }
.chips::-webkit-scrollbar, .dist::-webkit-scrollbar { display: none; }
.chip { flex: 0 0 auto; border: 1px solid var(--border); background: var(--surface); color: var(--text2); border-radius: 999px; padding: 7px 16px; font-family: 'Inter'; font-weight: 500; font-size: 13.5px; cursor: pointer; transition: all .14s; }
.chip:hover { color: var(--text); border-color: var(--border-hi); }
.chip:active { transform: scale(.96); }
.chip.on { background: var(--text); color: var(--bg); border-color: var(--text); font-weight: 600; }
.dist { padding-bottom: 2px; }
.dist-lbl { flex: 0 0 auto; font-family: 'Inter'; font-weight: 600; font-size: 13px; color: var(--muted); margin-right: 2px; }
.dchip { flex: 0 0 auto; border: 1.5px solid var(--border); background: transparent; color: var(--muted); border-radius: 999px; padding: 7px 14px; font-family: 'Inter'; font-weight: 600; font-size: 13px; cursor: pointer; transition: all .14s; }
.dchip:hover { border-color: var(--border-hi); color: var(--text); }
.dchip:active { transform: scale(.94); }
.dchip.on { background: var(--teal); color: #fff; border-color: var(--teal); }

/* ---------- SPOTS (vertical cards) ---------- */
.rlist { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 14px; }
.vspot { position: relative; display: flex; flex-direction: column; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 1px 2px rgba(80,50,20,.05); transition: transform .18s, box-shadow .18s, border-color .18s; animation: pop .4s ease both; }
.vspot:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(80,50,20,.14); border-color: var(--border-hi); }
.vspot.best { border-color: rgba(14,143,134,.5); box-shadow: 0 1px 2px rgba(14,143,134,.1); }
.vspot.best:hover { box-shadow: 0 12px 30px rgba(14,143,134,.18); }
.vspot-img { position: relative; height: 140px; overflow: hidden; }
.vspot-img .fimg { width: 100%; height: 100%; transition: transform .45s; }
.vspot:hover .vspot-img .fimg { transform: scale(1.06); }
.v-badge { position: absolute; top: 10px; left: 10px; background: var(--teal); color: #fff; font-family: 'Inter'; font-weight: 700; font-size: 10px; letter-spacing: .04em; padding: 4px 9px; border-radius: 6px; z-index: 1; }
.v-heart { position: absolute; top: 9px; right: 9px; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: rgba(0,0,0,.5); backdrop-filter: blur(6px); color: rgba(255,255,255,.5); cursor: pointer; transition: transform .15s, color .15s; z-index: 1; }
.v-heart:hover { color: var(--red); } .v-heart:active { transform: scale(1.2); } .v-heart.on { color: var(--red); }
.vspot-body { display: flex; flex-direction: column; gap: 7px; padding: 13px 14px 14px; flex: 1; }
.v-name { font-family: 'Inter'; font-weight: 600; font-size: 15.5px; letter-spacing: -.01em; line-height: 1.25; color: var(--text); }
.v-meta { display: flex; align-items: center; gap: 5px; font-size: 12.5px; color: var(--text2); font-weight: 500; flex-wrap: wrap; }
.sstar { display: inline-flex; align-items: center; gap: 3px; color: var(--text); font-weight: 600; }
.sstar svg { color: var(--yellow); }
.mdot { opacity: .35; }
.v-meta em { font-style: normal; font-weight: 600; } .v-meta .op { color: var(--teal); } .v-meta .cl { color: var(--red); }
.v-foot { margin-top: auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 11px; margin-top: 11px; border-top: 1px solid var(--border); }
.v-price { font-family: 'Inter'; font-weight: 700; font-size: 22px; line-height: 1; letter-spacing: -.02em; color: var(--text); font-variant-numeric: tabular-nums; }
.vspot.best .v-price { color: var(--teal); }
.v-save { font-family: 'Inter'; font-weight: 600; font-size: 11px; color: var(--teal); background: rgba(13,148,136,.08); border: 1px solid rgba(13,148,136,.2); padding: 3px 8px; border-radius: 6px; white-space: nowrap; }
.rfoot { grid-column: 1 / -1; text-align: center; font-size: 12px; color: var(--muted); padding: 16px 0 2px; font-family: 'Inter'; }

/* ---------- LOCATION GATE ---------- */
.loc-gate { display: flex; justify-content: center; align-items: flex-start; padding: 56px 24px 90px; }
.loc-gate-box { background: var(--surface); border: 1px solid var(--border); border-radius: 18px; padding: 36px 32px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 24px 60px rgba(0,0,0,.5); }
.loc-gate-box > svg { color: var(--teal); width: 28px; height: 28px; margin-bottom: 14px; }
.loc-gate-box h2 { font-family: 'Inter'; font-weight: 700; font-size: 24px; letter-spacing: -.02em; color: var(--text); margin: 0 0 8px; }
.loc-gate-box p { font-family: 'Inter'; font-size: 14.5px; line-height: 1.5; color: var(--text2); margin: 0 0 24px; }
.near-me-btn.wide { width: 100%; }

/* ---------- LOADING ---------- */
.loading-bar { text-align: center; padding: 56px 22px; font-family: 'Inter'; font-weight: 500; font-size: 15px; color: var(--text2); animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

/* ---------- EMPTY ---------- */
.saved-page { max-width: 1120px; }
.empty { text-align: center; padding: 70px 22px; }
.empty-heart { color: var(--border-hi); display: inline-flex; margin-bottom: 12px; }
.empty h3 { font-family: 'Inter'; font-weight: 700; font-size: 23px; margin: 0 0 6px; color: var(--text); }
.empty p { color: var(--muted); font-family: 'Inter'; }

/* ---------- FOOTER (rich) ---------- */
.foot-in { align-items: flex-start; }
.foot-cols { display: flex; flex-direction: column; gap: 8px; max-width: 620px; }
.foot-disc { margin: 0; color: var(--text2); font-size: 12.5px; line-height: 1.55; font-family: 'Inter'; font-weight: 500; }
.foot-links { display: flex; align-items: center; gap: 8px; }
.foot-links a { color: var(--text); font-size: 13px; font-weight: 600; text-decoration: none; font-family: 'Inter'; }
.foot-links a:hover { color: var(--red); }
.foot-dot { color: var(--muted); }
.foot-copy { margin: 2px 0 0; color: var(--muted); font-size: 12px; font-family: 'Inter'; }

/* ---------- TILE PHOTO ---------- */
.tile-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; animation: fade .3s ease; }
.vspot { cursor: pointer; }

/* ---------- SKELETON LOADING ---------- */
.vspot.skel { pointer-events: none; }
.skel-box { height: 140px; }
.skel-box, .skel-line { background: linear-gradient(90deg, var(--surface2) 25%, rgba(0,0,0,.04) 37%, var(--surface2) 63%); background-size: 400% 100%; animation: shimmer 1.3s ease infinite; border-radius: 6px; }
.skel-line { height: 11px; margin: 9px 0; } .skel-line.w70 { width: 70%; } .skel-line.w40 { width: 40%; } .skel-line.w50 { width: 50%; }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -100% 0; } }

/* ---------- RIGHT-SIDE DRAWER ---------- */
.sheet-bg { position: fixed; inset: 0; z-index: 100; background: rgba(20,14,8,.45); backdrop-filter: blur(2px); display: flex; justify-content: flex-end; animation: fade .18s ease; }
.sheet { position: relative; width: 640px; max-width: 96vw; height: 100vh; background: var(--surface); box-shadow: -16px 0 60px rgba(20,14,8,.35); display: flex; flex-direction: column; overflow: hidden; animation: drawerin .3s cubic-bezier(.2,.8,.2,1) both; }
@keyframes drawerin { from { transform: translateX(100%); } }
.sheet-grab { display: none; }
.sheet-x { position: absolute; top: 14px; right: 16px; z-index: 5; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(0,0,0,.5); backdrop-filter: blur(6px); color: #fff; font-size: 13px; cursor: pointer; display: grid; place-items: center; }
.sheet-x:hover { background: rgba(0,0,0,.7); }
.sheet-hero { position: relative; height: 200px; flex: 0 0 auto; overflow: hidden; background: var(--surface2); }
.sheet-hero-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.sheet-hero-img.tile { display: grid; place-items: center; color: rgba(90,55,25,.5); }
.sheet-hero-grad { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,.1) 50%, rgba(0,0,0,.18) 100%); }
.sheet-hero-txt { position: absolute; left: 22px; right: 22px; bottom: 16px; }
.sheet-hero-txt h2 { font-family: 'Inter'; font-weight: 800; font-size: 26px; letter-spacing: -.02em; margin: 0 0 5px; color: #fff; text-shadow: 0 1px 12px rgba(0,0,0,.4); }
.sheet-sub { display: flex; align-items: center; gap: 6px; font-size: 13px; color: rgba(255,255,255,.92); font-weight: 600; flex-wrap: wrap; text-shadow: 0 1px 8px rgba(0,0,0,.4); }
.sheet-sub .sstar svg { color: var(--yellow); }
.sheet-sub .op { color: #6ee7d6; } .sheet-sub .cl { color: #ff9b9b; }
.sheet-nav { display: flex; gap: 2px; padding: 4px 14px 0; border-bottom: 1px solid var(--border); overflow-x: auto; scrollbar-width: none; flex: 0 0 auto; }
.sheet-nav::-webkit-scrollbar { display: none; }
.sheet-nav button { flex: 0 0 auto; background: none; border: none; border-bottom: 2px solid transparent; padding: 12px 12px; font-family: 'Inter'; font-weight: 600; font-size: 13.5px; color: var(--text2); cursor: pointer; transition: color .15s, border-color .15s; }
.sheet-nav button:hover { color: var(--text); }
.lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,.88); display: flex; align-items: center; justify-content: center; padding: 24px; animation: fade .15s ease; cursor: zoom-out; }
.lightbox img { max-width: 100%; max-height: 100%; border-radius: 10px; box-shadow: 0 20px 60px rgba(0,0,0,.6); }
.lb-x { background: rgba(255,255,255,.15); }
.rev-text.clamp { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.rev-more { background: none; border: none; padding: 6px 0 0; font-family: 'Inter'; font-weight: 600; font-size: 13px; color: var(--teal); cursor: pointer; }
.rev-more:hover { text-decoration: underline; }
.photo-cell { cursor: zoom-in; transition: opacity .15s; }
.photo-cell:hover { opacity: .88; }

/* ---------- ADD A RESTAURANT ---------- */
.add-spot-row { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 10px; padding: 22px 0 4px; font-family: 'Inter'; font-size: 14px; color: var(--text2); }
.add-spot-btn { background: var(--surface); color: var(--text); border: 1px solid var(--border-hi); border-radius: 10px; padding: 9px 16px; font-family: 'Inter'; font-weight: 600; font-size: 14px; cursor: pointer; transition: all .15s; }
.add-spot-btn:hover { border-color: var(--red); color: var(--red); }
.empty .add-spot-btn { margin-top: 16px; }
.add-bg { position: fixed; inset: 0; z-index: 120; background: rgba(20,14,8,.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fade .18s ease; }
.add-modal { position: relative; width: 100%; max-width: 440px; max-height: 92vh; overflow-y: auto; background: var(--surface); border-radius: 18px; padding: 26px 24px 24px; box-shadow: 0 30px 80px rgba(20,14,8,.4); animation: pop .25s ease both; }
.add-modal .sheet-x { background: var(--surface2); color: var(--text2); }
.add-modal .sheet-x:hover { background: var(--border-hi); }
.add-h { font-family: 'Inter'; font-weight: 700; font-size: 21px; letter-spacing: -.02em; margin: 0 0 4px; color: var(--text); }
.add-sub { margin: 0 0 18px; font-size: 13.5px; color: var(--text2); line-height: 1.5; }
.add-lbl { display: block; font-family: 'Inter'; font-weight: 600; font-size: 12.5px; color: var(--text); margin: 12px 0 6px; }
.add-opt { color: var(--muted); font-weight: 500; }
.add-input { width: 100%; background: var(--bg); border: 1px solid var(--border-hi); border-radius: 9px; padding: 10px 12px; font-family: 'Inter'; font-size: 14px; color: var(--text); outline: none; transition: border-color .15s; }
.add-input:focus { border-color: var(--teal); }
select.add-input { cursor: pointer; }
.add-or { display: flex; align-items: center; gap: 10px; margin: 16px 0 4px; }
.add-or::before, .add-or::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.add-or span { font-size: 11.5px; color: var(--muted); white-space: nowrap; }
.add-submit { width: 100%; margin-top: 18px; }
.add-done { text-align: center; padding: 18px 4px 6px; }
.add-done h3 { font-family: 'Inter'; font-weight: 700; font-size: 22px; margin: 0 0 8px; color: var(--text); }
.add-done p { font-size: 14px; color: var(--text2); line-height: 1.5; margin: 0 0 20px; }
.sheet-nav { display: flex; gap: 4px; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
.sheet-nav::-webkit-scrollbar { display: none; }
.sheet-nav button { flex: 0 0 auto; background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 10px; font-family: 'Inter'; font-weight: 600; font-size: 13.5px; color: var(--text2); cursor: pointer; transition: color .15s, border-color .15s; }
.sheet-nav button:hover { color: var(--text); }
.sheet-scroll { flex: 1; overflow-y: auto; scroll-snap-type: y mandatory; background-color: var(--surface); background-image: repeating-linear-gradient(45deg, rgba(226,59,59,.022) 0 16px, transparent 16px 32px); }
.pane-deco { margin-top: auto; padding-top: 32px; display: flex; flex-direction: column; align-items: center; gap: 8px; opacity: .5; }
.pane-deco .food-ic { opacity: .14; }
.deco-word { font-family: 'Monoton', cursive; font-size: 20px; letter-spacing: .04em; opacity: .25; }
.deco-d { color: var(--text2); } .deco-9 { color: var(--red); margin-left: .06em; }
.sec-pane { scroll-snap-align: start; scroll-snap-stop: always; min-height: 100%; padding: 22px 20px 28px; border-bottom: 8px solid var(--bg); display: flex; flex-direction: column; }
.pane-h { font-family: 'Inter'; font-weight: 700; font-size: 17px; letter-spacing: -.01em; color: var(--text); margin: 0 0 14px; }
.pane-src { font-weight: 500; font-size: 12px; color: var(--muted); }
.md-price-row { display: flex; align-items: baseline; gap: 8px; padding: 12px 14px; background: var(--surface2); border-radius: 12px; margin-bottom: 14px; }
.md-price { font-family: 'Inter'; font-weight: 800; font-size: 24px; color: var(--text); letter-spacing: -.02em; }
.md-price-lbl { font-size: 12.5px; color: var(--text2); font-weight: 500; }
.md-loading { color: var(--muted); font-size: 13px; margin: 0 0 12px; }
.md-info { display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; }
.md-row { display: flex; align-items: flex-start; gap: 9px; font-size: 13.5px; color: var(--text2); line-height: 1.4; }
.md-row svg { color: var(--red); flex: 0 0 auto; margin-top: 1px; }
.md-ic { flex: 0 0 auto; font-size: 13px; }
.md-row a { color: var(--teal); text-decoration: none; font-weight: 600; }
.md-hours { font-size: 13px; color: var(--text2); }
.md-hours summary { cursor: pointer; font-weight: 600; color: var(--text); }
.md-hours ul { margin: 8px 0 0; padding-left: 16px; line-height: 1.7; }
.md-actions { display: flex; gap: 10px; }
.md-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px; border-radius: 12px; font-family: 'Inter'; font-weight: 600; font-size: 14.5px; cursor: pointer; text-decoration: none; transition: all .15s; border: 1px solid transparent; }
.md-btn.primary { background: var(--red); color: #fff; }
.md-btn.primary:hover { background: var(--red-dk); }
.md-btn.primary svg { color: #fff; }
.md-btn.ghost { background: var(--surface); color: var(--text); border-color: var(--border-hi); }
.md-btn.ghost:hover { background: var(--surface2); }
.md-btn.sm { flex: 0 0 auto; padding: 10px 16px; }

/* ---------- PRICE REPORT ---------- */
.report { margin-top: 16px; padding: 16px; background: var(--surface2); border-radius: 14px; animation: fade .2s ease; }
.report.done { margin-top: 16px; padding: 14px 16px; background: rgba(14,143,134,.1); border: 1px solid rgba(14,143,134,.25); border-radius: 14px; color: var(--teal-dk); font-size: 13.5px; font-weight: 600; font-family: 'Inter'; }
.report-q { margin: 0 0 10px; font-size: 13.5px; font-weight: 600; color: var(--text); font-family: 'Inter'; }
.report-row { display: flex; align-items: center; gap: 8px; }
.report-dollar { font-family: 'Inter'; font-weight: 700; font-size: 18px; color: var(--text2); }
.report-price { flex: 1; min-width: 0; background: var(--surface); border: 1px solid var(--border-hi); border-radius: 9px; padding: 10px 12px; font-family: 'Inter'; font-size: 15px; font-weight: 600; color: var(--text); outline: none; }
.report-price:focus { border-color: var(--teal); }
.report-note { width: 100%; margin-top: 10px; background: var(--surface); border: 1px solid var(--border-hi); border-radius: 9px; padding: 9px 12px; font-family: 'Inter'; font-size: 13px; color: var(--text); outline: none; }
.report-note:focus { border-color: var(--teal); }
.report-err { margin: 8px 0 0; color: var(--red); font-size: 12.5px; font-family: 'Inter'; }

/* ---------- SHEET SECTIONS: map / order / reviews / photos ---------- */
.sheet-map { flex: 1; width: 100%; min-height: 320px; border: 0; border-radius: 14px; }
.map-fallback { flex: 1; min-height: 280px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: var(--surface2); border-radius: 14px; color: var(--text); font-family: 'Inter'; font-weight: 600; font-size: 15px; text-decoration: none; }
.map-fallback svg { width: 26px; height: 26px; color: var(--red); }
.order-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.order-btn { display: flex; flex-direction: column; gap: 3px; padding: 16px; border: 1px solid var(--border-hi); border-radius: 14px; background: var(--surface); text-decoration: none; transition: all .15s; }
.order-btn:hover { border-color: var(--text2); transform: translateY(-2px); }
.order-btn b { font-family: 'Inter'; font-weight: 700; font-size: 15px; color: var(--text); }
.order-btn span { font-family: 'Inter'; font-size: 12px; color: var(--text2); }
.order-btn.off { opacity: .5; }
.order-note { margin: 14px 0 0; font-size: 12px; color: var(--muted); font-family: 'Inter'; line-height: 1.5; }
.rev-list { display: flex; flex-direction: column; gap: 16px; }
.rev { border-bottom: 1px solid var(--border); padding-bottom: 14px; }
.rev:last-child { border-bottom: none; }
.rev-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.rev-av { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex: 0 0 auto; }
.rev-av.ph { display: grid; place-items: center; background: var(--surface2); color: var(--text2); font-weight: 700; font-family: 'Inter'; }
.rev-name { font-family: 'Inter'; font-weight: 600; font-size: 14px; color: var(--text); }
.rev-when { font-size: 12px; color: var(--muted); }
.rev-rating { margin-left: auto; display: inline-flex; align-items: center; gap: 3px; font-family: 'Inter'; font-weight: 700; font-size: 13px; color: var(--text); }
.rev-rating svg { color: var(--yellow); }
.rev-text { margin: 0; font-size: 13.5px; line-height: 1.55; color: var(--text2); font-family: 'Inter'; }
.photo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.photo-cell { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 12px; background: var(--surface2); }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 620px) {
  .hdr-in { flex-wrap: wrap; gap: 10px; padding: 10px 16px; }
  .neon { font-size: 42px; }
  .hero { padding: 40px 18px 50px; }
  .container { padding: 22px 16px 36px; }
  .grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .fcard-img { height: 116px; }
  .reshead-t h2 { font-size: 26px; }
  .controls { top: 58px; }
  .v-price { font-size: 22px; }
}
@media (max-width: 380px) {
  .grid { grid-template-columns: 1fr; }
}
`;
