import { useEffect, useRef, useState } from "react";

import { Link, useLocation } from "react-router-dom";
import { FiMessageSquare } from "react-icons/fi";

import doctorImage from "../../../assets/images/doctors/doctor-6.jpg";
import getAssetUrl from "../../../utils/getAssetUrl";

import Navbar from "../../../components/common/Navbar";
import Notification from "../../../components/common/Notification/Notification";
import SignOut from "../../../components/common/SignOut";
import ChatUnreadToast from "../../../components/common/ChatUnreadToast";

import useAuth from "../../../hooks/useAuth";
import { useSocket } from "../../../context/SocketContext";
import { formatTime } from "../../../utils/formatTime";

import socketService from "../../../services/socketService";
import {
  getChats,
} from "../../../services/chatService";

import "../../../styles/doctor_dashboard.css";

function DashboardHeader({
  openPanel,
  onTogglePanel,
  notificationButtonRef,
  notificationPanelRef,
}) {

  const [standaloneOpenPanel, setStandaloneOpenPanel] = useState(null);
  const standaloneNotificationButtonRef = useRef(null);
  const standaloneNotificationPanelRef = useRef(null);
  const managesNotificationPanel = typeof onTogglePanel !== "function";
  const activeOpenPanel = managesNotificationPanel ? standaloneOpenPanel : openPanel;
  const activeNotificationButtonRef =
    notificationButtonRef || standaloneNotificationButtonRef;
  const activeNotificationPanelRef =
    notificationPanelRef || standaloneNotificationPanelRef;

  const toggleNotificationPanel = (panel) => {
    if (managesNotificationPanel) {
      setStandaloneOpenPanel((current) => (current === panel ? null : panel));
      return;
    }

    onTogglePanel(panel);
  };

  /* ==========================================================
     Router
  ========================================================== */

  const location =
    useLocation();

  const isChatOpen =
    location.pathname ===
    "/doctor/inbox";

  const isNotificationOpen =
    activeOpenPanel ===
    "notifications";

  useEffect(() => {
    if (!managesNotificationPanel || !isNotificationOpen) return undefined;

    const closeWhenOutside = (event) => {
      if (
        !activeNotificationPanelRef.current?.contains(event.target) &&
        !activeNotificationButtonRef.current?.contains(event.target)
      ) {
        setStandaloneOpenPanel(null);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setStandaloneOpenPanel(null);
    };

    document.addEventListener("mousedown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [
    activeNotificationButtonRef,
    activeNotificationPanelRef,
    isNotificationOpen,
    managesNotificationPanel,
  ]);

  /* ==========================================================
     Auth
  ========================================================== */

  const { user } =
    useAuth();

  const {
    notifications,
    unreadCount,
    unreadChatSenderCount,
    markAllAsRead,
    markNotificationAsRead,
  } = useSocket();

  const formattedNotifications = notifications.map((n) => ({
    id: n._id || n.id || Math.random().toString(),
    title: n.title,
    description: n.message || n.description,
    isRead: n.isRead || n.read,
    time: formatTime(n.createdAt),
  }));

  const profile =
    user || {

      name:
        "Dr. Julianne Moore",

      roleTitle:
        "Senior Cardiologist",

      avatar:
        doctorImage,

    };

  /* ==========================================================
     State
  ========================================================== */

  const [
    unreadChats,
    setUnreadChats,
  ] = useState(0);

  /* ==========================================================
     Load Chat Count
  ========================================================== */

  useEffect(() => {

    loadChatCount();

  }, []);

  /* ==========================================================
     Socket Events
  ========================================================== */

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

  /* ==========================================================
     Chat Counter
  ========================================================== */

  const loadChatCount =
    async () => {

      try {

        const response =
          await getChats();

        const chats =
          response.chats || [];

        const total =
          chats.reduce(

            (
              count,
              chat
            ) =>

              count +
              (
                chat.unreadCount ||
                0
              ),

            0

          );

        setUnreadChats(
          total
        );

      }

      catch (
        error
      ) {

        console.error(
          error
        );

      }

    };

  /* ==========================================================
     Brand Click
  ========================================================== */

  const handleLinkClick =
    (
      event,
      href
    ) => {

      event.preventDefault();

      if (
        href === "#"
      ) {

        return;

      }

      const target =
        document.querySelector(
          href
        );

      if (
        target
      ) {

        window.scrollTo({

          top:
            target.offsetTop -
            80,

          behavior:
            "smooth",

        });

      }

    };
      /* ==========================================================
     Render
  ========================================================== */

  return (
    <>
    <Navbar
      className="doc-dashboard-header"
      contentClassName="doc-header-content"

      brand={

        <div
          className="doc-brand"
          onClick={(event) =>
            handleLinkClick(
              event,
              "#home"
            )
          }
        >

          <img
            className="doc-brand-mark"
            src="/assets/clinicconnect-logo.png"
            alt="Clinic Connect logo"
          />

          <div>

            <p className="doc-brand-name">
              Clinic Connect
            </p>

            <p className="doc-brand-subtitle">
              Doctor Portal
            </p>

          </div>

        </div>

      }

      actions={

        <div className="doc-header-actions">

          <span
            className="doc-header-divider"
            aria-hidden="true"
          />

          {/* ======================================
              Chat
          ======================================= */}

          <Link
            to={
              isChatOpen
                ? "/doctor/dashboard"
                : "/doctor/inbox"
            }
            className={`doc-icon-button ${
              isChatOpen
                ? "is-open"
                : ""
            }`}
            aria-label={
              isChatOpen
                ? "Close inbox"
                : "Open inbox"
            }
          >

            <FiMessageSquare />

            {unreadChats > 0 && (

              <span className="doc-chat-badge">

                {unreadChats > 99
                  ? "99+"
                  : unreadChats}

              </span>

            )}

          </Link>

          {/* ======================================
              Notifications
          ======================================= */}

          <div className="doc-navbar-menu">

            <button
              type="button"
              className={`doc-icon-button doc-notification-button ${
                isNotificationOpen
                  ? "is-open"
                  : ""
              }`}
              aria-label={
                isNotificationOpen
                  ? "Close notifications"
                  : "Open notifications"
              }
              aria-controls="doctor-notifications"
              aria-expanded={
                isNotificationOpen
              }
              onClick={() =>
                toggleNotificationPanel(
                  "notifications"
                )
              }
              ref={
                activeNotificationButtonRef
              }
            >

              <span className="material-symbols-outlined">
                notifications
              </span>

              {unreadCount > 0 && (
                <span className="doc-notification-count">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}

            </button>

            {isNotificationOpen && (

              <section
                id="doctor-notifications"
                className="doc-notification-dropdown"
                ref={
                  activeNotificationPanelRef
                }
                aria-label="Notifications"
              >

                <div className="doc-popover-heading">

                  <h2>
                    Notifications
                  </h2>

                  <button
                    type="button"
                    className="doc-clear-notifications"
                    onClick={markAllAsRead}
                  >

                    Mark all read

                  </button>

                </div>

                {formattedNotifications.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.875rem" }}>
                    No unread notifications
                  </div>
                ) : (
                  <Notification
                    items={formattedNotifications}
                    onItemClick={(id) => markNotificationAsRead(id)}
                  />
                )}

              </section>

            )}

          </div>

          {/* ======================================
              Profile
          ======================================= */}

          <SignOut
            triggerClassName="doc-doctor-profile"
            user={profile}
          >

            <div className="doc-doctor-details">

              <strong>

                {profile.fullName ||
                  profile.name}

              </strong>

              <span>

                {profile.roleTitle ||
                  profile.role}

              </span>

            </div>

            <img
              src={
                getAssetUrl(profile.profilePhoto || profile.avatar) ||
                doctorImage
              }
              alt={
                profile.fullName ||
                profile.name
              }
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = doctorImage;
              }}
            />

          </SignOut>

        </div>

      }
        />
      <ChatUnreadToast senderCount={unreadChatSenderCount} />
    </>
  );

}

export default DashboardHeader;
