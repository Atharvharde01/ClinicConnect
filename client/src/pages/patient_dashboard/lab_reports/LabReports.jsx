import { useState, useEffect, useCallback } from "react";
import { FiArrowRight, FiDownload, FiEye, FiTrash2 } from "react-icons/fi";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import { reports as staticReports } from "../data/reports";
import { getPatientReports, deletePatientReport } from "../../../services/patientService";
import getAssetUrl from "../../../utils/getAssetUrl";
import "../../../styles/patient_dashboard.css";

function LabReports() {
  const [reportsList, setReportsList] = useState(staticReports);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPatientReports();
      const fetched = res?.reports || res?.data || [];
      if (fetched && fetched.length > 0) {
        const formatted = fetched.map((item) => ({
          id: item._id,
          type: item.reportType || "Lab Report",
          title: item.title,
          status: item.status || "Completed",
          date: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          doctor: item.doctor?.user?.fullName || item.doctor?.name || "Self / Lab",
          size: "PDF",
          format: "Document",
          reportFile: item.reportFile,
          isReal: true,
        }));
        setReportsList(formatted);
      }
    } catch (err) {
      console.error("Error fetching patient reports:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
    window.addEventListener("patient-report-uploaded", fetchReports);
    return () => {
      window.removeEventListener("patient-report-uploaded", fetchReports);
    };
  }, [fetchReports]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medical report?")) return;
    try {
      await deletePatientReport(id);
      fetchReports();
    } catch (err) {
      console.error("Delete report error:", err);
      alert(err?.response?.data?.message || "Failed to delete report.");
    }
  };

  return (
    <section className="pd-lab-reports" id="reports">
      <div className="pd-section-heading">
        <h2>Recent Lab Reports</h2>
        <a className="pd-repository-link" href="#medical-records">
          Browse Repository <FiArrowRight />
        </a>
      </div>
      <div className="pd-report-grid">
        {reportsList.map((report) => (
          <Card className="pd-report-card" key={report.id}>
            <span className="pd-report-icon">{(report.type || "RP").slice(0, 2).toUpperCase()}</span>
            <span className="pd-report-status">{report.status}</span>
            <h3>{report.title}</h3>
            <p>Date: {report.date}</p>
            <small>{report.doctor}</small>
            <div className="pd-report-footer">
              <span>
                {report.size} • {report.format}
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                {report.reportFile ? (
                  <a
                    href={getAssetUrl(report.reportFile)}
                    target="_blank"
                    rel="noreferrer"
                    className="pd-report-action"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                  >
                    <FiDownload />
                  </a>
                ) : (
                  <Button className="pd-report-action" aria-label={`View ${report.title}`}>
                    {report.action === "visibility" ? <FiEye /> : <FiDownload />}
                  </Button>
                )}
                {report.isReal && (
                  <Button
                    className="pd-report-action"
                    style={{ color: "#ba1a1a" }}
                    onClick={() => handleDelete(report.id)}
                    aria-label={`Delete ${report.title}`}
                  >
                    <FiTrash2 />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default LabReports;
