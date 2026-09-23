import { MdDescription, MdSearch } from "react-icons/md";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import EditPatientModal from "./EditPatientModal";
import "../../../styles/reception_dashboard.css";
import { useEffect, useMemo, useState } from "react";
import {
  searchPatients,
  getPatientByPatientId,
} from "../../../services/patientService";

function PatientDetails({
  onEditProfile,
  onSelectPatient,
  onBookAppointment,
  onPatientUpdated,
  selectedPatient,
}) {
  const [localPatient, setLocalPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [patients, setPatients] = useState([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const activePatient = selectedPatient ?? localPatient;

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!searchTerm.trim()) {
        setPatients([]);
        return;
      }

      try {
        setLoadingSearch(true);

        const response = await searchPatients(searchTerm);

        setPatients(response.data || []);
      } catch (error) {
        console.error(error);
        setPatients([]);
      } finally {
        setLoadingSearch(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const calculateAge = (dob) => {
    if (!dob) return "-";

    const birth = new Date(dob);

    let age = new Date().getFullYear() - birth.getFullYear();

    const monthDiff = new Date().getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && new Date().getDate() < birth.getDate())
    ) {
      age--;
    }

    return age;
  };

  const profileFacts = useMemo(() => {
    if (!activePatient) return [];
    return [
      {
        label: "Patient ID",
        value: activePatient.patientId,
      },
      {
        label: "Phone",
        value: activePatient.phone,
      },
      {
        label: "Email",
        value: activePatient.email || "-",
      },
      {
        label: "Gender",
        value: activePatient.gender,
      },
      {
        label: "Age",
        value: `${calculateAge(activePatient.dateOfBirth)} Years`,
      },
      {
        label: "Blood Group",
        value: activePatient.bloodGroup || "-",
      },
      {
        label: "Address",
        value: activePatient.address || "-",
      },
    ].filter(Boolean);
  }, [activePatient]);

  const selectPatient = async (patient) => {
    try {
      const response = await getPatientByPatientId(patient.patientId);

      setLocalPatient(response.patient);

      onSelectPatient?.(response.patient);

      setSearchTerm("");

      setPatients([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handlePatientUpdated = (updatedPatient) => {
    setLocalPatient(updatedPatient);
    onPatientUpdated?.(updatedPatient);
  };

  const handleEditClick = () => {
    if (onEditProfile) {
      onEditProfile();
    } else {
      setIsEditModalOpen(true);
    }
  };

  const handleBookClick = () => {
    if (activePatient) {
      if (onBookAppointment) {
        onBookAppointment(activePatient);
      } else if (onSelectPatient) {
        onSelectPatient(activePatient);
      }
      document.getElementById("registration")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!activePatient) {
    return (
      <section className="rc-patient-details-section" id="patient-details">
        <div className="rc-section-heading">
          <h2>Selected Patient Details</h2>
        </div>

        <div className="rc-selected-patient-search">
          <label>
            <MdSearch />
            <input
              type="search"
              placeholder="Search patients by name, ID or phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>

          {searchTerm && (
            <div className="rc-patient-search-results">
              {loadingSearch ? (
                <p>Searching...</p>
              ) : patients.length ? (
                patients.map((patient) => (
                  <button
                    key={patient.patientId}
                    type="button"
                    onClick={() => selectPatient(patient)}
                  >
                    <span>
                      <strong>{patient.fullName}</strong>
                      <small>{patient.patientId}</small>
                    </span>
                  </button>
                ))
              ) : (
                <p>No matching patients found.</p>
              )}
            </div>
          )}
        </div>

        <Card className="rc-patient-card">
          <p
            style={{
              textAlign: "center",
              padding: "40px",
            }}
          >
            Search and select a patient to view details.
          </p>
        </Card>
      </section>
    );
  }

  return (
    <section className="rc-patient-details-section" id="patient-details">
      <div className="rc-section-heading">
        <h2>Selected Patient Details</h2>
      </div>
      <div className="rc-selected-patient-search">
        <label>
          <MdSearch />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search patients by name or ID"
            aria-label="Search patients"
            aria-controls="patient-search-results"
          />
        </label>
        {searchTerm && (
          <div
            className="rc-patient-search-results"
            id="patient-search-results"
          >
            {loadingSearch ? (
              <p>Searching...</p>
            ) : patients.length > 0 ? (
              patients.map((patient) => (
                <button
                  type="button"
                  key={patient.patientId}
                  onClick={() => selectPatient(patient)}
                >
                  <span>
                    <strong>{patient.fullName}</strong>
                    <small>{patient.patientId}</small>
                  </span>
                </button>
              ))
            ) : (
              <p>No matching patients found.</p>
            )}
          </div>
        )}
      </div>
      <Card className="rc-patient-card">
        <header className="rc-patient-card-header">
          <div className="rc-patient-avatar">
            {(activePatient.fullName || activePatient.name || "?")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <h3>{activePatient.fullName}</h3>

            <p>Patient ID : {activePatient.patientId}</p>

            <div className="rc-medical-alerts">
              {activePatient.allergies?.length ? (
                activePatient.allergies.map((item) => (
                  <span key={item} className="danger">
                    {item}
                  </span>
                ))
              ) : (
                <span className="safe">No Known Allergies</span>
              )}
            </div>
          </div>
        </header>
        <div className="rc-patient-card-content">
          <div className="rc-patient-facts">
            <div>
              <span>Date of Birth</span>

              <strong>
                {new Date(activePatient.dateOfBirth).toLocaleDateString()}
              </strong>
            </div>

            <div>
              <span>Status</span>

              <strong>{activePatient.isActive ? "Active" : "Inactive"}</strong>
            </div>
            {profileFacts.map((fact) => (
              <div key={fact.label}>
                <span>{fact.label}</span>
                <strong>{fact.value}</strong>
              </div>
            ))}
          </div>
          <div className="rc-history">
            <span>Medical History</span>

            <div className="rc-report-item">
              <MdDescription />

              <div>
                <strong>No medical reports available</strong>

                <small>Reports will appear here after consultation.</small>
              </div>
            </div>
          </div>
          <div className="rc-patient-buttons">
            <Button onClick={handleEditClick}>Edit Profile</Button>

            <Button onClick={handleBookClick}>
              Book Appointment
            </Button>
          </div>
        </div>
      </Card>

      <EditPatientModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        patient={activePatient}
        onPatientUpdated={handlePatientUpdated}
      />
    </section>
  );
}

export default PatientDetails;
