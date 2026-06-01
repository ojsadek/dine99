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
          <button className="brand" onClick={goHome}><NeonSm /></button>
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
              <span className="hero-open">◗ OPEN 24 HRS ◖</span>
              <NeonBig />
              <span className="hero-tag">Food you crave at the price you desire</span>
            </div>
            <div className="hero-floor" />
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
                    <div className="fcard-img"><FoodImg kw={f.kw} w={420} h={320} lock={lockFor(f.id)} cls="" label={f.name} /></div>
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
            <span className="foot-floor" />
            <div className="foot-in">
              <NeonSm />
              <p>Real restaurant data via Google Places · prices estimated by tier</p>
            </div>
          </footer>
        </div>
      )}

      {/* ============ RESULTS ============ */}
      {tab === "menu" && selectedFood && (
        <div className="container results slide">
          <div className="reshead">
            <button className="circ" onClick={() => setSelectedFood(null)}><Back /></button>
            <FoodImg kw={foodObj.kw} w={120} h={120} lock={lockFor(foodObj.id)} cls="reshead-img" label={foodObj.name} />
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
                  <div key={r.id} className={`vspot ${best ? "best" : ""}`}>
                    <div className="vspot-img">
                      {r.imgUrl
                        ? <img className="fimg" loading="lazy" alt={r.name} src={r.imgUrl} />
                        : <FoodImg kw={foodObj.kw} w={360} h={300} lock={lockFor(r.id)} cls="" label={foodObj.name} />
                      }
                      {best && <span className="v-badge">★ BEST PRICE</span>}
                      <span className={`v-heart ${favs[r.id] ? "on" : ""}`} onClick={() => toggleFav(r)}><Heart filled={!!favs[r.id]} /></span>
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
                      <FoodImg kw={food.kw} w={360} h={300} lock={lockFor(r.id)} cls="" label={food.name} />
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
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Monoton&family=Fredoka:wght@400;500;600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap');

.d99 {
  --cream: #fff5e4;
  --white: #ffffff;
  --ink: #2a2018;
  --muted: #9a8c7c;
  --line: rgba(42,32,24,.10);
  --red: #ff3b41;
  --red-dk: #e62830;
  --teal: #15c5bd;
  --teal-dk: #0fa39b;
  --yellow: #ffc42e;
  --pink: #ff4d9d;
  --night: #181233;
  --night2: #241a4d;
  --shadow: 0 10px 28px rgba(42,32,24,.14);

  font-family: 'Nunito Sans', sans-serif;
  color: var(--ink);
  min-height: 100vh;
  background-color: var(--cream);
  background-image:
    linear-gradient(45deg, rgba(42,32,24,.045) 25%, transparent 25% 75%, rgba(42,32,24,.045) 75%),
    linear-gradient(45deg, rgba(42,32,24,.045) 25%, transparent 25% 75%, rgba(42,32,24,.045) 75%);
  background-size: 64px 64px, 64px 64px;
  background-position: 0 0, 32px 32px;
}
.d99 * { box-sizing: border-box; }

.fimg { display: block; object-fit: cover; width: 100%; height: 100%; background: #ecdfce; }
.fimg.fb { display: grid; place-items: center; background: linear-gradient(135deg, hsl(calc(var(--g) * 1deg) 70% 60%), hsl(calc(var(--g) * 1deg + 40) 75% 50%)); }
.fimg.fb span { font-family: 'Fredoka'; color: #fff; font-weight: 600; font-size: 15px; padding: 8px; text-align: center; }

/* ---------- NEON WORDMARK ---------- */
.neon { font-family: 'Monoton', cursive; font-size: 54px; line-height: .9; letter-spacing: .02em; }
.neon.sm { font-size: 26px; }
.neon-d { color: #fff0f6; text-shadow: 0 0 6px #ff8fc4, 0 0 14px #ff4d9d, 0 0 30px #ff4d9d, 0 0 54px rgba(255,77,157,.7); }
.neon-99 { color: #d8fffb; margin-left: .06em; text-shadow: 0 0 6px #7df5ec, 0 0 14px #15c5bd, 0 0 32px #15c5bd, 0 0 56px rgba(21,197,189,.7); }
.neon.sm .neon-d { text-shadow: 0 0 4px #ff8fc4, 0 0 10px #ff4d9d, 0 0 18px rgba(255,77,157,.7); }
.neon.sm .neon-99 { text-shadow: 0 0 4px #7df5ec, 0 0 10px #15c5bd, 0 0 18px rgba(21,197,189,.7); }

/* ---------- LOCATION PICKER ---------- */
.loc-wrap { position: relative; }
.loc-pill { display: inline-flex; align-items: center; gap: 6px; font-family: 'Fredoka'; font-weight: 600; font-size: 13.5px; color: #fff; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); padding: 8px 13px; border-radius: 999px; cursor: pointer; transition: background .15s; }
.loc-pill:hover { background: rgba(255,255,255,.18); }
.loc-pill svg { color: var(--yellow); }
.loc-caret { font-size: 9px; opacity: .7; margin-left: 2px; }
.loc-popover { position: absolute; top: calc(100% + 10px); left: 0; width: 260px; background: var(--night); border: 2px solid rgba(255,255,255,.14); border-radius: 18px; padding: 16px; box-shadow: 0 12px 36px rgba(0,0,0,.45); z-index: 50; animation: fade .15s ease; }
.near-me-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--teal); color: #fff; border: none; border-radius: 12px; padding: 11px; font-family: 'Fredoka'; font-weight: 700; font-size: 14.5px; cursor: pointer; transition: background .15s; }
.near-me-btn:hover { background: var(--teal-dk); }
.near-me-btn:disabled { opacity: .6; cursor: default; }
.near-me-btn svg { color: #fff; }
.loc-divider { display: flex; align-items: center; gap: 10px; margin: 12px 0; }
.loc-divider::before,.loc-divider::after { content:''; flex:1; height:1px; background: rgba(255,255,255,.12); }
.loc-divider span { font-family:'Fredoka'; font-size:12px; color:rgba(255,255,255,.45); white-space:nowrap; }
.loc-form { display: flex; gap: 8px; }
.loc-input { flex: 1; background: rgba(255,255,255,.08); border: 1.5px solid rgba(255,255,255,.18); border-radius: 10px; padding: 9px 12px; font-family: 'Fredoka'; font-size: 14px; color: #fff; outline: none; }
.loc-input::placeholder { color: rgba(255,255,255,.35); }
.loc-input:focus { border-color: var(--teal); }
.loc-go { background: var(--red); color: #fff; border: none; border-radius: 10px; padding: 9px 15px; font-family: 'Fredoka'; font-weight: 700; font-size: 14px; cursor: pointer; transition: background .15s; }
.loc-go:hover { background: var(--red-dk); }
.loc-go:disabled { opacity: .6; cursor: default; }
.loc-err { font-family: 'Fredoka'; font-size: 12.5px; color: var(--red); margin-top: 8px; text-align: center; }

/* ---------- SITE HEADER ---------- */
.site-hdr { position: sticky; top: 0; z-index: 30; background: var(--night); border-bottom: 3px solid var(--red); box-shadow: 0 4px 20px rgba(0,0,0,.3); }
.hdr-in { max-width: 1120px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; }
.brand { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; }
.site-nav { display: flex; align-items: center; gap: 10px; }
.nav-link { display: inline-flex; align-items: center; gap: 7px; font-family: 'Fredoka'; font-weight: 600; font-size: 14px; color: rgba(255,255,255,.85); background: none; border: 2px solid transparent; border-radius: 999px; padding: 8px 16px; cursor: pointer; transition: all .15s; }
.nav-link:hover { color: #fff; background: rgba(255,255,255,.08); }
.nav-link.on { color: #fff; background: var(--red); }
.nav-link.saved svg { color: var(--pink); }
.nav-link.saved.on svg { color: #fff; }

/* ---------- HERO ---------- */
.page.fade { animation: fade .32s ease both; }
@keyframes fade { from { opacity: 0; transform: translateY(7px); } }
.hero { position: relative; background: radial-gradient(circle at 50% 24%, var(--night2), var(--night) 78%); overflow: hidden; padding: 54px 24px 64px; text-align: center; }
.hero-glow { position: absolute; inset: 0; background: radial-gradient(circle at 50% 30%, rgba(255,77,157,.32) 0%, transparent 44%), radial-gradient(circle at 82% 76%, rgba(21,197,189,.26) 0%, transparent 44%), radial-gradient(circle at 16% 70%, rgba(255,196,46,.18) 0%, transparent 42%); }
.hero-in { position: relative; z-index: 2; max-width: 640px; margin: 0 auto; }
.hero-open { font-family: 'Fredoka'; font-weight: 600; letter-spacing: .3em; font-size: 11px; color: var(--teal); display: block; margin-bottom: 16px; text-shadow: 0 0 8px rgba(21,197,189,.9); }
.neon { animation: flick 6s infinite; display: inline-block; }
@keyframes flick { 0%,17%,21%,23%,56%,58%,100% { opacity: 1; } 19%,22%,57% { opacity: .8; } }
.hero-tag { display: block; margin-top: 14px; font-family: 'Fredoka'; font-weight: 500; font-size: 15px; color: rgba(255,255,255,.82); }
.hero-floor { position: absolute; left: 0; right: 0; bottom: 0; height: 18px; z-index: 1;
  background-image: linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25% 75%, rgba(255,255,255,.15) 75%), linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25% 75%, rgba(255,255,255,.15) 75%);
  background-size: 18px 18px; background-position: 0 0, 9px 9px; }

/* ---------- CONTAINER ---------- */
.container { max-width: 1120px; margin: 0 auto; padding: 28px 24px 40px; }

/* ---------- CATEGORY CHIPS ---------- */
.cats { display: flex; gap: 9px; overflow-x: auto; padding-bottom: 18px; scrollbar-width: none; }
.cats::-webkit-scrollbar { display: none; }
.cat { flex: 0 0 auto; border: 2px solid var(--ink); background: var(--white); color: var(--ink); border-radius: 999px; padding: 9px 18px; font-family: 'Fredoka'; font-weight: 600; font-size: 14px; cursor: pointer; transition: all .14s; }
.cat:active { transform: scale(.95); }
.cat.on { background: var(--red); color: #fff; border-color: var(--red); }

.sec { font-family: 'Fredoka'; font-weight: 700; font-size: 26px; margin: 6px 0 18px; }
.sec.big { font-size: 32px; }

/* ---------- FOOD CARDS ---------- */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(216px, 1fr)); gap: 18px; }
.fcard { background: var(--white); border: 3px solid var(--ink); border-radius: 22px; overflow: hidden; cursor: pointer; padding: 0; text-align: left; box-shadow: 4px 5px 0 var(--ink); transition: transform .15s, box-shadow .15s; animation: pop .4s ease both; }
@keyframes pop { from { opacity: 0; transform: translateY(12px); } }
.fcard:hover { transform: translate(-2px,-2px); box-shadow: 6px 7px 0 var(--red); }
.fcard:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--ink); }
.fcard-img { height: 150px; border-bottom: 3px solid var(--ink); overflow: hidden; }
.fcard-img .fimg { transition: transform .45s; }
.fcard:hover .fcard-img .fimg { transform: scale(1.07); }
.fcard-txt { padding: 13px 15px 15px; display: flex; flex-direction: column; gap: 7px; }
.fcard-name { font-family: 'Fredoka'; font-weight: 600; font-size: 17px; line-height: 1.1; }
.fcard-from { align-self: flex-start; font-family: 'Fredoka'; font-weight: 600; font-size: 13px; color: #fff; background: var(--teal); padding: 3px 11px; border-radius: 999px; }
.nores { grid-column: 1/-1; text-align: center; color: var(--muted); padding: 44px 0; font-family: 'Fredoka'; font-size: 17px; }

/* ---------- FOOTER ---------- */
.foot { margin-top: 20px; }
.foot-floor { display: block; height: 16px; background-image: linear-gradient(45deg, var(--ink) 25%, transparent 25% 75%, var(--ink) 75%), linear-gradient(45deg, var(--ink) 25%, transparent 25% 75%, var(--ink) 75%); background-size: 16px 16px; background-position: 0 0, 8px 8px; background-color: var(--cream); }
.foot-in { max-width: 1120px; margin: 0 auto; padding: 22px 24px 44px; display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
.foot-in .neon.sm { font-size: 22px; }
.foot-in p { margin: 0; color: var(--muted); font-size: 13.5px; max-width: 520px; font-family: 'Fredoka'; font-weight: 500; }

/* ---------- RESULTS ---------- */
.results { max-width: 1120px; }
.slide { animation: slide .3s cubic-bezier(.2,.7,.2,1) both; }
@keyframes slide { from { opacity: 0; transform: translateY(10px); } }
.reshead { display: flex; align-items: center; gap: 15px; margin-bottom: 20px; }
.circ { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 50%; border: 3px solid var(--ink); background: var(--white); color: var(--ink); display: grid; place-items: center; cursor: pointer; box-shadow: 2px 2px 0 var(--ink); }
.circ:active { transform: scale(.93); }
.reshead-img { width: 60px; height: 60px; border-radius: 16px; border: 3px solid var(--ink); flex: 0 0 auto; }
.reshead-t { min-width: 0; }
.reshead-t h2 { font-family: 'Fredoka'; font-weight: 700; font-size: 32px; margin: 0; line-height: 1; }
.reshead-t span { font-family: 'Fredoka'; font-weight: 500; font-size: 14px; color: var(--muted); }

.controls { position: sticky; top: 64px; z-index: 6; background: linear-gradient(var(--cream) 82%, transparent); padding: 6px 0 14px; margin-bottom: 6px; }
.chips, .dist { display: flex; gap: 9px; overflow-x: auto; scrollbar-width: none; padding-bottom: 10px; align-items: center; }
.chips::-webkit-scrollbar, .dist::-webkit-scrollbar { display: none; }
.chip { flex: 0 0 auto; border: 2px solid var(--ink); background: var(--white); color: var(--ink); border-radius: 999px; padding: 9px 17px; font-family: 'Fredoka'; font-weight: 600; font-size: 14px; cursor: pointer; transition: all .14s; }
.chip:active { transform: scale(.95); }
.chip.on { background: var(--ink); color: var(--cream); }
.dist { padding-bottom: 2px; }
.dist-lbl { flex: 0 0 auto; font-family: 'Fredoka'; font-weight: 600; font-size: 13.5px; color: var(--muted); margin-right: 2px; }
.dchip { flex: 0 0 auto; border: 2px solid var(--line); background: var(--white); color: var(--ink); border-radius: 999px; padding: 8px 15px; font-family: 'Fredoka'; font-weight: 600; font-size: 13.5px; cursor: pointer; transition: all .14s; }
.dchip:active { transform: scale(.94); }
.dchip.on { background: var(--teal); color: #fff; border-color: var(--teal); }

/* ---------- SPOTS (vertical cards) ---------- */
.rlist { display: grid; grid-template-columns: repeat(auto-fill, minmax(218px, 1fr)); gap: 18px; margin-top: 14px; }
.vspot { position: relative; display: flex; flex-direction: column; background: var(--white); border: 3px solid var(--ink); border-radius: 20px; overflow: hidden; box-shadow: 4px 5px 0 var(--ink); transition: transform .15s, box-shadow .15s; animation: pop .4s ease both; }
.vspot:hover { transform: translate(-2px,-2px); box-shadow: 6px 7px 0 var(--red); }
.vspot.best { border-color: var(--teal); box-shadow: 5px 6px 0 var(--teal-dk); }
.vspot.best:hover { box-shadow: 7px 8px 0 var(--teal-dk); }
.vspot-img { position: relative; height: 144px; border-bottom: 3px solid var(--ink); overflow: hidden; }
.vspot-img .fimg { width: 100%; height: 100%; transition: transform .45s; }
.vspot:hover .vspot-img .fimg { transform: scale(1.07); }
.v-badge { position: absolute; top: 10px; left: 10px; background: var(--teal); color: #fff; font-family: 'Fredoka'; font-weight: 700; font-size: 10.5px; letter-spacing: .04em; padding: 4px 10px; border-radius: 999px; box-shadow: 0 3px 8px rgba(15,163,155,.5); }
.v-heart { position: absolute; top: 9px; right: 9px; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 50%; background: rgba(255,255,255,.92); color: var(--muted); cursor: pointer; transition: transform .15s, color .15s; box-shadow: 0 2px 6px rgba(0,0,0,.2); }
.v-heart:hover { color: var(--red); } .v-heart:active { transform: scale(1.2); } .v-heart.on { color: var(--red); }
.vspot-body { display: flex; flex-direction: column; gap: 7px; padding: 13px 15px 15px; flex: 1; }
.v-name { font-family: 'Fredoka'; font-weight: 600; font-size: 17.5px; line-height: 1.12; }
.v-meta { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--muted); font-weight: 600; flex-wrap: wrap; }
.sstar { display: inline-flex; align-items: center; gap: 3px; color: var(--yellow); }
.sstar svg { color: var(--yellow); }
.mdot { color: var(--line); }
.v-meta em { font-style: normal; } .v-meta .op { color: var(--teal-dk); } .v-meta .cl { color: var(--red); }
.v-foot { margin-top: auto; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-top: 4px; }
.v-price { font-family: 'Fredoka'; font-weight: 700; font-size: 27px; line-height: 1; color: var(--red); }
.vspot.best .v-price { color: var(--teal-dk); }
.v-save { font-family: 'Fredoka'; font-weight: 600; font-size: 11px; color: #fff; background: var(--teal); padding: 2px 9px; border-radius: 999px; white-space: nowrap; }
.rfoot { grid-column: 1 / -1; text-align: center; font-size: 12.5px; color: var(--muted); padding: 12px 0 2px; font-family: 'Fredoka'; }

/* ---------- LOCATION GATE ---------- */
.loc-gate { display: flex; justify-content: center; align-items: flex-start; padding: 48px 24px 80px; }
.loc-gate-box { background: var(--night); border: 2px solid rgba(255,255,255,.12); border-radius: 24px; padding: 36px 32px; max-width: 380px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.loc-gate-box > svg { color: var(--yellow); width: 32px; height: 32px; margin-bottom: 12px; }
.loc-gate-box h2 { font-family: 'Fredoka'; font-weight: 700; font-size: 28px; color: #fff; margin: 0 0 8px; }
.loc-gate-box p { font-family: 'Fredoka'; font-size: 15px; color: rgba(255,255,255,.55); margin: 0 0 22px; }
.near-me-btn.wide { width: 100%; }

/* ---------- LOADING ---------- */
.loading-bar { text-align: center; padding: 48px 22px; font-family: 'Fredoka'; font-weight: 600; font-size: 16px; color: var(--teal-dk); animation: pulse 1.4s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

/* ---------- EMPTY ---------- */
.saved-page { max-width: 1120px; }
.empty { text-align: center; padding: 70px 22px; }
.empty-heart { color: var(--line); display: inline-flex; margin-bottom: 12px; }
.empty h3 { font-family: 'Fredoka'; font-weight: 700; font-size: 23px; margin: 0 0 6px; }
.empty p { color: var(--muted); font-family: 'Fredoka'; }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 620px) {
  .hdr-in { flex-wrap: wrap; gap: 10px; padding: 10px 16px; }
  .loc-pill { display: none; }
  .neon { font-size: 42px; }
  .hero { padding: 40px 18px 50px; }
  .container { padding: 22px 16px 36px; }
  .grid { grid-template-columns: 1fr 1fr; gap: 12px; }
  .fcard-img { height: 116px; }
  .reshead-t h2 { font-size: 26px; }
  .controls { top: 58px; }
  .spot-price { font-size: 24px; }
}
@media (max-width: 380px) {
  .grid { grid-template-columns: 1fr; }
}
`;
