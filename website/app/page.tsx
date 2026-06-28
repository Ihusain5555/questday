export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="wrap nav-in">
          <div className="brand">
            <span className="crest">
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l2.5 5 5.5.8-4 3.9.95 5.5L12 21.6 7.05 18.2 8 12.7l-4-3.9L9.5 8z" />
              </svg>
            </span>
            QuestDay
          </div>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#faith">Built around prayer</a>
            <a href="#privacy">Privacy</a>
            <a href="#download" className="btn btn-primary" style={{ padding: "9px 16px" }}>
              Download
            </a>
          </nav>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" style={{ padding: 0 }}>
        <div className="wrap hero-in">
          <div>
            <span className="pill">🕌 A calm, private desktop companion</span>
            <h1>
              Build your focused work <span className="accent">around the five daily prayers.</span>
            </h1>
            <p className="lede">
              QuestDay turns your day into clear quests and deep-work blocks that flow with your salah — quietly, on
              your desktop, with everything kept on your device.
            </p>
            <div className="cta-row">
              <a href="#download" className="btn btn-primary">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5.8 10.5 4.8v6.7H3zM10.5 12.5v6.7L3 18.2v-5.7zM11.6 4.6 21 3.3v8.2h-9.4zM21 12.5v8.2l-9.4-1.3v-6.9z" />
                </svg>
                Download for Windows
              </a>
              <a href="#download" className="btn btn-ghost">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 3.2c.1 1.1-.3 2.1-1 2.9-.7.9-1.8 1.5-2.9 1.4-.1-1 .4-2.1 1-2.8.7-.8 1.9-1.4 2.9-1.5zM19 17.3c-.5 1.2-.8 1.7-1.4 2.7-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.3.9-3.7.9c-1.6 0-2.8-1.6-3.7-3C-.1 16.9-.6 11.4 2 8.6c1-1.1 2.4-1.8 3.9-1.8 1.6 0 2.6 1 3.9 1 1.3 0 2-1 3.9-1 1.3 0 2.7.7 3.7 2-3.2 1.8-2.7 6.4 1.7 8.5z" />
                </svg>
                macOS
              </a>
            </div>
            <div className="trust-line">
              <span>
                <i className="dot"></i> Free forever
              </span>
              <span>
                <i className="dot"></i> 100% offline
              </span>
              <span>
                <i className="dot"></i> No account, no cloud
              </span>
            </div>
          </div>

          {/* CSS mock of the app */}
          <div className="shot">
            <div className="win">
              <div className="win-bar">
                <span className="tl" style={{ background: "#ff5f57" }}></span>
                <span className="tl" style={{ background: "#febc2e" }}></span>
                <span className="tl" style={{ background: "#28c840" }}></span>
                <span className="win-title">QuestDay — Today</span>
              </div>
              <div className="win-body">
                <div className="side">
                  <div className="tab on">Dashboard</div>
                  <div className="tab">Quests</div>
                  <div className="tab">Time frames</div>
                  <div className="tab">Forge</div>
                  <div className="tab">Realm</div>
                  <div className="tab">Arcade</div>
                </div>
                <div>
                  <div className="panel" style={{ marginBottom: 12 }}>
                    <div className="frame-h">
                      <b>Morning</b>
                      <span className="pr">Fajr → Dhuhr</span>
                    </div>
                    <div className="q cur">
                      <i></i>
                      <span>Finish the proposal draft</span>
                      <small>now</small>
                    </div>
                    <div className="q">
                      <i></i>
                      <span>Review pull request</span>
                      <small>25m</small>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="frame-h">
                      <b>Afternoon</b>
                      <span className="pr">Asr → Maghrib</span>
                    </div>
                    <div className="q">
                      <i></i>
                      <span>Deep-work: study block</span>
                      <small>50m</small>
                    </div>
                    <div className="q">
                      <i></i>
                      <span>Read Qur&apos;an</span>
                      <small>15m</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="widget">
              <div className="lab">Current quest</div>
              <div className="qt">Finish the proposal draft</div>
              <div className="sub">Next: outline section 3</div>
              <div className="bar">
                <i></i>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">What it does</span>
            <h2>A focused day, gently structured</h2>
            <p>Everything a good task app does — plus the things only a faith-native one would.</p>
          </div>
          <div className="grid">
            <div className="card">
              <div className="ci">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 7v5l3 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>
              <h3>Prayer-aware time frames</h3>
              <p>
                Anchor your day&apos;s blocks to your local prayer times — your &quot;afternoon&quot; begins at Asr and
                shifts naturally with the seasons.
              </p>
            </div>
            <div className="card">
              <div className="ci">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M3 9h18M8 2v4M16 2v4" />
                </svg>
              </div>
              <h3>Islamic calendar &amp; reminders</h3>
              <p>
                Gentle nudges for the fasting days, Ramadan, the two Eids and more — grounded in the Qur&apos;an and
                authentic Sunnah, computed on your device.
              </p>
            </div>
            <div className="card">
              <div className="ci">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </div>
              <h3>The current-quest widget</h3>
              <p>
                An always-on-top nudge that shows the one thing to do next — and the next small step — without opening
                the app.
              </p>
            </div>
            <div className="card">
              <div className="ci">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                </svg>
              </div>
              <h3>Focus mode &amp; priority matrix</h3>
              <p>
                A built-in focus timer and an importance × urgency view that quietly surfaces what truly matters first.
              </p>
            </div>
            <div className="card">
              <div className="ci">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6z" />
                </svg>
              </div>
              <h3>Calm, never punishing</h3>
              <p>
                Your progress only ever grows. No streak-shaming, no lost points — a quiet day is just a day of rest.
              </p>
            </div>
            <div className="card">
              <div className="ci">
                <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="6" width="20" height="12" rx="3" />
                  <path d="M7 12h3M8.5 10.5v3M15 11h.01M18 13h.01" />
                </svg>
              </div>
              <h3>
                A little arcade <span className="soon">+ a realm, soon</span>
              </h3>
              <p>
                Earn quick brain-break minigames as a reward — with a growing world on the way. Always a treat, never
                the point.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAITH BAND */}
      <section id="faith" className="band">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow" style={{ color: "var(--gold-soft)" }}>
              Why it&apos;s different
            </span>
            <h2>The desktop deep-work companion for a Muslim&apos;s day</h2>
            <p>
              Other apps bolt productivity onto your life. QuestDay shapes your focused work around what already anchors
              your day — your salah.
            </p>
          </div>
          <div className="vals">
            <div className="val">
              <b>5×</b>
              <span>day shaped by the five prayers, computed on-device</span>
            </div>
            <div className="val">
              <b>0</b>
              <span>accounts, servers, or data ever leaving your machine</span>
            </div>
            <div className="val">
              <b>∞</b>
              <span>free, forever — offered freely</span>
            </div>
            <div className="val">
              <b>1</b>
              <span>calm, focused thing to do next</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRIVACY */}
      <section id="privacy">
        <div className="wrap">
          <div className="sec-head">
            <span className="eyebrow">Your data is yours</span>
            <h2>No accounts. No cloud. No tracking. Ever.</h2>
            <p>
              QuestDay runs entirely on your computer. Your quests, your prayers, your reflections — they never touch a
              server, because there is no server. Prayer times and the Islamic calendar are calculated with pure
              on-device math, so your location never leaves your machine.
            </p>
          </div>
        </div>
      </section>

      {/* DOWNLOAD */}
      <section id="download" className="dl">
        <div className="wrap">
          <div className="dl-card">
            <h2>Download QuestDay</h2>
            <p className="free">Free forever · Windows 10/11 · macOS (Apple Silicon &amp; Intel)</p>
            <div className="dl-btns">
              <a href="https://github.com/Ihusain5555/questday/releases/latest" className="btn btn-primary">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 5.8 10.5 4.8v6.7H3zM10.5 12.5v6.7L3 18.2v-5.7zM11.6 4.6 21 3.3v8.2h-9.4zM21 12.5v8.2l-9.4-1.3v-6.9z" />
                </svg>
                Windows installer
              </a>
              <a href="https://github.com/Ihusain5555/questday/releases/latest" className="btn btn-ghost">
                <svg className="ico" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 3.2c.1 1.1-.3 2.1-1 2.9-.7.9-1.8 1.5-2.9 1.4-.1-1 .4-2.1 1-2.8.7-.8 1.9-1.4 2.9-1.5zM19 17.3c-.5 1.2-.8 1.7-1.4 2.7-.9 1.4-2.2 3.1-3.8 3.1-1.4 0-1.8-.9-3.7-.9s-2.3.9-3.7.9c-1.6 0-2.8-1.6-3.7-3C-.1 16.9-.6 11.4 2 8.6c1-1.1 2.4-1.8 3.9-1.8 1.6 0 2.6 1 3.9 1 1.3 0 2-1 3.9-1 1.3 0 2.7.7 3.7 2-3.2 1.8-2.7 6.4 1.7 8.5z" />
                </svg>
                macOS (.dmg)
              </a>
            </div>
            <div className="note">
              <b>First launch note:</b> QuestDay is a small independent app, so Windows may show a blue “Windows
              protected your PC” screen the first time. Click <b>More info → Run anyway</b>. On a Mac, right-click the
              app → <b>Open</b>. This is normal for new apps and goes away after the first run.
            </div>
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap foot-in">
          <div className="brand" style={{ fontSize: 17 }}>
            <span className="crest" style={{ width: 28, height: 28 }}>
              <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3l2.5 5 5.5.8-4 3.9.95 5.5L12 21.6 7.05 18.2 8 12.7l-4-3.9L9.5 8z" />
              </svg>
            </span>
            QuestDay
          </div>
          <div>Private by design · Free forever · © QuestDay</div>
        </div>
      </footer>
    </>
  );
}
