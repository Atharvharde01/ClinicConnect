import api from "./api";

/**
 * Fetch all public reviews (Public)
 */
export const getReviews = async () => {
  const response = await api.get("/reviews");
  return response.data;
};

/**
 * Submit a new review (Authenticated)
 * @param {{ firstName: string, lastName: string, rating: number, message: string }} reviewData
 */
export const createReview = async (reviewData) => {
  const response = await api.post("/reviews", reviewData);
  return response.data;
};

/**
 * Update an existing review (Authenticated owner only)
 * @param {string} id
 * @param {{ firstName: string, lastName: string, rating: number, message: string }} reviewData
 */
export const updateReview = async (id, reviewData) => {
  const response = await api.put(`/reviews/${id}`, reviewData);
  return response.data;
};

/**
 * Delete an existing review (Authenticated owner only)
 * @param {string} id
 */
export const deleteReview = async (id) => {
  const response = await api.delete(`/reviews/${id}`);
  return response.data;
};
