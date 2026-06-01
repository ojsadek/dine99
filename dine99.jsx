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

// Clean, consistent emoji per item — replaces generic stock photos on tiles.
const EMOJI = {
  hamburger: "🍔", cheeseburger: "🍔", "grilled-chicken-sandwich": "🍗",
  "fried-chicken-sandwich": "🍗", "chicken-wings": "🍗", "italian-beef": "🥪",
  "philly-cheesesteak": "🥖", "hot-dog": "🌭", "pizza-slice": "🍕", "pizza-14": "🍕",
  tacos: "🌮", burrito: "🌯", shawarma: "🥙", gyros: "🥙", "french-fries": "🍟",
  "onion-rings": "🧅",
};
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

  // Cheapest-item photo per food tile (foodId -> imgUrl)
  const [tilePhotos, setTilePhotos] = useState({});

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
    fetch(`/api/search?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=16000&keyword=${encodeURIComponent(food.name)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.places?.length) return; // fall back to sample data
        const mapped = d.places.map((p) => ({
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

  // Progressive tile photos: for each food, find the cheapest nearby spot
  // with a photo and use it. Emoji stays as the instant fallback.
  useEffect(() => {
    if (!userLoc) return;
    let cancelled = false;
    setTilePhotos({});
    FOODS.forEach((food) => {
      fetch(`/api/search?lat=${userLoc.lat}&lng=${userLoc.lng}&radius=16000&keyword=${encodeURIComponent(food.name)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d.places?.length) return;
          const withPhoto = d.places
            .filter((p) => p.photoRef)
            .map((p) => ({ ...p, price: estimatePrice(p.priceLevel, food.base) }))
            .sort((a, b) => a.price - b.price);
          if (withPhoto[0]) {
            setTilePhotos((prev) => ({ ...prev, [food.id]: photoUrl(withPhoto[0].photoRef) }));
          }
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
  }, [userLoc]);

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
                        : <span className="tile-emoji">{EMOJI[f.id]}</span>}
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
                <p className="foot-disc">Prices are estimates and may not be current or available at all locations. Always confirm with the restaurant. Listings &amp; photos via Google Places.</p>
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
            <div className="reshead-img" style={{ backgroundImage: gradFor(foodObj) }}><span className="tile-emoji sm">{EMOJI[foodObj.id]}</span></div>
            <div className="reshead-t">
              <h2>{foodObj.name}</h2>
              <span>{results.length} spots near you · avg ${avg ? avg.toFixed(2) : "—"}</span>
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
              {[["1", 1], ["3", 3], ["5", 5], ["10", 10], ["Any", 12]].map(([l, v]) => (
                <button key={l} className={`dchip ${range === v ? "on" : ""}`} onClick={() => setRange(v)}>{l === "Any" ? "Any" : `${l} mi`}</button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="loading-bar">
              <span>Finding real spots near you…</span>
            </div>
          )}

          {!loading && results.length === 0 ? (
            <div className="empty"><h3>No spots in range</h3><p>Tap a bigger distance to see more.</p></div>
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
                        : <div className="fimg tile" style={{ backgroundImage: gradFor(foodObj) }}><span className="tile-emoji sm">{EMOJI[foodObj.id]}</span></div>
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
                        : <div className="fimg tile" style={{ backgroundImage: gradFor(food) }}><span className="tile-emoji sm">{EMOJI[food.id]}</span></div>
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

      {/* ============ RESTAURANT DETAIL MODAL ============ */}
      {spot && (
        <div className="modal-bg" onClick={closeSpot}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-x" onClick={closeSpot} aria-label="Close">✕</button>

            <div className="md-head">
              {(detail?.photoRef || spot.imgUrl)
                ? <img className="md-img" alt={spot.name} src={detail?.photoRef ? `/api/photo?ref=${encodeURIComponent(detail.photoRef)}&w=600` : spot.imgUrl} />
                : <div className="md-img tile" style={{ backgroundImage: gradFor(FOODS.find((f)=>f.id===spot.foodId)) }}><span className="tile-emoji">{EMOJI[spot.foodId]}</span></div>}
            </div>

            <div className="md-body">
              <h2 className="md-name">{spot.name}</h2>
              <div className="md-meta">
                <span className="sstar"><Star /> {spot.rating || "—"}</span>
                {detail?.reviews ? <><span className="mdot">•</span>{detail.reviews} reviews</> : null}
                <span className="mdot">•</span>{spot.distance} mi
                {detail?.open != null && <><span className="mdot">•</span><em className={detail.open ? "op" : "cl"}>{detail.open ? "Open now" : "Closed"}</em></>}
              </div>

              <div className="md-price-row">
                <div>
                  <span className="md-price">${spot.price.toFixed(2)}</span>
                  <span className="md-price-lbl"> est. for {FOODS.find((f)=>f.id===spot.foodId)?.name}</span>
                </div>
              </div>

              {detailLoading && <p className="md-loading">Loading details…</p>}

              {detail && (
                <div className="md-info">
                  {detail.address && <div className="md-row"><Pin /> <span>{detail.address}</span></div>}
                  {detail.phone && <div className="md-row"><span className="md-ic">📞</span> <a href={`tel:${detail.phone}`}>{detail.phone}</a></div>}
                  {detail.website && <div className="md-row"><span className="md-ic">🌐</span> <a href={detail.website} target="_blank" rel="noreferrer">Website</a></div>}
                  {detail.hours && (
                    <details className="md-hours">
                      <summary>Hours</summary>
                      <ul>{detail.hours.map((h, i) => <li key={i}>{h}</li>)}</ul>
                    </details>
                  )}
                </div>
              )}

              <div className="md-actions">
                <a
                  className="md-btn primary"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${detail?.lat && detail?.lng ? `${detail.lat},${detail.lng}` : encodeURIComponent(spot.name)}&destination_place_id=${spot.id}`}
                  target="_blank" rel="noreferrer"
                ><Pin /> Get directions</a>
                <button className="md-btn ghost" onClick={() => { setReportOpen((o) => !o); setReportState(""); }}>
                  Report a price
                </button>
              </div>

              {reportOpen && (
                reportState === "done" ? (
                  <div className="report done">✓ Thanks! Your price report was submitted for review.</div>
                ) : (
                  <form className="report" onSubmit={submitReport}>
                    <p className="report-q">What price did you see for {FOODS.find((f)=>f.id===spot.foodId)?.name.toLowerCase()}?</p>
                    <div className="report-row">
                      <span className="report-dollar">$</span>
                      <input className="report-price" type="number" step="0.01" min="0" placeholder="0.00"
                        value={reportPrice} onChange={(e) => setReportPrice(e.target.value)} autoFocus />
                      <button className="md-btn primary sm" type="submit" disabled={reportState === "sending"}>
                        {reportState === "sending" ? "Sending…" : "Submit"}
                      </button>
                    </div>
                    <input className="report-note" placeholder="Note (optional) — e.g. lunch special, size…"
                      value={reportNote} onChange={(e) => setReportNote(e.target.value)} />
                    {reportState === "error" && <p className="report-err">Enter a valid price and try again.</p>}
                  </form>
                )
              )}
            </div>
          </div>
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

/* ---------- EMOJI TILES ---------- */
.tile-emoji { font-size: 54px; line-height: 1; filter: drop-shadow(0 3px 6px rgba(80,50,20,.18)); }
.tile-emoji.sm { font-size: 42px; }
.fcard-img, .vspot-img .tile, .reshead-img { display: grid; place-items: center; }
.reshead-img .tile-emoji { font-size: 30px; }

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

/* ---------- MODAL ---------- */
.modal-bg { position: fixed; inset: 0; z-index: 100; background: rgba(20,14,8,.5); backdrop-filter: blur(3px); display: flex; align-items: center; justify-content: center; padding: 20px; animation: fade .18s ease; }
.modal { position: relative; width: 100%; max-width: 440px; max-height: 90vh; overflow-y: auto; background: var(--surface); border-radius: 20px; box-shadow: 0 30px 80px rgba(20,14,8,.4); animation: pop .25s ease both; }
.modal-x { position: absolute; top: 12px; right: 12px; z-index: 2; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(0,0,0,.45); color: #fff; font-size: 14px; cursor: pointer; display: grid; place-items: center; }
.modal-x:hover { background: rgba(0,0,0,.65); }
.md-head { height: 180px; overflow: hidden; border-radius: 20px 20px 0 0; }
.md-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.md-img.tile { display: grid; place-items: center; }
.md-body { padding: 18px 20px 22px; }
.md-name { font-family: 'Inter'; font-weight: 700; font-size: 22px; letter-spacing: -.02em; margin: 0 0 6px; color: var(--text); }
.md-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text2); font-weight: 500; flex-wrap: wrap; margin-bottom: 14px; }
.md-meta .op { color: var(--teal); font-weight: 600; } .md-meta .cl { color: var(--red); font-weight: 600; }
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
