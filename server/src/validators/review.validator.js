export const validateReview = (body) => {
  const { firstName, lastName, rating, message } = body;

  const trimmedFirstName = typeof firstName === "string" ? firstName.trim() : "";
  const trimmedLastName = typeof lastName === "string" ? lastName.trim() : "";
  const trimmedMessage = typeof message === "string" ? message.trim() : "";
  const numericRating = Number(rating);

  if (!trimmedFirstName) {
    return {
      valid: false,
      message: "First name is required.",
    };
  }

  if (trimmedFirstName.length > 100) {
    return {
      valid: false,
      message: "First name cannot exceed 100 characters.",
    };
  }

  if (!trimmedLastName) {
    return {
      valid: false,
      message: "Last name is required.",
    };
  }

  if (trimmedLastName.length > 100) {
    return {
      valid: false,
      message: "Last name cannot exceed 100 characters.",
    };
  }

  if (
    rating === undefined ||
    rating === null ||
    !Number.isInteger(numericRating) ||
    numericRating < 1 ||
    numericRating > 5
  ) {
    return {
      valid: false,
      message: "Rating must be an integer between 1 and 5.",
    };
  }

  if (!trimmedMessage) {
    return {
      valid: false,
      message: "Review message is required.",
    };
  }

  if (trimmedMessage.length > 1000) {
    return {
      valid: false,
      message: "Review message cannot exceed 1000 characters.",
    };
  }

  return {
    valid: true,
    data: {
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      rating: numericRating,
      message: trimmedMessage,
    },
  };
};
