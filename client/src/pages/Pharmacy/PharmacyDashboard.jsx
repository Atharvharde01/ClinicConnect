import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiBell,
  FiCheckCircle,
  FiChevronDown,
  FiEdit3,
  FiFileText,
  FiLogOut,
  FiMenu,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiSettings,
  FiShield,
  FiTrendingUp,
  FiUser,
  FiX,
} from "react-icons/fi";
import PharmacyBilling from "./Billing";
import PharmacyInventory from "./Inventory";
import PharmacyPrescription from "./Prescription";
import Navbar from "../../components/common/Navbar";
import "../../styles/pharmacy_dashboard.css";
import { getPharmacyPrescriptions } from "../../services/pharmacyService";
import socketService from "../../services/socketService";
import useAuth from "../../hooks/useAuth";
import { useSocket } from "../../context/SocketContext";
import { formatTime } from "../../utils/formatTime";



const initialInventory = [
  {
    id: "medicine-1",
    name: "Lipitor 20mg",
    category: "Cardiovascular",
    available: 450,
    reserved: 12,
    expiry: "12/2026",
    expiringSoon: true,
    daysToExpiry: 15,
    lowStockAt: 50,
  },
  {
    id: "medicine-2",
    name: "Saline Solution 1L",
    category: "Fluids",
    available: 8500,
    reserved: 400,
    expiry: "05/2026",
    expiringSoon: false,
    daysToExpiry: 180,
    lowStockAt: 100,
  },
  {
    id: "medicine-3",
    name: "Insulin Glargine",
    category: "Endocrine",
    available: 12,
    reserved: 4,
    expiry: "08/2026",
    expiringSoon: false,
    daysToExpiry: 120,
    lowStockAt: 20,
  },
  {
    id: "medicine-4",
    name: "Amoxicillin 500mg",
    category: "Antibiotics",
    available: 1240,
    reserved: 85,
    expiry: "12/2027",
    expiringSoon: false,
    daysToExpiry: 420,
    lowStockAt: 100,
  },
];

const initialNotifications = [
  {
    id: 1,
    title: "Critical low: Insulin Glargine",
    message: "Pharmacy B-Shelf. 4 units remaining.",
    time: "2 mins ago",
    read: false,
  },
  {
    id: 2,
    title: "New emergency prescription",
    message: "Patient ID: #ER-9012. Dr. K. Miller",
    time: "12 mins ago",
    read: false,
  },
  {
    id: 3,
    title: "Inventory sync complete",
    message: "Central Database handshake successful.",
    time: "45 mins ago",
    read: true,
  },
];

