import { createContext, useContext, useEffect, useMemo, useState } from "react";

const PendingReviewContext = createContext();

const STORAGE_KEY = "pendingReview";

const initialReview = {
  firstName: "",
  lastName: "",
  rating: 0,
  message: "",
};

export const PendingReviewProvider = ({ children }) => {
  const [pendingReview, setPendingReview] = useState(initialReview);

  // Restore pending review after page refresh / navigation
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPendingReview(JSON.parse(saved));
      } catch (error) {
        console.error("Failed to restore pending review:", error);
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist to sessionStorage whenever it changes
  useEffect(() => {
    const hasData =
      pendingReview.firstName ||
      pendingReview.lastName ||
      pendingReview.rating > 0 ||
      pendingReview.message;

    if (hasData) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(pendingReview));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [pendingReview]);

  const saveReview = (reviewData) => {
    setPendingReview({
      ...initialReview,
      ...reviewData,
    });
  };

  const clearReview = () => {
    setPendingReview(initialReview);
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(
    () => ({
      pendingReview,
      saveReview,
      clearReview,
      isPending:
        pendingReview.firstName !== "" ||
        pendingReview.lastName !== "" ||
        pendingReview.rating > 0 ||
        pendingReview.message !== "",
    }),
    [pendingReview]
  );

  return (
    <PendingReviewContext.Provider value={value}>
      {children}
    </PendingReviewContext.Provider>
  );
};

export const usePendingReview = () => {
  const context = useContext(PendingReviewContext);
  if (!context) {
    throw new Error(
      "usePendingReview must be used within PendingReviewProvider"
    );
  }
  return context;
};
