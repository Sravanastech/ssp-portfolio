import VisitorsPanel from "@/components/admin/VisitorsPanel";
import { useAdmin } from "./AdminContext";
import Forbidden from "./Forbidden";
import "@/styles/pages.css";
import "@/styles/admin.css";

/** Audience › People: verified resume visitors (moved out of the old editor page). */
export default function PeoplePage() {
  const { me } = useAdmin();
  if (!me.permissions.includes("people.read")) return <Forbidden />;
  return (
    <div className="studio-container admin-section">
      <header className="admin-head">
        <h1 className="admin-title">People</h1>
      </header>
      <VisitorsPanel />
    </div>
  );
}