function Modal({ title, children, onClose }) {
  return (
    <div
      className="ph-modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="ph-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ph-modal-header">
          <h2>{title}</h2>
          <button
            className="ph-icon-button"
            type="button"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <FiX />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

function makePdf(lines) {
  const escapePdf = (value) =>
    String(value)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  const content = `BT\n/F1 12 Tf\n50 750 Td\n${lines
    .slice(0, 34)
    .map((line, index) => `${index ? "0 -18 Td\n" : ""}(${escapePdf(line)}) Tj`)
    .join("\n")}\nET\n`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}endstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join(
      "",
    )}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function downloadFile(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function PharmacyDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markNotificationAsRead } = useSocket();
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionLoading, setPrescriptionLoading] = useState(true);
  const [prescriptionError, setPrescriptionError] = useState("");
  const [inventory, setInventory] = useState(initialInventory);
  const [globalSearch, setGlobalSearch] = useState("");
  const [debouncedGlobalSearch, setDebouncedGlobalSearch] = useState("");
  const [activeSection, setActiveSection] = useState("Dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModal, setProfileModal] = useState("");
  const [selectedPrescription, setSelectedPrescription] = useState(null);
  const [busyAction, setBusyAction] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState(null);
  const [chartRange, setChartRange] = useState("Weekly");
  const [logsOpen, setLogsOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [emergencyDetails, setEmergencyDetails] = useState("");
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    confirm: "",
  });


  const loadPrescriptions = async () => {
  try {
    setPrescriptionLoading(true);
    setPrescriptionError("");

    const response = await getPharmacyPrescriptions();

    const formattedPrescriptions = (
  response.prescriptions || []
).map((prescription) => ({
  id: prescription._id,

  patient: prescription.patient?.fullName || "Unknown Patient",

  patientId:
    prescription.patient?.patientId || "-",

  patientEmail:
    prescription.patient?.email || "-",

  patientPhone:
    prescription.patient?.phone || "-",

  gender:
    prescription.patient?.gender || "-",

  dateOfBirth:
    prescription.patient?.dateOfBirth || null,

  bloodGroup:
    prescription.patient?.bloodGroup || "-",

  address:
    prescription.patient?.address || "-",

  allergies:
    prescription.patient?.allergies || [],

  chronicDiseases:
    prescription.patient?.chronicDiseases || [],

  emergencyContact:
    prescription.patient?.emergencyContact || null,

  physician:
    prescription.doctor?.user?.fullName ||
    "Unknown Doctor",

  doctorEmail:
    prescription.doctor?.user?.email || "-",

  doctorPhone:
    prescription.doctor?.user?.phone || "-",

  specialization:
    prescription.doctor?.specialization || "-",

  qualification:
    prescription.doctor?.qualification || "-",

  experience:
    prescription.doctor?.experience ?? "-",

  department:
    prescription.doctor?.department?.name ||
    "-",

  diagnosis:
    prescription.diagnosis || "-",

  notes:
    prescription.notes || "",

  followUpDate:
    prescription.followUpDate || null,

  status:
    prescription.status || "Issued",

  createdAt:
    prescription.createdAt,

  updatedAt:
    prescription.updatedAt,

  appointment:
    prescription.appointment || null,

  priority: "Normal",

  items: (
    prescription.medicines || []
  ).map((item) => ({
    id: item._id,

    medicineId:
      item.medicine?._id ||
      item.medicine ||
      null,

    name:
      item.medicine?.name ||
      "Unknown Medicine",

    genericName:
      item.medicine?.genericName || "",

    brand:
      item.medicine?.brand || "",

    category:
      item.medicine?.category || "",

    strength:
      item.medicine?.strength || "",

    manufacturer:
      item.medicine?.manufacturer || "",

    unit:
      item.medicine?.unit || "",

    price:
      item.medicine?.price || 0,

    dosage:
      item.dosage || "",

    frequency:
      item.frequency || "",

    duration:
      item.duration || "",

    quantity:
      item.quantity || 0,

    instructions:
      item.instructions || "",
  })),

  previousPrescriptions:
    prescription.previousPrescriptions || [],
}));

    setPrescriptions(formattedPrescriptions);
  } catch (error) {
    console.error(
      "Failed to load pharmacy prescriptions:",
      error
    );

    setPrescriptionError(
      error.response?.data?.message ||
        "Unable to load prescriptions."
    );
  } finally {
    setPrescriptionLoading(false);
  }
};

  useEffect(() => {
  const timer = window.setTimeout(
    () => setDebouncedGlobalSearch(globalSearch.trim().toLowerCase()),
    300,
  );

  return () => window.clearTimeout(timer);
}, [globalSearch]);


useEffect(() => {
  if (!toast) return undefined;

  const timer = window.setTimeout(() => setToast(null), 3500);

  return () => window.clearTimeout(timer);
}, [toast]);


// Load prescriptions from backend
useEffect(() => {
  loadPrescriptions();

  const handleNotification = (notif) => {
    loadPrescriptions();
    setToast({
      message: notif?.title || "New Prescription Notification Received",
      type: "info",
    });
  };

  socketService.onNotification(handleNotification);

  return () => {
    socketService.off("new-notification", handleNotification);
  };
}, []);

