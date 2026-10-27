import React, { useState } from "react";

import Navbar from "../pages/landing/navbar/Navbar";
import Footer from "../pages/landing/footer/Footer";

import Hero from "../pages/landing/hero/Hero";
import ClinicalExcellence from "../pages/landing/clinical/ClinicalExcellence";
import About from "../pages/landing/about/About";
import FeaturedDoctors from "../pages/landing/featured_doctors/FeaturedDoctors";
import Doctors from "../pages/landing/doctors/Doctors";
import Departments from "../pages/landing/departments/Departments";
import Appointment from "../pages/landing/appointment/Appointment";
import Journey from "../pages/landing/journey/Journey";
import Facilities from "../pages/landing/facilities/Facilities";
import Testimonials from "../pages/landing/testimonials/Testimonials";
import FAQ from "../pages/landing/faq/FAQ";
import Contact from "../pages/landing/contact/Contact";

function LandingPage() {
  const [latestReview, setLatestReview] = useState(null);
  const [updatedReview, setUpdatedReview] = useState(null);
  const [editingReview, setEditingReview] = useState(null);

  const handleReviewAdded = (review) => {
    setLatestReview(review);
    setEditingReview(null);
  };

  const handleReviewUpdated = (review) => {
    setUpdatedReview(review);
    setEditingReview(null);
  };

  const handleReviewDeleted = (deletedId) => {
    if (editingReview && editingReview._id === deletedId) {
      setEditingReview(null);
    }
  };

  return (
    <>
      <Navbar />
      <Hero />
      <ClinicalExcellence />
      <About />
      <FeaturedDoctors />
      <Doctors />
      <Departments />
      <Appointment />
      <Journey />
      <Facilities />
      <Testimonials
        latestReview={latestReview}
        updatedReview={updatedReview}
        onEditReview={setEditingReview}
        onReviewDeleted={handleReviewDeleted}
      />
      <FAQ />
      <Contact
        onReviewAdded={handleReviewAdded}
        onReviewUpdated={handleReviewUpdated}
        editingReview={editingReview}
        onCancelEdit={() => setEditingReview(null)}
      />
      <Footer />
    </>
  );
}

export default LandingPage;
