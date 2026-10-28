import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/admin/Dashboard";
import Employees from "./pages/admin/Employees";
import Activities from "./pages/admin/Activities";
import ActivityDetail from "./pages/admin/ActivityDetail";
import Plan from "./pages/admin/Plan";
import Vendors from "./pages/admin/Vendors";
import SettingsPage from "./pages/admin/Settings";
import MyActivities from "./pages/me/MyActivities";
import Checkin from "./pages/me/Checkin";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="activities" element={<Activities />} />
        <Route path="activities/:id" element={<ActivityDetail />} />
        <Route path="plan" element={<Plan />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="me" element={<MyActivities />} />
        <Route path="checkin/:id" element={<Checkin />} />
      </Route>
    </Routes>
  );
}
