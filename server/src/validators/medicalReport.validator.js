export const validateMedicalReport = (body) => {
  const {
    appointment,
    reportType,
    title,
  } = body;

  if (!reportType || !title) {
    return {
      valid: false,
      message: "Report type and title are required.",
    };
  }

  return {
    valid: true,
  };
};