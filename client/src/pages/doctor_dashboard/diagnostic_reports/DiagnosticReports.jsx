import { useEffect, useState } from "react";

import {
  getReportByAppointment,
  deleteMedicalReport,
} from "../../../services/medicalReportService";

import UploadReportModal from "./UploadReportModal";
import getAssetUrl from "../../../utils/getAssetUrl";

import "../../../styles/doctor_dashboard.css";

function DiagnosticReports({
  appointment,
}) {
  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showUploadModal, setShowUploadModal] =
    useState(false);

  useEffect(() => {
    loadReports();
  }, [appointment]);

  const loadReports = async () => {

    if (!appointment?.appointmentId) {
      setReports([]);
      setLoading(false);
      return;
    }

    try {

      setLoading(true);

      const response =
        await getReportByAppointment(
          appointment.appointmentId
        );

      if (response.report) {
        setReports([response.report]);
      } else {
        setReports([]);
      }

    } catch (error) {

      if (
        error.response?.status === 404
      ) {
        setReports([]);
      } else {
        console.error(error);
      }

    } finally {

      setLoading(false);

    }
  };

  const handleDelete = async (
    reportId
  ) => {

    const confirmed =
      window.confirm(
        "Delete this report?"
      );

    if (!confirmed) return;

    try {

      await deleteMedicalReport(
        reportId
      );

      await loadReports();

      alert(
        "Report deleted successfully."
      );

    } catch (error) {

      console.error(error);

      alert(
        "Unable to delete report."
      );

    }
  };

  const openReport = (reportFile) => {
  if (!reportFile) return;

  const fileUrl = getAssetUrl(reportFile);

  const extension =
    reportFile.split(".").pop().toLowerCase();

  const previewExtensions = [
    "pdf",
    "jpg",
    "jpeg",
    "png",
  ];

  if (previewExtensions.includes(extension)) {
    window.open(fileUrl, "_blank");
  } else {
    window.location.href = fileUrl;
  }
};

  return (
    <section className="doc-reports-section">

      <div className="doc-reports-header">

        <h3 className="doc-subsection-title">
          Diagnostic Reports
        </h3>

        <button
          className="doc-upload-report-btn"
          onClick={() =>
            setShowUploadModal(true)
          }
        >

          <span className="material-symbols-outlined">
            upload
          </span>

          Upload Report

        </button>

      </div>

      {loading ? (

        <div className="doc-report-empty">
          Loading reports...
        </div>

      ) : reports.length === 0 ? (

        <div className="doc-report-empty">

          <span className="material-symbols-outlined">
            description
          </span>

          <p>
            No diagnostic reports
            uploaded yet.
          </p>

        </div>

      ) : (

        <div className="doc-report-list">

          {reports.map(
            (report) => {
              const reportUrl = getAssetUrl(report.reportFile);

              return (

             <div className="doc-report-card">

    <div className="doc-report-left">

        

        <div className="doc-report-info">

            <h4>{report.title}</h4>

            <p>{report.reportType}</p>

            <small>
                Uploaded on{" "}
                {new Date(report.createdAt).toLocaleDateString("en-IN")}
            </small>

            <span
                className={`doc-report-status ${
                    report.status === "Completed"
                        ? "completed"
                        : "pending"
                }`}
            >
                {report.status}
            </span>

        </div>

    </div>

    <div className="doc-report-actions">

        <button
            onClick={() => openReport(report.reportFile)}
        >
            <span className="material-symbols-outlined">
                visibility
            </span>
        </button>

        <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            download
        >
            <span className="material-symbols-outlined">
                download
            </span>
        </a>

        <button
            className="danger"
            onClick={() => handleDelete(report._id)}
        >
            <span className="material-symbols-outlined">
                delete
            </span>
        </button>

    </div>

</div>

              );
            }
          )}

        </div>

      )}

      {showUploadModal && (

        <UploadReportModal
          appointment={appointment}
          onUploaded={loadReports}
          onClose={() =>
            setShowUploadModal(false)
          }
        />

      )}

    </section>
  );
}

export default DiagnosticReports;
