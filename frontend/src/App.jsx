import { useEffect, useState } from "react";
import axios from "axios";
import "./index.css";

const API = "http://127.0.0.1:8000";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(
    JSON.parse(localStorage.getItem("user") || "null")
  );

  const [mode, setMode] = useState("login");

  const [authForm, setAuthForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [hobbies, setHobbies] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [posts, setPosts] = useState([]);
  const [analytics, setAnalytics] = useState([]);

  const [hobbyForm, setHobbyForm] = useState({
    name: "",
    category: "",
    goal: "",
  });

  const [practiceForm, setPracticeForm] = useState({
    hobby_id: "",
    duration: 30,
    notes: "",
  });

  const [postContent, setPostContent] = useState("");
  const [commentInputs, setCommentInputs] = useState({});

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  useEffect(() => {
    if (token) {
      loadAllData();
    }
  }, [token]);

  async function loadAllData() {
    try {
      const [hobbiesRes, dashboardRes, postsRes, analyticsRes] =
        await Promise.all([
          axios.get(`${API}/hobbies`, authHeaders),
          axios.get(`${API}/dashboard`, authHeaders),
          axios.get(`${API}/posts`),
          axios.get(`${API}/analytics`, authHeaders),
        ]);

      setHobbies(hobbiesRes.data);
      setDashboard(dashboardRes.data);
      setPosts(postsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const endpoint =
        mode === "login" ? `${API}/login` : `${API}/register`;

      const payload =
        mode === "login"
          ? {
              email: authForm.email,
              password: authForm.password,
            }
          : authForm;

      const response = await axios.post(endpoint, payload);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      setToken(response.data.token);
      setUser(response.data.user);

      setMessage(
        mode === "login"
          ? "Welcome back!"
          : "Account created successfully!"
      );
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
    setHobbies([]);
    setDashboard(null);
    setPosts([]);
    setAnalytics([]);
  }

  async function createHobby(e) {
    e.preventDefault();

    try {
      await axios.post(
        `${API}/hobbies`,
        hobbyForm,
        authHeaders
      );

      setHobbyForm({
        name: "",
        category: "",
        goal: "",
      });

      setMessage("Hobby created successfully!");
      loadAllData();
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Could not create hobby."
      );
    }
  }

  async function logPractice(e) {
    e.preventDefault();

    if (!practiceForm.hobby_id) {
      setMessage("Please select a hobby.");
      return;
    }

    try {
      await axios.post(
        `${API}/practice`,
        {
          ...practiceForm,
          hobby_id: Number(practiceForm.hobby_id),
          duration: Number(practiceForm.duration),
        },
        authHeaders
      );

      setPracticeForm({
        hobby_id: "",
        duration: 30,
        notes: "",
      });

      setMessage("Practice session logged!");
      loadAllData();
    } catch (error) {
      setMessage(
        error.response?.data?.detail ||
          "Could not log practice session."
      );
    }
  }

  async function createPost(e) {
    e.preventDefault();

    if (!postContent.trim()) return;

    try {
      await axios.post(
        `${API}/posts`,
        { content: postContent },
        authHeaders
      );

      setPostContent("");
      setMessage("Post shared with the community!");
      loadAllData();
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Could not share post."
      );
    }
  }

  async function likePost(postId) {
    try {
      await axios.post(
        `${API}/posts/${postId}/like`,
        {},
        authHeaders
      );

      loadAllData();
    } catch (error) {
      console.error(error);
    }
  }

  async function addComment(postId) {
    const content = commentInputs[postId];

    if (!content?.trim()) return;

    try {
      await axios.post(
        `${API}/posts/${postId}/comments`,
        { content },
        authHeaders
      );

      setCommentInputs({
        ...commentInputs,
        [postId]: "",
      });

      loadAllData();
    } catch (error) {
      console.error(error);
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="brand-mark">✦</div>

          <h1>HobbySphere</h1>

          <p className="subtitle">
            Track your skills. Build streaks. Share your progress.
          </p>

          <div className="auth-tabs">
            <button
              className={mode === "login" ? "active-tab" : ""}
              onClick={() => setMode("login")}
            >
              Login
            </button>

            <button
              className={mode === "register" ? "active-tab" : ""}
              onClick={() => setMode("register")}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {mode === "register" && (
              <div className="field">
                <label>Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({
                      ...authForm,
                      name: e.target.value,
                    })
                  }
                  required
                />
              </div>
            )}

            <div className="field">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    email: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({
                    ...authForm,
                    password: e.target.value,
                  })
                }
                required
              />
            </div>

            <button className="primary-btn" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "login"
                ? "Login"
                : "Create Account"}
            </button>
          </form>

          {message && <div className="message">{message}</div>}

          <div className="cloud-note">
            ☁ Cloud-ready architecture • REST API • User-specific data
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <div className="logo">✦ HobbySphere</div>
          <span className="logo-subtitle">
            Online Hobby & Skills Tracker
          </span>
        </div>

        <div className="user-area">
          <div className="avatar">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>

          <div>
            <strong>{user?.name}</strong>
            <small>{user?.email}</small>
          </div>

          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="container">
        {message && (
          <div className="success-message">
            {message}
            <button onClick={() => setMessage("")}>×</button>
          </div>
        )}

        <section className="welcome">
          <div>
            <p className="eyebrow">PERSONAL PROGRESS</p>
            <h2>Welcome back, {user?.name?.split(" ")[0]} 👋</h2>
            <p>
              Keep practicing, maintain your streak and share your
              journey with the community.
            </p>
          </div>

          <div className="streak-box">
            <span>🔥</span>
            <div>
              <strong>{dashboard?.current_streak || 0}</strong>
              <small>Day Streak</small>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <div className="stat-card">
            <span>🎯</span>
            <div>
              <strong>{dashboard?.total_hobbies || 0}</strong>
              <small>Hobbies</small>
            </div>
          </div>

          <div className="stat-card">
            <span>📚</span>
            <div>
              <strong>{dashboard?.total_sessions || 0}</strong>
              <small>Practice Sessions</small>
            </div>
          </div>

          <div className="stat-card">
            <span>⏱️</span>
            <div>
              <strong>{dashboard?.total_minutes || 0}</strong>
              <small>Minutes Practiced</small>
            </div>
          </div>

          <div className="stat-card">
            <span>🏆</span>
            <div>
              <strong>{dashboard?.badges?.length || 0}</strong>
              <small>Badges Earned</small>
            </div>
          </div>
        </section>

        <div className="content-grid">
          <div>
            <section className="card">
              <div className="card-heading">
                <div>
                  <h3>Create a Hobby / Skill</h3>
                  <p>Add something you want to improve.</p>
                </div>
                <span>🎨</span>
              </div>

              <form onSubmit={createHobby}>
                <div className="two-columns">
                  <div className="field">
                    <label>Hobby / Skill Name</label>
                    <input
                      placeholder="e.g. Photography"
                      value={hobbyForm.name}
                      onChange={(e) =>
                        setHobbyForm({
                          ...hobbyForm,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="field">
                    <label>Category</label>
                    <input
                      placeholder="e.g. Creative"
                      value={hobbyForm.category}
                      onChange={(e) =>
                        setHobbyForm({
                          ...hobbyForm,
                          category: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Goal / Milestone</label>
                  <input
                    placeholder="e.g. Practice 30 minutes daily"
                    value={hobbyForm.goal}
                    onChange={(e) =>
                      setHobbyForm({
                        ...hobbyForm,
                        goal: e.target.value,
                      })
                    }
                  />
                </div>

                <button className="primary-btn">
                  + Create Hobby
                </button>
              </form>
            </section>

            <section className="card">
              <div className="card-heading">
                <div>
                  <h3>Log Practice Session</h3>
                  <p>Record your latest learning activity.</p>
                </div>
                <span>⏱️</span>
              </div>

              <form onSubmit={logPractice}>
                <div className="two-columns">
                  <div className="field">
                    <label>Select Hobby</label>
                    <select
                      value={practiceForm.hobby_id}
                      onChange={(e) =>
                        setPracticeForm({
                          ...practiceForm,
                          hobby_id: e.target.value,
                        })
                      }
                      required
                    >
                      <option value="">
                        Choose a hobby
                      </option>

                      {hobbies.map((hobby) => (
                        <option
                          key={hobby.id}
                          value={hobby.id}
                        >
                          {hobby.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label>Duration (minutes)</label>
                    <input
                      type="number"
                      min="1"
                      value={practiceForm.duration}
                      onChange={(e) =>
                        setPracticeForm({
                          ...practiceForm,
                          duration: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Practice Notes</label>
                  <textarea
                    placeholder="What did you practice today?"
                    value={practiceForm.notes}
                    onChange={(e) =>
                      setPracticeForm({
                        ...practiceForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>

                <button className="primary-btn">
                  ✓ Save Practice
                </button>
              </form>
            </section>

            <section className="card">
              <div className="card-heading">
                <div>
                  <h3>Your Hobbies</h3>
                  <p>Your current skills and learning goals.</p>
                </div>
                <span>📌</span>
              </div>

              {hobbies.length === 0 ? (
                <div className="empty">
                  No hobbies yet. Create your first one above.
                </div>
              ) : (
                <div className="hobby-list">
                  {hobbies.map((hobby) => (
                    <div className="hobby-item" key={hobby.id}>
                      <div className="hobby-icon">✨</div>

                      <div>
                        <strong>{hobby.name}</strong>
                        <span>{hobby.category}</span>
                        {hobby.goal && <small>{hobby.goal}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div>
            <section className="card">
              <div className="card-heading">
                <div>
                  <h3>Achievements</h3>
                  <p>Milestones unlocked through practice.</p>
                </div>
                <span>🏆</span>
              </div>

              {dashboard?.badges?.length ? (
                <div className="badge-list">
                  {dashboard.badges.map((badge) => (
                    <div className="badge" key={badge}>
                      <div>🏅</div>
                      <span>{badge}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  Start practicing to unlock badges.
                </div>
              )}
            </section>

            <section className="card">
              <div className="card-heading">
                <div>
                  <h3>Practice Analytics</h3>
                  <p>Time spent on each hobby.</p>
                </div>
                <span>📊</span>
              </div>

              {analytics.length === 0 ? (
                <div className="empty">
                  Practice data will appear here.
                </div>
              ) : (
                <div className="analytics-list">
                  {analytics.map((item) => (
                    <div
                      className="analytics-item"
                      key={item.hobby}
                    >
                      <div className="analytics-top">
                        <strong>{item.hobby}</strong>
                        <span>{item.minutes} min</span>
                      </div>

                      <div className="progress-bar">
                        <div
                          style={{
                            width: `${Math.min(
                              100,
                              Math.max(
                                8,
                                item.minutes / 3
                              )
                            )}%`,
                          }}
                        />
                      </div>

                      <small>
                        {item.sessions} practice session
                        {item.sessions !== 1 ? "s" : ""}
                      </small>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <section className="community-section">
          <div className="section-title">
            <div>
              <p className="eyebrow">COMMUNITY</p>
              <h2>Share Your Progress</h2>
              <p>
                Inspire others by sharing what you're learning.
              </p>
            </div>
          </div>

          <section className="card post-composer">
            <form onSubmit={createPost}>
              <textarea
                placeholder="What did you practice today? Share your progress..."
                value={postContent}
                onChange={(e) =>
                  setPostContent(e.target.value)
                }
              />

              <div className="composer-footer">
                <span>🌱 Keep learning. Keep growing.</span>
                <button className="primary-btn">
                  Share Update
                </button>
              </div>
            </form>
          </section>

          <div className="feed">
            {posts.length === 0 ? (
              <div className="card empty">
                No community posts yet. Be the first to share!
              </div>
            ) : (
              posts.map((post) => (
                <article className="card post" key={post.id}>
                  <div className="post-header">
                    <div className="avatar small">
                      {post.author
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </div>

                    <div>
                      <strong>{post.author}</strong>
                      <small>
                        {new Date(
                          post.created_at
                        ).toLocaleString()}
                      </small>
                    </div>
                  </div>

                  <p className="post-content">
                    {post.content}
                  </p>

                  <div className="post-actions">
                    <button
                      onClick={() => likePost(post.id)}
                    >
                      ❤️ {post.likes}
                    </button>

                    <span>
                      💬 {post.comments?.length || 0}
                    </span>
                  </div>

                  <div className="comments">
                    {post.comments?.map((comment) => (
                      <div
                        className="comment"
                        key={comment.id}
                      >
                        <strong>{comment.author}</strong>
                        <span>{comment.content}</span>
                      </div>
                    ))}

                    <div className="comment-form">
                      <input
                        placeholder="Write a comment..."
                        value={
                          commentInputs[post.id] || ""
                        }
                        onChange={(e) =>
                          setCommentInputs({
                            ...commentInputs,
                            [post.id]: e.target.value,
                          })
                        }
                      />

                      <button
                        onClick={() =>
                          addComment(post.id)
                        }
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>

      <footer>
        <strong>HobbySphere</strong> — Online Hobby & Skills
        Tracker with Community Sharing on Cloud
      </footer>
    </div>
  );
}

export default App;