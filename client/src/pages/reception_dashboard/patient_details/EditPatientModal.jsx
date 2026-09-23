import { useState, useEffect } from "react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import { updatePatientProfile } from "../../../services/patientService";
import { getApiErrorMessage } from "../../../services/api";

function EditPatientModal({ isOpen, onClose, patient, onPatientUpdated }) {
  const [formData, setFormData] = useState(() => ({
    fullName: patient?.fullName || "",
    phone: patient?.phone || "",
    email: patient?.email || "",
    address: patient?.address || "",
    bloodGroup: patient?.bloodGroup || "",
    emergencyContactName: patient?.emergencyContact?.name || "",
    emergencyContactRelation: patient?.emergencyContact?.relation || "",
    emergencyContactPhone: patient?.emergencyContact?.phone || "",
    allergies: Array.isArray(patient?.allergies)
      ? patient.allergies.join(", ")
      : patient?.allergies || "",
    chronicDiseases: Array.isArray(patient?.chronicDiseases)
      ? patient.chronicDiseases.join(", ")
      : patient?.chronicDiseases || "",
  }));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!patient) return;

    setFormData({
      fullName: patient.fullName || "",
      phone: patient.phone || "",
      email: patient.email || "",
      address: patient.address || "",
      bloodGroup: patient.bloodGroup || "",
      emergencyContactName: patient.emergencyContact?.name || "",
      emergencyContactRelation: patient.emergencyContact?.relation || "",
      emergencyContactPhone: patient.emergencyContact?.phone || "",
      allergies: Array.isArray(patient.allergies)
        ? patient.allergies.join(", ")
        : patient.allergies || "",
      chronicDiseases: Array.isArray(patient.chronicDiseases)
        ? patient.chronicDiseases.join(", ")
        : patient.chronicDiseases || "",
    });

    setError("");
  }, [patient]);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  if (!isOpen || !patient) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!formData.phone.trim() || !/^\d{10}$/.test(formData.phone.trim())) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }

    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || undefined,
        address: formData.address.trim(),
        bloodGroup: formData.bloodGroup,
        emergencyContact: {
          name: formData.emergencyContactName.trim(),
          relation: formData.emergencyContactRelation.trim(),
          phone: formData.emergencyContactPhone.trim(),
        },
        allergies: formData.allergies
          ? formData.allergies
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        chronicDiseases: formData.chronicDiseases
          ? formData.chronicDiseases
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };

      const response = await updatePatientProfile(patient._id, payload);

      if (response.success) {
        onPatientUpdated?.(response.patient);
        onClose();
      } else {
        setError(response.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Error updating patient profile:", err);
      setError(getApiErrorMessage(err, "Failed to update patient profile."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Patient Profile"
      className="rc-modal edit-patient-modal"
      overlayClassName="rc-modal-backdrop"
    >
      <form
        onSubmit={handleSubmit}
        className="rc-edit-patient-form"
        style={{
          padding: "0 24px 24px",
          maxHeight: "calc(90vh - 100px)",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {error && (
          <div
            className="rc-form-error mb-3"
            style={{ color: "#ba1a1a", marginBottom: "16px" }}
          >
            {error}
          </div>
        )}

        <div
          className="rc-form-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
          }}
        >
          {/* Read-Only Fields */}
          <Input
            label="Patient ID"
            value={patient.patientId || ""}
            disabled
            readOnly
            className="rc-form-field disabled-field"
          />

          <Input
            label="Gender"
            value={patient.gender || ""}
            disabled
            readOnly
            className="rc-form-field disabled-field"
          />

          <Input
            label="Date of Birth"
            type="date"
            value={
              patient.dateOfBirth
                ? new Date(patient.dateOfBirth).toISOString().split("T")[0]
                : ""
            }
            disabled
            readOnly
            className="rc-form-field disabled-field"
          />

          {/* Editable Fields */}
          <Input
            label="Full Name"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
            className="rc-form-field"
          />

          <Input
            label="Phone Number"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            required
            className="rc-form-field"
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="rc-form-field"
          />

          <Input
            as="select"
            label="Blood Group"
            name="bloodGroup"
            value={formData.bloodGroup}
            onChange={handleChange}
            className="rc-form-field"
          >
            <option value="">Select Blood Group</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </Input>

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="rc-form-field"
          />

          <Input
            label="Emergency Contact Name"
            name="emergencyContactName"
            value={formData.emergencyContactName}
            onChange={handleChange}
            className="rc-form-field"
          />

          <Input
            label="Emergency Contact Relation"
            name="emergencyContactRelation"
            value={formData.emergencyContactRelation}
            onChange={handleChange}
            className="rc-form-field"
          />

          <Input
            label="Emergency Contact Phone"
            name="emergencyContactPhone"
            type="tel"
            value={formData.emergencyContactPhone}
            onChange={handleChange}
            className="rc-form-field"
          />
        </div>

        <Input
          as="textarea"
          label="Allergies (comma-separated)"
          name="allergies"
          value={formData.allergies}
          onChange={handleChange}
          rows="2"
          placeholder="e.g. Penicillin, Dust, Peanuts"
          className="rc-form-field"
          style={{ marginTop: "12px" }}
        />

        <Input
          as="textarea"
          label="Chronic Diseases (comma-separated)"
          name="chronicDiseases"
          value={formData.chronicDiseases}
          onChange={handleChange}
          rows="2"
          placeholder="e.g. Hypertension, Asthma, Diabetes"
          className="rc-form-field"
          style={{ marginTop: "12px" }}
        />

        <div
          className="rc-modal-actions"
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <Button type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" className="rc-modal-submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default EditPatientModal;