useEffect(() => {
  if (!user) return;

  setProfileForm({
    name: user.fullName || user.name || "",
    email: user.email || "",
  });
}, [user]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const searchMatches = useMemo(
    () =>
      debouncedGlobalSearch
        ? prescriptions
            .filter((item) =>
              `${item.id} ${item.patient} ${item.patientId} ${item.physician}`
                .toLowerCase()
                .includes(debouncedGlobalSearch),
            )
            .slice(0, 5)
        : [],
    [debouncedGlobalSearch, prescriptions],
  );

  const scrollTo = (section) => {
    setActiveSection(section);
    setMobileNavOpen(false);
    document
      .getElementById(section)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const finishAction = (id, action, payload) => {
    const normalizedId = typeof id === "object" ? id.id : id;
    if (action === "Create Order") {
      const nextId = `RX-${88422 + prescriptions.length}`;
      const newOrder = {
        id: nextId,
        patientId: `P-${String(10000 + prescriptions.length)}`,
        createdAt: "Just now",
        date: "2026-07-16",
        status: "Pending",
        allergies: "No known allergies",
        notes: "Created from pharmacy queue.",
        items: [
          {
            name: "Pending medication review",
            dosage: "As prescribed",
            quantity: 1,
            price: 0,
          },
        ],
        ...payload,
      };
      setPrescriptions((current) => [newOrder, ...current]);
      showToast(`${nextId} created successfully.`);
      return;
    }
    const statusMap = {
      Verify: "Verified",
      Dispense: "Dispensed",
      "Partial Dispense": "Partially Dispensed",
      Hold: "On Hold",
      Resume: "Preparing",
      Cancel: "Cancelled",
      "Generate Invoice": "Invoiced",
    };
    if (!statusMap[action]) return;
    setBusyAction(`${normalizedId}-${action}`);
    setPrescriptions((current) =>
      current.map((item) =>
        item.id === normalizedId
          ? { ...item, status: statusMap[action] }
          : item,
      ),
    );
    window.setTimeout(() => {
      setBusyAction("");
      showToast(`${normalizedId} ${action.toLowerCase()} action completed.`);
    }, 450);
  };

  const requestAction = (id, action, payload) => {
    if (action === "Cancel") {
      setConfirmation({
        id,
        action,
        payload,
        message:
          "Cancel this prescription? This action changes the dispensing workflow.",
      });
      return;
    }
    finishAction(id, action, payload);
  };

  const runBulkAction = (ids, action) => {
    if (action === "Generate Invoice") {
      setPrescriptions((current) =>
        current.map((item) =>
          ids.includes(item.id) ? { ...item, status: "Invoiced" } : item,
        ),
      );
      showToast(`${ids.length} invoices generated.`);
      return;
    }
    if (action === "Cancelled") {
      setConfirmation({
        ids,
        action: "Cancel",
        message: `Cancel ${ids.length} selected prescriptions?`,
      });
      return;
    }
    setPrescriptions((current) =>
      current.map((item) =>
        ids.includes(item.id) ? { ...item, status: action } : item,
      ),
    );
    showToast(`${ids.length} prescription statuses updated.`);
  };

  const downloadPdf = (filename, lines) => {
    downloadFile(filename, makePdf(lines));
    showToast(`${filename} downloaded.`);
  };

  const printDocuments = (documents, title) => {
    const lines = documents.flatMap((document) =>
      Array.isArray(document)
        ? document
        : [`${document.id} · ${document.patient} · ${document.status}`],
    );
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) {
      showToast("Allow popups to print this document.", "error");
      return;
    }
    popup.document.write(
      `<!doctype html><html><head><title>${title}</title><style>body{font-family:Arial,sans-serif;padding:40px;color:#191c1c}h1{color:#006b2c}pre{font:14px/1.7 Arial;white-space:pre-wrap}</style></head><body><h1>${title}</h1><pre>${lines.join("\n")}</pre></body></html>`,
    );
    popup.document.close();
    popup.focus();
    window.setTimeout(() => popup.print(), 200);
  };

  const updateInventory = (id, updates) =>
    setInventory((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  const addInventory = (item) => {
    setInventory((current) => [
      ...current,
      {
        ...item,
        id: `medicine-${Date.now()}`,
        lowStockAt: 20,
        expiringSoon: false,
        daysToExpiry: 365,
      },
    ]);
    showToast(`${item.name} added to inventory.`);
  };
  const exportInventory = (items) => {
    const csv = [
      "Medicine,Category,Available,Reserved,Expiry",
      ...items.map(
        (item) =>
          `${item.name},${item.category},${item.available},${item.reserved},${item.expiry}`,
      ),
    ].join("\n");
    downloadFile(
      "pharmacy-inventory.csv",
      new Blob([csv], { type: "text/csv" }),
    );
    showToast("Inventory export downloaded.");
  };

  const chartValues =
    chartRange === "Weekly"
      ? [38, 58, 31, 83, 53, 43, 92]
      : [56, 47, 71, 64, 83, 58, 76];

  const saveProfile = () => {
    if (!profileForm.name.trim() || !profileForm.email.includes("@")) {
      showToast("Enter a valid profile name and email.", "error");
      return;
    }
    setProfileModal("");
    showToast("Profile updated.");
  };
  const changePassword = () => {
    if (
      !passwordForm.current ||
      passwordForm.next.length < 8 ||
      passwordForm.next !== passwordForm.confirm
    ) {
      showToast("Use matching passwords with at least 8 characters.", "error");
      return;
    }
    setPasswordForm({ current: "", next: "", confirm: "" });
    setProfileModal("");
    showToast("Password changed successfully.");
  };

  const dispatchEmergency = () => {
    if (!emergencyDetails.trim()) {
      showToast(
        "Describe the medicine request and urgency before dispatching.",
        "error",
      );
      return;
    }
    setEmergencyDetails("");
    setEmergencyOpen(false);
    showToast("Emergency requisition dispatched.");
  };


  const filteredPrescriptions = prescriptions.filter((item) => {
  const query = globalSearch.trim().toLowerCase();

  if (!query) return true;

  return (
    item.id?.toLowerCase().includes(query) ||
    item.patient?.toLowerCase().includes(query) ||
    item.patientId?.toLowerCase().includes(query) ||
    item.physician?.toLowerCase().includes(query) ||
    item.department?.toLowerCase().includes(query) ||
    item.diagnosis?.toLowerCase().includes(query) ||
    item.items?.some((medicine) =>
      medicine.name?.toLowerCase().includes(query)
    )
  );
});
  

  return (
    <div className="pharmacy-dashboard">
      <Navbar as="nav" className="ph-topnav">
        <div className="ph-brand">
          <img src="/assets/clinicconnect-logo.png" alt="Clinic Connect logo" />
          <span>ClinicConnect</span>
        </div>
        <div className={`ph-nav-links ${mobileNavOpen ? "is-open" : ""}`}>
          <button
            className={activeSection === "Dashboard" ? "is-active" : ""}
            type="button"
            onClick={() => scrollTo("Dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeSection === "Prescriptions" ? "is-active" : ""}
            type="button"
            onClick={() => scrollTo("Prescriptions")}
          >
            Prescriptions
          </button>
          <button
            className={activeSection === "Inventory" ? "is-active" : ""}
            type="button"
            onClick={() => scrollTo("Inventory")}
          >
            Inventory
          </button>
          <button
            className={activeSection === "MedicineBilling" ? "is-active" : ""}
            type="button"
            onClick={() => scrollTo("MedicineBilling")}
          >
            Medicine Billing
          </button>
        </div>
        <div className="ph-nav-actions">
          <div className="ph-nav-popover">
            <button
              className={`ph-icon-button ${notificationsOpen ? "is-active" : ""}`}
              type="button"
              aria-label="Open notifications"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setProfileOpen(false);
              }}
            >
              <FiBell />
              {unreadCount > 0 && <b>{unreadCount}</b>}
            </button>
            {notificationsOpen && (
              <div className="ph-notification-panel">
                <header>
                  <h2>Notifications</h2>
                  <button
                    type="button"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </button>
                </header>
                {notifications.length === 0 ? (
                  <p style={{ padding: "16px", textAlign: "center", color: "#64748b" }}>
                    No notifications remaining.
                  </p>
                ) : (
                  notifications.map((item) => (
                    <article
                      className="is-unread"
                      key={item._id || item.id}
                      onClick={() => markNotificationAsRead(item._id || item.id)}
                      style={{ cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", borderBottom: "1px solid #e2e8f0" }}
                    >
                      <div>
                        <strong style={{ display: "block" }}>{item.title}</strong>
                        <p style={{ margin: "4px 0", fontSize: "13px", color: "#475569" }}>{item.message || item.description}</p>
                        <small style={{ color: "#94a3b8" }}>{formatTime(item.createdAt)}</small>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          markNotificationAsRead(item._id || item.id);
                        }}
                        style={{ background: "none", border: "none", color: "#16a34a", cursor: "pointer" }}
                      >
                        <FiCheckCircle />
                      </button>
                    </article>
                  ))
                )}
              </div>
            )}
          </div>
        <div className="ph-nav-popover">
  <button
    className="ph-user-trigger"
    type="button"
    onClick={() => {
      setProfileOpen((open) => !open);
      setNotificationsOpen(false);
    }}
  >
    <span className="ph-user-avatar">
      <FiUser />
    </span>

    <span>
      <strong>
        {user?.fullName ||
          user?.name ||
          profileForm.name ||
          "Pharmacist"}
      </strong>

      <small>
        {user?.role === "pharmacist"
          ? "Pharmacist"
          : user?.role || "Staff"}
      </small>
    </span>

    <FiChevronDown />
  </button>

  {profileOpen && (
    <div className="ph-profile-menu">
      <button
        type="button"
        onClick={() => {
          setProfileModal("profile");
          setProfileOpen(false);
        }}
      >
        <FiEdit3 />
        Edit Profile
      </button>

      <button
        type="button"
        onClick={() => {
          setProfileModal("password");
          setProfileOpen(false);
        }}
      >
        <FiSettings />
        Change Password
      </button>

      <button
        type="button"
        onClick={async () => {
          try {
            await logout();
          } finally {
            navigate("/login/staff", {
              replace: true,
            });
          }
        }}
      >
        <FiLogOut />
        Logout
      </button>
    </div>
  )}
</div>
        </div>
      </Navbar>
      <main className="ph-main">
        <section className="ph-command-center" id="Dashboard">
          <div>
            <h1>Pharmacy Command Center</h1>
            <p>
              Real-time pharmaceutical analytics and system health overview.
            </p>
          </div>
          <div className="ph-stat-grid">
            <article>
              <span>
                <FiFileText />
              </span>
              <div>
                <small>Pending RX</small>
                <strong>
                  {
                    prescriptions.filter((item) =>
                      ["Pending", "Preparing", "Verified"].includes(
                        item.status,
                      ),
                    ).length
                  }
                </strong>
              </div>
              <em>
                <FiTrendingUp />
                12%
              </em>
            </article>
            <article>
              <span>
                <FiCheckCircle />
              </span>
              <div>
                <small>Dispensed Today</small>
                <strong>
                  {prescriptions.filter((item) => item.status === "Dispensed")
                    .length + 126}
                </strong>
              </div>
            </article>
            <article>
              <span className="is-error">
                <FiAlertTriangle />
              </span>
              <div>
                <small>Low Stock Alert</small>
                <strong>
                  {inventory
                    .filter((item) => item.available <= item.lowStockAt)
                    .length.toString()
                    .padStart(2, "0")}
                </strong>
              </div>
            </article>
            <article>
              <span>
                <FiShield />
              </span>
              <div>
                <small>Today's Revenue</small>
                <strong>$4,820.50</strong>
              </div>
            </article>
          </div>
          <div className="ph-analytics-grid">
            <section className="ph-chart-card">
              <header>
                <h2>Inventory Dynamics</h2>
                <div>
                  <button
                    className={chartRange === "Weekly" ? "is-active" : ""}
                    type="button"
                    onClick={() => setChartRange("Weekly")}
                  >
                    Weekly
                  </button>
                  <button
                    className={chartRange === "Monthly" ? "is-active" : ""}
                    type="button"
                    onClick={() => setChartRange("Monthly")}
                  >
                    Monthly
                  </button>
                </div>
              </header>
              <div className="ph-chart-bars">
                {chartValues.map((value, index) => (
                  <div key={index}>
                    <span style={{ height: `${value}%` }} />
                    <small>
                      {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"][index]}
                    </small>
                  </div>
                ))}
              </div>
            </section>
            <section className="ph-alerts-card">
              <header>
                <h2>Clinical Alerts</h2>
                <button type="button" onClick={() => setLogsOpen(true)}>
                  View system logs
                </button>
              </header>
              <article className="is-critical">
                <FiAlertTriangle />
                <div>
                  <strong>Critical Low: Insulin Glargine</strong>
                  <p>Pharmacy B-Shelf. 4 units remaining.</p>
                  <small>2 mins ago</small>
                </div>
              </article>
              <article>
                <FiPlus />
                <div>
                  <strong>New Emergency Prescription</strong>
                  <p>Patient ID: #ER-9012. Dr. K. Miller</p>
                  <small>12 mins ago</small>
                </div>
              </article>
              <article>
                <FiRefreshCw />
                <div>
                  <strong>Inventory Sync Complete</strong>
                  <p>Central Database handshake successful.</p>
                  <small>45 mins ago</small>
                </div>
              </article>
            </section>
          </div>
        </section>
        <PharmacyPrescription
          prescriptions={prescriptions}
          globalSearch={debouncedGlobalSearch}
          onClearGlobalSearch={() => setGlobalSearch("")}
          onAction={requestAction}
          onBulkAction={runBulkAction}
          onLoadToBilling={(item) => {
            setSelectedPrescription(item);
            scrollTo("MedicineBilling");
          }}
          onDownloadPdf={downloadPdf}
          onPrint={printDocuments}
          onToast={showToast}
          busyAction={busyAction}
        />
        <PharmacyInventory
          inventory={inventory}
          onUpdateInventory={updateInventory}
          onAddInventory={addInventory}
          onExportInventory={exportInventory}
          onToast={showToast}
        />
        <PharmacyBilling
          prescriptions={prescriptions}
          selectedPrescription={selectedPrescription}
          onSelectPrescription={setSelectedPrescription}
          onDownloadPdf={downloadPdf}
          onPrint={printDocuments}
          onToast={showToast}
        />
      </main>
      <footer className="ph-footer">
        <strong>ClinicConnect</strong>
        <p>
          Precision Managed Healthcare Solutions. All pharmaceutical data is
          encrypted and HIPAA compliant.
        </p>
      </footer>
      <button
        className="ph-emergency-fab"
        type="button"
        aria-label="Emergency requisition"
        onClick={() => setEmergencyOpen(true)}
      >
        <FiAlertTriangle />
      </button>
      {confirmation && (
        <Modal title="Confirm action" onClose={() => setConfirmation(null)}>
          <div className="ph-modal-body">
            <p>{confirmation.message}</p>
            <div className="ph-modal-actions">
              <button
                className="ph-secondary-button"
                type="button"
                onClick={() => setConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="ph-danger-button"
                type="button"
                onClick={() => {
                  if (confirmation.ids)
                    confirmation.ids.forEach((id) =>
                      finishAction(id, confirmation.action),
                    );
                  else
                    finishAction(
                      confirmation.id,
                      confirmation.action,
                      confirmation.payload,
                    );
                  setConfirmation(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
      {profileModal === "profile" && (
        <Modal title="Edit Profile" onClose={() => setProfileModal("")}>
          <div className="ph-modal-body">
            <div className="ph-form-grid">
              <label>
                Name
                <input
                  value={profileForm.name}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(event) =>
                    setProfileForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="ph-modal-actions">
              <button
                className="ph-secondary-button"
                type="button"
                onClick={() => setProfileModal("")}
              >
                Cancel
              </button>
              <button
                className="ph-primary-button"
                type="button"
                onClick={saveProfile}
              >
                Save profile
              </button>
            </div>
          </div>
        </Modal>
      )}
      {profileModal === "password" && (
        <Modal title="Change Password" onClose={() => setProfileModal("")}>
          <div className="ph-modal-body">
            <div className="ph-form-grid">
              <label>
                Current password
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      current: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={passwordForm.next}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      next: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      confirm: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="ph-modal-actions">
              <button
                className="ph-secondary-button"
                type="button"
                onClick={() => setProfileModal("")}
              >
                Cancel
              </button>
              <button
                className="ph-primary-button"
                type="button"
                onClick={changePassword}
              >
                Change password
              </button>
            </div>
          </div>
        </Modal>
      )}
      {logsOpen && (
        <Modal title="System Logs" onClose={() => setLogsOpen(false)}>
          <div className="ph-modal-body">
            <div className="ph-record-list">
              <p>09:42 · Inventory synchronization completed.</p>
              <p>09:30 · RX-88419 entered the queue.</p>
              <p>09:12 · Low-stock alert raised for Insulin Glargine.</p>
            </div>
            <div className="ph-modal-actions">
              <button
                className="ph-secondary-button"
                type="button"
                onClick={() => setLogsOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
      {emergencyOpen && (
        <Modal
          title="Emergency Requisition"
          onClose={() => setEmergencyOpen(false)}
        >
          <div className="ph-modal-body">
            <p>Create a priority task for the on-call pharmacy team.</p>
            <label>
              Request details
              <textarea
                value={emergencyDetails}
                onChange={(event) => setEmergencyDetails(event.target.value)}
                rows="4"
                placeholder="Describe the medicine and urgency"
              />
            </label>
            <div className="ph-modal-actions">
              <button
                className="ph-secondary-button"
                type="button"
                onClick={() => setEmergencyOpen(false)}
              >
                Cancel
              </button>
              <button
                className="ph-danger-button"
                type="button"
                onClick={dispatchEmergency}
              >
                Dispatch
              </button>
            </div>
          </div>
        </Modal>
      )}
      {toast && (
        <div className={`ph-toast ${toast.type}`} role="status">
          {toast.type === "success" ? <FiCheckCircle /> : <FiAlertTriangle />}
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default PharmacyDashboard;
