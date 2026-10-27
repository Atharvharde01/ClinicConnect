import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { usePendingReview } from "../../../context/PendingReviewContext";
import { createReview, updateReview } from "../../../services/reviewService";

function Contact({ onReviewAdded, onReviewUpdated, editingReview, onCancelEdit }) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { pendingReview, saveReview, clearReview, isPending: hasPendingReview } = usePendingReview();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    rating: 0,
    message: "",
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Sync form when editingReview changes
  useEffect(() => {
    if (editingReview) {
      setFormData({
        firstName: editingReview.firstName || "",
        lastName: editingReview.lastName || "",
        rating: editingReview.rating || 0,
        message: editingReview.message || "",
      });
      setErrors({});
      setStatusMessage(null);
    } else {
      // If user is logged in, optionally prefill first/last name if blank and not editing
      setFormData((prev) => {
        if (!prev.firstName && !prev.lastName && user?.fullName) {
          const parts = user.fullName.trim().split(" ");
          return {
            ...prev,
            firstName: parts[0] || "",
            lastName: parts.slice(1).join(" ") || "",
          };
        }
        return prev;
      });
    }
  }, [editingReview, user]);

  // Auto-submit pending review after user returns from login
  useEffect(() => {
    if (
      isAuthenticated &&
      hasPendingReview &&
      !editingReview &&
      !autoSubmitting
    ) {
      const doAutoSubmit = async () => {
        setAutoSubmitting(true);

        // Populate form with pending review data for visual feedback
        setFormData({
          firstName: pendingReview.firstName,
          lastName: pendingReview.lastName,
          rating: pendingReview.rating,
          message: pendingReview.message,
        });

        setStatusMessage({
          type: "info",
          text: "Submitting your review...",
        });

        setSubmitting(true);

        const payload = {
          firstName: pendingReview.firstName.trim(),
          lastName: pendingReview.lastName.trim(),
          rating: pendingReview.rating,
          message: pendingReview.message.trim(),
        };

        try {
          const response = await createReview(payload);

          if (response && response.success && response.review) {
            clearReview();

            setStatusMessage({
              type: "success",
              text: "Thank you! Your review has been saved successfully.",
            });

            setFormData({
              firstName: "",
              lastName: "",
              rating: 0,
              message: "",
            });
            setHoverRating(0);
            setErrors({});

            if (typeof onReviewAdded === "function") {
              onReviewAdded(response.review);
            }

            window.dispatchEvent(
              new CustomEvent("clinic-connect-new-review", {
                detail: response.review,
              })
            );
          } else {
            setStatusMessage({
              type: "error",
              text: response?.message || "Failed to submit review. Please try again.",
            });
          }
        } catch (error) {
          const errorMsg =
            error?.response?.data?.message ||
            error?.message ||
            "An error occurred. Please check your connection and try again.";
          setStatusMessage({
            type: "error",
            text: errorMsg,
          });
        } finally {
          setSubmitting(false);
          setAutoSubmitting(false);
        }
      };

      doAutoSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasPendingReview]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const handleRatingSelect = (starValue) => {
    setFormData((prev) => ({
      ...prev,
      rating: starValue,
    }));

    if (errors.rating) {
      setErrors((prev) => ({
        ...prev,
        rating: null,
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const trimmedFirst = formData.firstName.trim();
    const trimmedLast = formData.lastName.trim();
    const trimmedMsg = formData.message.trim();

    if (!trimmedFirst) {
      newErrors.firstName = "First name is required.";
    } else if (trimmedFirst.length > 100) {
      newErrors.firstName = "First name cannot exceed 100 characters.";
    }

    if (!trimmedLast) {
      newErrors.lastName = "Last name is required.";
    } else if (trimmedLast.length > 100) {
      newErrors.lastName = "Last name cannot exceed 100 characters.";
    }

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = "Please select a rating between 1 and 5 stars.";
    }

    if (!trimmedMsg) {
      newErrors.message = "Review message is required.";
    } else if (trimmedMsg.length > 1000) {
      newErrors.message = "Review message cannot exceed 1,000 characters.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMessage(null);

    if (submitting) return;

    if (!validateForm()) {
      return;
    }

    // If not authenticated, save form data and redirect to login
    if (!isAuthenticated) {
      saveReview({
        firstName: formData.firstName,
        lastName: formData.lastName,
        rating: formData.rating,
        message: formData.message,
      });

      setStatusMessage({
        type: "info",
        text: "Redirecting to login... Your review will be submitted after you sign in.",
      });

      // Small delay so user can see the message
      setTimeout(() => {
        navigate("/login", { state: { fromReview: true } });
      }, 600);
      return;
    }

    setSubmitting(true);

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      rating: formData.rating,
      message: formData.message.trim(),
    };

    try {
      if (editingReview && editingReview._id) {
        // Edit mode
        const response = await updateReview(editingReview._id, payload);

        if (response && response.success && response.review) {
          setStatusMessage({
            type: "success",
            text: "Your review has been updated successfully.",
          });

          if (typeof onReviewUpdated === "function") {
            onReviewUpdated(response.review);
          }

          window.dispatchEvent(
            new CustomEvent("clinic-connect-review-updated", {
              detail: response.review,
            })
          );

          if (typeof onCancelEdit === "function") {
            onCancelEdit();
          }

          // Reset form to clean state
          setFormData({
            firstName: "",
            lastName: "",
            rating: 0,
            message: "",
          });
          setHoverRating(0);
          setErrors({});
        } else {
          setStatusMessage({
            type: "error",
            text: response?.message || "Failed to update review. Please try again.",
          });
        }
      } else {
        // Create mode
        const response = await createReview(payload);

        if (response && response.success && response.review) {
          setStatusMessage({
            type: "success",
            text: "Thank you! Your review has been saved successfully.",
          });

          // Reset the form only after successful submission
          setFormData({
            firstName: "",
            lastName: "",
            rating: 0,
            message: "",
          });
          setHoverRating(0);
          setErrors({});

          if (typeof onReviewAdded === "function") {
            onReviewAdded(response.review);
          }

          window.dispatchEvent(
            new CustomEvent("clinic-connect-new-review", {
              detail: response.review,
            })
          );
        } else {
          setStatusMessage({
            type: "error",
            text: response?.message || "Failed to submit review. Please try again.",
          });
        }
      }
    } catch (error) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "An error occurred. Please check your connection and try again.";
      setStatusMessage({
        type: "error",
        text: errorMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = () => {
    if (typeof onCancelEdit === "function") {
      onCancelEdit();
    }
    setFormData({
      firstName: "",
      lastName: "",
      rating: 0,
      message: "",
    });
    setHoverRating(0);
    setErrors({});
    setStatusMessage(null);
  };

  const activeRating = hoverRating || formData.rating;

  return (
    <section className="contact" id="contact">
      <div className="contact-grid">
        <div className="contact-info">
          <h2>Reach Out to Us</h2>
          <p>
            We are here to assist you with any inquiries or support requirements.
            Our team is available 24/7 for urgent needs.
          </p>

          <div className="contact-items">
            <div className="contact-item">
              <div className="contact-icon">
                <span className="material-symbols-outlined">call</span>
              </div>
              <div>
                <p className="contact-label">Emergency Hotline</p>
                <p className="contact-value contact-value-primary">
                  +1 (800) Clinic Connect
                </p>
              </div>
            </div>
            <div className="contact-item">
              <div className="contact-icon">
                <span className="material-symbols-outlined">location_on</span>
              </div>
              <div>
                <p className="contact-label">Main Campus</p>
                <p className="contact-value">
                  123 Wellness Plaza, Medical District, NY 10001
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="contact-form-card">
          <h3>{editingReview ? "Edit Your Review" : "Send a Review"}</h3>

          {editingReview && (
            <div className="contact-form-edit-badge">
              <span className="material-symbols-outlined">edit_note</span>
              <span>Editing your existing review</span>
            </div>
          )}

          {statusMessage && (
            <div
              className={`contact-form-alert ${statusMessage.type}`}
              role="status"
              aria-live="polite"
            >
              <span className="material-symbols-outlined">
                {statusMessage.type === "success"
                  ? "check_circle"
                  : statusMessage.type === "info"
                  ? "info"
                  : "error"}
              </span>
              <span>{statusMessage.text}</span>
            </div>
          )}

          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <div className="contact-form-row">
              <div className="form-group">
                <label htmlFor="review-first-name">
                  First Name <span className="required-star">*</span>
                </label>
                <input
                  id="review-first-name"
                  name="firstName"
                  type="text"
                  placeholder="First Name"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={!!errors.firstName}
                />
                {errors.firstName && (
                  <span className="field-error">{errors.firstName}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="review-last-name">
                  Last Name <span className="required-star">*</span>
                </label>
                <input
                  id="review-last-name"
                  name="lastName"
                  type="text"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={submitting}
                  maxLength={100}
                  aria-required="true"
                  aria-invalid={!!errors.lastName}
                />
                {errors.lastName && (
                  <span className="field-error">{errors.lastName}</span>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>
                Rating <span className="required-star">*</span>
              </label>
              <div
                className="star-rating-control"
                role="radiogroup"
                aria-label="Star Rating"
              >
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = activeRating >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      className="star-rating-btn"
                      onClick={() => handleRatingSelect(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      disabled={submitting}
                      role="radio"
                      aria-checked={formData.rating === starValue}
                      aria-label={`${starValue} star${starValue > 1 ? "s" : ""}`}
                    >
                      <span
                        className={`material-symbols-outlined ${isFilled ? "filled" : ""}`}
                        style={{
                          color: isFilled ? "#eab308" : "#94a3b8",
                          fontSize: "28px",
                        }}
                      >
                        star
                      </span>
                    </button>
                  );
                })}
                <span className="star-rating-hint">
                  {formData.rating > 0
                    ? `${formData.rating} of 5 stars`
                    : "Select a rating"}
                </span>
              </div>
              {errors.rating && (
                <span className="field-error">{errors.rating}</span>
              )}
            </div>

            <div className="form-group">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <label htmlFor="review-message">
                  Message <span className="required-star">*</span>
                </label>
                <span className="char-count">
                  {formData.message.length} / 1000
                </span>
              </div>
              <textarea
                id="review-message"
                name="message"
                rows="4"
                placeholder="Share your experience with us..."
                value={formData.message}
                onChange={handleInputChange}
                disabled={submitting}
                maxLength={1000}
                aria-required="true"
                aria-invalid={!!errors.message}
              ></textarea>
              {errors.message && (
                <span className="field-error">{errors.message}</span>
              )}
            </div>

            {editingReview ? (
              <div className="contact-form-edit-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving Changes..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleCancelClick}
                  disabled={submitting}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={submitting}
              >
                {submitting ? "Sending Review..." : "Send Review"}
              </button>
            )}
          </form>

          {!isAuthenticated && !editingReview && (
            <p className="review-auth-hint">
              <span className="material-symbols-outlined">info</span>
              You'll be asked to log in when you submit your review.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Contact;
