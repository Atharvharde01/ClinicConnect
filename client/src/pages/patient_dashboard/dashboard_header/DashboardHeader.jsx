import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FiArrowUp,
  FiBell,
  FiFileText,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMessageSquare,
  FiSearch,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import patientPhoto from "../../../assets/images/hero/patient1.jpg";
import Notification from "../../../components/common/Notification/Notification";
import SignOut from "../../../components/common/SignOut";
import ChatUnreadToast from "../../../components/common/ChatUnreadToast";
import useAuth from "../../../hooks/useAuth";
import { useSocket } from "../../../context/SocketContext";
import { formatTime } from "../../../utils/formatTime";
import socketService from "../../../services/socketService";
import { getChats } from "../../../services/chatService";
import "../../../styles/patient_dashboard.css";

const mainNavigation = [
  { label: "Dashboard", icon: FiGrid, to: "/patient/dashboard" },
  { label: "Billing", icon: FiFileText, to: "/patient/billing" },
  { label: "My Doctors", icon: FiUsers, to: "/patient/doctors" },
];
const accountNavigation = [
  { label: "Profile", icon: FiUser, to: "/patient/profile" },
  { label: "Sign Out", icon: FiLogOut, danger: true, isSignOut: true },
];

function DashboardHeader() {
  const [openPanel, setOpenPanel] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const location = useLocation();
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    unreadChatSenderCount,
    markAllAsRead,
    markNotificationAsRead,
  } = useSocket();
  const profile = {
    name: user?.fullName || user?.name || "Patient",
    roleTitle: user?.roleTitle || "Patient Portal",
    avatar: user?.profilePhoto || user?.avatar || patientPhoto,
    email: user?.email || "",
  };
  const isInboxOpen = location.pathname === "/patient/inbox";
  const activeSection = mainNavigation.find((item) => item.to === location.pathname)?.label || "Dashboard";

  const formattedNotifications = notifications.map((n) => ({
    _id: n._id || n.id,
    id: n._id || n.id || `${n.title || "notification"}-${n.createdAt || n.time || "unknown"}`,
    title: n.title,
    description: n.message || n.description,
    isRead: n.isRead || n.read,
    time: n.createdAt ? formatTime(n.createdAt) : "Just now",
  }));

  const loadChatCount = async () => {
    try {
      const response = await getChats();
      const chats = response.chats || [];
      const total = chats.reduce(
        (count, chat) => count + (chat.unreadCount || 0),
        0,
      );
      setUnreadChats(total);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadChatCount();
  }, []);

  useEffect(() => {
    const handleRefreshChats = () => {
      loadChatCount();
    };

    const handleReceiveMessage = () => {
      loadChatCount();
    };

    socketService.onRefreshChats(handleRefreshChats);
    socketService.onReceiveMessage(handleReceiveMessage);

    return () => {
      socketService.off("refresh-chats", handleRefreshChats);
      socketService.off("receive-message", handleReceiveMessage);
    };
  }, []);

  useEffect(() => {
    const updateScrollButton = () => setShowScrollButton(window.scrollY > 320);
    window.addEventListener("scroll", updateScrollButton, { passive: true });
    updateScrollButton();

    return () => window.removeEventListener("scroll", updateScrollButton);
  }, []);

  const togglePanel = (panel) => {
    setOpenPanel((currentPanel) => (currentPanel === panel ? null : panel));
  };

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <>
      {isSidebarOpen && (
        <button
          aria-label="Close navigation"
          className="pd-sidebar-backdrop"
          onClick={closeSidebar}
          type="button"
        />
      )}
      <aside className={`pd-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <div className="pd-sidebar-inner">
          <a className="pd-brand" href="#dashboard" onClick={closeSidebar}>
            <img
              className="pd-brand-mark"
              src="/assets/clinicconnect-logo.png"
              alt="Clinic Connect logo"
            />
            <span>
              <strong>Clinic Connect</strong>
              <small>Patient Portal</small>
            </span>
          </a>
          <nav className="pd-sidebar-nav" aria-label="Primary navigation">
            {mainNavigation.map(({ label, icon: Icon, to }) => (
              <Link
                className={`pd-nav-link ${activeSection === label ? "is-active" : ""}`}
                key={label}
                to={to}
                onClick={() => {
                  closeSidebar();
                }}
              >
                <Icon />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <nav className="pd-sidebar-account" aria-label="Account navigation">
            {accountNavigation.map(
              ({ label, icon: Icon, danger, isSignOut, to }) =>
                isSignOut ? (
                  <SignOut
                    className={`pd-nav-link ${danger ? "is-danger" : ""}`}
                    direct
                    key={label}
                    redirectTo="/login"
                  >
                    <Icon />
                    <span>{label}</span>
                  </SignOut>
                ) : (
                  <Link
                    className={`pd-nav-link ${danger ? "is-danger" : ""}`}
                    key={label}
                    to={to}
                    onClick={closeSidebar}
                  >
                    <Icon />
                    <span>{label}</span>
                  </Link>
                ),
            )}
          </nav>
        </div>
      </aside>
      <header className="pd-topbar">
        <button
          aria-expanded={isSidebarOpen}
          aria-label={isSidebarOpen ? "Close navigation" : "Open navigation"}
          className="pd-menu-toggle"
          onClick={() => setIsSidebarOpen((isOpen) => !isOpen)}
          type="button"
        >
          <FiMenu />
        </button>
        <label className="pd-search" aria-label="Search patient information">
          <FiSearch />
          <input
            placeholder="Search patients, reports, or doctors..."
            type="search"
          />
        </label>
        <div className="pd-header-actions">
          <Link
            className={`pd-icon-button pd-chat-button ${isInboxOpen ? "is-open" : ""}`}
            to={isInboxOpen ? "/patient/dashboard" : "/patient/inbox"}
            aria-label={isInboxOpen ? "Close inbox" : "Open inbox"}
          >
            <FiMessageSquare />
            {unreadChats > 0 && (
              <span className="pd-chat-badge">
                {unreadChats > 99 ? "99+" : unreadChats}
              </span>
            )}
          </Link>
          <div className="pd-navbar-menu">
            <button
              className={`pd-icon-button pd-notification-button ${openPanel === "notifications" ? "is-open" : ""}`}
              type="button"
              aria-label="Open notifications"
              aria-expanded={openPanel === "notifications"}
              onClick={() => togglePanel("notifications")}
              style={{ position: "relative" }}
            >
              <FiBell />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-2px",
                    right: "-2px",
                    background: "#ef4444",
                    color: "#ffffff",
                    borderRadius: "50%",
                    fontSize: "10px",
                    fontWeight: 700,
                    minWidth: "16px",
                    height: "16px",
                    padding: "0 4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px #ffffff",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            {openPanel === "notifications" && (
              <div
                className="pd-navbar-popover"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="pd-popover-heading">
                  <h2>Notifications</h2>
                  <button
                    type="button"
                    style={{ background: "none", border: "none", color: "var(--color-primary, #0284c7)", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </button>
                </div>
                {formattedNotifications.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
                    No unread notifications
                  </div>
                ) : (
                  <Notification
                    items={formattedNotifications}
                    onItemClick={(id) => markNotificationAsRead(id)}
                  />
                )}
              </div>
            )}
          </div>
          <SignOut
            redirectTo="/login"
            triggerClassName="pd-user-menu"
            user={profile}
          >
            <span className="pd-user-copy">
              <strong>{profile.name}</strong>
              <small>{profile.roleTitle || profile.role}</small>
            </span>
            <img
              src={profile.avatar || patientPhoto}
              alt={profile.name}
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = patientPhoto;
              }}
            />
          </SignOut>
        </div>
      </header>
      {showScrollButton && (
        <button
          className="pd-scroll-top"
          type="button"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <FiArrowUp />
        </button>
      )}
      <ChatUnreadToast senderCount={unreadChatSenderCount} />
    </>
  );
}

export default DashboardHeader;
