import { useState, useEffect, useCallback } from "react";
import { FiDownload, FiFileText } from "react-icons/fi";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { medicalRecords as staticRecords } from "../data/appointments";
import { getPatientReports } from "../../../services/patientService";
import getAssetUrl from "../../../utils/getAssetUrl";
import "../../../styles/patient_dashboard.css";

function MedicalRecords() {
  const [recordsList, setRecordsList] = useState(staticRecords);

  const fetchRecords = useCallback(async () => {
    try {
      const res = await getPatientReports();
      const fetched = res?.reports || res?.data || [];
      if (fetched && fetched.length > 0) {
        const formatted = fetched.map((item) => ({
          id: item._id,
          diagnosis: item.title,
          visitDate: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          doctor: item.doctor?.user?.fullName || item.doctor?.name || "Self / Lab",
          hospital: "ClinicConnect Medical Center",
          reportFile: item.reportFile,
        }));
        setRecordsList(formatted);
      }
    } catch (err) {
      console.error("Error fetching medical records:", err);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
    window.addEventListener("patient-report-uploaded", fetchRecords);
    return () => {
      window.removeEventListener("patient-report-uploaded", fetchRecords);
    };
  }, [fetchRecords]);

  return (
    <section className="pd-detail-section" id="medical-records">
      <div className="pd-section-heading">
        <h2>Medical Records</h2>
        <a href="#reports">View repository</a>
      </div>
      <div className="pd-detail-grid">
        {recordsList.map((record) => (
          <Card className="pd-record-card" key={record.id}>
            <span className="pd-detail-icon">
              <FiFileText />
            </span>
            <small>Medical record</small>
            <h3>{record.diagnosis}</h3>
            <dl>
              <div>
                <dt>Visit date</dt>
                <dd>{record.visitDate}</dd>
              </div>
              <div>
                <dt>Doctor</dt>
                <dd>{record.doctor}</dd>
              </div>
              <div>
                <dt>Hospital</dt>
                <dd>{record.hospital}</dd>
              </div>
            </dl>
            {record.reportFile ? (
              <a
                href={getAssetUrl(record.reportFile)}
                target="_blank"
                rel="noreferrer"
                className="pd-compact-button"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px", textDecoration: "none" }}
              >
                <FiDownload />
                Download
              </a>
            ) : (
              <Button className="pd-compact-button">
                <FiDownload />
                Download
              </Button>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

export default MedicalRecords;
