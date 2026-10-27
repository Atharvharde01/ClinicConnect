import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { MdChatBubbleOutline, MdNotificationsNone } from "react-icons/md";
import Navbar from "../../../components/common/Navbar";
import SignOut from "../../../components/common/SignOut";
import useAuth from "../../../hooks/useAuth";
import { useSocket } from "../../../context/SocketContext";
import socketService from "../../../services/socketService";
import { getChats } from "../../../services/chatService";
import "../../../styles/reception_dashboard.css";
import receptionistImage from "../../../assets/patients/elena-rodriguez.jpg";
import ReceptionNotificationPanel from "./ReceptionNotificationPanel";
import ChatUnreadToast from "../../../components/common/ChatUnreadToast";

const navigation = [
  { label: "Dashboard", href: "#welcome" },
  { label: "Today's Queue", href: "#queue" },
  { label: "Booking", href: "#booking" },
  { label: "Registration", href: "#registration" },
  { label: "Doctors", href: "#doctors" },
  { label: "Broadcast", href: "#broadcast" },
];

function DashboardHeader({ openPanel, onTogglePanel, notificationButtonRef, notificationPanelRef }) {
  const [activeLink, setActiveLink] = useState("#welcome");
  const [unreadChats, setUnreadChats] = useState(0);
  const { user } = useAuth();
  const { unreadCount, unreadChatSenderCount } = useSocket();
  const profile = user || {
    name: "Elena Rodriguez",
    roleTitle: "Lead Receptionist",
    avatar: receptionistImage,
  };
  const location = useLocation();
  const isChatOpen = location.pathname === "/reception/inbox";
  const isNotificationOpen = openPanel === "notifications";

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

  return (
    <>
    <Navbar
      className="rc-dashboard-header"
      brand={(
        <div className="rc-brand-navigation">
        <a className="rc-brand" href="#welcome">
          <img src="/assets/clinicconnect-logo.png" alt="Clinic Connect logo" />
          <span>ClinicConnect</span>
        </a>
        <nav className="rc-dashboard-nav" aria-label="Reception dashboard navigation">
          {navigation.map((item) => (
            <a
              aria-current={activeLink === item.href ? "page" : undefined}
              className={activeLink === item.href ? "is-active" : ""}
              href={item.href}
              key={item.label}
              onClick={() => setActiveLink(item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>
        </div>
      )}

      actions={(
        <div className="rc-header-actions">
        
        <div className="rc-header-icon-group">
          <div className="rc-navbar-menu">
            <button
              className={`rc-header-icon has-notification ${isNotificationOpen ? "is-open" : ""}`}
              type="button"
              aria-label={isNotificationOpen ? "Close notifications" : "Open notifications"}
              aria-controls="reception-notifications"
              aria-expanded={isNotificationOpen}
              onClick={() => onTogglePanel("notifications")}
              ref={notificationButtonRef}
              style={{ position: "relative" }}
            >
              <MdNotificationsNone />
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
            {isNotificationOpen && <ReceptionNotificationPanel panelRef={notificationPanelRef} />}
          </div>
          <Link
            className={`rc-header-icon ${isChatOpen ? "is-open" : ""}`}
            to={isChatOpen ? "/reception/dashboard" : "/reception/inbox"}
            aria-label={isChatOpen ? "Close inbox" : "Open inbox"}
          >
            <MdChatBubbleOutline />
            {unreadChats > 0 && (
              <span className="rc-chat-badge">
                {unreadChats > 99 ? "99+" : unreadChats}
              </span>
            )}
          </Link>
        </div>
        <SignOut triggerClassName="rc-profile" user={profile}>
          <div className="rc-profile-copy">
            <p>{profile.name}</p>
            <span>{profile.roleTitle || profile.role}</span>
          </div>
          <img src={profile.avatar || receptionistImage} alt={profile.name} />
        </SignOut>
        </div>
      )}
    />
    <ChatUnreadToast senderCount={unreadChatSenderCount} />
    </>
  );
}

export default DashboardHeader;
