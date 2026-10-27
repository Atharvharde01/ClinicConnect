import { useEffect, useRef, useState } from "react";
import { getReviews, deleteReview } from "../../../services/reviewService";
import { useAuth } from "../../../context/AuthContext";

const INITIAL_VISIBLE_COUNT = 3;

function Testimonials({ latestReview, updatedReview, onEditReview, onReviewDeleted }) {
  const { user } = useAuth();
  const [dbReviews, setDbReviews] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchDbReviews = async () => {
      try {
        const response = await getReviews();
        if (isMounted && response && Array.isArray(response.reviews)) {
          setDbReviews(response.reviews);
        }
      } catch (err) {
        console.error("Failed to load reviews:", err);
      }
    };

    fetchDbReviews();

    const handleNewReviewEvent = (e) => {
      const review = e.detail;
      if (review && review._id) {
        setDbReviews((prev) => [
          review,
          ...prev.filter((r) => r._id !== review._id),
        ]);
      }
    };

    const handleReviewUpdatedEvent = (e) => {
      const review = e.detail;
      if (review && review._id) {
        setDbReviews((prev) =>
          prev.map((r) => (r._id === review._id ? review : r))
        );
      }
    };

    window.addEventListener("clinic-connect-new-review", handleNewReviewEvent);
    window.addEventListener(
      "clinic-connect-review-updated",
      handleReviewUpdatedEvent
    );

    return () => {
      isMounted = false;
      window.removeEventListener(
        "clinic-connect-new-review",
        handleNewReviewEvent
      );
      window.removeEventListener(
        "clinic-connect-review-updated",
        handleReviewUpdatedEvent
      );
    };
  }, []);

  // Sync latest newly created review from prop
  useEffect(() => {
    if (latestReview && latestReview._id) {
      setDbReviews((prev) => [
        latestReview,
        ...prev.filter((r) => r._id !== latestReview._id),
      ]);
    }
  }, [latestReview]);

  // Sync updated review from prop
  useEffect(() => {
    if (updatedReview && updatedReview._id) {
      setDbReviews((prev) =>
        prev.map((r) => (r._id === updatedReview._id ? updatedReview : r))
      );
    }
  }, [updatedReview]);

  const handleDelete = async (review) => {
    if (!review || !review._id) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete your review?"
    );
    if (!confirmed) return;

    try {
      setDeletingId(review._id);
      const response = await deleteReview(review._id);

      if (response && response.success) {
        setDbReviews((prev) => prev.filter((r) => r._id !== review._id));

        if (typeof onReviewDeleted === "function") {
          onReviewDeleted(review._id);
        }
      } else {
        alert(response?.message || "Failed to delete review.");
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete review. Please try again.";
      alert(errorMsg);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditClick = (review) => {
    if (typeof onEditReview === "function") {
      onEditReview(review);
    }

    const contactEl = document.getElementById("contact");
    if (contactEl) {
      contactEl.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleViewMore = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const maxScroll = container.scrollHeight - container.clientHeight;
    const isNearBottom = container.scrollTop >= maxScroll - 20;

    if (isNearBottom) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      container.scrollBy({ top: 280, behavior: "smooth" });
    }
  };

  return (
    <section className="testimonials" id="testimonials">
      <div className="testimonials-inner">
        <h2>Patient Voices</h2>

        <div
          className="testimonials-list-container"
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label="Patient reviews"
        >
          {dbReviews.length === 0 ? (
            <div className="testimonials-empty-state glass-card">
              <span className="material-symbols-outlined">rate_review</span>
              <p>No reviews yet. Be the first to share your experience!</p>
            </div>
          ) : (
            <div className="testimonials-grid">
              {dbReviews.map((item) => {
                const currentUserId = user?._id || user?.id;
                const reviewOwnerId =
                  typeof item.user === "object" ? item.user?._id : item.user;
                const isOwner = Boolean(
                  currentUserId &&
                    reviewOwnerId &&
                    String(currentUserId) === String(reviewOwnerId)
                );

                return (
                  <div
                    className="testimonial-card glass-card"
                    key={item._id}
                  >
                    <div className="testimonial-header">
                      <div>
                        <h4>{`${item.firstName} ${item.lastName}`}</h4>
                        <div className="testimonial-stars">
                          {[...Array(item.rating || 5)].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined filled"
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="testimonial-quote">"{item.message}"</p>

                    {isOwner && (
                      <div className="testimonial-owner-actions">
                        <button
                          type="button"
                          className="testimonial-action-btn edit"
                          onClick={() => handleEditClick(item)}
                          title="Edit your review"
                          aria-label="Edit review"
                        >
                          <span className="material-symbols-outlined">edit</span>
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          className="testimonial-action-btn delete"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item._id}
                          title="Delete your review"
                          aria-label="Delete review"
                        >
                          <span className="material-symbols-outlined">delete</span>
                          <span>
                            {deletingId === item._id ? "Deleting..." : "Delete"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {dbReviews.length > INITIAL_VISIBLE_COUNT && (
          <div className="testimonials-more-wrap">
            <button
              type="button"
              className="testimonials-more-btn"
              onClick={handleViewMore}
            >
              View More Reviews
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default Testimonials;
