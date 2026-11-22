import React, { useEffect, useState } from "react";
import { Star, Plus, X, Trash2, Loader2, Heart } from "lucide-react";

// Real backend helpers. `api` is the dashboard's apiRequest (it sends the login token automatically).
const fetchReviews = (api) => api("/api/reviews");
const postReview = (api, form) =>
  api("/api/reviews", { method: "POST", body: JSON.stringify({ rating: form.rating, comment: form.comment }) });
const deleteReview = (api, id) => api(`/api/reviews/${encodeURIComponent(id)}`, { method: "DELETE" });
const fetchMyStories = async (api) => (await api("/api/my-stories")).stories || [];
const deleteMyStory = (api, id) => api(`/api/my-stories/${encodeURIComponent(id)}`, { method: "DELETE" });
const fetchTopCommunity = async (api) => (await api("/api/community/feed?sort=top&limit=6")).posts || [];

function ReviewStars({ value, size = "w-4 h-4" }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= value ? "text-amber-400 fill-amber-400" : "opacity-25"}`} />
      ))}
    </div>
  );
}

export default function ReviewsSection({ currentStyle, currentUser, onRequireLogin, onOpenStory, api }) {
  const [reviews, setReviews] = useState([]);
  const [average, setAverage] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ rating: 5, comment: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [myStories, setMyStories] = useState([]);
  const [community, setCommunity] = useState([]);

  const load = async () => {
    try {
      const data = await fetchReviews(api);
      setReviews(data.reviews || []);
      setAverage(data.average || 0);
      setLoadError("");
    } catch (err) {
      setLoadError(err.message);
    }
  };

  useEffect(() => {
    load();
    fetchTopCommunity(api).then(setCommunity).catch(() => setCommunity([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setMyStories([]);
      return;
    }
    fetchMyStories(api).then(setMyStories).catch(() => setMyStories([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const mine = currentUser ? reviews.find((r) => r.userId === currentUser.id) : null;

  const openModal = () => {
    if (!currentUser) return onRequireLogin();
    setForm(mine ? { rating: mine.rating, comment: mine.comment } : { rating: 5, comment: "" });
    setFormError("");
    setShowModal(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.comment.trim()) return setFormError("Please write a few words about your experience.");
    setSaving(true);
    try {
      await postReview(api, form);
      setShowModal(false);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    try {
      await deleteReview(api, id);
      await load();
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const removeStory = async (e, id) => {
    e.stopPropagation();
    try {
      await deleteMyStory(api, id);
      setMyStories(await fetchMyStories(api));
    } catch (err) {
      setLoadError(err.message);
    }
  };

  const card = `${currentStyle?.bgCard || "bg-white/5"} border border-black/10 dark:border-white/10 rounded-3xl shadow-lg`;
  const muted = "opacity-70";

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 space-y-8 rv-fade">
      <style>{`
        @keyframes rvFade { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .rv-fade { animation: rvFade 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @media (prefers-reduced-motion: reduce) { .rv-fade { animation: none; } }
      `}</style>

      {/* Header + summary */}
      <section className={`${card} p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-purple-500">Reviews</p>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">What creators say about PlotCraft</h2>
          <p className={`text-sm ${muted} max-w-xl`}>Honest feedback from people who write, draw and create with PlotCraft.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="text-center sm:text-right">
            <div className="text-4xl font-black">{reviews.length ? average.toFixed(1) : "—"}</div>
            <ReviewStars value={Math.round(average)} size="w-4 h-4" />
            <div className={`text-xs ${muted} mt-1`}>
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </div>
          </div>
          <button
            type="button"
            onClick={openModal}
            className={`px-5 py-3 rounded-2xl text-xs font-bold shadow-md hover:scale-[1.02] transition ${currentStyle?.btnPrimary || "bg-purple-600 text-white"}`}
          >
            <Plus className="inline w-4 h-4 mr-1" />
            {mine ? "Edit your review" : currentUser ? "Write a review" : "Log in to review"}
          </button>
        </div>
      </section>

      {loadError && <p className="text-xs text-red-500 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">{loadError}</p>}

      {/* Reviews */}
      <section className="space-y-4">
        {!loadError && reviews.length === 0 && (
          <div className={`${card} p-8 text-center text-sm ${muted}`}>No reviews yet. Be the first one to share your experience.</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <article key={rev.id} className={`${card} p-5 flex flex-col justify-between gap-4`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {(rev.name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{rev.name}</div>
                      <div className={`text-[11px] ${muted}`}>{new Date(rev.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <ReviewStars value={rev.rating} size="w-3.5 h-3.5" />
                </div>
                <p className="text-sm leading-relaxed">{rev.comment}</p>
              </div>
              <div className={`pt-3 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs ${muted}`}>
                <span>{rev.storyCount > 0 ? `${rev.storyCount} ${rev.storyCount === 1 ? "story" : "stories"} created` : "PlotCraft user"}</span>
                {currentUser && rev.userId === currentUser.id && (
                  <button type="button" onClick={() => remove(rev.id)} className="text-red-500 hover:text-red-400 font-bold flex items-center gap-1">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* My stories (only when logged in) */}
      {currentUser && (
        <section className={`${card} p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg">My stories <span className={muted}>({myStories.length})</span></h3>
          </div>
          {myStories.length === 0 ? (
            <p className={`text-sm ${muted}`}>No stories yet. Create one from Create → Story & Writing.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {myStories.slice(0, 9).map((st) => (
                <div
                  key={st.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenStory({ title: st.title, heroName: st.heroName, genre: st.genre, storyText: st.storyText })}
                  onKeyDown={(e) => e.key === "Enter" && onOpenStory({ title: st.title, heroName: st.heroName, genre: st.genre, storyText: st.storyText })}
                  className="p-4 rounded-2xl border border-black/10 dark:border-white/10 hover:border-purple-500 cursor-pointer transition space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500">{st.genre || "Story"}</span>
                    <button type="button" onClick={(e) => removeStory(e, st.id)} title="Delete story" className="text-red-500 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="font-bold text-sm line-clamp-1">{st.title}</h4>
                  <p className={`text-xs ${muted} line-clamp-2`}>{st.storyText}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Community picks (real published projects) */}
      {community.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="font-black text-lg">Top from the Community</h3>
            <p className={`text-sm ${muted}`}>Projects that other creators published and liked the most.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {community.map((p) => (
              <div key={p.id} className={`${card} p-4 space-y-2`}>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-purple-500">
                  <span>{p.type}</span>
                  <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {p.likes}</span>
                </div>
                <h4 className="font-bold text-sm line-clamp-1">{p.title}</h4>
                <p className={`text-xs ${muted}`}>by {p.authorName}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Review modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className={`${card} w-full max-w-md p-6 md:p-8 space-y-5 relative`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Write a review">
            <button type="button" onClick={() => setShowModal(false)} aria-label="Close" className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-xl font-black">{mine ? "Edit your review" : "Rate PlotCraft"}</h3>
              <p className={`text-xs ${muted} mt-1`}>Posting as <strong>{currentUser?.name || "Creator"}</strong>. Visible to all visitors.</p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setForm({ ...form, rating: n })} aria-label={`${n} stars`} className="p-1 hover:scale-110 transition">
                      <Star className={`w-7 h-7 ${n <= form.rating ? "text-amber-400 fill-amber-400" : "opacity-25"}`} />
                    </button>
                  ))}
                  <span className="ml-auto text-sm font-bold">{form.rating}/5</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="rv-comment" className="text-xs font-bold">Your feedback</label>
                <textarea
                  id="rv-comment"
                  rows={4}
                  maxLength={500}
                  value={form.comment}
                  onChange={(e) => setForm({ ...form, comment: e.target.value })}
                  placeholder="What do you like about PlotCraft? How has it helped your writing or design?"
                  className="w-full p-3 text-sm rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 focus:outline-none focus:border-purple-500 resize-none"
                />
                <div className={`text-[11px] ${muted} text-right`}>{form.comment.length}/500</div>
              </div>

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <button type="submit" disabled={saving} className={`w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 ${currentStyle?.btnPrimary || "bg-purple-600 text-white"} disabled:opacity-60`}>
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {mine ? "Update review" : "Submit review"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}