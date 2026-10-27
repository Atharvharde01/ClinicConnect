import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

const PendingReviewContext = createContext();

const REVIEW_STORAGE_KEY = "pendingReview";
const INTENT_STORAGE_KEY = "pendingReviewIntent";

const initialReview = {
  firstName: "",
  lastName: "",
  rating: 0,
  message: "",
};

const hasReviewData = (review) =>
  Boolean(
    review?.firstName ||
      review?.lastName ||
      Number(review?.rating) > 0 ||
      review?.message,
  );

const readStoredReview = () => {
  try {
    const savedReview = sessionStorage.getItem(REVIEW_STORAGE_KEY);
    if (!savedReview) return initialReview;

    const parsedReview = JSON.parse(savedReview);
    return {
      ...initialReview,
      firstName:
        typeof parsedReview.firstName === "string" ? parsedReview.firstName : "",
      lastName:
        typeof parsedReview.lastName === "string" ? parsedReview.lastName : "",
      rating: Number(parsedReview.rating) || 0,
      message:
        typeof parsedReview.message === "string" ? parsedReview.message : "",
    };
  } catch {
    sessionStorage.removeItem(REVIEW_STORAGE_KEY);
    return initialReview;
  }
};

const readStoredIntent = () => {
  try {
    const savedIntent = sessionStorage.getItem(INTENT_STORAGE_KEY);
    if (!savedIntent) return null;

    const intent = JSON.parse(savedIntent);
    if (
      intent?.source !== "landing-review" ||
      !intent.operationId ||
      !["ready", "submitting", "failed"].includes(intent.status)
    ) {
      sessionStorage.removeItem(INTENT_STORAGE_KEY);
      return null;
    }

    // A refresh during an in-flight request must never create a second review.
    if (intent.status === "submitting") {
      const interruptedIntent = { ...intent, status: "failed" };
      sessionStorage.setItem(
        INTENT_STORAGE_KEY,
        JSON.stringify(interruptedIntent),
      );
      return interruptedIntent;
    }

    return intent;
  } catch {
    sessionStorage.removeItem(INTENT_STORAGE_KEY);
    return null;
  }
};

const persistReview = (review) => {
  if (hasReviewData(review)) {
    sessionStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(review));
  } else {
    sessionStorage.removeItem(REVIEW_STORAGE_KEY);
  }
};

const persistIntent = (intent) => {
  if (intent) {
    sessionStorage.setItem(INTENT_STORAGE_KEY, JSON.stringify(intent));
  } else {
    sessionStorage.removeItem(INTENT_STORAGE_KEY);
  }
};

export const PendingReviewProvider = ({ children }) => {
  const [pendingReview, setPendingReview] = useState(readStoredReview);
  const [pendingReviewIntent, setPendingReviewIntent] =
    useState(readStoredIntent);

  const startReviewAuthentication = useCallback((reviewData) => {
    const review = {
      ...initialReview,
      ...reviewData,
    };
    const intent = {
      source: "landing-review",
      operationId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      status: "ready",
      createdAt: Date.now(),
    };

    persistReview(review);
    persistIntent(intent);
    setPendingReview(review);
    setPendingReviewIntent(intent);
  }, []);

  const updatePendingReview = useCallback((reviewData) => {
    const review = {
      ...initialReview,
      ...reviewData,
    };

    persistReview(review);
    setPendingReview(review);
  }, []);

  const clearReview = useCallback(() => {
    sessionStorage.removeItem(REVIEW_STORAGE_KEY);
    sessionStorage.removeItem(INTENT_STORAGE_KEY);
    setPendingReview(initialReview);
    setPendingReviewIntent(null);
  }, []);

  const claimPendingReviewSubmission = useCallback((operationId) => {
    const intent = readStoredIntent();
    if (
      !intent ||
      intent.operationId !== operationId ||
      intent.status !== "ready"
    ) {
      return false;
    }

    const submittingIntent = { ...intent, status: "submitting" };
    persistIntent(submittingIntent);
    setPendingReviewIntent(submittingIntent);
    return true;
  }, []);

  const markPendingReviewSubmissionFailed = useCallback((operationId) => {
    const intent = readStoredIntent();
    if (!intent || intent.operationId !== operationId) return;

    const failedIntent = { ...intent, status: "failed" };
    persistIntent(failedIntent);
    setPendingReviewIntent(failedIntent);
  }, []);

  const hasPendingReview = hasReviewData(pendingReview);
  const hasPendingReviewIntent =
    hasPendingReview && pendingReviewIntent?.source === "landing-review";
  const canAutoSubmit =
    hasPendingReviewIntent && pendingReviewIntent?.status === "ready";

  const value = useMemo(
    () => ({
      pendingReview,
      pendingReviewIntent,
      startReviewAuthentication,
      updatePendingReview,
      clearReview,
      claimPendingReviewSubmission,
      markPendingReviewSubmissionFailed,
      isPending: hasPendingReview,
      hasPendingReviewIntent,
      canAutoSubmit,
    }),
    [
      pendingReview,
      pendingReviewIntent,
      startReviewAuthentication,
      updatePendingReview,
      clearReview,
      claimPendingReviewSubmission,
      markPendingReviewSubmissionFailed,
      hasPendingReview,
      hasPendingReviewIntent,
      canAutoSubmit,
    ],
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
      "usePendingReview must be used within PendingReviewProvider",
    );
  }
  return context;
};
