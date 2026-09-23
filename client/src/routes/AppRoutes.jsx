import { BrowserRouter, Routes, Route } from "react-router-dom";

// Landing
import LandingPage from "../layouts/LandingLayout";

// Login
import PatientLogin from "../pages/Login/PatientLogin";
import StaffLogin from "../pages/Login/StaffLogin";
import PatientDashboard from "../pages/patient_dashboard/PatientDashboard";
import PatientDashboardPage from "../pages/patient_dashboard/PatientDashboardPage";
import PatientBooking from "../pages/patient_dashboard/booking/PatientBooking";
import PatientAppointmentsPage from "../pages/patient_dashboard/appointments/PatientAppointmentsPage";
import RescheduleAppointment from "../pages/patient_dashboard/appointments/RescheduleAppointment";
import BillingInsurance from "../pages/patient_dashboard/billing/BillingInsurance";
import DoctorDirectory from "../pages/patient_dashboard/doctor_directory/DoctorDirectory";
import PatientInbox from "../pages/patient_dashboard/inbox/Inbox";
import PatientProfilePage from "../pages/patient_dashboard/profile/PatientProfilePage";
import DoctorDashboard from "../pages/doctor_dashboard/DoctorDashboard";
import ReceptionDashboard from "../pages/reception_dashboard/ReceptionDashboard";
import PharmacyDashboard from "../pages/Pharmacy/PharmacyDashboard";
import AdminDashboard from "../pages/Admin/Dashboard";
import AdminProfile from "../pages/Admin/Profile";
import DoctorInbox from "../pages/doctor_dashboard/DoctorInbox";
import ProtectedRoute from "./ProtectedRoute";
import DoctorsPage from "../pages/Admin/doctors/DoctorsPage";
import ReceptionistsPage from "../pages/Admin/receptionists/ReceptionistsPage";
import PharmacistsPage from "../pages/Admin/pharmacists/PharmacistsPage";
import DepartmentsPage from "../pages/Admin/departments/DepartmentsPage";
import PatientsPage from "../pages/Admin/patients/PatientsPage";


function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Login */}
        <Route path="/login" element={<PatientLogin />} />
        <Route path="/login/verify" element={<PatientLogin />} />
        <Route path="/login/staff" element={<StaffLogin />} />

        {/* Dashboards */}
        <Route element={<ProtectedRoute allowedRoles={["patient"]} loginPath="/login" />}>
          <Route path="/patient/dashboard" element={<PatientDashboard />} />
          <Route path="/patient/book" element={<PatientBooking />} />
          <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
          <Route path="/patient/reschedule" element={<RescheduleAppointment />} />
          <Route path="/patient/billing" element={<PatientDashboardPage><BillingInsurance /></PatientDashboardPage>} />
          <Route path="/patient/doctors" element={<PatientDashboardPage><DoctorDirectory /></PatientDashboardPage>} />
          <Route path="/patient/profile" element={<PatientProfilePage />} />
          <Route path="/patient/inbox" element={<PatientInbox />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/inbox" element={<DoctorInbox />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["receptionist"]} />}>
          <Route path="/reception/dashboard" element={<ReceptionDashboard />} />
          <Route path="/reception/inbox" element={<ReceptionDashboard />} />
          <Route path="/reception/billing" element={<ReceptionDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["pharmacist"]} />}>
          <Route path="/pharmacy/dashboard" element={<PharmacyDashboard />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/profile" element={<AdminProfile />} />
          <Route path="/admin/doctors" element={<DoctorsPage />}/>
          <Route path="/admin/receptionists" element={<ReceptionistsPage />}/>
          <Route path="/admin/pharmacists" element={<PharmacistsPage />}/>
          <Route path="/admin/pharmacy" element={<PharmacistsPage />}/>
          <Route path="/admin/departments" element={<DepartmentsPage />}/>
          <Route path="/admin/patients" element={<PatientsPage />}/>
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
